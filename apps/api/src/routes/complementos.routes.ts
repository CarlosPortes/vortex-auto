import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../prisma.js';
import {
  RegistrarGarantiaSchema,
  CriarServicoTerceiroSchema,
  AtualizarServicoTerceiroSchema,
  PermissaoAcesso,
  StatusAtendimento,
  TipoOperacaoAuditoria,
} from '@vortex/shared';
import { tenantMiddleware, exigirPermissao } from '../middlewares/tenant.middleware.js';
import { AuditoriaService } from '../services/auditoria.service.js';

export async function complementosRoutes(app: FastifyInstance) {
  app.addHook('onRequest', async (req) => req.jwtVerify());
  app.addHook('onRequest', tenantMiddleware);

  // =============================================================
  // HU-023: GESTÃO DE GARANTIAS E RETORNO (DOC-004 e Seção 14)
  // =============================================================

  /**
   * POST /api/atendimentos/:id/garantia
   * Registrar avaliação e decisão de garantia de um atendimento entregue (GAR-C01)
   */
  app.post(
    '/atendimentos/:id/garantia',
    { preHandler: [exigirPermissao(PermissaoAcesso.ATENDIMENTO_ABRIR)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenant = request.tenant!;
      const { id } = request.params as { id: string };

      const parseResult = RegistrarGarantiaSchema.safeParse({
        ...(request.body as any),
        atendimentoOrigemId: id,
      });

      if (!parseResult.success) {
        return reply.status(400).send({
          sucesso: false,
          mensagem: 'Dados inválidos para registro de garantia',
          erros: parseResult.error.errors.map((e) => ({ campo: e.path.join('.'), mensagem: e.message })),
        });
      }

      const { reclamacaoCliente, parecerTecnico, decisao, justificativaDecisao, itensCobertos } = parseResult.data;

      // Buscar atendimento de origem
      const atendimentoOrigem = await prisma.atendimento.findFirst({
        where: { id, empresaId: tenant.empresaId },
        include: {
          cliente: true,
          veiculo: true,
          medicao: true,
        },
      });

      if (!atendimentoOrigem) {
        return reply.status(404).send({ sucesso: false, mensagem: 'Atendimento de origem não encontrado.' });
      }

      const resultado = await prisma.$transaction(async (tx) => {
        // Obter sequencial da garantia
        const ultimaGarantia = await tx.garantiaAtendimento.findFirst({
          where: { empresaId: tenant.empresaId },
          orderBy: { numeroSequencial: 'desc' },
          select: { numeroSequencial: true },
        });

        const proxSeqGarantia = (ultimaGarantia?.numeroSequencial || 0) + 1;
        const anoAtual = new Date().getFullYear();
        const codigoFormatadoGarantia = `GAR-${anoAtual}-${String(proxSeqGarantia).padStart(4, '0')}`;

        let novoAtendimentoId: string | null = null;
        let novoAtendimentoFormatado: string | null = null;

        // Se a garantia for COBERTA (total ou parcial), abrir novo Atendimento em garantia
        if (decisao === 'COBERTA_TOTAL' || decisao === 'COBERTA_PARCIAL') {
          const ultimoAtend = await tx.atendimento.findFirst({
            where: { empresaId: tenant.empresaId },
            orderBy: { numeroSequencial: 'desc' },
            select: { numeroSequencial: true },
          });

          const proxSeqAtend = (ultimoAtend?.numeroSequencial || 0) + 1;
          novoAtendimentoFormatado = `AT-${anoAtual}-${String(proxSeqAtend).padStart(4, '0')}`;

          const novoAtendimento = await tx.atendimento.create({
            data: {
              empresaId: tenant.empresaId,
              unidadeId: tenant.unidadeId,
              numeroSequencial: proxSeqAtend,
              codigoFormatado: novoAtendimentoFormatado,
              clienteId: atendimentoOrigem.clienteId,
              veiculoId: atendimentoOrigem.veiculoId,
              usuarioAberturaId: tenant.usuarioId,
              status: StatusAtendimento.CONFIRMADO,
              queixaPrincipal: `[RETORNO EM GARANTIA ref. ${atendimentoOrigem.codigoFormatado}] ${reclamacaoCliente}`,
            },
          });

          novoAtendimentoId = novoAtendimento.id;

          // Registrar medição espelhada do veículo
          await tx.medicaoVeiculo.create({
            data: {
              empresaId: tenant.empresaId,
              atendimentoId: novoAtendimento.id,
              quilometragem: atendimentoOrigem.medicao?.quilometragem || 0,
              nivelCombustivel: atendimentoOrigem.medicao?.nivelCombustivel || 'MEIO',
              pertencesDeixados: 'Retorno para reparo sob garantia',
              temEstepe: atendimentoOrigem.medicao?.temEstepe ?? true,
              temMacaco: atendimentoOrigem.medicao?.temMacaco ?? true,
              temChaveRoda: atendimentoOrigem.medicao?.temChaveRoda ?? true,
              temManualChaveReserva: atendimentoOrigem.medicao?.temManualChaveReserva ?? false,
            },
          });
        }

        // Criar registro formal da garantia
        const garantia = await tx.garantiaAtendimento.create({
          data: {
            empresaId: tenant.empresaId,
            atendimentoOrigemId: atendimentoOrigem.id,
            atendimentoGarantiaId: novoAtendimentoId,
            codigoFormatado: codigoFormatadoGarantia,
            numeroSequencial: proxSeqGarantia,
            reclamacaoCliente,
            parecerTecnico,
            decisao,
            justificativaDecisao,
            itensCobertos,
            usuarioDecisaoId: tenant.usuarioId,
          },
          include: {
            usuarioDecisao: { select: { id: true, nome: true } },
          },
        });

        return {
          garantia,
          novoAtendimentoId,
          novoAtendimentoFormatado,
        };
      });

      await AuditoriaService.registrar({
        empresaId: tenant.empresaId,
        usuarioId: tenant.usuarioId,
        operacao: TipoOperacaoAuditoria.CRIACAO,
        entidade: 'GarantiaAtendimento',
        entidadeId: resultado.garantia.id,
        detalhes: {
          codigoGarantia: resultado.garantia.codigoFormatado,
          atendimentoOrigem: atendimentoOrigem.codigoFormatado,
          decisao,
          novoAtendimento: resultado.novoAtendimentoFormatado,
        },
      });

      return reply.status(201).send({
        sucesso: true,
        mensagem:
          decisao === 'RECUSADA'
            ? `Registro de garantia ${resultado.garantia.codigoFormatado} formalizado com status RECUSADA.`
            : `Garantia ${resultado.garantia.codigoFormatado} aprovada com sucesso! Novo atendimento ${resultado.novoAtendimentoFormatado} gerado para execução.`,
        dados: resultado,
      });
    }
  );

  /**
   * GET /api/garantias
   * Listar todas as garantias da oficina (HU-023)
   */
  app.get('/garantias', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = request.tenant!;

    const garantias = await prisma.garantiaAtendimento.findMany({
      where: { empresaId: tenant.empresaId },
      include: {
        usuarioDecisao: { select: { id: true, nome: true, email: true } },
        atendimentoOrigem: {
          select: {
            id: true,
            codigoFormatado: true,
            dataEntrada: true,
            cliente: { select: { id: true, nomeRazao: true, telefone: true } },
            veiculo: { select: { id: true, placa: true, modelo: true, marca: true } },
          },
        },
        atendimentoGarantia: {
          select: {
            id: true,
            codigoFormatado: true,
            status: true,
            ordemServico: { select: { id: true, codigoFormatado: true, status: true } },
          },
        },
      },
      orderBy: { criadoEm: 'desc' },
    });

    return reply.send({
      sucesso: true,
      dados: garantias,
    });
  });

  // =============================================================
  // HU-025: SERVIÇOS DE TERCEIROS E RETÍFICAS EXTERNAS
  // =============================================================

  /**
   * POST /api/atendimentos/:id/servicos-terceiros
   * Cadastrar envio de peça/componente para serviço de terceiro (HU-025)
   */
  app.post(
    '/atendimentos/:id/servicos-terceiros',
    { preHandler: [exigirPermissao(PermissaoAcesso.OS_EXECUTAR)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenant = request.tenant!;
      const { id } = request.params as { id: string };

      const parseResult = CriarServicoTerceiroSchema.safeParse({
        ...(request.body as any),
        atendimentoId: id,
      });

      if (!parseResult.success) {
        return reply.status(400).send({
          sucesso: false,
          mensagem: 'Dados inválidos para serviço de terceiro',
          erros: parseResult.error.errors.map((e) => ({ campo: e.path.join('.'), mensagem: e.message })),
        });
      }

      const {
        fornecedorNome,
        descricaoServico,
        valorCusto,
        valorCobradoCliente,
        dataRetornoPrevista,
        observacoes,
      } = parseResult.data;

      const atendimento = await prisma.atendimento.findFirst({
        where: { id, empresaId: tenant.empresaId },
      });

      if (!atendimento) {
        return reply.status(404).send({ sucesso: false, mensagem: 'Atendimento não encontrado.' });
      }

      const servicoTerceiro = await prisma.servicoTerceiro.create({
        data: {
          empresaId: tenant.empresaId,
          atendimentoId: id,
          fornecedorNome,
          descricaoServico,
          valorCusto,
          valorCobradoCliente,
          status: 'ENVIADO',
          dataRetornoPrevista: dataRetornoPrevista ? new Date(dataRetornoPrevista) : null,
          observacoes,
        },
      });

      await AuditoriaService.registrar({
        empresaId: tenant.empresaId,
        usuarioId: tenant.usuarioId,
        operacao: TipoOperacaoAuditoria.CRIACAO,
        entidade: 'ServicoTerceiro',
        entidadeId: servicoTerceiro.id,
        detalhes: {
          atendimento: atendimento.codigoFormatado,
          fornecedor: fornecedorNome,
          descricao: descricaoServico,
          valorCusto,
          valorCobradoCliente,
        },
      });

      return reply.status(201).send({
        sucesso: true,
        mensagem: 'Serviço de terceiro registrado com sucesso!',
        dados: servicoTerceiro,
      });
    }
  );

  /**
   * GET /api/servicos-terceiros
   * Listar todos os serviços de terceiros da oficina (HU-025)
   */
  app.get('/servicos-terceiros', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = request.tenant!;
    const { status } = request.query as { status?: string };

    const where: any = { empresaId: tenant.empresaId };
    if (status) {
      where.status = status;
    }

    const servicos = await prisma.servicoTerceiro.findMany({
      where,
      include: {
        atendimento: {
          select: {
            id: true,
            codigoFormatado: true,
            cliente: { select: { id: true, nomeRazao: true } },
            veiculo: { select: { id: true, placa: true, modelo: true } },
          },
        },
      },
      orderBy: { dataEnvio: 'desc' },
    });

    return reply.send({
      sucesso: true,
      dados: servicos,
    });
  });

  /**
   * PATCH /api/servicos-terceiros/:id/receber
   * Registrar retorno/recebimento de serviço de terceiro (HU-025)
   */
  app.patch(
    '/servicos-terceiros/:id/receber',
    { preHandler: [exigirPermissao(PermissaoAcesso.OS_EXECUTAR)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenant = request.tenant!;
      const { id } = request.params as { id: string };
      const { observacoesRetorno } = request.body as { observacoesRetorno?: string };

      const servico = await prisma.servicoTerceiro.findFirst({
        where: { id, empresaId: tenant.empresaId },
        include: { atendimento: true },
      });

      if (!servico) {
        return reply.status(404).send({ sucesso: false, mensagem: 'Serviço de terceiro não encontrado.' });
      }

      const atualizado = await prisma.servicoTerceiro.update({
        where: { id },
        data: {
          status: 'RECEBIDO',
          dataRecebimento: new Date(),
          observacoesRetorno: observacoesRetorno || servico.observacoesRetorno,
        },
      });

      await AuditoriaService.registrar({
        empresaId: tenant.empresaId,
        usuarioId: tenant.usuarioId,
        operacao: TipoOperacaoAuditoria.TRANSICAO_ESTADO,
        entidade: 'ServicoTerceiro',
        entidadeId: id,
        detalhes: {
          atendimento: servico.atendimento.codigoFormatado,
          fornecedor: servico.fornecedorNome,
          status: 'RECEBIDO',
        },
      });

      return reply.send({
        sucesso: true,
        mensagem: `Serviço de terceiro (${servico.descricaoServico}) recebido e conferido com sucesso!`,
        dados: atualizado,
      });
    }
  );

  /**
   * PATCH /api/servicos-terceiros/:id/status
   * Atualizar status geral do serviço de terceiros (EM_EXECUCAO, CANCELADO)
   */
  app.patch(
    '/servicos-terceiros/:id/status',
    { preHandler: [exigirPermissao(PermissaoAcesso.OS_EXECUTAR)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenant = request.tenant!;
      const { id } = request.params as { id: string };
      const parseResult = AtualizarServicoTerceiroSchema.safeParse(request.body);

      if (!parseResult.success) {
        return reply.status(400).send({
          sucesso: false,
          mensagem: 'Dados inválidos para alteração de status',
          erros: parseResult.error.errors.map((e) => ({ campo: e.path.join('.'), mensagem: e.message })),
        });
      }

      const { status, observacoesRetorno } = parseResult.data;

      const servico = await prisma.servicoTerceiro.findFirst({
        where: { id, empresaId: tenant.empresaId },
      });

      if (!servico) {
        return reply.status(404).send({ sucesso: false, mensagem: 'Serviço de terceiro não encontrado.' });
      }

      const atualizado = await prisma.servicoTerceiro.update({
        where: { id },
        data: {
          status,
          observacoesRetorno: observacoesRetorno || servico.observacoesRetorno,
          ...(status === 'RECEBIDO' ? { dataRecebimento: new Date() } : {}),
        },
      });

      return reply.send({
        sucesso: true,
        mensagem: `Status do serviço de terceiro atualizado para ${status}`,
        dados: atualizado,
      });
    }
  );

  // =============================================================
  // HU-026 e HU-027: RELATÓRIOS GERENCIAIS E INDICADORES EXECUTIVOS
  // =============================================================

  /**
   * GET /api/relatorios/resumo
   * Painel de Indicadores Executivos Consolidados (DOC-004 e DOC-016)
   */
  app.get(
    '/relatorios/resumo',
    { preHandler: [exigirPermissao(PermissaoAcesso.RELATORIOS_VISUALIZAR)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenant = request.tenant!;

      // 1. Contagem de atendimentos por status
      const atendimentosPorStatus = await prisma.atendimento.groupBy({
        by: ['status'],
        where: { empresaId: tenant.empresaId },
        _count: { id: true },
      });

      const totalAtendimentos = atendimentosPorStatus.reduce((acc, curr) => acc + curr._count.id, 0);
      const atendimentosEntregues =
        atendimentosPorStatus.find((a) => a.status === StatusAtendimento.ENTREGUE)?._count.id || 0;

      // 2. Faturamento Realizado (Recebimentos)
      const recebimentos = await prisma.recebimento.aggregate({
        where: { empresaId: tenant.empresaId },
        _sum: { valor: true },
        _count: { id: true },
      });

      const faturamentoTotalRealizado = Number(recebimentos._sum.valor || 0);

      // 3. Faturamento Pendente / Em Aberto (Parcelas não quitadas)
      const parcelasPendentes = await prisma.parcelaCobranca.aggregate({
        where: {
          empresaId: tenant.empresaId,
          status: { in: ['PENDENTE', 'PARCIALMENTE_PAGA'] },
        },
        _sum: { saldoDevedor: true },
        _count: { id: true },
      });

      const totalSaldoPendente = Number(parcelasPendentes._sum.saldoDevedor || 0);

      // 4. Ticket Médio
      const ticketMedio = atendimentosEntregues > 0 ? faturamentoTotalRealizado / atendimentosEntregues : 0;

      // 5. Ordens de Serviço (Produtividade)
      const ordensServico = await prisma.ordemServico.groupBy({
        by: ['status'],
        where: { empresaId: tenant.empresaId },
        _count: { id: true },
      });

      const totalOS = ordensServico.reduce((acc, curr) => acc + curr._count.id, 0);
      const osConcluidas = ordensServico.find((o) => o.status === 'CONCLUIDA')?._count.id || 0;
      const osEmAndamento = ordensServico.find((o) => o.status === 'EM_ANDAMENTO')?._count.id || 0;
      const taxaConclusaoOS = totalOS > 0 ? Math.round((osConcluidas / totalOS) * 100) : 0;

      // 6. Serviços de Terceiros e Margem
      const servicosTerceiros = await prisma.servicoTerceiro.findMany({
        where: { empresaId: tenant.empresaId },
        select: { valorCusto: true, valorCobradoCliente: true, status: true },
      });

      const totalCustoTerceiros = servicosTerceiros.reduce((acc, s) => acc + Number(s.valorCusto), 0);
      const totalCobradoTerceiros = servicosTerceiros.reduce((acc, s) => acc + Number(s.valorCobradoCliente), 0);
      const margemTerceiros = totalCobradoTerceiros - totalCustoTerceiros;

      // 7. Estoque e Peças
      const produtos = await prisma.produto.findMany({
        where: { empresaId: tenant.empresaId, ativo: true },
        select: {
          id: true,
          saldoFisico: true,
          saldoReservado: true,
          estoqueMinimo: true,
          precoCusto: true,
          precoVenda: true,
        },
      });

      const totalProdutos = produtos.length;
      const produtosCriticos = produtos.filter((p) => Number(p.saldoFisico) <= Number(p.estoqueMinimo)).length;
      const valorTotalEstoqueCusto = produtos.reduce(
        (acc, p) => acc + Number(p.saldoFisico) * Number(p.precoCusto),
        0
      );
      const valorTotalEstoqueVenda = produtos.reduce(
        (acc, p) => acc + Number(p.saldoFisico) * Number(p.precoVenda),
        0
      );

      // 8. Garantias
      const garantias = await prisma.garantiaAtendimento.groupBy({
        by: ['decisao'],
        where: { empresaId: tenant.empresaId },
        _count: { id: true },
      });

      const totalGarantias = garantias.reduce((acc, g) => acc + g._count.id, 0);
      const garantiasCobertas = garantias
        .filter((g) => g.decisao === 'COBERTA_TOTAL' || g.decisao === 'COBERTA_PARCIAL')
        .reduce((acc, g) => acc + g._count.id, 0);
      const garantiasRecusadas = garantias.find((g) => g.decisao === 'RECUSADA')?._count.id || 0;

      return reply.send({
        sucesso: true,
        dados: {
          financeiro: {
            faturamentoTotalRealizado,
            totalSaldoPendente,
            ticketMedio,
            totalRecebimentos: recebimentos._count.id,
          },
          atendimentos: {
            total: totalAtendimentos,
            entregues: atendimentosEntregues,
            porStatus: atendimentosPorStatus.map((s) => ({ status: s.status, total: s._count.id })),
          },
          ordensServico: {
            total: totalOS,
            concluidas: osConcluidas,
            emAndamento: osEmAndamento,
            taxaConclusaoPercent: taxaConclusaoOS,
          },
          servicosTerceiros: {
            total: servicosTerceiros.length,
            totalCusto: totalCustoTerceiros,
            totalCobrado: totalCobradoTerceiros,
            margemBruta: margemTerceiros,
          },
          estoque: {
            totalItensCadastrados: totalProdutos,
            itensEstoqueCritico: produtosCriticos,
            valorTotalEstoqueCusto,
            valorTotalEstoqueVenda,
          },
          garantias: {
            total: totalGarantias,
            cobertas: garantiasCobertas,
            recusadas: garantiasRecusadas,
          },
        },
      });
    }
  );

  /**
   * GET /api/relatorios/exportar-csv
   * Exportação tabular de fechamento em CSV para análise de planilha (HU-027)
   */
  app.get(
    '/relatorios/exportar-csv',
    { preHandler: [exigirPermissao(PermissaoAcesso.RELATORIOS_VISUALIZAR)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenant = request.tenant!;

      const atendimentos = await prisma.atendimento.findMany({
        where: { empresaId: tenant.empresaId },
        include: {
          cliente: true,
          veiculo: true,
          cobranca: { include: { parcelas: true } },
          ordemServico: true,
          entrega: true,
        },
        orderBy: { dataEntrada: 'desc' },
      });

      const linhas: string[] = [];
      linhas.push(
        'Codigo Atendimento;Data Entrada;Cliente;CPF/CNPJ;Telefone;Veiculo;Placa;Status;Codigo OS;Status OS;Valor Cobranca;Valor Pago;Saldo Devedor;Data Entrega'
      );

      for (const at of atendimentos) {
        const valorCobranca = at.cobranca ? Number(at.cobranca.valorTotalFinal).toFixed(2) : '0.00';
        const valorPago = at.cobranca
          ? at.cobranca.parcelas
              .reduce((acc, p) => acc + (Number(p.valorParcela) - Number(p.saldoDevedor)), 0)
              .toFixed(2)
          : '0.00';
        const saldoDevedor = at.cobranca
          ? at.cobranca.parcelas.reduce((acc, p) => acc + Number(p.saldoDevedor), 0).toFixed(2)
          : '0.00';

        const dataEntregaStr = at.entrega ? at.entrega.dataHoraEntrega.toISOString().split('T')[0] : '';
        const dataEntradaStr = at.dataEntrada.toISOString().split('T')[0];

        const linha = [
          at.codigoFormatado,
          dataEntradaStr,
          `"${at.cliente.nomeRazao.replace(/"/g, '""')}"`,
          at.cliente.cpfCnpj,
          at.cliente.telefone,
          `"${at.veiculo.marca} ${at.veiculo.modelo}"`,
          at.veiculo.placa,
          at.status,
          at.ordemServico?.codigoFormatado || '',
          at.ordemServico?.status || '',
          valorCobranca,
          valorPago,
          saldoDevedor,
          dataEntregaStr,
        ].join(';');

        linhas.push(linha);
      }

      const csvContent = linhas.join('\r\n');

      reply.header('Content-Type', 'text/csv; charset=utf-8');
      reply.header('Content-Disposition', 'attachment; filename="relatorio-vortex-fechamento.csv"');
      return reply.send(csvContent);
    }
  );
}
