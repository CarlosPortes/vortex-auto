import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../prisma.js';
import {
  AbrirAtendimentoSchema,
  PermissaoAcesso,
  StatusAtendimento,
  TipoOperacaoAuditoria,
} from '@vortex/shared';
import { tenantMiddleware, exigirPermissao } from '../middlewares/tenant.middleware.js';
import { AuditoriaService } from '../services/auditoria.service.js';

export async function atendimentosRoutes(app: FastifyInstance) {
  app.addHook('onRequest', async (req) => req.jwtVerify());
  app.addHook('onRequest', tenantMiddleware);

  /**
   * GET /api/atendimentos
   * Listagem de atendimentos da oficina ativa (HU-008)
   */
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = request.tenant!;
    const { status, busca } = request.query as { status?: string; busca?: string };

    const where: any = {
      empresaId: tenant.empresaId,
    };

    if (status && status !== 'TODOS') {
      where.status = status;
    }

    if (busca && busca.trim()) {
      const termo = busca.trim();
      where.OR = [
        { codigoFormatado: { contains: termo, mode: 'insensitive' } },
        { queixaPrincipal: { contains: termo, mode: 'insensitive' } },
        { cliente: { nomeRazao: { contains: termo, mode: 'insensitive' } } },
        { veiculo: { placa: { contains: termo.toUpperCase() } } },
        { veiculo: { modelo: { contains: termo, mode: 'insensitive' } } },
      ];
    }

    const atendimentos = await prisma.atendimento.findMany({
      where,
      include: {
        cliente: true,
        veiculo: { include: { categoria: true } },
        usuarioAbertura: { select: { id: true, nome: true } },
        medicao: true,
      },
      orderBy: { dataEntrada: 'desc' },
      take: 50,
    });

    return reply.send({
      sucesso: true,
      dados: atendimentos,
    });
  });

  /**
   * POST /api/atendimentos
   * Abertura e confirmação de Atendimento na Recepção (HU-008 e HU-009)
   */
  app.post(
    '/',
    { preHandler: [exigirPermissao(PermissaoAcesso.ATENDIMENTO_ABRIR)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenant = request.tenant!;
      const parseResult = AbrirAtendimentoSchema.safeParse(request.body);

      if (!parseResult.success) {
        return reply.status(400).send({
          sucesso: false,
          mensagem: 'Dados inválidos para abertura do atendimento',
          erros: parseResult.error.errors.map((e) => ({ campo: e.path.join('.'), mensagem: e.message })),
        });
      }

      const data = parseResult.data;

      // Validar pertença do cliente e veículo à mesma empresa
      const cliente = await prisma.cliente.findFirst({
        where: { id: data.clienteId, empresaId: tenant.empresaId },
      });

      if (!cliente) {
        return reply.status(400).send({
          sucesso: false,
          mensagem: 'Cliente não encontrado nesta oficina.',
        });
      }

      const veiculo = await prisma.veiculo.findFirst({
        where: { id: data.veiculoId, empresaId: tenant.empresaId },
      });

      if (!veiculo) {
        return reply.status(400).send({
          sucesso: false,
          mensagem: 'Veículo não encontrado nesta oficina.',
        });
      }

      // Transação ACID para geração sequencial atômica e medições de entrada
      const atendimentoCriado = await prisma.$transaction(async (tx) => {
        // Obter último sequencial da empresa
        const ultimo = await tx.atendimento.findFirst({
          where: { empresaId: tenant.empresaId },
          orderBy: { numeroSequencial: 'desc' },
          select: { numeroSequencial: true },
        });

        const proximoSeq = (ultimo?.numeroSequencial || 0) + 1;
        const anoAtual = new Date().getFullYear();
        const codigoFormatado = `AT-${anoAtual}-${String(proximoSeq).padStart(4, '0')}`;

        const atendimento = await tx.atendimento.create({
          data: {
            empresaId: tenant.empresaId,
            unidadeId: tenant.unidadeId,
            numeroSequencial: proximoSeq,
            codigoFormatado,
            clienteId: cliente.id,
            veiculoId: veiculo.id,
            usuarioAberturaId: tenant.usuarioId,
            status: StatusAtendimento.CONFIRMADO,
            queixaPrincipal: data.queixaPrincipal,
            previsaoEntrega: data.previsaoEntrega ? new Date(data.previsaoEntrega) : null,
          },
        });

        // Registrar Medições de Entrada (HU-009)
        const medicao = await tx.medicaoVeiculo.create({
          data: {
            empresaId: tenant.empresaId,
            atendimentoId: atendimento.id,
            quilometragem: data.quilometragem,
            nivelCombustivel: data.nivelCombustivel,
            pertencesDeixados: data.pertencesDeixados || null,
            avariasPrevias: data.avariasPrevias || null,
            temEstepe: data.temEstepe,
            temMacaco: data.temMacaco,
            temChaveRoda: data.temChaveRoda,
            temManualChaveReserva: data.temManualChaveReserva,
          },
        });

        return { ...atendimento, medicao };
      });

      // Auditoria Rastreável (HU-029)
      await AuditoriaService.registrar({
        empresaId: tenant.empresaId,
        unidadeId: tenant.unidadeId,
        usuarioId: tenant.usuarioId,
        operacao: TipoOperacaoAuditoria.CRIACAO,
        entidade: 'Atendimento',
        entidadeId: atendimentoCriado.id,
        detalhes: {
          codigo: atendimentoCriado.codigoFormatado,
          cliente: cliente.nomeRazao,
          veiculo: `${veiculo.marca} ${veiculo.modelo} (${veiculo.placa})`,
          km: data.quilometragem,
        },
        ipOrigem: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return reply.status(201).send({
        sucesso: true,
        mensagem: `Atendimento ${atendimentoCriado.codigoFormatado} aberto com sucesso!`,
        dados: atendimentoCriado,
      });
    }
  );

  /**
   * GET /api/atendimentos/:id
   */
  app.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = request.tenant!;
    const { id } = request.params as { id: string };

    const atendimento = await prisma.atendimento.findFirst({
      where: { id, empresaId: tenant.empresaId },
      include: {
        cliente: true,
        veiculo: { include: { categoria: true } },
        usuarioAbertura: { select: { id: true, nome: true, email: true } },
        medicao: true,
        cobranca: {
          include: {
            parcelas: true,
            recebimentos: true,
          },
        },
        entrega: {
          include: {
            usuarioEntrega: { select: { id: true, nome: true } },
          },
        },
        garantiasOrigem: {
          include: {
            usuarioDecisao: { select: { id: true, nome: true } },
          },
        },
        garantiaGerada: true,
        servicosTerceiros: true,
      },
    });

    if (!atendimento) {
      return reply.status(404).send({ sucesso: false, mensagem: 'Atendimento não encontrado.' });
    }

    return reply.send({ sucesso: true, dados: atendimento });
  });

  /**
   * PATCH /api/atendimentos/:id/status
   * Transição de Estado da Jornada (DOC-003)
   */
  app.patch('/:id/status', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = request.tenant!;
    const { id } = request.params as { id: string };
    const { novoStatus } = request.body as { novoStatus: string };

    const atendimento = await prisma.atendimento.findFirst({
      where: { id, empresaId: tenant.empresaId },
    });

    if (!atendimento) {
      return reply.status(404).send({ sucesso: false, mensagem: 'Atendimento não encontrado.' });
    }

    const atualizado = await prisma.atendimento.update({
      where: { id: atendimento.id },
      data: { status: novoStatus },
    });

    // Auditoria de transição de estado
    await AuditoriaService.registrar({
      empresaId: tenant.empresaId,
      unidadeId: tenant.unidadeId,
      usuarioId: tenant.usuarioId,
      operacao: TipoOperacaoAuditoria.TRANSICAO_ESTADO,
      entidade: 'Atendimento',
      entidadeId: atendimento.id,
      detalhes: {
        codigo: atendimento.codigoFormatado,
        statusAnterior: atendimento.status,
        novoStatus,
      },
      ipOrigem: request.ip,
      userAgent: request.headers['user-agent'],
    });

    return reply.send({
      sucesso: true,
      mensagem: `Status do atendimento alterado para ${novoStatus}`,
      dados: atualizado,
    });
  });

  /**
   * POST /api/atendimentos/:id/reservas
   * Reservar material / peças para o atendimento
   */
  app.post('/:id/reservas', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = request.tenant!;
    const { id } = request.params as { id: string };
    const { produtoId, quantidade } = request.body as { produtoId: string; quantidade: number };

    const atend = await prisma.atendimento.findFirst({
      where: { id, empresaId: tenant.empresaId },
    });
    if (!atend) return reply.status(404).send({ sucesso: false, mensagem: 'Atendimento não encontrado.' });

    const prod = await prisma.produto.findFirst({
      where: { id: produtoId, empresaId: tenant.empresaId },
    });
    if (!prod) return reply.status(404).send({ sucesso: false, mensagem: 'Produto não encontrado.' });

    const reserva = await prisma.reservaEstoque.create({
      data: {
        empresaId: tenant.empresaId,
        atendimentoId: id,
        produtoId,
        quantidade,
        status: 'ATIVA',
      },
    });

    await prisma.produto.update({
      where: { id: produtoId },
      data: { saldoReservado: { increment: quantidade } },
    });

    return reply.status(201).send({ sucesso: true, dados: reserva });
  });
}
