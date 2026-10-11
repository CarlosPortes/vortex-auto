import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../prisma.js';
import {
  CriarProdutoSchema,
  MovimentarEstoqueSchema,
  EntradaWMSSchema,
  BaixaOSWMSSchema,
  VendaBalcaoWMSSchema,
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
   * Listar catálogo de produtos com saldo físico, reservado, código de barras e foto (HU-017 / HU-018)
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
        { codigoBarras: { contains: q, mode: 'insensitive' } },
        { localizacao: { contains: q, mode: 'insensitive' } },
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
          codigoBarras: p.codigoBarras,
          descricao: p.descricao,
          localizacao: p.localizacao,
          fotoUrl: p.fotoUrl,
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
   * GET /api/produtos/scan/:codigo
   * Busca instantânea por Código de Barras EAN ou Código SKU para o leitor WMS
   */
  app.get('/scan/:codigo', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = request.tenant!;
    const { codigo } = request.params as { codigo: string };

    const termo = codigo.trim();

    const p = await prisma.produto.findFirst({
      where: {
        empresaId: tenant.empresaId,
        OR: [
          { codigoBarras: termo },
          { codigo: { equals: termo, mode: 'insensitive' } },
        ],
      },
    });

    if (!p) {
      return reply.status(404).send({
        sucesso: false,
        mensagem: `Nenhum produto encontrado com o código de barras ou SKU: '${termo}'`,
      });
    }

    const saldoFisico = Number(p.saldoFisico);
    const saldoReservado = Number(p.saldoReservado);

    return reply.send({
      sucesso: true,
      dados: {
        id: p.id,
        codigo: p.codigo,
        codigoBarras: p.codigoBarras,
        descricao: p.descricao,
        localizacao: p.localizacao,
        fotoUrl: p.fotoUrl,
        unidadeMedida: p.unidadeMedida,
        precoCusto: Number(p.precoCusto),
        precoVenda: Number(p.precoVenda),
        saldoFisico,
        saldoReservado,
        saldoDisponivel: saldoFisico - saldoReservado,
        estoqueMinimo: Number(p.estoqueMinimo),
        ativo: p.ativo,
      },
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
        codigoBarras: p.codigoBarras,
        descricao: p.descricao,
        localizacao: p.localizacao,
        fotoUrl: p.fotoUrl,
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
   * Cadastrar novo produto no catálogo (com código de barras, localização e foto) (HU-017)
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
            codigoBarras: data.codigoBarras?.trim() || null,
            descricao: data.descricao.trim(),
            localizacao: data.localizacao?.trim() || null,
            fotoUrl: data.fotoUrl?.trim() || null,
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
        detalhes: {
          codigo: novoProduto.codigo,
          descricao: novoProduto.descricao,
          codigoBarras: novoProduto.codigoBarras,
          localizacao: novoProduto.localizacao,
          saldoInicial: data.saldoInicial,
        },
      });

      return reply.status(201).send({
        sucesso: true,
        mensagem: 'Produto cadastrado com sucesso!',
        dados: novoProduto,
      });
    }
  );

  /**
   * PUT /api/produtos/:id
   * Atualizar dados do produto (descrição, foto, localização, preços, etc)
   */
  app.put(
    '/:id',
    { preHandler: [exigirPermissao(PermissaoAcesso.PRODUTO_GERENCIAR)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenant = request.tenant!;
      const { id } = request.params as { id: string };
      const body = request.body as any;

      const prod = await prisma.produto.findFirst({
        where: { id, empresaId: tenant.empresaId },
      });

      if (!prod) {
        return reply.status(404).send({ sucesso: false, mensagem: 'Produto não encontrado.' });
      }

      const atualizado = await prisma.produto.update({
        where: { id: prod.id },
        data: {
          descricao: body.descricao ? body.descricao.trim() : prod.descricao,
          codigoBarras: body.codigoBarras !== undefined ? body.codigoBarras?.trim() || null : prod.codigoBarras,
          localizacao: body.localizacao !== undefined ? body.localizacao?.trim() || null : prod.localizacao,
          fotoUrl: body.fotoUrl !== undefined ? body.fotoUrl?.trim() || null : prod.fotoUrl,
          unidadeMedida: body.unidadeMedida ? body.unidadeMedida.trim().toUpperCase() : prod.unidadeMedida,
          precoCusto: body.precoCusto !== undefined ? Number(body.precoCusto) : prod.precoCusto,
          precoVenda: body.precoVenda !== undefined ? Number(body.precoVenda) : prod.precoVenda,
          estoqueMinimo: body.estoqueMinimo !== undefined ? Number(body.estoqueMinimo) : prod.estoqueMinimo,
          ativo: body.ativo !== undefined ? Boolean(body.ativo) : prod.ativo,
        },
      });

      await AuditoriaService.registrar({
        empresaId: tenant.empresaId,
        usuarioId: tenant.usuarioId,
        operacao: TipoOperacaoAuditoria.EDICAO,
        entidade: 'Produto',
        entidadeId: prod.id,
        detalhes: {
          codigo: prod.codigo,
          descricao: atualizado.descricao,
          localizacao: atualizado.localizacao,
          fotoUrl: atualizado.fotoUrl,
        },
      });

      return reply.send({
        sucesso: true,
        mensagem: 'Produto atualizado com sucesso!',
        dados: atualizado,
      });
    }
  );

  /**
   * POST /api/produtos/wms/entrada
   * WMS: Recebimento de Compras / Entrada com bipagem rápida
   */
  app.post(
    '/wms/entrada',
    { preHandler: [exigirPermissao(PermissaoAcesso.ESTOQUE_AJUSTAR)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenant = request.tenant!;

      const parseResult = EntradaWMSSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          sucesso: false,
          mensagem: 'Dados inválidos para entrada no WMS',
          erros: parseResult.error.errors,
        });
      }

      const { produtoId, quantidade, precoCusto, motivo, documentoRef } = parseResult.data;

      const prod = await prisma.produto.findFirst({
        where: { id: produtoId, empresaId: tenant.empresaId },
      });

      if (!prod) {
        return reply.status(404).send({ sucesso: false, mensagem: 'Produto não encontrado.' });
      }

      const qtdNum = Number(quantidade);
      const saldoFisicoAnt = Number(prod.saldoFisico);
      const saldoFisicoNovo = saldoFisicoAnt + qtdNum;
      const saldoRes = Number(prod.saldoReservado);

      const resultado = await prisma.$transaction(async (tx) => {
        const prodUp = await tx.produto.update({
          where: { id: prod.id },
          data: {
            saldoFisico: saldoFisicoNovo,
            ...(precoCusto !== undefined && precoCusto > 0 ? { precoCusto } : {}),
          },
        });

        const mov = await tx.movimentoEstoque.create({
          data: {
            empresaId: tenant.empresaId,
            produtoId: prod.id,
            tipo: TipoMovimentoEstoque.ENTRADA,
            quantidade: qtdNum,
            saldoFisicoAnterior: saldoFisicoAnt,
            saldoFisicoNovo,
            saldoReservadoAnterior: saldoRes,
            saldoReservadoNovo: saldoRes,
            origemDocumento: documentoRef || 'WMS_RECEBIMENTO',
            usuarioId: tenant.usuarioId,
            motivo: motivo || 'Entrada registrada via leitor de código de barras (WMS)',
          },
        });

        return { prodUp, mov };
      });

      await AuditoriaService.registrar({
        empresaId: tenant.empresaId,
        usuarioId: tenant.usuarioId,
        operacao: TipoOperacaoAuditoria.MOVIMENTACAO_ESTOQUE,
        entidade: 'Produto',
        entidadeId: prod.id,
        detalhes: {
          tipo: 'ENTRADA_WMS',
          codigo: prod.codigo,
          descricao: prod.descricao,
          quantidade: qtdNum,
          saldoNovo: saldoFisicoNovo,
          documentoRef,
        },
      });

      return reply.send({
        sucesso: true,
        mensagem: `Entrada de ${qtdNum} ${prod.unidadeMedida} de '${prod.descricao}' confirmada com sucesso!`,
        dados: {
          produtoId: prod.id,
          codigo: prod.codigo,
          descricao: prod.descricao,
          saldoFisico: saldoFisicoNovo,
          saldoDisponivel: saldoFisicoNovo - saldoRes,
          movimentoId: resultado.mov.id,
        },
      });
    }
  );

  /**
   * POST /api/produtos/wms/baixa-os
   * WMS: Separação de Peças para Ordem de Serviço (Requisição de Box)
   */
  app.post(
    '/wms/baixa-os',
    { preHandler: [exigirPermissao(PermissaoAcesso.ESTOQUE_CONSUMIR)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenant = request.tenant!;

      const parseResult = BaixaOSWMSSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          sucesso: false,
          mensagem: 'Dados inválidos para baixa de OS no WMS',
          erros: parseResult.error.errors,
        });
      }

      const { ordemServicoId, produtoId, quantidade, motivo } = parseResult.data;

      const [os, prod] = await Promise.all([
        prisma.ordemServico.findFirst({
          where: { id: ordemServicoId, empresaId: tenant.empresaId },
          include: { atendimento: true },
        }),
        prisma.produto.findFirst({
          where: { id: produtoId, empresaId: tenant.empresaId },
        }),
      ]);

      if (!os) {
        return reply.status(404).send({ sucesso: false, mensagem: 'Ordem de Serviço não encontrada.' });
      }

      if (!prod) {
        return reply.status(404).send({ sucesso: false, mensagem: 'Produto não encontrado.' });
      }

      const qtdNum = Number(quantidade);
      const saldoFisicoAnt = Number(prod.saldoFisico);

      if (saldoFisicoAnt < qtdNum) {
        return reply.status(400).send({
          sucesso: false,
          mensagem: `Saldo físico insuficiente para '${prod.descricao}'. Saldo atual: ${saldoFisicoAnt}, solicitado: ${qtdNum}`,
        });
      }

      const saldoFisicoNovo = saldoFisicoAnt - qtdNum;
      const saldoResAnt = Number(prod.saldoReservado);
      // Se houver reserva associada, consome a reserva
      const consumoReserva = Math.min(saldoResAnt, qtdNum);
      const saldoResNovo = Math.max(0, saldoResAnt - consumoReserva);

      const resultado = await prisma.$transaction(async (tx) => {
        const prodUp = await tx.produto.update({
          where: { id: prod.id },
          data: {
            saldoFisico: saldoFisicoNovo,
            saldoReservado: saldoResNovo,
          },
        });

        const mov = await tx.movimentoEstoque.create({
          data: {
            empresaId: tenant.empresaId,
            produtoId: prod.id,
            tipo: TipoMovimentoEstoque.CONSUMO,
            quantidade: qtdNum,
            saldoFisicoAnterior: saldoFisicoAnt,
            saldoFisicoNovo,
            saldoReservadoAnterior: saldoResAnt,
            saldoReservadoNovo: saldoResNovo,
            origemDocumento: os.codigoFormatado,
            usuarioId: tenant.usuarioId,
            motivo: motivo || `Saída WMS para box na OS ${os.codigoFormatado}`,
          },
        });

        // Atualizar status de reserva se houver
        const reservaExistente = await tx.reservaEstoque.findFirst({
          where: {
            empresaId: tenant.empresaId,
            produtoId: prod.id,
            atendimentoId: os.atendimentoId,
            status: 'ATIVA',
          },
        });

        if (reservaExistente) {
          await tx.reservaEstoque.update({
            where: { id: reservaExistente.id },
            data: { status: 'CONSUMIDA' },
          });
        }

        return { prodUp, mov };
      });

      await AuditoriaService.registrar({
        empresaId: tenant.empresaId,
        usuarioId: tenant.usuarioId,
        operacao: TipoOperacaoAuditoria.MOVIMENTACAO_ESTOQUE,
        entidade: 'Produto',
        entidadeId: prod.id,
        detalhes: {
          tipo: 'BAIXA_OS_WMS',
          osCodigo: os.codigoFormatado,
          produto: prod.descricao,
          quantidade: qtdNum,
          saldoNovo: saldoFisicoNovo,
        },
      });

      return reply.send({
        sucesso: true,
        mensagem: `Baixa de ${qtdNum} ${prod.unidadeMedida} de '${prod.descricao}' vinculada à OS ${os.codigoFormatado}!`,
        dados: {
          produtoId: prod.id,
          codigo: prod.codigo,
          descricao: prod.descricao,
          saldoFisico: saldoFisicoNovo,
          saldoDisponivel: saldoFisicoNovo - saldoResNovo,
          movimentoId: resultado.mov.id,
          osCodigo: os.codigoFormatado,
        },
      });
    }
  );

  /**
   * POST /api/produtos/wms/venda-balcao
   * WMS: Venda Direta no Balcão com baixa imediata e faturamento à vista
   */
  app.post(
    '/wms/venda-balcao',
    { preHandler: [exigirPermissao(PermissaoAcesso.ESTOQUE_CONSUMIR)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenant = request.tenant!;

      const parseResult = VendaBalcaoWMSSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          sucesso: false,
          mensagem: 'Dados inválidos da venda balcão',
          erros: parseResult.error.errors,
        });
      }

      const { itens, formaPagamento, clienteNome, observacoes } = parseResult.data;

      // Buscar todos os produtos envolvidos
      const produtosIds = itens.map((i) => i.produtoId);
      const produtos = await prisma.produto.findMany({
        where: {
          id: { in: produtosIds },
          empresaId: tenant.empresaId,
        },
      });

      if (produtos.length !== produtosIds.length) {
        return reply.status(400).send({
          sucesso: false,
          mensagem: 'Um ou mais produtos da venda balcão não foram localizados.',
        });
      }

      // Validar estoques
      let valorTotalVenda = 0;
      for (const item of itens) {
        const prod = produtos.find((p) => p.id === item.produtoId)!;
        const saldoFis = Number(prod.saldoFisico);
        if (saldoFis < item.quantidade) {
          return reply.status(400).send({
            sucesso: false,
            mensagem: `Estoque insuficiente para '${prod.descricao}'. Saldo disponível: ${saldoFis}, solicitado: ${item.quantidade}`,
          });
        }
        valorTotalVenda += item.quantidade * item.valorUnitario;
      }

      const codigoVenda = `VB-${Date.now().toString().slice(-6)}`;

      // Executar transação de baixa atômica
      const resultado = await prisma.$transaction(async (tx) => {
        const movimentos = [];

        for (const item of itens) {
          const prod = produtos.find((p) => p.id === item.produtoId)!;
          const saldoAnt = Number(prod.saldoFisico);
          const saldoNovo = saldoAnt - item.quantidade;
          const saldoRes = Number(prod.saldoReservado);

          await tx.produto.update({
            where: { id: prod.id },
            data: { saldoFisico: saldoNovo },
          });

          const mov = await tx.movimentoEstoque.create({
            data: {
              empresaId: tenant.empresaId,
              produtoId: prod.id,
              tipo: TipoMovimentoEstoque.VENDA_DIRETA,
              quantidade: item.quantidade,
              saldoFisicoAnterior: saldoAnt,
              saldoFisicoNovo: saldoNovo,
              saldoReservadoAnterior: saldoRes,
              saldoReservadoNovo: saldoRes,
              origemDocumento: codigoVenda,
              usuarioId: tenant.usuarioId,
              motivo: `Venda balcão à vista (${formaPagamento}) - Cliente: ${clienteNome || 'Consumidor Final'}`,
            },
          });

          movimentos.push(mov);
        }

        return { movimentos, codigoVenda, valorTotalVenda };
      });

      await AuditoriaService.registrar({
        empresaId: tenant.empresaId,
        usuarioId: tenant.usuarioId,
        operacao: TipoOperacaoAuditoria.MOVIMENTACAO_ESTOQUE,
        entidade: 'VendaBalcao',
        entidadeId: codigoVenda,
        detalhes: {
          codigoVenda,
          total: valorTotalVenda,
          formaPagamento,
          cliente: clienteNome || 'Consumidor Final',
          qtdItens: itens.length,
        },
      });

      return reply.send({
        sucesso: true,
        mensagem: `Venda balcão #${codigoVenda} no valor de R$ ${valorTotalVenda.toFixed(2)} finalizada com sucesso!`,
        dados: {
          codigoVenda,
          valorTotal: valorTotalVenda,
          formaPagamento,
          clienteNome: clienteNome || 'Consumidor Final',
          movimentosRegistrados: resultado.movimentos.length,
        },
      });
    }
  );

  /**
   * POST /api/produtos/:id/movimentar
   * Movimentar estoque manual (ajuste, entrada, consumo avulso) (HU-018)
   */
  app.post(
    '/:id/movimentar',
    { preHandler: [exigirPermissao(PermissaoAcesso.ESTOQUE_AJUSTAR)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenant = request.tenant!;
      const { id } = request.params as { id: string };

      const parseResult = MovimentarEstoqueSchema.safeParse({
        ...((request.body as object) || {}),
        produtoId: id,
      });

      if (!parseResult.success) {
        return reply.status(400).send({
          sucesso: false,
          mensagem: 'Dados inválidos da movimentação',
          erros: parseResult.error.errors,
        });
      }

      const { tipo, quantidade, motivo, documentoRef } = parseResult.data;

      const produto = await prisma.produto.findFirst({
        where: { id, empresaId: tenant.empresaId },
      });

      if (!produto) {
        return reply.status(404).send({ sucesso: false, mensagem: 'Produto não encontrado.' });
      }

      const saldoFisicoAnt = Number(produto.saldoFisico);
      const saldoReservadoAnt = Number(produto.saldoReservado);

      let saldoFisicoNovo = saldoFisicoAnt;
      let saldoReservadoNovo = saldoReservadoAnt;

      if (tipo === TipoMovimentoEstoque.ENTRADA || tipo === TipoMovimentoEstoque.AJUSTE_POSITIVO) {
        saldoFisicoNovo += quantidade;
      } else if (
        tipo === TipoMovimentoEstoque.CONSUMO ||
        tipo === TipoMovimentoEstoque.AJUSTE_NEGATIVO ||
        tipo === TipoMovimentoEstoque.VENDA_DIRETA
      ) {
        if (saldoFisicoAnt < quantidade) {
          return reply.status(400).send({
            sucesso: false,
            mensagem: `Saldo físico insuficiente para saída. Saldo atual: ${saldoFisicoAnt}, saída solicitada: ${quantidade}`,
          });
        }
        saldoFisicoNovo -= quantidade;
      } else if (tipo === TipoMovimentoEstoque.RESERVA) {
        const saldoDisponivel = saldoFisicoAnt - saldoReservadoAnt;
        if (saldoDisponivel < quantidade) {
          return reply.status(400).send({
            sucesso: false,
            mensagem: `Saldo disponível insuficiente para reserva. Disponível: ${saldoDisponivel}, solicitado: ${quantidade}`,
          });
        }
        saldoReservadoNovo += quantidade;
      } else if (tipo === TipoMovimentoEstoque.LIBERACAO_RESERVA) {
        if (saldoReservadoAnt < quantidade) {
          return reply.status(400).send({
            sucesso: false,
            mensagem: `Quantidade a liberar excede o saldo reservado (${saldoReservadoAnt}).`,
          });
        }
        saldoReservadoNovo -= quantidade;
      }

      const resultado = await prisma.$transaction(async (tx) => {
        const produtoAtualizado = await tx.produto.update({
          where: { id },
          data: {
            saldoFisico: saldoFisicoNovo,
            saldoReservado: saldoReservadoNovo,
          },
        });

        const mov = await tx.movimentoEstoque.create({
          data: {
            empresaId: tenant.empresaId,
            produtoId: id,
            tipo,
            quantidade,
            saldoFisicoAnterior: saldoFisicoAnt,
            saldoFisicoNovo,
            saldoReservadoAnterior: saldoReservadoAnt,
            saldoReservadoNovo,
            origemDocumento: documentoRef || 'AJUSTE_MANUAL',
            usuarioId: tenant.usuarioId,
            motivo: motivo || 'Movimentação manual autorizada',
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
        codigoBarras: prod.codigoBarras,
        descricao: prod.descricao,
        localizacao: prod.localizacao,
        fotoUrl: prod.fotoUrl,
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
