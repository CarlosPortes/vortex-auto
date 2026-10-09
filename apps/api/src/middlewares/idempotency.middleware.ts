import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../prisma.js';

export async function idempotenciaPreHandler(request: FastifyRequest, reply: FastifyReply) {
  const chave = request.headers['idempotency-key'] as string | undefined;

  // Se não foi enviada chave de idempotência ou requisição é GET/HEAD, prossegue normalmente
  if (!chave || request.method === 'GET' || request.method === 'HEAD') {
    return;
  }

  const empresaId = request.tenant?.empresaId;
  if (!empresaId) {
    return; // Se não tem tenant ainda, não aplica
  }

  try {
    const registro = await prisma.chaveIdempotencia.findUnique({
      where: {
        empresaId_chave: {
          empresaId,
          chave,
        },
      },
    });

    if (registro) {
      if (registro.expiraEm > new Date()) {
        // Retornar a mesma resposta em cache da operação anterior
        return reply
          .header('X-Cache-Idempotency', 'HIT')
          .status(registro.statusHttp)
          .send(registro.respostaJson);
      } else {
        // Expirado, remove registro antigo
        await prisma.chaveIdempotencia.delete({ where: { id: registro.id } });
      }
    }
  } catch (err) {
    console.error('[Idempotencia] Erro ao consultar chave:', err);
  }
}

/**
 * Salva a resposta gerada para a chave de idempotência
 */
export async function salvarRespostaIdempotente(
  empresaId: string,
  chave: string,
  rota: string,
  statusHttp: number,
  resposta: unknown
) {
  try {
    const expiraEm = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas de validade

    await prisma.chaveIdempotencia.upsert({
      where: {
        empresaId_chave: {
          empresaId,
          chave,
        },
      },
      update: {
        rota,
        statusHttp,
        respostaJson: JSON.parse(JSON.stringify(resposta)),
        expiraEm,
      },
      create: {
        empresaId,
        chave,
        rota,
        statusHttp,
        respostaJson: JSON.parse(JSON.stringify(resposta)),
        expiraEm,
      },
    });
  } catch (err) {
    console.error('[Idempotencia] Erro ao salvar chave:', err);
  }
}
