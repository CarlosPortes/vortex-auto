import { prisma } from '../prisma.js';
import { IAuditoriaPayload } from '@vortex/shared';

export class AuditoriaService {
  /**
   * Grava um registro de auditoria de forma assíncrona sem bloquear a resposta principal
   */
  static async registrar(payload: IAuditoriaPayload): Promise<void> {
    try {
      await prisma.registroAuditoria.create({
        data: {
          empresaId: payload.empresaId,
          unidadeId: payload.unidadeId || null,
          usuarioId: payload.usuarioId || null,
          operacao: payload.operacao,
          entidade: payload.entidade,
          entidadeId: payload.entidadeId || null,
          detalhes: payload.detalhes ? JSON.parse(JSON.stringify(payload.detalhes)) : undefined,
          ipOrigem: payload.ipOrigem || null,
          userAgent: payload.userAgent || null,
          correlacaoId: payload.correlacaoId || null,
        },
      });
    } catch (err) {
      console.error('[AuditoriaService] Falha ao registrar evento de auditoria:', err);
    }
  }
}
