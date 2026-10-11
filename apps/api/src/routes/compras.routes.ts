import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../prisma.js';
import {
  CriarCompraSchema,
  CriticidadeMRP,
  StatusCompra,
  TipoOperacaoAuditoria,
  TipoMovimentoEstoque,
  ItemSugestaoMRP,
  ResumoMRP,
} from '@vortex/shared';
import { tenantMiddleware } from '../middlewares/tenant.middleware.js';
import { AuditoriaService } from '../services/auditoria.service.js';

export async function comprasRoutes(app: FastifyInstance) {
  app.addHook('onRequest', async (req) => req.jwtVerify());
  app.addHook('onRequest', tenantMiddleware);

  /**
   * GET /api/compras/mrp/sugestoes
   * Motor de MRP Básico: Analisa demanda de OS em aberto + estoque mínimo de segurança
   * e gera a lista prioritária de sugestão de compras com Custo Médio e Necessidade Líquida.
   */
  app.get('/mrp/sugestoes', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = request.tenant!;

    // 1. Buscar todos os produtos ativos da empresa
    const produtos = await prisma.produto.findMany({
      where: {
        empresaId: tenant.empresaId,
        ativo: true,
      },
      orderBy: { descricao: 'asc' },
    });

    // 2. Buscar todas as reservas ativas vinculadas a atendimentos/OS abertas
    const reservasAtivas = await prisma.reservaEstoque.findMany({
      where: {
        empresaId: tenant.empresaId,
        status: 'ATIVA',
      },
      include: {
        atendimento: {
          include: {
            cliente: { select: { nomeRazao: true } },
            veiculo: { select: { modelo: true, placa: true } },
            ordemServico: {
              select: { id: true, codigoFormatado: true, status: true },
            },
          },
        },
      },
    });

    // Agrupar reservas ativas por produtoId
    const reservasPorProduto = new Map<string, { totalQtd: number; ordens: any[] }>();
    for (const res of reservasAtivas) {
      const pid = res.produtoId;
      if (!reservasPorProduto.has(pid)) {
        reservasPorProduto.set(pid, { totalQtd: 0, ordens: [] });
      }
      const entry = reservasPorProduto.get(pid)!;
      const qtd = Number(res.quantidade);
      entry.totalQtd += qtd;

      const osCodigo = res.atendimento.ordemServico?.codigoFormatado || res.atendimento.codigoFormatado;
      const veiculoStr = res.atendimento.veiculo ? `${res.atendimento.veiculo.modelo} (${res.atendimento.veiculo.placa})` : 'Veículo não informado';
      const clienteStr = res.atendimento.cliente?.nomeRazao || 'Cliente não informado';

      entry.ordens.push({
        osId: res.atendimento.ordemServico?.id || res.atendimentoId,
        osCodigo,
        veiculo: veiculoStr,
        cliente: clienteStr,
        quantidadeNecessaria: qtd,
      });
    }

    // 3. Processar cada produto segundo as regras de MRP
    const itensSugeridos: ItemSugestaoMRP[] = [];

    for (const prod of produtos) {
      const saldoFisico = Number(prod.saldoFisico);
      const saldoReservado = Number(prod.saldoReservado);
      const saldoDisponivel = saldoFisico - saldoReservado;
      const estoqueMinimo = Number(prod.estoqueMinimo);

      const demandaObj = reservasPorProduto.get(prod.id);
      const demandaOS = demandaObj ? demandaObj.totalQtd : 0;
      const ordensRelacionadas = demandaObj ? demandaObj.ordens : [];

      // Fórmula da Necessidade Líquida:
      // Se há demanda de OS que supera o físico ou se o disponível está abaixo do mínimo
      const necessidadeLiquida = Math.max(0, (demandaOS + estoqueMinimo) - saldoFisico);

      const custoMedio = Number(prod.custoMedio) > 0 ? Number(prod.custoMedio) : Number(prod.precoCusto);
      const ultimoPrecoCompra = prod.ultimoPrecoCompra ? Number(prod.ultimoPrecoCompra) : custoMedio;
      const ultimoPrecoVenda = prod.ultimoPrecoVenda ? Number(prod.ultimoPrecoVenda) : Number(prod.precoVenda);

      let criticidade: CriticidadeMRP = CriticidadeMRP.ESTAVEL;
      let motivoUrgencia = 'Estoque suficiente para a demanda atual.';

      if (demandaOS > saldoFisico) {
        criticidade = CriticidadeMRP.CRITICO;
        motivoUrgencia = `Demanda de OS (${demandaOS} ${prod.unidadeMedida}) supera o saldo físico (${saldoFisico} ${prod.unidadeMedida})! Carros aguardando peças.`;
      } else if (saldoDisponivel <= estoqueMinimo && (necessidadeLiquida > 0 || estoqueMinimo > 0)) {
        criticidade = CriticidadeMRP.REPOSICAO;
        motivoUrgencia = `Saldo disponível (${saldoDisponivel} ${prod.unidadeMedida}) está no ponto de pedido ou abaixo do estoque mínimo (${estoqueMinimo} ${prod.unidadeMedida}).`;
      }

      if (criticidade !== CriticidadeMRP.ESTAVEL || necessidadeLiquida > 0) {
        itensSugeridos.push({
          produtoId: prod.id,
          codigo: prod.codigo,
          descricao: prod.descricao,
          fotoUrl: prod.fotoUrl,
          localizacao: prod.localizacao,
          saldoFisico,
          saldoReservado,
          saldoDisponivel,
          estoqueMinimo,
          demandaOS,
          necessidadeLiquida: necessidadeLiquida > 0 ? necessidadeLiquida : Math.max(1, estoqueMinimo - saldoDisponivel),
          custoMedio,
          ultimoPrecoCompra,
          ultimoPrecoVenda,
          precoCustoAtual: Number(prod.precoCusto),
          custoTotalEstimado: (necessidadeLiquida > 0 ? necessidadeLiquida : Math.max(1, estoqueMinimo - saldoDisponivel)) * ultimoPrecoCompra,
          criticidade,
          motivoUrgencia,
          ordensRelacionadas,
        });
      }
    }

    // 4. Ordenar itens: CRITICO primeiro, depois REPOSICAO, depois por necessidade decrescente
    itensSugeridos.sort((a, b) => {
      const prioridade = { [CriticidadeMRP.CRITICO]: 1, [CriticidadeMRP.REPOSICAO]: 2, [CriticidadeMRP.ESTAVEL]: 3 };
      if (prioridade[a.criticidade] !== prioridade[b.criticidade]) {
        return prioridade[a.criticidade] - prioridade[b.criticidade];
      }
      return b.necessidadeLiquida - a.necessidadeLiquida;
    });

    const totalItensCriticos = itensSugeridos.filter((i) => i.criticidade === CriticidadeMRP.CRITICO).length;
    const totalItensReposicao = itensSugeridos.filter((i) => i.criticidade === CriticidadeMRP.REPOSICAO).length;
    const totalPecasNecessarias = itensSugeridos.reduce((acc, i) => acc + i.necessidadeLiquida, 0);
    const custoTotalSugerido = itensSugeridos.reduce((acc, i) => acc + i.custoTotalEstimado, 0);

    const resumo: ResumoMRP = {
      totalItensCriticos,
      totalItensReposicao,
      totalPecasNecessarias,
      custoTotalSugerido,
      itens: itensSugeridos,
    };

    return reply.send({
      sucesso: true,
      dados: resumo,
    });
  });

  /**
   * GET /api/compras
   * Listar todas as compras / Notas Fiscais efetuadas pela empresa
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
        { fornecedorNome: { contains: q, mode: 'insensitive' } },
        { numeroNota: { contains: q, mode: 'insensitive' } },
        { chaveAcesso: { contains: q, mode: 'insensitive' } },
      ];
    }

    const compras = await prisma.compra.findMany({
      where,
      include: {
        usuario: { select: { id: true, nome: true, email: true } },
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
                custoMedio: true,
                ultimoPrecoCompra: true,
              },
            },
          },
        },
      },
      orderBy: { criadoEm: 'desc' },
    });

    const formatadas = compras.map((c) => ({
      ...c,
      valorTotal: Number(c.valorTotal),
      itens: c.itens.map((it) => ({
        ...it,
        quantidade: Number(it.quantidade),
        precoUnitario: Number(it.precoUnitario),
        subtotal: Number(it.subtotal),
        produto: {
          ...it.produto,
          custoMedio: Number(it.produto.custoMedio),
          ultimoPrecoCompra: it.produto.ultimoPrecoCompra ? Number(it.produto.ultimoPrecoCompra) : null,
        },
      })),
    }));

    return reply.send({
      sucesso: true,
      dados: formatadas,
    });
  });

  /**
   * GET /api/compras/:id
   * Obter detalhes de uma compra ou nota fiscal específica
   */
  app.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = request.tenant!;
    const { id } = request.params as { id: string };

    const compra = await prisma.compra.findFirst({
      where: { id, empresaId: tenant.empresaId },
      include: {
        usuario: { select: { id: true, nome: true } },
        itens: {
          include: {
            produto: true,
          },
        },
      },
    });

    if (!compra) {
      return reply.status(404).send({ sucesso: false, mensagem: 'Compra não localizada.' });
    }

    return reply.send({
      sucesso: true,
      dados: {
        ...compra,
        valorTotal: Number(compra.valorTotal),
        itens: compra.itens.map((it) => ({
          ...it,
          quantidade: Number(it.quantidade),
          precoUnitario: Number(it.precoUnitario),
          subtotal: Number(it.subtotal),
          produto: {
            ...it.produto,
            precoCusto: Number(it.produto.precoCusto),
            precoVenda: Number(it.produto.precoVenda),
            custoMedio: Number(it.produto.custoMedio),
            ultimoPrecoCompra: it.produto.ultimoPrecoCompra ? Number(it.produto.ultimoPrecoCompra) : null,
            ultimoPrecoVenda: it.produto.ultimoPrecoVenda ? Number(it.produto.ultimoPrecoVenda) : null,
          },
        })),
      },
    });
  });

  /**
   * POST /api/compras
   * Registrar Compra / Recebimento de NF-e
   * Atualiza estoque físico, calcula Custo Médio Ponderado (CMP) e atualiza últimoPrecoCompra no cadastro.
   */
  app.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = request.tenant!;
    const parsed = CriarCompraSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        sucesso: false,
        mensagem: parsed.error.errors[0]?.message || 'Dados inválidos.',
      });
    }

    const {
      fornecedorNome,
      fornecedorCnpj,
      numeroNota,
      serie,
      chaveAcesso,
      dataEmissao,
      dataRecebimento,
      status,
      itens,
      observacoes,
    } = parsed.data;

    // Calcular valor total da compra
    let valorTotalCalculado = 0;
    for (const item of itens) {
      valorTotalCalculado += item.quantidade * item.precoUnitario;
    }

    // Executar transação atômica
    const resultado = await prisma.$transaction(async (tx) => {
      // 1. Criar cabeçalho da Compra
      const compraCriada = await tx.compra.create({
        data: {
          empresaId: tenant.empresaId,
          usuarioId: tenant.usuarioId,
          fornecedorNome,
          fornecedorCnpj,
          numeroNota,
          serie,
          chaveAcesso,
          status,
          dataEmissao: dataEmissao ? new Date(dataEmissao) : new Date(),
          dataRecebimento: dataRecebimento ? new Date(dataRecebimento) : new Date(),
          valorTotal: valorTotalCalculado,
          observacoes,
        },
      });

      const itensProcessados = [];

      // 2. Processar cada item
      for (const item of itens) {
        const prod = await tx.produto.findFirst({
          where: { id: item.produtoId, empresaId: tenant.empresaId },
        });

        if (!prod) {
          throw new Error(`Produto ID '${item.produtoId}' não localizado no catálogo da empresa.`);
        }

        const subtotal = item.quantidade * item.precoUnitario;

        // Criar item da compra
        const itemCriado = await tx.itemCompra.create({
          data: {
            compraId: compraCriada.id,
            produtoId: item.produtoId,
            quantidade: item.quantidade,
            precoUnitario: item.precoUnitario,
            subtotal,
          },
        });
        itensProcessados.push(itemCriado);

        // Se a compra for recebida (entrada física de mercadoria no estoque)
        if (status === StatusCompra.RECEBIDO) {
          const saldoAnterior = Number(prod.saldoFisico);
          const custoMedioAnterior =
            Number(prod.custoMedio) > 0 ? Number(prod.custoMedio) : Number(prod.precoCusto);
          const qtdComprada = item.quantidade;
          const precoCompra = item.precoUnitario;

          const novoSaldoFisico = saldoAnterior + qtdComprada;

          // Fórmula do Custo Médio Ponderado (CMP):
          // Novo Custo Médio = ((Saldo Anterior * Custo Anterior) + (Qtd Comprada * Preco Compra)) / Novo Saldo
          const novoCustoMedio =
            novoSaldoFisico > 0
              ? (saldoAnterior * custoMedioAnterior + qtdComprada * precoCompra) / novoSaldoFisico
              : precoCompra;

          // Atualizar Produto
          await tx.produto.update({
            where: { id: prod.id },
            data: {
              saldoFisico: { increment: qtdComprada },
              custoMedio: novoCustoMedio,
              ultimoPrecoCompra: precoCompra,
              precoCusto: novoCustoMedio, // sincroniza precoCusto com o custo médio ponderado
            },
          });

          // Registrar Movimento de Estoque
          await tx.movimentoEstoque.create({
            data: {
              empresaId: tenant.empresaId,
              produtoId: prod.id,
              usuarioId: tenant.usuarioId,
              tipo: TipoMovimentoEstoque.ENTRADA,
              quantidade: qtdComprada,
              saldoFisicoAnterior: saldoAnterior,
              saldoFisicoNovo: novoSaldoFisico,
              saldoReservadoAnterior: Number(prod.saldoReservado),
              saldoReservadoNovo: Number(prod.saldoReservado),
              origemDocumento: numeroNota ? `NF-e ${numeroNota}` : `COMPRA-${compraCriada.id.slice(0, 8)}`,
              motivo: `Recebimento de compra NF-e / Fornecedor: ${fornecedorNome}`,
            },
          });
        }
      }

      // Registrar Auditoria
      await AuditoriaService.registrar({
        empresaId: tenant.empresaId,
        usuarioId: tenant.usuarioId,
        tipoOperacao: TipoOperacaoAuditoria.CRIACAO,
        entidade: 'Compra',
        entidadeId: compraCriada.id,
        dadosNovos: {
          compraId: compraCriada.id,
          fornecedor: fornecedorNome,
          numeroNota,
          valorTotal: valorTotalCalculado,
          totalItens: itens.length,
          status,
        },
      });

      return { compraCriada, valorTotalCalculado };
    });

    return reply.status(201).send({
      sucesso: true,
      mensagem:
        status === StatusCompra.RECEBIDO
          ? `Compra/NF-e registrada com sucesso! Estoque e Custo Médio Ponderado atualizados.`
          : `Pedido de Compra registrado com sucesso!`,
      dados: resultado,
    });
  });
}
