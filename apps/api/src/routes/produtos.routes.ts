import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../prisma.js';
import {
  CriarProdutoSchema,
  MovimentarEstoqueSchema,
  PermissaoAcesso,
  TipoOperacaoAuditoria,
  TipoMovimentoEstoque,
} from '@vortex/shared';
import { tenantMiddleware, exigirPermissao } from '../middlewares/tenant.middleware.js';
import { AuditoriaService } from '../services/auditoria.service.js';

export async function produtosRoutes(app: FastifyInstance) {
  app.addHook('onRequest', async (req) => req.jwtVerify());
  app.addHook('onRequest', tenantMiddleware);

  /**
   * GET /api/produtos
   * Listar catálogo de produtos com saldo físico, reservado e disponível (HU-017 / HU-018)
   */
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = request.tenant!;
    const { q, apenasAbaixoMinimo } = request.query as {
      q?: string;
      apenasAbaixoMinimo?: string;
    };

    const where: any = {
      empresaId: tenant.empresaId,
    };

    if (q) {
      where.OR = [
        { codigo: { contains: q, mode: 'insensitive' } },
        { descricao: { contains: q, mode: 'insensitive' } },
      ];
    }

    const produtos = await prisma.produto.findMany({
      where,
      orderBy: { descricao: 'asc' },
    });

    const itens = produtos
      .map((p) => {
        const saldoFisico = Number(p.saldoFisico);
        const saldoReservado = Number(p.saldoReservado);
        const saldoDisponivel = saldoFisico - saldoReservado;
        const estoqueMinimo = Number(p.estoqueMinimo);
        const abaixoMinimo = saldoDisponivel < estoqueMinimo;

        return {
          id: p.id,
          codigo: p.codigo,
          descricao: p.descricao,
          unidadeMedida: p.unidadeMedida,
          precoCusto: Number(p.precoCusto),
          precoVenda: Number(p.precoVenda),
          saldoFisico,
          saldoReservado,
          saldoDisponivel,
          estoqueMinimo,
          abaixoMinimo,
          ativo: p.ativo,
          criadoEm: p.criadoEm,
        };
      })
      .filter((p) => {
        if (apenasAbaixoMinimo === 'true') {
          return p.abaixoMinimo;
        }
        return true;
      });

    return reply.send({
      sucesso: true,
      total: itens.length,
      dados: itens,
    });
  });

  /**
   * GET /api/produtos/:id
   * Obter detalhes de um produto
   */
  app.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = request.tenant!;
    const { id } = request.params as { id: string };

    const p = await prisma.produto.findFirst({
      where: { id, empresaId: tenant.empresaId },
    });

    if (!p) {
      return reply.status(404).send({ sucesso: false, mensagem: 'Produto não encontrado.' });
    }

    const saldoFisico = Number(p.saldoFisico);
    const saldoReservado = Number(p.saldoReservado);

    return reply.send({
      sucesso: true,
      dados: {
        id: p.id,
        codigo: p.codigo,
        descricao: p.descricao,
        unidadeMedida: p.unidadeMedida,
        precoCusto: Number(p.precoCusto),
        precoVenda: Number(p.precoVenda),
        saldoFisico,
        saldoReservado,
        saldoDisponivel: saldoFisico - saldoReservado,
        estoqueMinimo: Number(p.estoqueMinimo),
        ativo: p.ativo,
        criadoEm: p.criadoEm,
      },
    });
  });

  /**
   * POST /api/produtos
   * Cadastrar novo produto no catálogo (HU-017)
   */
  app.post(
    '/',
    { preHandler: [exigirPermissao(PermissaoAcesso.PRODUTO_GERENCIAR)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenant = request.tenant!;

      const parseResult = CriarProdutoSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          sucesso: false,
          mensagem: 'Dados inválidos do produto',
          erros: parseResult.error.errors.map((e) => ({
            campo: e.path.join('.'),
            mensagem: e.message,
          })),
        });
      }

      const data = parseResult.data;

      // Verificar código duplicado no tenant
      const jaExiste = await prisma.produto.findFirst({
        where: { empresaId: tenant.empresaId, codigo: data.codigo },
      });

      if (jaExiste) {
        return reply.status(400).send({
          sucesso: false,
          mensagem: `Já existe um produto com o código '${data.codigo}' cadastrado na sua oficina.`,
        });
      }

      const novoProduto = await prisma.$transaction(async (tx) => {
        const prod = await tx.produto.create({
          data: {
            empresaId: tenant.empresaId,
            codigo: data.codigo.trim().toUpperCase(),
            descricao: data.descricao.trim(),
            unidadeMedida: data.unidadeMedida.trim().toUpperCase(),
            precoCusto: data.precoCusto,
            precoVenda: data.precoVenda,
            estoqueMinimo: data.estoqueMinimo,
            saldoFisico: data.saldoInicial,
            saldoReservado: 0,
            ativo: true,
          },
        });

        if (data.saldoInicial > 0) {
          await tx.movimentoEstoque.create({
            data: {
              empresaId: tenant.empresaId,
              produtoId: prod.id,
              tipo: TipoMovimentoEstoque.ENTRADA,
              quantidade: data.saldoInicial,
              saldoFisicoAnterior: 0,
              saldoFisicoNovo: data.saldoInicial,
              saldoReservadoAnterior: 0,
              saldoReservadoNovo: 0,
              origemDocumento: 'CADASTRO_INICIAL',
              usuarioId: tenant.usuarioId,
              motivo: 'Saldo inicial cadastrado com o produto',
            },
          });
        }

        return prod;
      });

      await AuditoriaService.registrar({
        empresaId: tenant.empresaId,
        usuarioId: tenant.usuarioId,
        operacao: TipoOperacaoAuditoria.CRIACAO,
        entidade: 'Produto',
        entidadeId: novoProduto.id,
        detalhes: { codigo: novoProduto.codigo, descricao: novoProduto.descricao, saldoInicial: data.saldoInicial },
      });

      return reply.status(201).send({
        sucesso: true,
        mensagem: 'Produto cadastrado com sucesso!',
        dados: {
          id: novoProduto.id,
          codigo: novoProduto.codigo,
          descricao: novoProduto.descricao,
          saldoFisico: Number(novoProduto.saldoFisico),
          saldoReservado: Number(novoProduto.saldoReservado),
          saldoDisponivel: Number(novoProduto.saldoFisico),
        },
      });
    }
  );

  /**
   * POST /api/produtos/:id/movimento
   * Movimentação manual de estoque (Entrada, Ajuste de Inventário) (HU-018)
   */
  app.post(
    '/:id/movimento',
    { preHandler: [exigirPermissao(PermissaoAcesso.ESTOQUE_AJUSTAR)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenant = request.tenant!;
      const { id } = request.params as { id: string };

      const parseResult = MovimentarEstoqueSchema.safeParse({
        ...request.body as any,
        produtoId: id,
      });

      if (!parseResult.success) {
        return reply.status(400).send({
          sucesso: false,
          mensagem: 'Dados inválidos da movimentação',
          erros: parseResult.error.errors.map((e) => ({
            campo: e.path.join('.'),
            mensagem: e.message,
          })),
        });
      }

      const { tipo, quantidade, motivo, documentoRef } = parseResult.data;

      // Validar tipos permitidos nesta rota manual
      const tiposPermitidos = [
        TipoMovimentoEstoque.ENTRADA,
        TipoMovimentoEstoque.AJUSTE_POSITIVO,
        TipoMovimentoEstoque.AJUSTE_NEGATIVO,
      ];

      if (!tiposPermitidos.includes(tipo)) {
        return reply.status(400).send({
          sucesso: false,
          mensagem: `Tipo de movimento '${tipo}' não é permitido via ajuste manual. Utilize a rota de execução da OS para consumo ou devolução.`,
        });
      }

      const resultado = await prisma.$transaction(async (tx) => {
        const prod = await tx.produto.findFirst({
          where: { id, empresaId: tenant.empresaId },
        });

        if (!prod) {
          throw new Error('PRODUTO_NAO_ENCONTRADO');
        }

        const saldoFisicoAtual = Number(prod.saldoFisico);
        const saldoReservadoAtual = Number(prod.saldoReservado);
        let novoSaldoFisico = saldoFisicoAtual;

        if (tipo === TipoMovimentoEstoque.ENTRADA || tipo === TipoMovimentoEstoque.AJUSTE_POSITIVO) {
          novoSaldoFisico = saldoFisicoAtual + quantidade;
        } else if (tipo === TipoMovimentoEstoque.AJUSTE_NEGATIVO) {
          if (saldoFisicoAtual - saldoReservadoAtual < quantidade) {
            throw new Error('SALDO_INSUFICIENTE');
          }
          novoSaldoFisico = Math.max(0, saldoFisicoAtual - quantidade);
        }

        const produtoAtualizado = await tx.produto.update({
          where: { id: prod.id },
          data: { saldoFisico: novoSaldoFisico },
        });

        const mov = await tx.movimentoEstoque.create({
          data: {
            empresaId: tenant.empresaId,
            produtoId: prod.id,
            tipo,
            quantidade,
            saldoFisicoAnterior: saldoFisicoAtual,
            saldoFisicoNovo: novoSaldoFisico,
            saldoReservadoAnterior: saldoReservadoAtual,
            saldoReservadoNovo: saldoReservadoAtual,
            origemDocumento: documentoRef || 'AJUSTE_MANUAL',
            usuarioId: tenant.usuarioId,
            motivo: motivo || 'Movimentação operacional de estoque',
          },
        });

        return { produto: produtoAtualizado, movimento: mov };
      });

      await AuditoriaService.registrar({
        empresaId: tenant.empresaId,
        usuarioId: tenant.usuarioId,
        operacao: TipoOperacaoAuditoria.MOVIMENTACAO_ESTOQUE,
        entidade: 'Produto',
        entidadeId: id,
        detalhes: {
          tipo,
          quantidade,
          saldoNovo: Number(resultado.produto.saldoFisico),
          motivo,
        },
      });

      return reply.send({
        sucesso: true,
        mensagem: 'Movimentação de estoque registrada com sucesso!',
        dados: {
          produtoId: id,
          saldoFisico: Number(resultado.produto.saldoFisico),
          saldoReservado: Number(resultado.produto.saldoReservado),
          saldoDisponivel: Number(resultado.produto.saldoFisico) - Number(resultado.produto.saldoReservado),
          movimentoId: resultado.movimento.id,
        },
      });
    }
  );

  /**
   * GET /api/produtos/:id/movimentos
   * Extrato histórico de movimentações do produto (HU-018)
   */
  app.get('/:id/movimentos', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = request.tenant!;
    const { id } = request.params as { id: string };

    const prod = await prisma.produto.findFirst({
      where: { id, empresaId: tenant.empresaId },
    });

    if (!prod) {
      return reply.status(404).send({ sucesso: false, mensagem: 'Produto não encontrado.' });
    }

    const movimentos = await prisma.movimentoEstoque.findMany({
      where: { produtoId: id, empresaId: tenant.empresaId },
      include: {
        usuario: { select: { id: true, nome: true, email: true } },
      },
      orderBy: { criadoEm: 'desc' },
      take: 50,
    });

    return reply.send({
      sucesso: true,
      produto: {
        id: prod.id,
        codigo: prod.codigo,
        descricao: prod.descricao,
        saldoFisico: Number(prod.saldoFisico),
        saldoReservado: Number(prod.saldoReservado),
        saldoDisponivel: Number(prod.saldoFisico) - Number(prod.saldoReservado),
      },
      dados: movimentos.map((m) => ({
        id: m.id,
        tipo: m.tipo,
        quantidade: Number(m.quantidade),
        saldoFisicoAnterior: Number(m.saldoFisicoAnterior),
        saldoFisicoNovo: Number(m.saldoFisicoNovo),
        saldoReservadoAnterior: Number(m.saldoReservadoAnterior),
        saldoReservadoNovo: Number(m.saldoReservadoNovo),
        origemDocumento: m.origemDocumento,
        motivo: m.motivo,
        usuarioNome: m.usuario.nome,
        criadoEm: m.criadoEm,
      })),
    });
  });
}
