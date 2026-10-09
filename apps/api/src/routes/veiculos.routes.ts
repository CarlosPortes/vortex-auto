import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../prisma.js';
import { CriarVeiculoSchema, PermissaoAcesso, TipoOperacaoAuditoria } from '@vortex/shared';
import { tenantMiddleware, exigirPermissao } from '../middlewares/tenant.middleware.js';
import { AuditoriaService } from '../services/auditoria.service.js';

export async function veiculosRoutes(app: FastifyInstance) {
  app.addHook('onRequest', async (req) => req.jwtVerify());
  app.addHook('onRequest', tenantMiddleware);

  /**
   * GET /api/veiculos/categorias
   */
  app.get('/categorias', async (_req, reply: FastifyReply) => {
    const categorias = await prisma.categoriaVeiculo.findMany({
      orderBy: { nome: 'asc' },
    });
    return reply.send({ sucesso: true, dados: categorias });
  });

  /**
   * GET /api/veiculos
   * Lista veículos cadastrados na oficina (HU-007)
   */
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = request.tenant!;
    const { busca, clienteId } = request.query as { busca?: string; clienteId?: string };

    const where: any = {
      empresaId: tenant.empresaId,
      ativo: true,
    };

    if (clienteId) {
      where.clientes = { some: { clienteId } };
    }

    if (busca && busca.trim()) {
      const termo = busca.trim().toUpperCase();
      where.OR = [
        { placa: { contains: termo } },
        { marca: { contains: busca.trim(), mode: 'insensitive' } },
        { modelo: { contains: busca.trim(), mode: 'insensitive' } },
        { chassi: { contains: termo } },
      ];
    }

    const veiculos = await prisma.veiculo.findMany({
      where,
      include: {
        categoria: true,
        clientes: {
          include: {
            cliente: {
              select: { id: true, nomeRazao: true, telefone: true, cpfCnpj: true },
            },
          },
        },
      },
      orderBy: { modelo: 'asc' },
      take: 100,
    });

    return reply.send({
      sucesso: true,
      dados: veiculos.map((v) => ({
        id: v.id,
        placa: v.placa,
        chassi: v.chassi,
        marca: v.marca,
        modelo: v.modelo,
        anoFabricacao: v.anoFabricacao,
        anoModelo: v.anoModelo,
        cor: v.cor,
        combustivel: v.combustivel,
        categoria: v.categoria.nome,
        categoriaCodigo: v.categoria.codigo,
        proprietario: v.clientes[0]?.cliente
          ? {
              id: v.clientes[0].cliente.id,
              nome: v.clientes[0].cliente.nomeRazao,
              telefone: v.clientes[0].cliente.telefone,
            }
          : null,
      })),
    });
  });

  /**
   * POST /api/veiculos
   * Cadastro de Veículo e Vínculo com Cliente (HU-007)
   */
  app.post(
    '/',
    { preHandler: [exigirPermissao(PermissaoAcesso.VEICULO_GERENCIAR)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenant = request.tenant!;
      const parseResult = CriarVeiculoSchema.safeParse(request.body);

      if (!parseResult.success) {
        return reply.status(400).send({
          sucesso: false,
          mensagem: 'Dados inválidos do veículo',
          erros: parseResult.error.errors.map((e) => ({ campo: e.path.join('.'), mensagem: e.message })),
        });
      }

      const data = parseResult.data;
      const placaFormatada = data.placa.trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

      // Verificar unicidade da placa na empresa
      const existente = await prisma.veiculo.findUnique({
        where: {
          empresaId_placa: {
            empresaId: tenant.empresaId,
            placa: placaFormatada,
          },
        },
      });

      if (existente) {
        return reply.status(409).send({
          sucesso: false,
          mensagem: `O veículo com placa ${placaFormatada} já está cadastrado nesta oficina.`,
        });
      }

      // Validar cliente
      const cliente = await prisma.cliente.findFirst({
        where: { id: data.clienteId, empresaId: tenant.empresaId },
      });

      if (!cliente) {
        return reply.status(400).send({
          sucesso: false,
          mensagem: 'Cliente informado não encontrado ou não pertence a esta oficina.',
        });
      }

      // Buscar categoria
      const categoria = await prisma.categoriaVeiculo.findFirst({
        where: { codigo: data.categoriaCodigo },
      });

      if (!categoria) {
        return reply.status(400).send({
          sucesso: false,
          mensagem: 'Categoria de veículo inválida.',
        });
      }

      // Criar veículo e vincular ao cliente em transação
      const resultado = await prisma.$transaction(async (tx) => {
        const veiculo = await tx.veiculo.create({
          data: {
            empresaId: tenant.empresaId,
            placa: placaFormatada,
            chassi: data.chassi ? data.chassi.trim().toUpperCase() : null,
            marca: data.marca.trim(),
            modelo: data.modelo.trim(),
            anoFabricacao: data.anoFabricacao || null,
            anoModelo: data.anoModelo || null,
            cor: data.cor ? data.cor.trim() : null,
            combustivel: data.combustivel ? data.combustivel.trim() : null,
            categoriaId: categoria.id,
          },
        });

        const vinculo = await tx.vinculoClienteVeiculo.create({
          data: {
            empresaId: tenant.empresaId,
            clienteId: cliente.id,
            veiculoId: veiculo.id,
            papel: data.papel,
          },
        });

        return { veiculo, vinculo };
      });

      // Auditoria
      await AuditoriaService.registrar({
        empresaId: tenant.empresaId,
        unidadeId: tenant.unidadeId,
        usuarioId: tenant.usuarioId,
        operacao: TipoOperacaoAuditoria.CRIACAO,
        entidade: 'Veiculo',
        entidadeId: resultado.veiculo.id,
        detalhes: { placa: resultado.veiculo.placa, modelo: resultado.veiculo.modelo, clienteId: cliente.id },
        ipOrigem: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return reply.status(201).send({
        sucesso: true,
        mensagem: 'Veículo cadastrado e vinculado com sucesso!',
        dados: resultado.veiculo,
      });
    }
  );
}
