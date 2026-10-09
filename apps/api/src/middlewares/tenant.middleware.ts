import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../prisma.js';
import { ITenantContext, PerfilAcesso, PermissaoAcesso } from '@vortex/shared';

declare module 'fastify' {
  interface FastifyRequest {
    tenant?: ITenantContext;
    correlacaoId?: string;
  }
}

export async function tenantMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { usuarioId?: string; empresaId?: string; unidadeId?: string } | undefined;

  if (!user || !user.usuarioId) {
    return reply.status(401).send({
      sucesso: false,
      mensagem: 'Sessão inválida ou não autenticada',
    });
  }

  // Obter empresaId e unidadeId do token ou dos headers
  const empresaId = user.empresaId || (request.headers['x-empresa-id'] as string | undefined);
  const unidadeId = user.unidadeId || (request.headers['x-unidade-id'] as string | undefined);

  if (!empresaId) {
    return reply.status(400).send({
      sucesso: false,
      mensagem: 'Contexto de empresa não selecionado. Selecione a empresa ativa para prosseguir.',
    });
  }

  // Validação estrita no banco com defesa em profundidade (DOC-006, DOC-012)
  const vinculo = await prisma.vinculoUsuarioEmpresa.findUnique({
    where: {
      usuarioId_empresaId: {
        usuarioId: user.usuarioId,
        empresaId,
      },
    },
    include: {
      empresa: true,
      unidade: true,
      usuario: true,
      perfis: {
        include: {
          perfil: {
            include: {
              permissoes: {
                include: {
                  permissao: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!vinculo || !vinculo.ativo || !vinculo.empresa.ativo) {
    return reply.status(403).send({
      sucesso: false,
      mensagem: 'Acesso negado: vínculo inativo ou não autorizado para esta empresa.',
    });
  }

  // Validar se a unidade pertence à empresa
  const targetUnidadeId = unidadeId || vinculo.unidadeId;
  const unidadeValida = await prisma.unidade.findFirst({
    where: {
      id: targetUnidadeId,
      empresaId,
      ativo: true,
    },
  });

  if (!unidadeValida) {
    return reply.status(400).send({
      sucesso: false,
      mensagem: 'Unidade operacional informada inválida ou inativa.',
    });
  }

  // Mapear perfis e permissões acumuladas
  const perfis = vinculo.perfis.map((vp) => vp.perfil.codigo as PerfilAcesso);
  const permissoesSet = new Set<PermissaoAcesso>();

  for (const vp of vinculo.perfis) {
    for (const pp of vp.perfil.permissoes) {
      permissoesSet.add(pp.permissao.codigo as PermissaoAcesso);
    }
  }

  request.tenant = {
    empresaId,
    unidadeId: unidadeValida.id,
    usuarioId: vinculo.usuarioId,
    vinculoId: vinculo.id,
    perfis,
    permissoes: Array.from(permissoesSet),
    nomeUsuario: vinculo.usuario.nome,
    emailUsuario: vinculo.usuario.email,
    razaoSocialEmpresa: vinculo.empresa.razaoSocial,
  };
}

/**
 * Guarda de Permissão Granular (HU-004 e DOC-005)
 */
export function exigirPermissao(permissaoNecessaria: PermissaoAcesso) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.tenant) {
      return reply.status(401).send({ sucesso: false, mensagem: 'Contexto de tenant ausente' });
    }

    const { permissoes, perfis } = request.tenant;

    // Administrador geral tem permissão total
    if (perfis.includes(PerfilAcesso.ADMIN_GERAL)) {
      return;
    }

    if (!permissoes.includes(permissaoNecessaria)) {
      return reply.status(403).send({
        sucesso: false,
        mensagem: `Ação não permitida. Exige a permissão: ${permissaoNecessaria}`,
      });
    }
  };
}
