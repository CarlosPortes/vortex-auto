import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../prisma.js';
import {
  RegistrarDiagnosticoSchema,
  CriarVersaoOrcamentoSchema,
  RegistrarDecisaoComercialSchema,
  PermissaoAcesso,
  StatusAtendimento,
  StatusVersaoOrcamento,
  DecisaoItemOrcamento,
  TipoOperacaoAuditoria,
} from '@vortex/shared';
import { tenantMiddleware, exigirPermissao } from '../middlewares/tenant.middleware.js';
import { AuditoriaService } from '../services/auditoria.service.js';

export async function orcamentosRoutes(app: FastifyInstance) {
  app.addHook('onRequest', async (req) => req.jwtVerify());
  app.addHook('onRequest', tenantMiddleware);

  /**
   * POST /api/atendimentos/:id/diagnostico
   * Registrar Diagnóstico Técnico (HU-010)
   */
  app.post(
    '/atendimentos/:id/diagnostico',
    { preHandler: [exigirPermissao(PermissaoAcesso.DIAGNOSTICO_REGISTRAR)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenant = request.tenant!;
      const { id: atendimentoId } = request.params as { id: string };

      const parseResult = RegistrarDiagnosticoSchema.safeParse({
        ...request.body as any,
        atendimentoId,
      });

      if (!parseResult.success) {
        return reply.status(400).send({
          sucesso: false,
          mensagem: 'Dados inválidos do diagnóstico',
          erros: parseResult.error.errors.map((e) => ({ campo: e.path.join('.'), mensagem: e.message })),
        });
      }

      const data = parseResult.data;

      const atendimento = await prisma.atendimento.findFirst({
        where: { id: atendimentoId, empresaId: tenant.empresaId },
      });

      if (!atendimento) {
        return reply.status(404).send({ sucesso: false, mensagem: 'Atendimento não encontrado.' });
      }

      const diagnostico = await prisma.diagnostico.create({
        data: {
          empresaId: tenant.empresaId,
          atendimentoId,
          responsavelTecnicoId: tenant.usuarioId,
          relatoTecnico: data.relatoTecnico,
          constatacoes: data.constatacoes,
          conclusao: data.conclusao,
          procedimentoRecomendado: data.procedimentoRecomendado || null,
        },
        include: {
          responsavelTecnico: { select: { id: true, nome: true } },
        },
      });

      // Atualizar status do atendimento para ORCAMENTO_PENDENTE se necessário
      if (atendimento.status === StatusAtendimento.CONFIRMADO || atendimento.status === StatusAtendimento.EM_DIAGNOSTICO) {
        await prisma.atendimento.update({
          where: { id: atendimento.id },
          data: { status: StatusAtendimento.ORCAMENTO_PENDENTE },
        });
      }

      // Auditoria
      await AuditoriaService.registrar({
        empresaId: tenant.empresaId,
        unidadeId: tenant.unidadeId,
        usuarioId: tenant.usuarioId,
        operacao: TipoOperacaoAuditoria.CRIACAO,
        entidade: 'Diagnostico',
        entidadeId: diagnostico.id,
        detalhes: {
          atendimentoCodigo: atendimento.codigoFormatado,
          conclusao: data.conclusao,
          tecnico: tenant.nomeUsuario,
        },
        ipOrigem: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return reply.status(201).send({
        sucesso: true,
        mensagem: 'Diagnóstico técnico registrado com sucesso!',
        dados: diagnostico,
      });
    }
  );

  /**
   * GET /api/atendimentos/:id/diagnostico
   */
  app.get('/atendimentos/:id/diagnostico', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = request.tenant!;
    const { id: atendimentoId } = request.params as { id: string };

    const diagnosticos = await prisma.diagnostico.findMany({
      where: { atendimentoId, empresaId: tenant.empresaId },
      include: {
        responsavelTecnico: { select: { id: true, nome: true, email: true } },
      },
      orderBy: { criadoEm: 'desc' },
    });

    return reply.send({ sucesso: true, dados: diagnosticos });
  });

  /**
   * POST /api/atendimentos/:id/orcamentos
   * Elaborar Nova Versão de Orçamento (HU-011)
   */
  app.post(
    '/atendimentos/:id/orcamentos',
    { preHandler: [exigirPermissao(PermissaoAcesso.ORCAMENTO_CRIAR)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenant = request.tenant!;
      const { id: atendimentoId } = request.params as { id: string };

      const parseResult = CriarVersaoOrcamentoSchema.safeParse({
        ...request.body as any,
        atendimentoId,
      });

      if (!parseResult.success) {
        return reply.status(400).send({
          sucesso: false,
          mensagem: 'Dados inválidos do orçamento',
          erros: parseResult.error.errors.map((e) => ({ campo: e.path.join('.'), mensagem: e.message })),
        });
      }

      const data = parseResult.data;

      const atendimento = await prisma.atendimento.findFirst({
        where: { id: atendimentoId, empresaId: tenant.empresaId },
      });

      if (!atendimento) {
        return reply.status(404).send({ sucesso: false, mensagem: 'Atendimento não encontrado.' });
      }

      // Localizar ou criar Orcamento mestre
      let orcamento = await prisma.orcamento.findUnique({
        where: { atendimentoId },
      });

      if (!orcamento) {
        orcamento = await prisma.orcamento.create({
          data: {
            empresaId: tenant.empresaId,
            atendimentoId,
          },
        });
      }

      // Obter número da próxima versão
      const ultimaVersao = await prisma.versaoOrcamento.findFirst({
        where: { orcamentoId: orcamento.id },
        orderBy: { numeroVersao: 'desc' },
        select: { numeroVersao: true },
      });

      const proximaVersao = (ultimaVersao?.numeroVersao || 0) + 1;

      // Calcular subtotais com precisão
      let totalPecas = 0;
      let totalServicos = 0;
      let totalDesconto = 0;

      const itensPreparados = data.itens.map((it) => {
        const subtotal = it.quantidade * it.valorUnitario;
        const total = Math.max(0, subtotal - it.valorDesconto);

        if (it.tipo === 'PECA') {
          totalPecas += total;
        } else {
          totalServicos += total;
        }
        totalDesconto += it.valorDesconto;

        return {
          empresaId: tenant.empresaId,
          tipo: it.tipo,
          descricao: it.descricao,
          quantidade: it.quantidade,
          unidadeMedida: it.unidadeMedida,
          valorUnitario: it.valorUnitario,
          valorDesconto: it.valorDesconto,
          valorTotal: total,
          decisao: DecisaoItemOrcamento.PENDENTE,
        };
      });

      const totalFinal = totalPecas + totalServicos;

      const versaoCriada = await prisma.$transaction(async (tx) => {
        const versao = await tx.versaoOrcamento.create({
          data: {
            empresaId: tenant.empresaId,
            orcamentoId: orcamento.id,
            numeroVersao: proximaVersao,
            status: StatusVersaoOrcamento.RASCUNHO,
            validadeDias: data.validadeDias,
            observacoesComerciais: data.observacoesComerciais || null,
            valorTotalPecas: totalPecas,
            valorTotalServicos: totalServicos,
            valorDescontoGeral: totalDesconto,
            valorTotalFinal: totalFinal,
            itens: {
              create: itensPreparados,
            },
          },
          include: { itens: true },
        });

        // Atualizar status do atendimento para ORCAMENTO_PENDENTE
        await tx.atendimento.update({
          where: { id: atendimento.id },
          data: { status: StatusAtendimento.ORCAMENTO_PENDENTE },
        });

        return versao;
      });

      // Auditoria
      await AuditoriaService.registrar({
        empresaId: tenant.empresaId,
        unidadeId: tenant.unidadeId,
        usuarioId: tenant.usuarioId,
        operacao: TipoOperacaoAuditoria.CRIACAO,
        entidade: 'VersaoOrcamento',
        entidadeId: versaoCriada.id,
        detalhes: {
          atendimentoCodigo: atendimento.codigoFormatado,
          versao: proximaVersao,
          valorTotal: totalFinal,
          itensCount: data.itens.length,
        },
        ipOrigem: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return reply.status(201).send({
        sucesso: true,
        mensagem: `Versão ${proximaVersao} do orçamento criada com sucesso!`,
        dados: versaoCriada,
      });
    }
  );

  /**
   * GET /api/atendimentos/:id/orcamentos
   * Consulta versões do orçamento de um atendimento
   */
  app.get('/atendimentos/:id/orcamentos', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = request.tenant!;
    const { id: atendimentoId } = request.params as { id: string };

    const orcamento = await prisma.orcamento.findUnique({
      where: { atendimentoId },
      include: {
        versoes: {
          orderBy: { numeroVersao: 'desc' },
          include: {
            itens: { orderBy: { criadoEm: 'asc' } },
            decisoes: {
              include: { usuarioRegistrador: { select: { id: true, nome: true } } },
              orderBy: { dataDecisao: 'desc' },
            },
          },
        },
      },
    });

    return reply.send({
      sucesso: true,
      dados: orcamento ? orcamento.versoes : [],
    });
  });

  /**
   * POST /api/orcamentos/versoes/:versaoId/apresentar
   * Apresentar Proposta ao Cliente (HU-011 - torna a versão imutável)
   */
  app.post(
    '/orcamentos/versoes/:versaoId/apresentar',
    { preHandler: [exigirPermissao(PermissaoAcesso.ORCAMENTO_APRESENTAR)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenant = request.tenant!;
      const { versaoId } = request.params as { versaoId: string };

      const versao = await prisma.versaoOrcamento.findFirst({
        where: { id: versaoId, empresaId: tenant.empresaId },
        include: { orcamento: { include: { atendimento: true } } },
      });

      if (!versao) {
        return reply.status(404).send({ sucesso: false, mensagem: 'Versão do orçamento não encontrada.' });
      }

      const atualizado = await prisma.$transaction(async (tx) => {
        const v = await tx.versaoOrcamento.update({
          where: { id: versao.id },
          data: {
            status: StatusVersaoOrcamento.APRESENTADA,
            apresentadaEm: new Date(),
          },
        });

        await tx.atendimento.update({
          where: { id: versao.orcamento.atendimentoId },
          data: { status: StatusAtendimento.AGUARDANDO_APROVACAO },
        });

        return v;
      });

      // Auditoria
      await AuditoriaService.registrar({
        empresaId: tenant.empresaId,
        unidadeId: tenant.unidadeId,
        usuarioId: tenant.usuarioId,
        operacao: TipoOperacaoAuditoria.ALTERACAO,
        entidade: 'VersaoOrcamento',
        entidadeId: versao.id,
        detalhes: {
          atendimentoCodigo: versao.orcamento.atendimento.codigoFormatado,
          versao: versao.numeroVersao,
          acao: 'APRESENTADO_AO_CLIENTE',
        },
        ipOrigem: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return reply.send({
        sucesso: true,
        mensagem: 'Orçamento apresentado ao cliente. Aguardando decisão comercial.',
        dados: atualizado,
      });
    }
  );

  /**
   * POST /api/orcamentos/versoes/:versaoId/decisao
   * Registrar Aprovação ou Recusa por Item (HU-012 e HU-013)
   */
  app.post(
    '/orcamentos/versoes/:versaoId/decisao',
    { preHandler: [exigirPermissao(PermissaoAcesso.ORCAMENTO_DECIDIR)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenant = request.tenant!;
      const { versaoId } = request.params as { versaoId: string };

      const parseResult = RegistrarDecisaoComercialSchema.safeParse({
        ...request.body as any,
        versaoOrcamentoId: versaoId,
      });

      if (!parseResult.success) {
        return reply.status(400).send({
          sucesso: false,
          mensagem: 'Dados inválidos da decisão comercial',
          erros: parseResult.error.errors.map((e) => ({ campo: e.path.join('.'), mensagem: e.message })),
        });
      }

      const data = parseResult.data;

      const versao = await prisma.versaoOrcamento.findFirst({
        where: { id: versaoId, empresaId: tenant.empresaId },
        include: {
          itens: true,
          orcamento: { include: { atendimento: true } },
        },
      });

      if (!versao) {
        return reply.status(404).send({ sucesso: false, mensagem: 'Versão do orçamento não encontrada.' });
      }

      const resultado = await prisma.$transaction(async (tx) => {
        // 1. Atualizar decisão individual de cada item
        for (const itemDecisao of data.decisoesItens) {
          await tx.itemOrcamento.update({
            where: { id: itemDecisao.itemId },
            data: {
              decisao: itemDecisao.decisao,
              justificativaDecisao: itemDecisao.justificativa || null,
            },
          });
        }

        // 2. Criar registro de decisão comercial rastreável (DOC-003, DOC-004)
        const decisaoRegistro = await tx.decisaoComercial.create({
          data: {
            empresaId: tenant.empresaId,
            versaoOrcamentoId: versao.id,
            canal: data.canal,
            autorizadorNome: data.autorizadorNome,
            documentoAutorizador: data.documentoAutorizador || null,
            evidenciaTexto: data.evidenciaTexto || null,
            usuarioRegistradorId: tenant.usuarioId,
          },
        });

        // 3. Determinar novo status da versão
        const itensAtualizados = await tx.itemOrcamento.findMany({
          where: { versaoOrcamentoId: versao.id },
        });

        const totalItens = itensAtualizados.length;
        const totalAprovados = itensAtualizados.filter((i) => i.decisao === DecisaoItemOrcamento.APROVADO).length;
        const totalRecusados = itensAtualizados.filter((i) => i.decisao === DecisaoItemOrcamento.RECUSADO).length;

        let novoStatusVersao = StatusVersaoOrcamento.APROVADA_PARCIAL;
        if (totalAprovados === totalItens) {
          novoStatusVersao = StatusVersaoOrcamento.APROVADA_TOTAL;
        } else if (totalRecusados === totalItens) {
          novoStatusVersao = StatusVersaoOrcamento.RECUSADA;
        }

        const versaoAtualizada = await tx.versaoOrcamento.update({
          where: { id: versao.id },
          data: { status: novoStatusVersao },
        });

        // 4. Se houver pelo menos um item aprovado, o atendimento avança para EM_EXECUCAO
        if (totalAprovados > 0) {
          await tx.atendimento.update({
            where: { id: versao.orcamento.atendimentoId },
            data: { status: StatusAtendimento.EM_EXECUCAO },
          });
        }

        return { versaoAtualizada, decisaoRegistro, totalAprovados, totalRecusados };
      });

      // Auditoria Rastreável
      await AuditoriaService.registrar({
        empresaId: tenant.empresaId,
        unidadeId: tenant.unidadeId,
        usuarioId: tenant.usuarioId,
        operacao: TipoOperacaoAuditoria.AUTORIZACAO_COMERCIAL,
        entidade: 'DecisaoComercial',
        entidadeId: resultado.decisaoRegistro.id,
        detalhes: {
          atendimentoCodigo: versao.orcamento.atendimento.codigoFormatado,
          versao: versao.numeroVersao,
          canal: data.canal,
          autorizador: data.autorizadorNome,
          aprovados: resultado.totalAprovados,
          recusados: resultado.totalRecusados,
          novoStatus: resultado.versaoAtualizada.status,
        },
        ipOrigem: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return reply.send({
        sucesso: true,
        mensagem: `Decisão comercial registrada via ${data.canal} por ${data.autorizadorNome}!`,
        dados: resultado,
      });
    }
  );
}
