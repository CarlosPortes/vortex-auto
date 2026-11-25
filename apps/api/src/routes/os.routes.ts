import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../prisma.js';
import {
  PlanejarOSSchema,
  ApontarAtividadeSchema,
  ConsumirMaterialOSSchema,
  DevolverMaterialOSSchema,
  PermissaoAcesso,
  StatusOS,
  StatusAtividade,
  StatusAtendimento,
  TipoMovimentoEstoque,
  TipoOperacaoAuditoria,
} from '@vortex/shared';
import { tenantMiddleware, exigirPermissao } from '../middlewares/tenant.middleware.js';
import { AuditoriaService } from '../services/auditoria.service.js';

export async function osRoutes(app: FastifyInstance) {
  app.addHook('onRequest', async (req) => req.jwtVerify());
  app.addHook('onRequest', tenantMiddleware);

  /**
   * GET /api/os
   * Listar Ordens de Serviço do tenant com filtros de status e busca (HU-014)
   */
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = request.tenant!;
    const { status, q, clienteId } = request.query as { status?: string; q?: string; clienteId?: string };

    const where: any = {
      empresaId: tenant.empresaId,
    };

    if (status) {
      where.status = status;
    }

    if (clienteId && clienteId !== 'TODOS') {
      where.atendimento = {
        ...(where.atendimento || {}),
        clienteId,
      };
    }

    if (q && q.trim()) {
      const termo = q.trim();
      where.OR = [
        { codigoFormatado: { contains: termo, mode: 'insensitive' } },
        { observacoesTecnicas: { contains: termo, mode: 'insensitive' } },
        { atendimento: { codigoFormatado: { contains: termo, mode: 'insensitive' } } },
        { atendimento: { queixaPrincipal: { contains: termo, mode: 'insensitive' } } },
        { atendimento: { veiculo: { placa: { contains: termo, mode: 'insensitive' } } } },
        { atendimento: { veiculo: { modelo: { contains: termo, mode: 'insensitive' } } } },
        { atendimento: { veiculo: { marca: { contains: termo, mode: 'insensitive' } } } },
        { atendimento: { cliente: { nomeRazao: { contains: termo, mode: 'insensitive' } } } },
        { atendimento: { cliente: { cpfCnpj: { contains: termo, mode: 'insensitive' } } } },
        { atividades: { some: { descricao: { contains: termo, mode: 'insensitive' } } } },
        {
          atendimento: {
            orcamento: {
              versoes: {
                some: {
                  itens: {
                    some: { descricao: { contains: termo, mode: 'insensitive' } },
                  },
                },
              },
            },
          },
        },
      ];
    }

    const ordens = await prisma.ordemServico.findMany({
      where,
      include: {
        responsavelMecanico: { select: { id: true, nome: true, email: true } },
        atendimento: {
          select: {
            id: true,
            codigoFormatado: true,
            status: true,
            queixaPrincipal: true,
            cliente: { select: { id: true, nomeRazao: true, telefone: true } },
            veiculo: { select: { id: true, placa: true, modelo: true, marca: true } },
            cobranca: {
              select: {
                id: true,
                codigoFormatado: true,
                status: true,
                valorLiquido: true,
                valorRecebido: true,
              },
            },
            orcamento: {
              select: {
                versoes: {
                  orderBy: { numeroVersao: 'desc' },
                  take: 1,
                  select: {
                    id: true,
                    valorTotalPecas: true,
                    valorTotalServicos: true,
                    valorTotalFinal: true,
                    itens: {
                      select: {
                        id: true,
                        tipo: true,
                        descricao: true,
                        quantidade: true,
                        valorUnitario: true,
                        valorTotal: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        atividades: {
          select: {
            id: true,
            itemOrcamentoId: true,
            descricao: true,
            status: true,
            tempoEstimadoMinutos: true,
            tempoRealizadoMinutos: true,
            mecanico: { select: { id: true, nome: true } },
          },
          orderBy: { criadoEm: 'asc' },
        },
        fotos: {
          select: {
            id: true,
            etapa: true,
            legenda: true,
            url: true,
            criadoEm: true,
          },
          orderBy: { criadoEm: 'asc' },
        },
      },
      orderBy: { criadoEm: 'desc' },
    });

    const formatadas = ordens.map((os) => {
      const totalAtividades = os.atividades.length;
      const concluidas = os.atividades.filter((a) => a.status === StatusAtividade.CONCLUIDA).length;
      const progressoPercent = totalAtividades > 0 ? Math.round((concluidas / totalAtividades) * 100) : 0;
      const versaoOrc = (os.atendimento as any).orcamento?.versoes?.[0];

      return {
        id: os.id,
        numeroOS: os.numeroOS,
        codigoFormatado: os.codigoFormatado,
        status: os.status,
        dataInicio: os.dataInicio,
        dataConclusao: os.dataConclusao,
        observacoesTecnicas: os.observacoesTecnicas,
        mecanicoResponsavel: os.responsavelMecanico ? os.responsavelMecanico.nome : null,
        atendimento: os.atendimento,
        orcamentoResumo: versaoOrc
          ? {
              valorTotalPecas: Number(versaoOrc.valorTotalPecas),
              valorTotalServicos: Number(versaoOrc.valorTotalServicos),
              valorTotalFinal: Number(versaoOrc.valorTotalFinal),
              itens: versaoOrc.itens.map((it: any) => ({
                id: it.id,
                tipo: it.tipo,
                descricao: it.descricao,
                quantidade: Number(it.quantidade),
                valorUnitario: Number(it.valorUnitario),
                valorTotal: Number(it.valorTotal),
              })),
            }
          : null,
        progresso: {
          totalAtividades,
          concluidas,
          progressoPercent,
        },
        atividades: os.atividades,
        fotos: (os as any).fotos.map((f: any) => ({
          id: f.id,
          etapa: f.etapa,
          legenda: f.legenda,
          url: f.url,
          dataHora: f.criadoEm,
        })),
        criadoEm: os.criadoEm,
      };
    });

    return reply.send({
      sucesso: true,
      total: formatadas.length,
      dados: formatadas,
    });
  });

  /**
   * GET /api/os/atendimento/:atendimentoId
   * Obter a OS vinculada a um atendimento específico
   */
  app.get('/atendimento/:atendimentoId', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = request.tenant!;
    const { atendimentoId } = request.params as { atendimentoId: string };

    const os = await prisma.ordemServico.findFirst({
      where: { atendimentoId, empresaId: tenant.empresaId },
      include: {
        responsavelMecanico: { select: { id: true, nome: true } },
        atividades: {
          include: {
            mecanico: { select: { id: true, nome: true } },
          },
          orderBy: { criadoEm: 'asc' },
        },
        reservasEstoque: {
          include: {
            produto: { select: { id: true, codigo: true, descricao: true, unidadeMedida: true } },
          },
        },
      },
    });

    if (!os) {
      return reply.send({ sucesso: true, dados: null });
    }

    return reply.send({ sucesso: true, dados: os });
  });

  /**
   * GET /api/os/:id
   * Obter detalhes completos de uma Ordem de Serviço
   */
  app.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = request.tenant!;
    const { id } = request.params as { id: string };

    const os = await prisma.ordemServico.findFirst({
      where: { id, empresaId: tenant.empresaId },
      include: {
        responsavelMecanico: { select: { id: true, nome: true, email: true } },
        atendimento: {
          include: {
            cliente: true,
            veiculo: true,
            medicao: true,
            diagnosticos: true,
          },
        },
        atividades: {
          include: {
            mecanico: { select: { id: true, nome: true } },
          },
          orderBy: { criadoEm: 'asc' },
        },
        reservasEstoque: {
          include: {
            produto: true,
          },
        },
      },
    });

    if (!os) {
      return reply.status(404).send({ sucesso: false, mensagem: 'Ordem de serviço não encontrada.' });
    }

    return reply.send({ sucesso: true, dados: os });
  });

  /**
   * POST /api/os/planejar
   * Criar/Planejar Ordem de Serviço única para o atendimento (HU-014)
   */
  app.post(
    '/planejar',
    { preHandler: [exigirPermissao(PermissaoAcesso.OS_INICIAR)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenant = request.tenant!;

      const parseResult = PlanejarOSSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          sucesso: false,
          mensagem: 'Dados inválidos para planejar a OS',
          erros: parseResult.error.errors.map((e) => ({
            campo: e.path.join('.'),
            mensagem: e.message,
          })),
        });
      }

      const { atendimentoId, responsavelMecanicoId, observacoesTecnicas, atividades } = parseResult.data;

      // 1. Validar Atendimento
      const atendimento = await prisma.atendimento.findFirst({
        where: { id: atendimentoId, empresaId: tenant.empresaId },
      });

      if (!atendimento) {
        return reply.status(404).send({ sucesso: false, mensagem: 'Atendimento não encontrado.' });
      }

      // 2. Verificar se já existe OS para o Atendimento (Regra MVP: 1 OS por atendimento)
      const osExistente = await prisma.ordemServico.findFirst({
        where: { atendimentoId, empresaId: tenant.empresaId },
      });

      if (osExistente) {
        return reply.status(400).send({
          sucesso: false,
          mensagem: `Já existe uma Ordem de Serviço (${osExistente.codigoFormatado}) vinculada a este atendimento.`,
        });
      }

      const anoAtual = new Date().getFullYear();

      const resultado = await prisma.$transaction(async (tx) => {
        // Gerar sequencial atômico de OS para a empresa
        const ultimaOS = await tx.ordemServico.findFirst({
          where: { empresaId: tenant.empresaId },
          orderBy: { numeroOS: 'desc' },
          select: { numeroOS: true },
        });

        const proximoNumero = (ultimaOS?.numeroOS ?? 0) + 1;
        const codigoFormatado = `OS-${anoAtual}-${String(proximoNumero).padStart(4, '0')}`;

        // Criar OS
        const os = await tx.ordemServico.create({
          data: {
            empresaId: tenant.empresaId,
            unidadeId: atendimento.unidadeId,
            atendimentoId,
            numeroOS: proximoNumero,
            codigoFormatado,
            status: StatusOS.PLANEJADA,
            responsavelMecanicoId: responsavelMecanicoId || tenant.usuarioId,
            observacoesTecnicas,
          },
        });

        // Criar Atividades
        for (const ativ of atividades) {
          await tx.atividadeOS.create({
            data: {
              empresaId: tenant.empresaId,
              ordemServicoId: os.id,
              itemOrcamentoId: ativ.itemOrcamentoId,
              descricao: ativ.descricao,
              status: StatusAtividade.PENDENTE,
              mecanicoId: ativ.mecanicoId || os.responsavelMecanicoId,
              tempoEstimadoMinutos: ativ.tempoEstimadoMinutos,
            },
          });
        }

        // Vincular reservas de estoque existentes do atendimento a esta OS
        await tx.reservaEstoque.updateMany({
          where: {
            empresaId: tenant.empresaId,
            atendimentoId,
            ordemServicoId: null,
          },
          data: {
            ordemServicoId: os.id,
          },
        });

        // Atualizar status do atendimento para EM_EXECUCAO se ainda não estava
        if (atendimento.status !== StatusAtendimento.EM_EXECUCAO) {
          await tx.atendimento.update({
            where: { id: atendimento.id },
            data: { status: StatusAtendimento.EM_EXECUCAO },
          });
        }

        return os;
      });

      await AuditoriaService.registrar({
        empresaId: tenant.empresaId,
        usuarioId: tenant.usuarioId,
        operacao: TipoOperacaoAuditoria.CRIACAO,
        entidade: 'OrdemServico',
        entidadeId: resultado.id,
        detalhes: {
          codigoFormatado: resultado.codigoFormatado,
          atendimentoId,
          totalAtividades: atividades.length,
        },
      });

      return reply.status(201).send({
        sucesso: true,
        mensagem: `Ordem de Serviço ${resultado.codigoFormatado} planejada com sucesso!`,
        dados: resultado,
      });
    }
  );

  /**
   * PATCH /api/os/:id/iniciar
   * Iniciar execução da Ordem de Serviço (HU-014 / HU-015)
   */
  app.patch(
    '/:id/iniciar',
    { preHandler: [exigirPermissao(PermissaoAcesso.OS_INICIAR)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenant = request.tenant!;
      const { id } = request.params as { id: string };

      const os = await prisma.ordemServico.findFirst({
        where: { id, empresaId: tenant.empresaId },
      });

      if (!os) {
        return reply.status(404).send({ sucesso: false, mensagem: 'Ordem de serviço não encontrada.' });
      }

      if (os.status === StatusOS.CONCLUIDA || os.status === StatusOS.CANCELADA) {
        return reply.status(400).send({
          sucesso: false,
          mensagem: `Não é possível iniciar uma OS com status '${os.status}'.`,
        });
      }

      const atualizada = await prisma.ordemServico.update({
        where: { id },
        data: {
          status: StatusOS.EM_ANDAMENTO,
          dataInicio: os.dataInicio || new Date(),
        },
      });

      await AuditoriaService.registrar({
        empresaId: tenant.empresaId,
        usuarioId: tenant.usuarioId,
        operacao: TipoOperacaoAuditoria.TRANSICAO_ESTADO,
        entidade: 'OrdemServico',
        entidadeId: id,
        detalhes: { de: os.status, para: StatusOS.EM_ANDAMENTO },
      });

      return reply.send({
        sucesso: true,
        mensagem: 'Ordem de serviço iniciada com sucesso!',
        dados: atualizada,
      });
    }
  );

  /**
   * PATCH /api/os/atividades/:atividadeId/apontar
   * Apontamento de status e tempo de uma atividade técnica (HU-015)
   */
  app.patch(
    '/atividades/:atividadeId/apontar',
    { preHandler: [exigirPermissao(PermissaoAcesso.OS_EXECUTAR)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenant = request.tenant!;
      const { atividadeId } = request.params as { atividadeId: string };

      const parseResult = ApontarAtividadeSchema.safeParse({
        ...request.body as any,
        atividadeId,
      });

      if (!parseResult.success) {
        return reply.status(400).send({
          sucesso: false,
          mensagem: 'Dados inválidos do apontamento',
          erros: parseResult.error.errors.map((e) => ({
            campo: e.path.join('.'),
            mensagem: e.message,
          })),
        });
      }

      const { novoStatus, motivoPausa, tempoGastoMinutos } = parseResult.data;

      const atividade = await prisma.atividadeOS.findFirst({
        where: { id: atividadeId, empresaId: tenant.empresaId },
        include: { ordemServico: true },
      });

      if (!atividade) {
        return reply.status(404).send({ sucesso: false, mensagem: 'Atividade não encontrada.' });
      }

      const agora = new Date();
      let updateData: any = { status: novoStatus };

      if (novoStatus === StatusAtividade.EM_EXECUCAO) {
        if (!atividade.iniciadoEm) {
          updateData.iniciadoEm = agora;
        }
        updateData.mecanicoId = tenant.usuarioId;

        // Se a OS ainda estiver PLANEJADA, ativa para EM_ANDAMENTO
        if (atividade.ordemServico.status === StatusOS.PLANEJADA) {
          await prisma.ordemServico.update({
            where: { id: atividade.ordemServicoId },
            data: { status: StatusOS.EM_ANDAMENTO, dataInicio: agora },
          });
        }
      } else if (novoStatus === StatusAtividade.PAUSADA) {
        updateData.motivoPausa = motivoPausa || 'Pausa operacional';
        if (tempoGastoMinutos) {
          updateData.tempoRealizadoMinutos = atividade.tempoRealizadoMinutos + tempoGastoMinutos;
        }
      } else if (novoStatus === StatusAtividade.CONCLUIDA) {
        updateData.concluidoEm = agora;
        if (tempoGastoMinutos) {
          updateData.tempoRealizadoMinutos = atividade.tempoRealizadoMinutos + tempoGastoMinutos;
        } else if (atividade.tempoRealizadoMinutos === 0) {
          updateData.tempoRealizadoMinutos = atividade.tempoEstimadoMinutos;
        }
      }

      const atualizada = await prisma.atividadeOS.update({
        where: { id: atividadeId },
        data: updateData,
        include: {
          mecanico: { select: { id: true, nome: true } },
        },
      });

      await AuditoriaService.registrar({
        empresaId: tenant.empresaId,
        usuarioId: tenant.usuarioId,
        operacao: TipoOperacaoAuditoria.ALTERACAO,
        entidade: 'AtividadeOS',
        entidadeId: atividadeId,
        detalhes: {
          de: atividade.status,
          para: novoStatus,
          tempoRealizado: atualizada.tempoRealizadoMinutos,
        },
      });

      return reply.send({
        sucesso: true,
        mensagem: `Atividade atualizada para '${novoStatus}'.`,
        dados: atualizada,
      });
    }
  );

  /**
   * POST /api/os/:id/consumir-material
   * Consumir e dar baixa de material de estoque na OS (HU-016)
   */
  app.post(
    '/:id/consumir-material',
    { preHandler: [exigirPermissao(PermissaoAcesso.ESTOQUE_CONSUMIR)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenant = request.tenant!;
      const { id } = request.params as { id: string };

      const parseResult = ConsumirMaterialOSSchema.safeParse({
        ...request.body as any,
        ordemServicoId: id,
      });

      if (!parseResult.success) {
        return reply.status(400).send({
          sucesso: false,
          mensagem: 'Dados inválidos para consumo de material',
          erros: parseResult.error.errors.map((e) => ({
            campo: e.path.join('.'),
            mensagem: e.message,
          })),
        });
      }

      const { produtoId, quantidade, motivo } = parseResult.data;

      const os = await prisma.ordemServico.findFirst({
        where: { id, empresaId: tenant.empresaId },
      });

      if (!os) {
        return reply.status(404).send({ sucesso: false, mensagem: 'Ordem de serviço não encontrada.' });
      }

      const resultado = await prisma.$transaction(async (tx) => {
        const prod = await tx.produto.findFirst({
          where: { id: produtoId, empresaId: tenant.empresaId },
        });

        if (!prod) {
          throw new Error('PRODUTO_NAO_ENCONTRADO');
        }

        const saldoFisicoAtual = Number(prod.saldoFisico);
        const saldoReservadoAtual = Number(prod.saldoReservado);

        if (saldoFisicoAtual < quantidade) {
          throw new Error('SALDO_FISICO_INSUFICIENTE');
        }

        // Verificar se há reserva correspondente ativa para abater
        const reserva = await tx.reservaEstoque.findFirst({
          where: {
            empresaId: tenant.empresaId,
            produtoId,
            status: 'ATIVA',
            OR: [
              { ordemServicoId: id },
              { atendimentoId: os.atendimentoId },
            ],
          },
        });

        let novoSaldoReservado = saldoReservadoAtual;
        if (reserva) {
          const qtdReserva = Number(reserva.quantidade);
          if (qtdReserva <= quantidade) {
            novoSaldoReservado = Math.max(0, saldoReservadoAtual - qtdReserva);
            await tx.reservaEstoque.update({
              where: { id: reserva.id },
              data: { status: 'CONSUMIDA' },
            });
          } else {
            novoSaldoReservado = Math.max(0, saldoReservadoAtual - quantidade);
            await tx.reservaEstoque.update({
              where: { id: reserva.id },
              data: { quantidade: qtdReserva - quantidade },
            });
          }
        }

        const novoSaldoFisico = Math.max(0, saldoFisicoAtual - quantidade);

        const produtoAtualizado = await tx.produto.update({
          where: { id: prod.id },
          data: {
            saldoFisico: novoSaldoFisico,
            saldoReservado: novoSaldoReservado,
          },
        });

        const movimento = await tx.movimentoEstoque.create({
          data: {
            empresaId: tenant.empresaId,
            produtoId: prod.id,
            tipo: TipoMovimentoEstoque.CONSUMO,
            quantidade,
            saldoFisicoAnterior: saldoFisicoAtual,
            saldoFisicoNovo: novoSaldoFisico,
            saldoReservadoAnterior: saldoReservadoAtual,
            saldoReservadoNovo: novoSaldoReservado,
            origemDocumento: os.codigoFormatado,
            usuarioId: tenant.usuarioId,
            motivo: motivo || `Consumo executado na OS ${os.codigoFormatado}`,
          },
        });

        return { produto: produtoAtualizado, movimento };
      });

      await AuditoriaService.registrar({
        empresaId: tenant.empresaId,
        usuarioId: tenant.usuarioId,
        operacao: TipoOperacaoAuditoria.MOVIMENTACAO_ESTOQUE,
        entidade: 'OrdemServico',
        entidadeId: id,
        detalhes: {
          acao: 'CONSUMO_MATERIAL',
          produtoId,
          quantidade,
          os: os.codigoFormatado,
        },
      });

      return reply.send({
        sucesso: true,
        mensagem: 'Consumo de material registrado e estoque baixado com sucesso!',
        dados: {
          produtoId,
          saldoFisico: Number(resultado.produto.saldoFisico),
          saldoReservado: Number(resultado.produto.saldoReservado),
          saldoDisponivel: Number(resultado.produto.saldoFisico) - Number(resultado.produto.saldoReservado),
          movimentoId: resultado.movimento.id,
        },
      });
    }
  );

  /**
   * POST /api/os/:id/devolver-material
   * Devolução de sobras de material/peças ao estoque (HU-016 / Regra EST-C03 / DOC-004)
   * A devolução deve referenciar consumo prévio na OS e não pode exceder o saldo líquido consumido.
   */
  app.post(
    '/:id/devolver-material',
    { preHandler: [exigirPermissao(PermissaoAcesso.ESTOQUE_CONSUMIR)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenant = request.tenant!;
      const { id } = request.params as { id: string };
      const parseResult = DevolverMaterialOSSchema.safeParse({
        ...(request.body as any),
        ordemServicoId: id,
      });

      if (!parseResult.success) {
        return reply.status(400).send({
          sucesso: false,
          mensagem: 'Dados inválidos para devolução de material ao estoque',
          erros: parseResult.error.errors.map((e) => ({ campo: e.path.join('.'), mensagem: e.message })),
        });
      }

      const { produtoId, quantidade, motivo } = parseResult.data;

      const os = await prisma.ordemServico.findFirst({
        where: { id, empresaId: tenant.empresaId },
      });

      if (!os) {
        return reply.status(404).send({ sucesso: false, mensagem: 'Ordem de Serviço não encontrada.' });
      }

      // Validar histórico de consumo e devoluções prévias desta OS para este produto (EST-C03)
      const movimentosHistorico = await prisma.movimentoEstoque.findMany({
        where: {
          empresaId: tenant.empresaId,
          produtoId,
          origemDocumento: os.codigoFormatado,
        },
      });

      let totalConsumido = 0;
      let totalDevolvido = 0;
      for (const mov of movimentosHistorico) {
        if (mov.tipo === TipoMovimentoEstoque.CONSUMO) {
          totalConsumido += Number(mov.quantidade);
        } else if (mov.tipo === TipoMovimentoEstoque.DEVOLUCAO) {
          totalDevolvido += Number(mov.quantidade);
        }
      }

      const saldoLiquidoConsumido = totalConsumido - totalDevolvido;

      if (saldoLiquidoConsumido <= 0) {
        return reply.status(400).send({
          sucesso: false,
          mensagem: `Não há consumo registrado desta peça na OS ${os.codigoFormatado} disponível para devolução.`,
        });
      }

      if (quantidade > saldoLiquidoConsumido) {
        return reply.status(400).send({
          sucesso: false,
          mensagem: `A quantidade informada (${quantidade}) excede o saldo líquido consumido na OS (${saldoLiquidoConsumido}).`,
        });
      }

      const resultado = await prisma.$transaction(async (tx) => {
        const prod = await tx.produto.findUnique({
          where: { id: produtoId },
        });

        if (!prod) {
          throw new Error('PRODUTO_NAO_ENCONTRADO');
        }

        const saldoFisicoAtual = Number(prod.saldoFisico);
        const saldoReservadoAtual = Number(prod.saldoReservado);
        const novoSaldoFisico = saldoFisicoAtual + quantidade;

        const produtoAtualizado = await tx.produto.update({
          where: { id: prod.id },
          data: {
            saldoFisico: novoSaldoFisico,
          },
        });

        const movimento = await tx.movimentoEstoque.create({
          data: {
            empresaId: tenant.empresaId,
            produtoId: prod.id,
            tipo: TipoMovimentoEstoque.DEVOLUCAO,
            quantidade,
            saldoFisicoAnterior: saldoFisicoAtual,
            saldoFisicoNovo: novoSaldoFisico,
            saldoReservadoAnterior: saldoReservadoAtual,
            saldoReservadoNovo: saldoReservadoAtual,
            origemDocumento: os.codigoFormatado,
            usuarioId: tenant.usuarioId,
            motivo: motivo || `Devolução de material referente à OS ${os.codigoFormatado}`,
          },
        });

        return { produto: produtoAtualizado, movimento };
      });

      await AuditoriaService.registrar({
        empresaId: tenant.empresaId,
        usuarioId: tenant.usuarioId,
        operacao: TipoOperacaoAuditoria.MOVIMENTACAO_ESTOQUE,
        entidade: 'OrdemServico',
        entidadeId: id,
        detalhes: {
          acao: 'DEVOLUCAO_MATERIAL',
          produtoId,
          quantidade,
          os: os.codigoFormatado,
          motivo,
        },
      });

      return reply.send({
        sucesso: true,
        mensagem: 'Devolução de material registrada e saldo físico estornado ao estoque!',
        dados: {
          produtoId,
          saldoFisico: Number(resultado.produto.saldoFisico),
          saldoReservado: Number(resultado.produto.saldoReservado),
          saldoDisponivel: Number(resultado.produto.saldoFisico) - Number(resultado.produto.saldoReservado),
          movimentoId: resultado.movimento.id,
        },
      });
    }
  );

  /**
   * PATCH /api/os/:id/concluir
   * Concluir Ordem de Serviço e avançar Atendimento para AGUARDANDO_INSPECAO (HU-014 / DOC-003)
   */
  app.patch(
    '/:id/concluir',
    { preHandler: [exigirPermissao(PermissaoAcesso.OS_CONCLUIR)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenant = request.tenant!;
      const { id } = request.params as { id: string };

      const os = await prisma.ordemServico.findFirst({
        where: { id, empresaId: tenant.empresaId },
        include: {
          atividades: true,
          atendimento: true,
        },
      });

      if (!os) {
        return reply.status(404).send({ sucesso: false, mensagem: 'Ordem de serviço não encontrada.' });
      }

      if (os.status === StatusOS.CONCLUIDA) {
        return reply.status(400).send({ sucesso: false, mensagem: 'Esta Ordem de Serviço já está concluída.' });
      }

      // Validar se todas as atividades foram concluídas
      const atividadesPendentes = os.atividades.filter(
        (a) => a.status !== StatusAtividade.CONCLUIDA && a.status !== StatusAtividade.CANCELADA
      );

      if (atividadesPendentes.length > 0) {
        return reply.status(400).send({
          sucesso: false,
          mensagem: `Não é possível concluir a OS. Há ${atividadesPendentes.length} atividade(s) ainda não concluída(s): ${atividadesPendentes.map((a) => a.descricao).join(', ')}.`,
        });
      }

      const agora = new Date();

      const resultado = await prisma.$transaction(async (tx) => {
        const osConcluida = await tx.ordemServico.update({
          where: { id },
          data: {
            status: StatusOS.CONCLUIDA,
            dataConclusao: agora,
          },
        });

        // Transiciona atendimento para AGUARDANDO_INSPECAO (Próxima etapa: Inspeção Final da ENT-005)
        await tx.atendimento.update({
          where: { id: os.atendimentoId },
          data: {
            status: StatusAtendimento.AGUARDANDO_INSPECAO,
          },
        });

        return osConcluida;
      });

      await AuditoriaService.registrar({
        empresaId: tenant.empresaId,
        usuarioId: tenant.usuarioId,
        operacao: TipoOperacaoAuditoria.TRANSICAO_ESTADO,
        entidade: 'OrdemServico',
        entidadeId: id,
        detalhes: {
          status: StatusOS.CONCLUIDA,
          atendimentoId: os.atendimentoId,
          proximoStatusAtendimento: StatusAtendimento.AGUARDANDO_INSPECAO,
        },
      });

      return reply.send({
        sucesso: true,
        mensagem: `Ordem de Serviço ${resultado.codigoFormatado} concluída com sucesso! O atendimento agora está 'Aguardando Inspeção'.`,
        dados: resultado,
      });
    }
  );

  /**
   * POST /api/os/:id/adicionar-servico
   * Adiciona um serviço (do catálogo ou avulso) ou peça diretamente na OS,
   * criando a atividade técnica correspondente e sincronizando o valor no orçamento do atendimento
   * para permitir faturamento direto e busca por serviço executado.
   */
  app.post('/:id/adicionar-servico', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = request.tenant!;
    const { id } = request.params as { id: string };
    const {
      tipo = 'SERVICO',
      descricao,
      quantidade = 1,
      valorUnitario = 0,
      tempoEstimadoMinutos = 30,
      criarAtividade = true,
    } = request.body as {
      tipo?: 'SERVICO' | 'PECA';
      descricao: string;
      quantidade?: number;
      valorUnitario?: number;
      tempoEstimadoMinutos?: number;
      criarAtividade?: boolean;
    };

    if (!descricao || !descricao.trim()) {
      return reply.status(400).send({ sucesso: false, mensagem: 'Informe a descrição do serviço ou item.' });
    }

    const os = await prisma.ordemServico.findFirst({
      where: { id, empresaId: tenant.empresaId },
      include: {
        atendimento: {
          include: {
            orcamento: {
              include: {
                versoes: {
                  orderBy: { numeroVersao: 'desc' },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    if (!os) {
      return reply.status(404).send({ sucesso: false, mensagem: 'Ordem de Serviço não encontrada.' });
    }

    const qtdNum = Number(quantidade) || 1;
    const valUnitNum = Number(valorUnitario) || 0;
    const subtotal = qtdNum * valUnitNum;

    const resultado = await prisma.$transaction(async (tx) => {
      // 1. Garantir que exista Orcamento e VersaoOrcamento no Atendimento para suportar faturamento imediato
      let orcamento = os.atendimento.orcamento;
      if (!orcamento) {
        orcamento = await tx.orcamento.create({
          data: {
            empresaId: tenant.empresaId,
            atendimentoId: os.atendimentoId,
          },
          include: { versoes: true },
        });
      }

      let versao = orcamento.versoes?.[0];
      if (!versao) {
        versao = await tx.versaoOrcamento.create({
          data: {
            empresaId: tenant.empresaId,
            orcamentoId: orcamento.id,
            numeroVersao: 1,
            status: 'APROVADA_TOTAL',
            validadeDias: 10,
            observacoesComerciais: `Gerado automaticamente via Ordem de Serviço ${os.codigoFormatado}`,
            valorTotalPecas: 0,
            valorTotalServicos: 0,
            valorDescontoGeral: 0,
            valorTotalFinal: 0,
          },
        });
      }

      // 2. Criar ItemOrcamento aprovado
      const itemOrc = await tx.itemOrcamento.create({
        data: {
          empresaId: tenant.empresaId,
          versaoOrcamentoId: versao.id,
          tipo,
          descricao: descricao.trim(),
          quantidade: qtdNum,
          unidadeMedida: tipo === 'SERVICO' ? 'SRV' : 'UN',
          valorUnitario: valUnitNum,
          valorDesconto: 0,
          valorTotal: subtotal,
          decisao: 'APROVADO',
        },
      });

      // 3. Atualizar totais da VersaoOrcamento
      const novoTotalPecas =
        Number(versao.valorTotalPecas) + (tipo === 'PECA' ? subtotal : 0);
      const novoTotalServicos =
        Number(versao.valorTotalServicos) + (tipo === 'SERVICO' ? subtotal : 0);
      const novoTotalFinal =
        novoTotalPecas + novoTotalServicos - Number(versao.valorDescontoGeral);

      await tx.versaoOrcamento.update({
        where: { id: versao.id },
        data: {
          valorTotalPecas: novoTotalPecas,
          valorTotalServicos: novoTotalServicos,
          valorTotalFinal: Math.max(0, novoTotalFinal),
          status: 'APROVADA_TOTAL',
        },
      });

      // 4. Se for SERVICO (ou criarAtividade=true), adicionar também como AtividadeOS para rastreabilidade e busca
      let atividadeCriada = null;
      if (tipo === 'SERVICO' || criarAtividade) {
        atividadeCriada = await tx.atividadeOS.create({
          data: {
            empresaId: tenant.empresaId,
            ordemServicoId: os.id,
            itemOrcamentoId: itemOrc.id,
            descricao: descricao.trim(),
            status: StatusAtividade.PENDENTE,
            mecanicoId: os.responsavelMecanicoId || tenant.usuarioId,
            tempoEstimadoMinutos: Number(tempoEstimadoMinutos) || 30,
          },
        });
      }

      return { itemOrc, atividadeCriada };
    });

    return reply.status(201).send({
      sucesso: true,
      mensagem: `${tipo === 'SERVICO' ? 'Serviço' : 'Peça'} adicionado(a) à OS com sucesso!`,
      dados: resultado,
    });
  });

  /**
   * DELETE /api/os/:id/atividades/:atividadeId
   * Remove uma atividade/serviço lançado por engano na OS e recalcula o orçamento vinculado.
   */
  app.delete('/:id/atividades/:atividadeId', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = request.tenant!;
    const { id, atividadeId } = request.params as { id: string; atividadeId: string };

    const atividade = await prisma.atividadeOS.findFirst({
      where: { id: atividadeId, ordemServicoId: id, empresaId: tenant.empresaId },
    });

    if (!atividade) {
      return reply.status(404).send({ sucesso: false, mensagem: 'Atividade não encontrada nesta OS.' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.atividadeOS.delete({ where: { id: atividade.id } });

      if (atividade.itemOrcamentoId) {
        const itemOrc = await tx.itemOrcamento.findFirst({
          where: { id: atividade.itemOrcamentoId, empresaId: tenant.empresaId },
        });
        if (itemOrc) {
          await tx.itemOrcamento.delete({ where: { id: itemOrc.id } });

          const itensRestantes = await tx.itemOrcamento.findMany({
            where: { versaoOrcamentoId: itemOrc.versaoOrcamentoId, empresaId: tenant.empresaId },
          });
          let pecas = 0;
          let servicos = 0;
          for (const it of itensRestantes) {
            if (it.tipo === 'PECA') pecas += Number(it.valorTotal);
            else servicos += Number(it.valorTotal);
          }
          await tx.versaoOrcamento.update({
            where: { id: itemOrc.versaoOrcamentoId },
            data: {
              valorTotalPecas: pecas,
              valorTotalServicos: servicos,
              valorTotalFinal: pecas + servicos,
            },
          });
        }
      }
    });

    return reply.send({
      sucesso: true,
      mensagem: 'Atividade/serviço removido da Ordem de Serviço com sucesso!',
    });
  });

  /**
   * GET /api/os/catalogo-servicos
   * Retorna o Catálogo Padronizado de Serviços da oficina persistido no PostgreSQL.
   * Na primeira consulta da oficina, popula automaticamente o catálogo inicial com 12 serviços.
   */
  app.get('/catalogo-servicos', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = request.tenant!;

    let servicos = await prisma.servicoCatalogo.findMany({
      where: { empresaId: tenant.empresaId, ativo: true },
      orderBy: [{ categoria: 'asc' }, { nome: 'asc' }],
    });

    if (servicos.length === 0) {
      const servicosIniciais = [
        {
          codigo: 'SRV-SOL-001',
          nome: 'Solda em Ferramenta Agrícola / Jardinagem (Rastelo, Enxada, Foice, Pá)',
          categoria: 'SOLDA_SERRALHERIA',
          valorSugerido: 45.0,
          tempoEstimadoMinutos: 30,
          descricaoPadrao: 'Limpeza do ponto de trinca, alinhamento, cordão de solda reforçado e acabamento com esmerilhadeira.',
        },
        {
          codigo: 'SRV-SOL-002',
          nome: 'Solda Estrutural MIG / Eletrodo em Peça Metálica ou Suporte',
          categoria: 'SOLDA_SERRALHERIA',
          valorSugerido: 85.0,
          tempoEstimadoMinutos: 45,
          descricaoPadrao: 'Solda estrutural de alta penetração com reforço metálico e acabamento.',
        },
        {
          codigo: 'SRV-SOL-003',
          nome: 'Solda em Escapamento / Silencioso / Catalisador',
          categoria: 'SOLDA_SERRALHERIA',
          valorSugerido: 90.0,
          tempoEstimadoMinutos: 45,
          descricaoPadrao: 'Remoção de vazamento, solda em tubulação de exaustão e verificação de coxins.',
        },
        {
          codigo: 'SRV-BAN-001',
          nome: 'Afiação, Desempeno e Ajuste de Ferramenta de Corte (Foice, Facão, Machado, Lâmina)',
          categoria: 'FERRAMENTAS_BANCADA',
          valorSugerido: 35.0,
          tempoEstimadoMinutos: 25,
          descricaoPadrao: 'Desbaste técnico, afiação de fio de corte e balanceamento de bancada.',
        },
        {
          codigo: 'SRV-BAN-002',
          nome: 'Substituição / Encabamento e Fixação de Cabo de Ferramenta',
          categoria: 'FERRAMENTAS_BANCADA',
          valorSugerido: 30.0,
          tempoEstimadoMinutos: 20,
          descricaoPadrao: 'Ajuste de olhal, encabamento firme com cunha de trava e acabamento.',
        },
        {
          codigo: 'SRV-BAN-003',
          nome: 'Reforma / Solda de Carrinho de Mão, Betoneira ou Implemento de Trabalho',
          categoria: 'FERRAMENTAS_BANCADA',
          valorSugerido: 120.0,
          tempoEstimadoMinutos: 60,
          descricaoPadrao: 'Recuperação estrutural de caçamba/chassi, eixo e pontos de apoio com solda reforçada.',
        },
        {
          codigo: 'SRV-MEC-001',
          nome: 'Troca de Óleo do Motor e Filtro Lubrificante',
          categoria: 'MECANICA_GERAL',
          valorSugerido: 70.0,
          tempoEstimadoMinutos: 30,
          descricaoPadrao: 'Drenagem do óleo usado, substituição do filtro e abastecimento no nível especificado.',
        },
        {
          codigo: 'SRV-MEC-002',
          nome: 'Revisão Preventiva Completa (Motor, Filtros, Correias e Fluidos)',
          categoria: 'MECANICA_GERAL',
          valorSugerido: 250.0,
          tempoEstimadoMinutos: 120,
          descricaoPadrao: 'Inspeção de 30 itens, verificação de correias, velas, filtros e vazamentos.',
        },
        {
          codigo: 'SRV-MEC-003',
          nome: 'Limpeza de Bicos Injetores e Corpo de Borboleta (TBI)',
          categoria: 'MECANICA_GERAL',
          valorSugerido: 160.0,
          tempoEstimadoMinutos: 90,
          descricaoPadrao: 'Teste de vazão/equalização em ultrassom, troca de reparos e limpeza de TBI.',
        },
        {
          codigo: 'SRV-FRE-001',
          nome: 'Substituição de Pastilhas e Discos de Freio Dianteiro',
          categoria: 'FREIOS_SUSPENSAO',
          valorSugerido: 140.0,
          tempoEstimadoMinutos: 60,
          descricaoPadrao: 'Desmontagem das pinças, limpeza de guias, troca de pastilhas/discos e teste de frenagem.',
        },
        {
          codigo: 'SRV-FRE-002',
          nome: 'Troca de Amortecedores e Kit Batente / Coxim',
          categoria: 'FREIOS_SUSPENSAO',
          valorSugerido: 220.0,
          tempoEstimadoMinutos: 120,
          descricaoPadrao: 'Substituição do par de amortecedores com encolhedor de molas e verificação de folgas.',
        },
        {
          codigo: 'SRV-ELE-001',
          nome: 'Diagnóstico Computadorizado com Scanner OBD-II',
          categoria: 'ELETRICA_DIAGNOSTICO',
          valorSugerido: 100.0,
          tempoEstimadoMinutos: 40,
          descricaoPadrao: 'Leitura de códigos de falha DTC, análise de parâmetros em tempo real e reset.',
        },
      ];

      for (const s of servicosIniciais) {
        await prisma.servicoCatalogo.upsert({
          where: {
            empresaId_codigo: {
              empresaId: tenant.empresaId,
              codigo: s.codigo,
            },
          },
          update: {},
          create: {
            empresaId: tenant.empresaId,
            codigo: s.codigo,
            nome: s.nome,
            categoria: s.categoria,
            valorSugerido: s.valorSugerido,
            tempoEstimadoMinutos: s.tempoEstimadoMinutos,
            descricaoPadrao: s.descricaoPadrao,
            ativo: true,
          },
        });
      }

      servicos = await prisma.servicoCatalogo.findMany({
        where: { empresaId: tenant.empresaId, ativo: true },
        orderBy: [{ categoria: 'asc' }, { nome: 'asc' }],
      });
    }

    return reply.send({
      sucesso: true,
      dados: servicos.map((s) => ({
        id: s.id,
        codigo: s.codigo,
        nome: s.nome,
        categoria: s.categoria,
        valorSugerido: Number(s.valorSugerido),
        tempoEstimadoMinutos: s.tempoEstimadoMinutos,
        descricaoPadrao: s.descricaoPadrao,
      })),
    });
  });

  /**
   * POST /api/os/catalogo-servicos
   * Cadastra ou atualiza um serviço padronizado no catálogo da oficina no PostgreSQL.
   */
  app.post('/catalogo-servicos', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = request.tenant!;
    const body = request.body as {
      id?: string;
      codigo?: string;
      nome: string;
      categoria: string;
      valorSugerido: number;
      tempoEstimadoMinutos: number;
      descricaoPadrao?: string;
    };

    if (!body.nome || !body.nome.trim()) {
      return reply.status(400).send({ sucesso: false, mensagem: 'Informe o nome do serviço.' });
    }

    const codigoFormatado =
      body.codigo && body.codigo.trim()
        ? body.codigo.trim().toUpperCase()
        : `SRV-${Date.now().toString().slice(-5)}`;

    const servico = await prisma.servicoCatalogo.upsert({
      where: {
        empresaId_codigo: {
          empresaId: tenant.empresaId,
          codigo: codigoFormatado,
        },
      },
      update: {
        nome: body.nome.trim(),
        categoria: body.categoria || 'MECANICA_GERAL',
        valorSugerido: Number(body.valorSugerido) || 0,
        tempoEstimadoMinutos: Number(body.tempoEstimadoMinutos) || 30,
        descricaoPadrao: body.descricaoPadrao?.trim() || null,
        ativo: true,
      },
      create: {
        empresaId: tenant.empresaId,
        codigo: codigoFormatado,
        nome: body.nome.trim(),
        categoria: body.categoria || 'MECANICA_GERAL',
        valorSugerido: Number(body.valorSugerido) || 0,
        tempoEstimadoMinutos: Number(body.tempoEstimadoMinutos) || 30,
        descricaoPadrao: body.descricaoPadrao?.trim() || null,
        ativo: true,
      },
    });

    return reply.status(201).send({
      sucesso: true,
      mensagem: 'Serviço salvo no catálogo da oficina!',
      dados: {
        id: servico.id,
        codigo: servico.codigo,
        nome: servico.nome,
        categoria: servico.categoria,
        valorSugerido: Number(servico.valorSugerido),
        tempoEstimadoMinutos: servico.tempoEstimadoMinutos,
        descricaoPadrao: servico.descricaoPadrao,
      },
    });
  });

  /**
   * DELETE /api/os/catalogo-servicos/:servicoId
   * Remove/desativa um serviço do catálogo da oficina.
   */
  app.delete('/catalogo-servicos/:servicoId', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = request.tenant!;
    const { servicoId } = request.params as { servicoId: string };

    await prisma.servicoCatalogo.deleteMany({
      where: { id: servicoId, empresaId: tenant.empresaId },
    });

    return reply.send({
      sucesso: true,
      mensagem: 'Serviço removido do catálogo.',
    });
  });

  /**
   * POST /api/os/:id/fotos
   * Salva foto de Antes / Durante / Depois da Ordem de Serviço no PostgreSQL
   * (sincronizando entre celular do mecânico e computadores da oficina).
   */
  app.post('/:id/fotos', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = request.tenant!;
    const { id } = request.params as { id: string };
    const { etapa = 'ANTES', legenda, url } = request.body as {
      etapa?: 'ANTES' | 'DURANTE' | 'DEPOIS';
      legenda?: string;
      url: string;
    };

    if (!url) {
      return reply.status(400).send({ sucesso: false, mensagem: 'Imagem inválida ou vazia.' });
    }

    const os = await prisma.ordemServico.findFirst({
      where: { id, empresaId: tenant.empresaId },
    });

    if (!os) {
      return reply.status(404).send({ sucesso: false, mensagem: 'Ordem de Serviço não encontrada.' });
    }

    const foto = await prisma.fotoOS.create({
      data: {
        empresaId: tenant.empresaId,
        ordemServicoId: os.id,
        etapa,
        legenda: legenda?.trim() || `Registro fotográfico (${etapa})`,
        url,
      },
    });

    return reply.status(201).send({
      sucesso: true,
      mensagem: `Foto da etapa ${etapa} salva na Ordem de Serviço!`,
      dados: {
        id: foto.id,
        etapa: foto.etapa,
        legenda: foto.legenda,
        url: foto.url,
        dataHora: foto.criadoEm,
      },
    });
  });

  /**
   * DELETE /api/os/:id/fotos/:fotoId
   * Remove foto de Antes / Durante / Depois da Ordem de Serviço.
   */
  app.delete('/:id/fotos/:fotoId', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = request.tenant!;
    const { id, fotoId } = request.params as { id: string; fotoId: string };

    await prisma.fotoOS.deleteMany({
      where: {
        id: fotoId,
        ordemServicoId: id,
        empresaId: tenant.empresaId,
      },
    });

    return reply.send({
      sucesso: true,
      mensagem: 'Foto removida da Ordem de Serviço.',
    });
  });
}
