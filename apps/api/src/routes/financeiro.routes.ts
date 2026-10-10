import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../prisma.js';
import {
  GerarCobrancaSchema,
  RegistrarRecebimentoSchema,
  RegistrarEntregaSchema,
  PermissaoAcesso,
  StatusCobranca,
  StatusParcela,
  StatusAtendimento,
  TipoOperacaoAuditoria,
} from '@vortex/shared';
import { tenantMiddleware, exigirPermissao } from '../middlewares/tenant.middleware.js';
import { AuditoriaService } from '../services/auditoria.service.js';

export async function financeiroRoutes(app: FastifyInstance) {
  app.addHook('onRequest', async (req) => req.jwtVerify());
  app.addHook('onRequest', tenantMiddleware);

  /**
   * GET /api/cobrancas
   * Listar cobranças da empresa (HU-020)
   */
  app.get('/cobrancas', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = request.tenant!;
    const { status, q } = request.query as { status?: string; q?: string };

    const where: any = {
      empresaId: tenant.empresaId,
    };

    if (status) {
      where.status = status;
    }

    if (q) {
      where.OR = [
        { codigoFormatado: { contains: q, mode: 'insensitive' } },
        { atendimento: { codigoFormatado: { contains: q, mode: 'insensitive' } } },
        { atendimento: { cliente: { nomeRazao: { contains: q, mode: 'insensitive' } } } },
        { atendimento: { veiculo: { placa: { contains: q, mode: 'insensitive' } } } },
      ];
    }

    const cobrancas = await prisma.cobranca.findMany({
      where,
      include: {
        atendimento: {
          select: {
            id: true,
            codigoFormatado: true,
            status: true,
            cliente: { select: { id: true, nomeRazao: true, cpfCnpj: true, telefone: true } },
            veiculo: { select: { id: true, placa: true, modelo: true, marca: true } },
          },
        },
        parcelas: {
          orderBy: { numeroParcela: 'asc' },
        },
      },
      orderBy: { criadoEm: 'desc' },
    });

    const formatadas = cobrancas.map((c) => {
      const valorTotal = Number(c.valorTotal);
      const valorDesconto = Number(c.valorDesconto);
      const valorLiquido = Number(c.valorLiquido);
      const valorRecebido = Number(c.valorRecebido);
      const saldoDevedor = Math.max(0, valorLiquido - valorRecebido);

      return {
        id: c.id,
        codigoFormatado: c.codigoFormatado,
        status: c.status,
        valorTotal,
        valorDesconto,
        valorLiquido,
        valorRecebido,
        saldoDevedor,
        totalParcelas: c.parcelas.length,
        parcelasPagas: c.parcelas.filter((p) => p.status === 'PAGA').length,
        atendimento: c.atendimento,
        criadoEm: c.criadoEm,
      };
    });

    return reply.send({
      sucesso: true,
      total: formatadas.length,
      dados: formatadas,
    });
  });

  /**
   * GET /api/cobrancas/:id
   * Obter detalhes da cobrança com parcelas e recebimentos
   */
  app.get('/cobrancas/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = request.tenant!;
    const { id } = request.params as { id: string };

    const c = await prisma.cobranca.findFirst({
      where: { id, empresaId: tenant.empresaId },
      include: {
        atendimento: {
          include: {
            cliente: true,
            veiculo: true,
          },
        },
        parcelas: {
          orderBy: { numeroParcela: 'asc' },
        },
        recebimentos: {
          include: {
            usuario: { select: { id: true, nome: true } },
            aplicacoes: true,
          },
          orderBy: { dataHoraRecebimento: 'desc' },
        },
      },
    });

    if (!c) {
      return reply.status(404).send({ sucesso: false, mensagem: 'Cobrança não encontrada.' });
    }

    const valorLiquido = Number(c.valorLiquido);
    const valorRecebido = Number(c.valorRecebido);

    return reply.send({
      sucesso: true,
      dados: {
        id: c.id,
        codigoFormatado: c.codigoFormatado,
        status: c.status,
        valorTotal: Number(c.valorTotal),
        valorDesconto: Number(c.valorDesconto),
        valorLiquido,
        valorRecebido,
        saldoDevedor: Math.max(0, valorLiquido - valorRecebido),
        observacoes: c.observacoes,
        criadoEm: c.criadoEm,
        atendimento: c.atendimento,
        parcelas: c.parcelas.map((p) => ({
          id: p.id,
          numeroParcela: p.numeroParcela,
          valor: Number(p.valor),
          valorPago: Number(p.valorPago),
          saldoDevedor: Number(p.saldoDevedor),
          dataVencimento: p.dataVencimento,
          status: p.status,
        })),
        recebimentos: c.recebimentos.map((r) => ({
          id: r.id,
          codigoFormatado: r.codigoFormatado,
          valor: Number(r.valor),
          meioPagamento: r.meioPagamento,
          detalhes: r.detalhes,
          usuarioNome: r.usuario.nome,
          dataHoraRecebimento: r.dataHoraRecebimento,
          aplicacoes: r.aplicacoes.map((a) => ({
            id: a.id,
            parcelaId: a.parcelaId,
            valorAplicado: Number(a.valorAplicado),
          })),
        })),
      },
    });
  });

  /**
   * GET /api/atendimentos/:id/cobranca
   * Obter cobrança vinculada a um atendimento
   */
  app.get('/atendimentos/:id/cobranca', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = request.tenant!;
    const { id: atendimentoId } = request.params as { id: string };

    const c = await prisma.cobranca.findFirst({
      where: { atendimentoId, empresaId: tenant.empresaId },
      include: {
        parcelas: { orderBy: { numeroParcela: 'asc' } },
        recebimentos: { orderBy: { dataHoraRecebimento: 'desc' } },
      },
    });

    if (!c) {
      return reply.send({ sucesso: true, dados: null });
    }

    const valorLiquido = Number(c.valorLiquido);
    const valorRecebido = Number(c.valorRecebido);

    return reply.send({
      sucesso: true,
      dados: {
        id: c.id,
        codigoFormatado: c.codigoFormatado,
        status: c.status,
        valorTotal: Number(c.valorTotal),
        valorDesconto: Number(c.valorDesconto),
        valorLiquido,
        valorRecebido,
        saldoDevedor: Math.max(0, valorLiquido - valorRecebido),
        observacoes: c.observacoes,
        criadoEm: c.criadoEm,
        parcelas: c.parcelas.map((p) => ({
          id: p.id,
          numeroParcela: p.numeroParcela,
          valor: Number(p.valor),
          valorPago: Number(p.valorPago),
          saldoDevedor: Number(p.saldoDevedor),
          dataVencimento: p.dataVencimento,
          status: p.status,
        })),
        recebimentos: c.recebimentos.map((r) => ({
          id: r.id,
          codigoFormatado: r.codigoFormatado,
          valor: Number(r.valor),
          meioPagamento: r.meioPagamento,
          dataHoraRecebimento: r.dataHoraRecebimento,
        })),
      },
    });
  });

  /**
   * POST /api/atendimentos/:id/cobranca
   * Gerar Cobrança e Parcelamento para o Atendimento (HU-020)
   */
  app.post(
    '/atendimentos/:id/cobranca',
    { preHandler: [exigirPermissao(PermissaoAcesso.COBRANCA_GERAR)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenant = request.tenant!;
      const { id: atendimentoId } = request.params as { id: string };

      const parseResult = GerarCobrancaSchema.safeParse({
        ...request.body as any,
        atendimentoId,
      });

      if (!parseResult.success) {
        return reply.status(400).send({
          sucesso: false,
          mensagem: 'Dados inválidos da cobrança',
          erros: parseResult.error.errors.map((e) => ({
            campo: e.path.join('.'),
            mensagem: e.message,
          })),
        });
      }

      const { numeroParcelas, primeiroVencimentoDias, observacoes } = parseResult.data;

      // 1. Validar atendimento
      const atendimento = await prisma.atendimento.findFirst({
        where: { id: atendimentoId, empresaId: tenant.empresaId },
        include: {
          cobranca: true,
          orcamento: {
            include: {
              versoes: {
                orderBy: { numeroVersao: 'desc' },
                take: 1,
              },
            },
          },
        },
      });

      if (!atendimento) {
        return reply.status(404).send({ sucesso: false, mensagem: 'Atendimento não encontrado.' });
      }

      if (atendimento.cobranca) {
        return reply.status(400).send({
          sucesso: false,
          mensagem: `Já existe uma cobrança (${atendimento.cobranca.codigoFormatado}) gerada para este atendimento.`,
        });
      }

      const versaoOrcamento = atendimento.orcamento?.versoes[0];
      if (!versaoOrcamento) {
        return reply.status(400).send({
          sucesso: false,
          mensagem: 'Não é possível gerar cobrança para atendimento sem orçamento aprovado.',
        });
      }

      const valorTotal = Number(versaoOrcamento.valorTotalPecas) + Number(versaoOrcamento.valorTotalServicos);
      const valorDesconto = Number(versaoOrcamento.valorDescontoGeral);
      const valorLiquido = Number(versaoOrcamento.valorTotalFinal);

      if (valorLiquido <= 0) {
        return reply.status(400).send({
          sucesso: false,
          mensagem: 'Valor final do atendimento deve ser superior a zero para emissão de cobrança.',
        });
      }

      const anoAtual = new Date().getFullYear();

      const resultado = await prisma.$transaction(async (tx) => {
        // Gerar sequencial atômico de cobrança
        const ultimaCobranca = await tx.cobranca.findFirst({
          where: { empresaId: tenant.empresaId },
          orderBy: { numeroSequencial: 'desc' },
          select: { numeroSequencial: true },
        });

        const proximoNumero = (ultimaCobranca?.numeroSequencial ?? 0) + 1;
        const codigoFormatado = `COB-${anoAtual}-${String(proximoNumero).padStart(4, '0')}`;

        const cobranca = await tx.cobranca.create({
          data: {
            empresaId: tenant.empresaId,
            atendimentoId,
            codigoFormatado,
            numeroSequencial: proximoNumero,
            valorTotal,
            valorDesconto,
            valorLiquido,
            valorRecebido: 0,
            status: StatusCobranca.PENDENTE,
            observacoes,
          },
        });

        // Gerar parcelas
        const valorParcelaBase = Math.floor((valorLiquido / numeroParcelas) * 100) / 100;
        let diferencaCentavos = Math.round((valorLiquido - valorParcelaBase * numeroParcelas) * 100) / 100;

        const agora = new Date();
        const dataBase = new Date(agora);
        dataBase.setDate(dataBase.getDate() + primeiroVencimentoDias);

        for (let i = 1; i <= numeroParcelas; i++) {
          let valorDaParcela = valorParcelaBase;
          if (i === 1 && diferencaCentavos > 0) {
            valorDaParcela += diferencaCentavos; // Ajuste no primeiro vencimento
          }

          const vencimento = new Date(dataBase);
          vencimento.setDate(vencimento.getDate() + (i - 1) * 30);

          await tx.parcelaCobranca.create({
            data: {
              empresaId: tenant.empresaId,
              cobrancaId: cobranca.id,
              numeroParcela: i,
              valor: valorDaParcela,
              valorPago: 0,
              saldoDevedor: valorDaParcela,
              dataVencimento: vencimento,
              status: StatusParcela.PENDENTE,
            },
          });
        }

        return cobranca;
      });

      await AuditoriaService.registrar({
        empresaId: tenant.empresaId,
        usuarioId: tenant.usuarioId,
        operacao: TipoOperacaoAuditoria.CRIACAO,
        entidade: 'Cobranca',
        entidadeId: resultado.id,
        detalhes: {
          codigoFormatado: resultado.codigoFormatado,
          atendimentoId,
          valorLiquido,
          numeroParcelas,
        },
      });

      return reply.status(201).send({
        sucesso: true,
        mensagem: `Cobrança ${resultado.codigoFormatado} gerada com sucesso!`,
        dados: resultado,
      });
    }
  );

  /**
   * POST /api/cobrancas/:id/recebimentos
   * Registrar Recebimento / Pagamento (HU-021)
   */
  app.post(
    '/cobrancas/:id/recebimentos',
    { preHandler: [exigirPermissao(PermissaoAcesso.RECEBIMENTO_REGISTRAR)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenant = request.tenant!;
      const { id: cobrancaId } = request.params as { id: string };

      const parseResult = RegistrarRecebimentoSchema.safeParse({
        ...request.body as any,
        cobrancaId,
      });

      if (!parseResult.success) {
        return reply.status(400).send({
          sucesso: false,
          mensagem: 'Dados inválidos do recebimento',
          erros: parseResult.error.errors.map((e) => ({
            campo: e.path.join('.'),
            mensagem: e.message,
          })),
        });
      }

      const { valor, meioPagamento, detalhes, parcelaId } = parseResult.data;

      const cobranca = await prisma.cobranca.findFirst({
        where: { id: cobrancaId, empresaId: tenant.empresaId },
        include: {
          parcelas: {
            orderBy: { numeroParcela: 'asc' },
          },
        },
      });

      if (!cobranca) {
        return reply.status(404).send({ sucesso: false, mensagem: 'Cobrança não encontrada.' });
      }

      const valorLiquido = Number(cobranca.valorLiquido);
      const valorRecebidoAtual = Number(cobranca.valorRecebido);
      const saldoDevedorGeral = valorLiquido - valorRecebidoAtual;

      if (saldoDevedorGeral <= 0) {
        return reply.status(400).send({
          sucesso: false,
          mensagem: 'Esta cobrança já se encontra totalmente liquidada.',
        });
      }

      const anoAtual = new Date().getFullYear();

      const resultado = await prisma.$transaction(async (tx) => {
        // Gerar sequencial de recebimento
        const ultimoRec = await tx.recebimento.findFirst({
          where: { empresaId: tenant.empresaId },
          orderBy: { numeroSequencial: 'desc' },
          select: { numeroSequencial: true },
        });

        const proximoNumero = (ultimoRec?.numeroSequencial ?? 0) + 1;
        const codigoFormatado = `REC-${anoAtual}-${String(proximoNumero).padStart(4, '0')}`;

        const recebimento = await tx.recebimento.create({
          data: {
            empresaId: tenant.empresaId,
            cobrancaId,
            codigoFormatado,
            numeroSequencial: proximoNumero,
            valor,
            meioPagamento,
            detalhes,
            usuarioId: tenant.usuarioId,
          },
        });

        // Abater o valor nas parcelas
        let saldoParaAplicar = valor;

        // Se uma parcela específica foi apontada, processa ela primeiro
        let parcelasPendentes = [...cobranca.parcelas.filter((p) => Number(p.saldoDevedor) > 0)];
        if (parcelaId) {
          const indexAlvo = parcelasPendentes.findIndex((p) => p.id === parcelaId);
          if (indexAlvo > -1) {
            const [pAlvo] = parcelasPendentes.splice(indexAlvo, 1);
            parcelasPendentes.unshift(pAlvo);
          }
        }

        for (const parc of parcelasPendentes) {
          if (saldoParaAplicar <= 0) break;

          const saldoParc = Number(parc.saldoDevedor);
          const valorAplicadoNaParcela = Math.min(saldoParaAplicar, saldoParc);
          const novoSaldoParc = Math.max(0, saldoParc - valorAplicadoNaParcela);
          const novoValorPago = Number(parc.valorPago) + valorAplicadoNaParcela;
          const statusParcela = novoSaldoParc === 0 ? StatusParcela.PAGA : StatusParcela.PENDENTE;

          await tx.parcelaCobranca.update({
            where: { id: parc.id },
            data: {
              valorPago: novoValorPago,
              saldoDevedor: novoSaldoParc,
              status: statusParcela,
            },
          });

          await tx.aplicacaoRecebimento.create({
            data: {
              empresaId: tenant.empresaId,
              recebimentoId: recebimento.id,
              parcelaId: parc.id,
              valorAplicado: valorAplicadoNaParcela,
            },
          });

          saldoParaAplicar -= valorAplicadoNaParcela;
        }

        // Atualizar saldo recebido da cobrança geral
        const novoTotalRecebido = valorRecebidoAtual + valor;
        const novoStatusCobranca =
          novoTotalRecebido >= valorLiquido
            ? StatusCobranca.LIQUIDADA
            : StatusCobranca.PARCIALMENTE_LIQUIDADA;

        const cobrancaAtualizada = await tx.cobranca.update({
          where: { id: cobrancaId },
          data: {
            valorRecebido: novoTotalRecebido,
            status: novoStatusCobranca,
          },
        });

        return { recebimento, cobranca: cobrancaAtualizada };
      });

      await AuditoriaService.registrar({
        empresaId: tenant.empresaId,
        usuarioId: tenant.usuarioId,
        operacao: TipoOperacaoAuditoria.RECEBIMENTO_FINANCEIRO,
        entidade: 'Recebimento',
        entidadeId: resultado.recebimento.id,
        detalhes: {
          codigoFormatado: resultado.recebimento.codigoFormatado,
          cobrancaId,
          valor,
          meioPagamento,
          statusCobranca: resultado.cobranca.status,
        },
      });

      return reply.status(201).send({
        sucesso: true,
        mensagem: `Recebimento ${resultado.recebimento.codigoFormatado} registrado com sucesso!`,
        dados: {
          recebimento: resultado.recebimento,
          statusCobranca: resultado.cobranca.status,
          totalRecebido: Number(resultado.cobranca.valorRecebido),
        },
      });
    }
  );

  /**
   * POST /api/atendimentos/:id/entrega
   * Liberação e Entrega do Veículo com Política de Débito (HU-022 / DOC-003)
   */
  app.post(
    '/atendimentos/:id/entrega',
    { preHandler: [exigirPermissao(PermissaoAcesso.ENTREGA_LIBERAR)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenant = request.tenant!;
      const { id: atendimentoId } = request.params as { id: string };

      const parseResult = RegistrarEntregaSchema.safeParse({
        ...request.body as any,
        atendimentoId,
      });

      if (!parseResult.success) {
        return reply.status(400).send({
          sucesso: false,
          mensagem: 'Dados inválidos para registrar a entrega do veículo',
          erros: parseResult.error.errors.map((e) => ({
            campo: e.path.join('.'),
            mensagem: e.message,
          })),
        });
      }

      const {
        condicaoDevolucao,
        nomeRecebedor,
        documentoRecebedor,
        quilometragemSaida,
        observacoes,
        motivoLiberacaoComDebito,
      } = parseResult.data;

      // 1. Validar atendimento
      const atendimento = await prisma.atendimento.findFirst({
        where: { id: atendimentoId, empresaId: tenant.empresaId },
        include: {
          cobranca: true,
          entrega: true,
        },
      });

      if (!atendimento) {
        return reply.status(404).send({ sucesso: false, mensagem: 'Atendimento não encontrado.' });
      }

      if (atendimento.entrega) {
        return reply.status(400).send({
          sucesso: false,
          mensagem: 'Veículo já foi entregue anteriormente.',
        });
      }

      // 2. Política Financeira de Liberação (DOC-003 / DOC-004 / DOC-005)
      let liberadaComDebito = false;

      if (atendimento.cobranca && atendimento.cobranca.status !== StatusCobranca.LIQUIDADA) {
        const saldoPendente =
          Number(atendimento.cobranca.valorLiquido) - Number(atendimento.cobranca.valorRecebido);

        // Usuário precisa ter permissão especial de alçada ENTREGA_COM_DEBITO
        const temPermissaoDebito = tenant.permissoes.includes(PermissaoAcesso.ENTREGA_COM_DEBITO);

        if (!temPermissaoDebito) {
          return reply.status(403).send({
            sucesso: false,
            mensagem: `O veículo possui saldo pendente de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(saldoPendente)}. A liberação de entrega com débito requer autorização de gestor (permissão ENTREGA_COM_DEBITO).`,
          });
        }

        if (!motivoLiberacaoComDebito) {
          return reply.status(400).send({
            sucesso: false,
            mensagem: 'Informe a justificativa/motivo para liberar a entrega com débito pendente.',
          });
        }

        liberadaComDebito = true;
      }

      const agora = new Date();

      const entrega = await prisma.$transaction(async (tx) => {
        const regEntrega = await tx.entregaVeiculo.create({
          data: {
            empresaId: tenant.empresaId,
            atendimentoId,
            condicaoDevolucao,
            nomeRecebedor,
            documentoRecebedor,
            quilometragemSaida,
            usuarioEntregaId: tenant.usuarioId,
            liberadaComDebito,
            motivoLiberacaoComDebito,
            observacoes,
            dataHoraEntrega: agora,
          },
        });

        // Transiciona atendimento para ENTREGUE
        await tx.atendimento.update({
          where: { id: atendimentoId },
          data: {
            status: StatusAtendimento.ENTREGUE,
            finalizadoEm: agora,
          },
        });

        return regEntrega;
      });

      await AuditoriaService.registrar({
        empresaId: tenant.empresaId,
        usuarioId: tenant.usuarioId,
        operacao: TipoOperacaoAuditoria.ENTREGA_VEICULO,
        entidade: 'EntregaVeiculo',
        entidadeId: entrega.id,
        detalhes: {
          atendimentoId,
          nomeRecebedor,
          quilometragemSaida,
          liberadaComDebito,
          motivoLiberacaoComDebito,
        },
      });

      return reply.status(201).send({
        sucesso: true,
        mensagem: 'Veículo entregue com sucesso! Atendimento finalizado.',
        dados: entrega,
      });
    }
  );

  /**
   * GET /api/atendimentos/:id/entrega
   * Obter registro de entrega do veículo
   */
  app.get('/atendimentos/:id/entrega', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = request.tenant!;
    const { id: atendimentoId } = request.params as { id: string };

    const entrega = await prisma.entregaVeiculo.findFirst({
      where: { atendimentoId, empresaId: tenant.empresaId },
      include: {
        usuarioEntrega: { select: { id: true, nome: true, email: true } },
      },
    });

    if (!entrega) {
      return reply.send({ sucesso: true, dados: null });
    }

    return reply.send({ sucesso: true, dados: entrega });
  });
}
