import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma.js';
import {
  CriarUsuarioVinculoSchema,
  PerfilAcesso,
  PermissaoAcesso,
  TipoOperacaoAuditoria,
} from '@vortex/shared';
import { tenantMiddleware, exigirPermissao } from '../middlewares/tenant.middleware.js';
import { AuditoriaService } from '../services/auditoria.service.js';

export async function adminRoutes(app: FastifyInstance) {
  // Todas as rotas de administração exigem autenticação e contexto de tenant ativo
  app.addHook('onRequest', async (req, rep) => req.jwtVerify());
  app.addHook('onRequest', tenantMiddleware);

  /**
   * GET /api/admin/empresa
   * Consulta dados administrativos da empresa e unidade atual (HU-005)
   */
  app.get('/empresa', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = request.tenant!;

    const empresa = await prisma.empresa.findUnique({
      where: { id: tenant.empresaId },
      include: {
        unidades: {
          where: { ativo: true },
        },
      },
    });

    if (!empresa) {
      return reply.status(404).send({ sucesso: false, mensagem: 'Empresa não encontrada' });
    }

    return reply.send({
      sucesso: true,
      dados: empresa,
    });
  });

  /**
   * GET /api/admin/usuarios
   * Lista colaboradores da oficina ativa (HU-004)
   */
  app.get(
    '/usuarios',
    { preHandler: [exigirPermissao(PermissaoAcesso.USUARIO_GERENCIAR)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenant = request.tenant!;

      const vinculos = await prisma.vinculoUsuarioEmpresa.findMany({
        where: { empresaId: tenant.empresaId },
        include: {
          usuario: {
            select: {
              id: true,
              nome: true,
              email: true,
              ativo: true,
              criadoEm: true,
            },
          },
          perfis: {
            include: {
              perfil: true,
            },
          },
        },
        orderBy: { criadoEm: 'desc' },
      });

      const colaboradores = vinculos.map((v) => ({
        vinculoId: v.id,
        usuarioId: v.usuario.id,
        nome: v.usuario.nome,
        email: v.usuario.email,
        ativo: v.ativo && v.usuario.ativo,
        alcadaDesconto: Number(v.alcadaDesconto),
        perfis: v.perfis.map((vp) => ({
          codigo: vp.perfil.codigo,
          nome: vp.perfil.nome,
        })),
        dataEntrada: v.criadoEm,
      }));

      return reply.send({
        sucesso: true,
        dados: colaboradores,
      });
    }
  );

  /**
   * POST /api/admin/usuarios
   * Cadastra ou vincula um colaborador na empresa com perfis definidos (HU-004)
   */
  app.post(
    '/usuarios',
    { preHandler: [exigirPermissao(PermissaoAcesso.USUARIO_GERENCIAR)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenant = request.tenant!;
      const parseResult = CriarUsuarioVinculoSchema.safeParse(request.body);

      if (!parseResult.success) {
        return reply.status(400).send({
          sucesso: false,
          mensagem: 'Dados inválidos',
          erros: parseResult.error.errors.map((e) => ({ campo: e.path.join('.'), mensagem: e.message })),
        });
      }

      const { nome, email, senha, perfis } = parseResult.data;

      // Buscar ou criar usuário
      let usuario = await prisma.usuario.findUnique({ where: { email } });
      if (!usuario) {
        const senhaHash = await bcrypt.hash(senha, 10);
        usuario = await prisma.usuario.create({
          data: {
            nome,
            email,
            senhaHash,
          },
        });
      }

      // Verificar se já possui vínculo nesta empresa
      const vinculoExistente = await prisma.vinculoUsuarioEmpresa.findUnique({
        where: {
          usuarioId_empresaId: {
            usuarioId: usuario.id,
            empresaId: tenant.empresaId,
          },
        },
      });

      if (vinculoExistente) {
        return reply.status(409).send({
          sucesso: false,
          mensagem: 'O usuário já está vinculado a esta oficina.',
        });
      }

      // Criar vínculo com a unidade ativa
      const vinculo = await prisma.vinculoUsuarioEmpresa.create({
        data: {
          usuarioId: usuario.id,
          empresaId: tenant.empresaId,
          unidadeId: tenant.unidadeId,
          ativo: true,
        },
      });

      // Vincular os perfis informados
      for (const codigoPerfil of perfis) {
        const perfil = await prisma.perfil.findUnique({ where: { codigo: codigoPerfil } });
        if (perfil) {
          await prisma.vinculoPerfil.create({
            data: {
              vinculoId: vinculo.id,
              perfilId: perfil.id,
            },
          });
        }
      }

      // Auditoria
      await AuditoriaService.registrar({
        empresaId: tenant.empresaId,
        unidadeId: tenant.unidadeId,
        usuarioId: tenant.usuarioId,
        operacao: TipoOperacaoAuditoria.CRIACAO,
        entidade: 'VinculoUsuarioEmpresa',
        entidadeId: vinculo.id,
        detalhes: { usuarioEmail: usuario.email, perfis },
        ipOrigem: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return reply.status(201).send({
        sucesso: true,
        mensagem: 'Colaborador adicionado com sucesso!',
        dados: {
          vinculoId: vinculo.id,
          usuarioId: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
        },
      });
    }
  );

  /**
   * GET /api/admin/auditorias
   * Consulta histórico de auditoria da empresa (HU-029)
   */
  app.get(
    '/auditorias',
    { preHandler: [exigirPermissao(PermissaoAcesso.AUDITORIA_VISUALIZAR)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenant = request.tenant!;

      const registros = await prisma.registroAuditoria.findMany({
        where: { empresaId: tenant.empresaId },
        include: {
          usuario: {
            select: {
              id: true,
              nome: true,
              email: true,
            },
          },
        },
        orderBy: { criadoEm: 'desc' },
        take: 50,
      });

      return reply.send({
        sucesso: true,
        dados: registros,
      });
    }
  );
}
