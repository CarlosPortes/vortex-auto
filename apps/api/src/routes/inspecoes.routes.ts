import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../prisma.js';
import {
  RegistrarInspecaoSchema,
  PermissaoAcesso,
  StatusAtendimento,
  TipoOperacaoAuditoria,
} from '@vortex/shared';
import { tenantMiddleware, exigirPermissao } from '../middlewares/tenant.middleware.js';
import { AuditoriaService } from '../services/auditoria.service.js';

export async function inspecoesRoutes(app: FastifyInstance) {
  app.addHook('onRequest', async (req) => req.jwtVerify());
  app.addHook('onRequest', tenantMiddleware);

  /**
   * GET /api/atendimentos/:id/inspecoes
   * Histórico de inspeções de qualidade do atendimento (HU-019)
   */
  app.get('/atendimentos/:id/inspecoes', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = request.tenant!;
    const { id: atendimentoId } = request.params as { id: string };

    const inspecoes = await prisma.inspecaoQualidade.findMany({
      where: { atendimentoId, empresaId: tenant.empresaId },
      include: {
        inspetor: { select: { id: true, nome: true, email: true } },
      },
      orderBy: { criadoEm: 'desc' },
    });

    return reply.send({
      sucesso: true,
      total: inspecoes.length,
      dados: inspecoes,
    });
  });

  /**
   * POST /api/atendimentos/:id/inspecoes
   * Registrar Inspeção Final de Qualidade / Check-out (HU-019 / DOC-003)
   */
  app.post(
    '/atendimentos/:id/inspecoes',
    { preHandler: [exigirPermissao(PermissaoAcesso.INSPECAO_EXECUTAR)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenant = request.tenant!;
      const { id: atendimentoId } = request.params as { id: string };

      const parseResult = RegistrarInspecaoSchema.safeParse({
        ...request.body as any,
        atendimentoId,
      });

      if (!parseResult.success) {
        return reply.status(400).send({
          sucesso: false,
          mensagem: 'Dados inválidos da inspeção de qualidade',
          erros: parseResult.error.errors.map((e) => ({
            campo: e.path.join('.'),
            mensagem: e.message,
          })),
        });
      }

      const { resultado, constatacoes, itensInspecionados, quilometragemTeste } = parseResult.data;

      // 1. Validar atendimento
      const atendimento = await prisma.atendimento.findFirst({
        where: { id: atendimentoId, empresaId: tenant.empresaId },
        include: { ordemServico: true },
      });

      if (!atendimento) {
        return reply.status(404).send({ sucesso: false, mensagem: 'Atendimento não encontrado.' });
      }

      // 2. Determinar novo status do atendimento
      let novoStatusAtendimento = atendimento.status;
      if (resultado === 'APROVADO_TOTAL' || resultado === 'APROVADO_COM_RESSALVA') {
        novoStatusAtendimento = StatusAtendimento.PRONTO_PARA_ENTREGA;
      } else if (resultado === 'REPROVADO') {
        // Se reprovado, volta para execução técnica
        novoStatusAtendimento = StatusAtendimento.EM_EXECUCAO;
      }

      const inspecao = await prisma.$transaction(async (tx) => {
        const insp = await tx.inspecaoQualidade.create({
          data: {
            empresaId: tenant.empresaId,
            atendimentoId,
            inspetorId: tenant.usuarioId,
            resultado,
            constatacoes,
            itensInspecionados,
            quilometragemTeste,
          },
        });

        if (novoStatusAtendimento !== atendimento.status) {
          await tx.atendimento.update({
            where: { id: atendimentoId },
            data: { status: novoStatusAtendimento },
          });
        }

        return insp;
      });

      await AuditoriaService.registrar({
        empresaId: tenant.empresaId,
        usuarioId: tenant.usuarioId,
        operacao: TipoOperacaoAuditoria.TRANSICAO_ESTADO,
        entidade: 'InspecaoQualidade',
        entidadeId: inspecao.id,
        detalhes: {
          atendimentoId,
          resultado,
          statusAnterior: atendimento.status,
          novoStatusAtendimento,
        },
      });

      return reply.status(201).send({
        sucesso: true,
        mensagem: resultado === 'REPROVADO'
          ? 'Inspeção reprovada registrada. Atendimento retornado para Execução Técnica.'
          : 'Inspeção de qualidade aprovada com sucesso! Veículo pronto para entrega.',
        dados: {
          ...inspecao,
          novoStatusAtendimento,
        },
      });
    }
  );
}
