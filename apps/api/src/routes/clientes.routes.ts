import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../prisma.js';
import { CriarClienteSchema, PermissaoAcesso, TipoOperacaoAuditoria } from '@vortex/shared';
import { tenantMiddleware, exigirPermissao } from '../middlewares/tenant.middleware.js';
import { AuditoriaService } from '../services/auditoria.service.js';

export async function clientesRoutes(app: FastifyInstance) {
  app.addHook('onRequest', async (req) => req.jwtVerify());
  app.addHook('onRequest', tenantMiddleware);

  /**
   * GET /api/clientes
   * Listagem de clientes com filtro de busca (HU-006)
   */
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = request.tenant!;
    const { busca } = request.query as { busca?: string };

    const where: any = {
      empresaId: tenant.empresaId,
      ativo: true,
    };

    if (busca && busca.trim()) {
      where.OR = [
        { nomeRazao: { contains: busca.trim(), mode: 'insensitive' } },
        { cpfCnpj: { contains: busca.replace(/\D/g, '') } },
        { telefone: { contains: busca.trim() } },
      ];
    }

    const clientes = await prisma.cliente.findMany({
      where,
      include: {
        veiculos: {
          where: { ativo: true },
          include: {
            veiculo: {
              include: { categoria: true },
            },
          },
        },
      },
      orderBy: { nomeRazao: 'asc' },
      take: 100,
    });

    return reply.send({
      sucesso: true,
      dados: clientes.map((c) => ({
        id: c.id,
        tipo: c.tipo,
        nomeRazao: c.nomeRazao,
        apelidoFantasia: c.apelidoFantasia,
        cpfCnpj: c.cpfCnpj,
        telefone: c.telefone,
        email: c.email,
        cidade: c.cidade,
        uf: c.uf,
        veiculosCount: c.veiculos.length,
        veiculos: c.veiculos.map((v) => ({
          vinculoId: v.id,
          veiculoId: v.veiculo.id,
          placa: v.veiculo.placa,
          modelo: `${v.veiculo.marca} ${v.veiculo.modelo}`,
          categoria: v.veiculo.categoria.nome,
          papel: v.papel,
        })),
      })),
    });
  });

  /**
   * POST /api/clientes
   * Cadastro de Cliente (HU-006)
   */
  app.post(
    '/',
    { preHandler: [exigirPermissao(PermissaoAcesso.CLIENTE_GERENCIAR)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenant = request.tenant!;
      const parseResult = CriarClienteSchema.safeParse(request.body);

      if (!parseResult.success) {
        return reply.status(400).send({
          sucesso: false,
          mensagem: 'Dados cadastrais inválidos',
          erros: parseResult.error.errors.map((e) => ({ campo: e.path.join('.'), mensagem: e.message })),
        });
      }

      const data = parseResult.data;
      const documentoLimpo = data.cpfCnpj.replace(/\D/g, '');

      // Verificar unicidade dentro da mesma empresa (DOC-006/008)
      const existente = await prisma.cliente.findUnique({
        where: {
          empresaId_cpfCnpj: {
            empresaId: tenant.empresaId,
            cpfCnpj: documentoLimpo,
          },
        },
      });

      if (existente) {
        return reply.status(409).send({
          sucesso: false,
          mensagem: 'Já existe um cliente cadastrado com este CPF/CNPJ nesta oficina.',
        });
      }

      const cliente = await prisma.cliente.create({
        data: {
          empresaId: tenant.empresaId,
          tipo: data.tipo,
          nomeRazao: data.nomeRazao,
          apelidoFantasia: data.apelidoFantasia || null,
          cpfCnpj: documentoLimpo,
          telefone: data.telefone,
          email: data.email || null,
          cep: data.cep || null,
          logradouro: data.logradouro || null,
          numero: data.numero || null,
          bairro: data.bairro || null,
          cidade: data.cidade || null,
          uf: data.uf ? data.uf.toUpperCase() : null,
          observacoes: data.observacoes || null,
        },
      });

      // Auditoria
      await AuditoriaService.registrar({
        empresaId: tenant.empresaId,
        unidadeId: tenant.unidadeId,
        usuarioId: tenant.usuarioId,
        operacao: TipoOperacaoAuditoria.CRIACAO,
        entidade: 'Cliente',
        entidadeId: cliente.id,
        detalhes: { nome: cliente.nomeRazao, documento: cliente.cpfCnpj },
        ipOrigem: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return reply.status(201).send({
        sucesso: true,
        mensagem: 'Cliente cadastrado com sucesso!',
        dados: cliente,
      });
    }
  );

  /**
   * GET /api/clientes/:id
   */
  app.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = request.tenant!;
    const { id } = request.params as { id: string };

    const cliente = await prisma.cliente.findFirst({
      where: { id, empresaId: tenant.empresaId },
      include: {
        veiculos: {
          include: {
            veiculo: {
              include: { categoria: true },
            },
          },
        },
        atendimentos: {
          orderBy: { criadoEm: 'desc' },
          include: { veiculo: true },
        },
      },
    });

    if (!cliente) {
      return reply.status(404).send({ sucesso: false, mensagem: 'Cliente não encontrado' });
    }

    return reply.send({ sucesso: true, dados: cliente });
  });

  /**
   * PUT /api/clientes/:id
   * Atualizar cadastro de Cliente (correção de nome, CPF/CNPJ, telefone, e-mail, cidade/UF)
   */
  app.put(
    '/:id',
    { preHandler: [exigirPermissao(PermissaoAcesso.CLIENTE_GERENCIAR)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenant = request.tenant!;
      const { id } = request.params as { id: string };
      const body = request.body as {
        tipo?: string;
        nomeRazao?: string;
        apelidoFantasia?: string;
        cpfCnpj?: string;
        telefone?: string;
        email?: string;
        cidade?: string;
        uf?: string;
        observacoes?: string;
      };

      const cliente = await prisma.cliente.findFirst({
        where: { id, empresaId: tenant.empresaId },
      });

      if (!cliente) {
        return reply.status(404).send({ sucesso: false, mensagem: 'Cliente não encontrado.' });
      }

      const cpfCnpjLimpo = body.cpfCnpj ? body.cpfCnpj.replace(/\D/g, '') : cliente.cpfCnpj;

      const atualizado = await prisma.cliente.update({
        where: { id: cliente.id },
        data: {
          tipo: body.tipo || cliente.tipo,
          nomeRazao: body.nomeRazao ? body.nomeRazao.trim() : cliente.nomeRazao,
          apelidoFantasia: body.apelidoFantasia !== undefined ? body.apelidoFantasia?.trim() || null : cliente.apelidoFantasia,
          cpfCnpj: cpfCnpjLimpo || cliente.cpfCnpj,
          telefone: body.telefone ? body.telefone.trim() : cliente.telefone,
          email: body.email !== undefined ? body.email?.trim() || null : cliente.email,
          cidade: body.cidade !== undefined ? body.cidade?.trim() || null : cliente.cidade,
          uf: body.uf !== undefined ? (body.uf ? body.uf.trim().toUpperCase().slice(0, 2) : null) : cliente.uf,
          observacoes: body.observacoes !== undefined ? body.observacoes?.trim() || null : cliente.observacoes,
        },
      });

      await AuditoriaService.registrar({
        empresaId: tenant.empresaId,
        unidadeId: tenant.unidadeId,
        usuarioId: tenant.usuarioId,
        operacao: TipoOperacaoAuditoria.ALTERACAO,
        entidade: 'Cliente',
        entidadeId: atualizado.id,
        detalhes: { nome: atualizado.nomeRazao, documento: atualizado.cpfCnpj },
        ipOrigem: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return reply.send({
        sucesso: true,
        mensagem: 'Cadastro do cliente atualizado com sucesso!',
        dados: atualizado,
      });
    }
  );
}
