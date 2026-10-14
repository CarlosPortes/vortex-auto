import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../prisma.js';
import {
  CriarVendaBalcaoSchema,
  StatusVendaBalcao,
  TipoOperacaoAuditoria,
  TipoMovimentoEstoque,
} from '@vortex/shared';
import { tenantMiddleware } from '../middlewares/tenant.middleware.js';
import { AuditoriaService } from '../services/auditoria.service.js';

export async function vendasBalcaoRoutes(app: FastifyInstance) {
  app.addHook('onRequest', async (req) => req.jwtVerify());
  app.addHook('onRequest', tenantMiddleware);

  /**
   * GET /api/vendas-balcao
   * Listar todas as vendas de balcão da empresa com filtros
   */
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
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
        { codigoVenda: { contains: q, mode: 'insensitive' } },
        { clienteNome: { contains: q, mode: 'insensitive' } },
        { clienteDocumento: { contains: q, mode: 'insensitive' } },
      ];
    }

    const vendas = await prisma.vendaBalcao.findMany({
      where,
      include: {
        usuario: { select: { id: true, nome: true } },
        itens: {
          include: {
            produto: {
              select: {
                id: true,
                codigo: true,
                descricao: true,
                unidadeMedida: true,
                fotoUrl: true,
              },
            },
          },
        },
      },
      orderBy: { criadoEm: 'desc' },
    });

    const formatadas = vendas.map((v) => ({
      ...v,
      subtotal: Number(v.subtotal),
      desconto: Number(v.desconto),
      valorTotal: Number(v.valorTotal),
      itens: v.itens.map((it) => ({
        ...it,
        quantidade: Number(it.quantidade),
        precoUnitario: Number(it.precoUnitario),
        custoUnitario: Number(it.custoUnitario),
        subtotal: Number(it.subtotal),
      })),
    }));

    return reply.send({
      sucesso: true,
      dados: formatadas,
    });
  });

  /**
   * GET /api/vendas-balcao/:id
   * Obter detalhes completos da venda de balcão para emissão de comprovante/recibo
   */
  app.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = request.tenant!;
    const { id } = request.params as { id: string };

    const venda = await prisma.vendaBalcao.findFirst({
      where: { id, empresaId: tenant.empresaId },
      include: {
        empresa: {
          select: {
            razaoSocial: true,
            nomeFantasia: true,
            cnpj: true,
            telefone: true,
            cidade: true,
            uf: true,
          },
        },
        usuario: { select: { id: true, nome: true } },
        itens: {
          include: {
            produto: {
              select: {
                id: true,
                codigo: true,
                descricao: true,
                unidadeMedida: true,
                fotoUrl: true,
                localizacao: true,
              },
            },
          },
        },
      },
    });

    if (!venda) {
      return reply.status(404).send({ sucesso: false, mensagem: 'Venda de balcão não localizada.' });
    }

    return reply.send({
      sucesso: true,
      dados: {
        ...venda,
        subtotal: Number(venda.subtotal),
        desconto: Number(venda.desconto),
        valorTotal: Number(venda.valorTotal),
        itens: venda.itens.map((it) => ({
          ...it,
          quantidade: Number(it.quantidade),
          precoUnitario: Number(it.precoUnitario),
          custoUnitario: Number(it.custoUnitario),
          subtotal: Number(it.subtotal),
        })),
      },
    });
  });

  /**
   * POST /api/vendas-balcao
   * Realizar Venda Balcão Completa
   * Valida estoque, calcula totais, baixa estoque, atualiza últimoPrecoVenda e gera comprovante.
   */
  app.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = request.tenant!;
    const parsed = CriarVendaBalcaoSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        sucesso: false,
        mensagem: parsed.error.errors[0]?.message || 'Dados inválidos.',
      });
    }

    const {
      clienteNome,
      clienteDocumento,
      clienteTelefone,
      formaPagamento,
      desconto,
      itens,
      observacoes,
    } = parsed.data;

    const ano = new Date().getFullYear();

    const resultado = await prisma.$transaction(async (tx) => {
      // 1. Obter número sequencial
      const ultimaVenda = await tx.vendaBalcao.findFirst({
        where: { empresaId: tenant.empresaId },
        orderBy: { numeroSequencial: 'desc' },
      });
      const proximoNumero = (ultimaVenda?.numeroSequencial || 0) + 1;
      const codigoVenda = `VB-${ano}-${String(proximoNumero).padStart(4, '0')}`;

      // 2. Validar cada item e calcular subtotais
      let subtotalCalculado = 0;
      const itensValidados: Array<{
        produto: any;
        quantidade: number;
        precoUnitario: number;
        custoUnitario: number;
        subtotal: number;
      }> = [];

      for (const item of itens) {
        const prod = await tx.produto.findFirst({
          where: { id: item.produtoId, empresaId: tenant.empresaId },
        });

        if (!prod) {
          throw new Error(`Peça/Produto ID '${item.produtoId}' não encontrado.`);
        }

        const saldoFisico = Number(prod.saldoFisico);
        if (saldoFisico < item.quantidade) {
          throw new Error(
            `Estoque insuficiente para '${prod.descricao}'. Disponível em estoque: ${saldoFisico} ${prod.unidadeMedida}, Solicitado: ${item.quantidade} ${prod.unidadeMedida}.`
          );
        }

        const subtotal = item.quantidade * item.precoUnitario;
        subtotalCalculado += subtotal;

        itensValidados.push({
          produto: prod,
          quantidade: item.quantidade,
          precoUnitario: item.precoUnitario,
          custoUnitario: Number(prod.custoMedio) > 0 ? Number(prod.custoMedio) : Number(prod.precoCusto),
          subtotal,
        });
      }

      const valorTotal = Math.max(0, subtotalCalculado - (desconto || 0));

      // 3. Criar registro da Venda Balcão
      const venda = await tx.vendaBalcao.create({
        data: {
          empresaId: tenant.empresaId,
          usuarioId: tenant.usuarioId,
          codigoVenda,
          numeroSequencial: proximoNumero,
          clienteNome,
          clienteDocumento,
          clienteTelefone,
          formaPagamento,
          subtotal: subtotalCalculado,
          desconto: desconto || 0,
          valorTotal,
          status: StatusVendaBalcao.CONCLUIDA,
          observacoes,
        },
      });

      // 4. Inserir itens e baixar estoque com atualização de últimoPrecoVenda
      for (const it of itensValidados) {
        await tx.itemVendaBalcao.create({
          data: {
            vendaId: venda.id,
            produtoId: it.produto.id,
            quantidade: it.quantidade,
            precoUnitario: it.precoUnitario,
            custoUnitario: it.custoUnitario,
            subtotal: it.subtotal,
          },
        });

        const saldoAnterior = Number(it.produto.saldoFisico);
        const novoSaldo = saldoAnterior - it.quantidade;

        // Atualizar produto no estoque
        await tx.produto.update({
          where: { id: it.produto.id },
          data: {
            saldoFisico: { decrement: it.quantidade },
            ultimoPrecoVenda: it.precoUnitario, // Mantém atualizado o último preço de venda praticado
          },
        });

        // Registrar movimentação de estoque com rastreabilidade
        await tx.movimentoEstoque.create({
          data: {
            empresaId: tenant.empresaId,
            produtoId: it.produto.id,
            usuarioId: tenant.usuarioId,
            tipo: TipoMovimentoEstoque.VENDA_DIRETA,
            quantidade: it.quantidade,
            saldoFisicoAnterior: saldoAnterior,
            saldoFisicoNovo: novoSaldo,
            saldoReservadoAnterior: Number(it.produto.saldoReservado),
            saldoReservadoNovo: Number(it.produto.saldoReservado),
            origemDocumento: codigoVenda,
            motivo: `Venda balcão para cliente '${clienteNome}'`,
          },
        });
      }

      // 5. Registrar auditoria
      await AuditoriaService.registrar({
        empresaId: tenant.empresaId,
        usuarioId: tenant.usuarioId,
        operacao: TipoOperacaoAuditoria.CRIACAO,
        entidade: 'VendaBalcao',
        entidadeId: venda.id,
        detalhes: {
          codigoVenda,
          clienteNome,
          formaPagamento,
          valorTotal,
          totalItens: itens.length,
        },
      });

      return {
        vendaId: venda.id,
        codigoVenda,
        valorTotal,
        formaPagamento,
      };
    });

    return reply.status(201).send({
      sucesso: true,
      mensagem: `Venda balcão ${resultado.codigoVenda} finalizada com sucesso!`,
      dados: resultado,
    });
  });

  /**
   * POST /api/vendas-balcao/:id/cancelar
   * Cancelar uma venda de balcão e estornar mercadorias ao estoque físico
   */
  app.post('/:id/cancelar', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = request.tenant!;
    const { id } = request.params as { id: string };
    const { motivo } = (request.body as { motivo?: string }) || {};

    const venda = await prisma.vendaBalcao.findFirst({
      where: { id, empresaId: tenant.empresaId },
      include: { itens: { include: { produto: true } } },
    });

    if (!venda) {
      return reply.status(404).send({ sucesso: false, mensagem: 'Venda não localizada.' });
    }

    if (venda.status === StatusVendaBalcao.CANCELADA) {
      return reply.status(400).send({ sucesso: false, mensagem: 'Esta venda já está cancelada.' });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Marcar como cancelada
      await tx.vendaBalcao.update({
        where: { id: venda.id },
        data: { status: StatusVendaBalcao.CANCELADA },
      });

      // 2. Estornar cada item de volta ao estoque físico
      for (const item of venda.itens) {
        const saldoAnterior = Number(item.produto.saldoFisico);
        const novoSaldo = saldoAnterior + Number(item.quantidade);

        await tx.produto.update({
          where: { id: item.produto.id },
          data: { saldoFisico: { increment: Number(item.quantidade) } },
        });

        await tx.movimentoEstoque.create({
          data: {
            empresaId: tenant.empresaId,
            produtoId: item.produto.id,
            usuarioId: tenant.usuarioId,
            tipo: TipoMovimentoEstoque.DEVOLUCAO,
            quantidade: Number(item.quantidade),
            saldoFisicoAnterior: saldoAnterior,
            saldoFisicoNovo: novoSaldo,
            saldoReservadoAnterior: Number(item.produto.saldoReservado),
            saldoReservadoNovo: Number(item.produto.saldoReservado),
            origemDocumento: `CANCELAMENTO-${venda.codigoVenda}`,
            motivo: motivo || `Estorno por cancelamento da venda balcão ${venda.codigoVenda}`,
          },
        });
      }

      // 3. Auditoria
      await AuditoriaService.registrar({
        empresaId: tenant.empresaId,
        usuarioId: tenant.usuarioId,
        operacao: TipoOperacaoAuditoria.ALTERACAO,
        entidade: 'VendaBalcao',
        entidadeId: venda.id,
        detalhes: {
          dadosAnteriores: { status: venda.status },
          dadosNovos: { status: StatusVendaBalcao.CANCELADA, motivoCancelamento: motivo },
        },
      });
    });

    return reply.send({
      sucesso: true,
      mensagem: `Venda ${venda.codigoVenda} cancelada e peças estornadas ao estoque!`,
    });
  });
}
