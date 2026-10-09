import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma.js';
import {
  LoginSchema,
  CadastroInicialEmpresaSchema,
  SelecionarTenantSchema,
  PerfilAcesso,
  TipoOperacaoAuditoria,
} from '@vortex/shared';
import { tenantMiddleware } from '../middlewares/tenant.middleware.js';
import { AuditoriaService } from '../services/auditoria.service.js';

export async function authRoutes(app: FastifyInstance) {
  /**
   * POST /api/auth/login
   * Autenticação de Usuário (HU-003)
   */
  app.post('/login', async (request: FastifyRequest, reply: FastifyReply) => {
    const parseResult = LoginSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        sucesso: false,
        mensagem: 'Dados inválidos',
        erros: parseResult.error.errors.map((e) => ({ campo: e.path.join('.'), mensagem: e.message })),
      });
    }

    const { email, senha } = parseResult.data;

    const usuario = await prisma.usuario.findUnique({
      where: { email },
      include: {
        vinculos: {
          where: { ativo: true },
          include: {
            empresa: true,
            unidade: true,
            perfis: {
              include: {
                perfil: true,
              },
            },
          },
        },
      },
    });

    if (!usuario || !usuario.ativo) {
      return reply.status(401).send({
        sucesso: false,
        mensagem: 'E-mail ou senha inválidos.',
      });
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senhaHash);
    if (!senhaValida) {
      return reply.status(401).send({
        sucesso: false,
        mensagem: 'E-mail ou senha inválidos.',
      });
    }

    // Se o usuário tem apenas uma empresa vinculada, seleciona automaticamente
    let tokenEmpresaId: string | undefined;
    let tokenUnidadeId: string | undefined;
    if (usuario.vinculos.length === 1) {
      tokenEmpresaId = usuario.vinculos[0].empresaId;
      tokenUnidadeId = usuario.vinculos[0].unidadeId;
    }

    const token = app.jwt.sign(
      {
        usuarioId: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        empresaId: tokenEmpresaId,
        unidadeId: tokenUnidadeId,
      },
      { expiresIn: '8h' }
    );

    const empresasDisponiveis = usuario.vinculos.map((v) => ({
      empresaId: v.empresaId,
      razaoSocial: v.empresa.razaoSocial,
      nomeFantasia: v.empresa.nomeFantasia,
      unidadeId: v.unidadeId,
      nomeUnidade: v.unidade.nome,
      vinculoId: v.id,
      perfis: v.perfis.map((vp) => vp.perfil.codigo),
    }));

    // Auditoria de login
    if (tokenEmpresaId) {
      await AuditoriaService.registrar({
        empresaId: tokenEmpresaId,
        unidadeId: tokenUnidadeId,
        usuarioId: usuario.id,
        operacao: TipoOperacaoAuditoria.LOGIN,
        entidade: 'Usuario',
        entidadeId: usuario.id,
        ipOrigem: request.ip,
        userAgent: request.headers['user-agent'],
      });
    }

    return reply.send({
      sucesso: true,
      dados: {
        token,
        usuario: {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          superAdmin: usuario.superAdmin,
        },
        empresasDisponiveis,
        empresaAtivaId: tokenEmpresaId,
      },
    });
  });

  /**
   * POST /api/auth/select-tenant
   * Seleciona o contexto ativo de Empresa e Unidade (HU-001)
   */
  app.post(
    '/select-tenant',
    { onRequest: [async (req, rep) => req.jwtVerify()] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parseResult = SelecionarTenantSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          sucesso: false,
          mensagem: 'Dados inválidos',
          erros: parseResult.error.errors.map((e) => ({ campo: e.path.join('.'), mensagem: e.message })),
        });
      }

      const { empresaId, unidadeId } = parseResult.data;
      const user = request.user as { usuarioId: string; nome: string; email: string };

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
          perfis: { include: { perfil: true } },
        },
      });

      if (!vinculo || !vinculo.ativo || !vinculo.empresa.ativo) {
        return reply.status(403).send({
          sucesso: false,
          mensagem: 'Vínculo com a empresa inválido ou inativo.',
        });
      }

      const token = app.jwt.sign(
        {
          usuarioId: user.usuarioId,
          nome: user.nome,
          email: user.email,
          empresaId,
          unidadeId,
        },
        { expiresIn: '8h' }
      );

      return reply.send({
        sucesso: true,
        dados: {
          token,
          empresa: {
            id: vinculo.empresa.id,
            razaoSocial: vinculo.empresa.razaoSocial,
            nomeFantasia: vinculo.empresa.nomeFantasia,
          },
          unidade: {
            id: vinculo.unidade.id,
            nome: vinculo.unidade.nome,
          },
          perfis: vinculo.perfis.map((vp) => vp.perfil.codigo),
        },
      });
    }
  );

  /**
   * GET /api/auth/me
   * Retorna os dados da sessão e contexto do tenant ativo
   */
  app.get(
    '/me',
    { onRequest: [async (req, rep) => req.jwtVerify(), tenantMiddleware] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      return reply.send({
        sucesso: true,
        dados: request.tenant,
      });
    }
  );

  /**
   * POST /api/auth/register-company
   * Cadastro Inicial de Empresa e Administrador (HU-005)
   */
  app.post('/register-company', async (request: FastifyRequest, reply: FastifyReply) => {
    const parseResult = CadastroInicialEmpresaSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        sucesso: false,
        mensagem: 'Erro de validação cadastral',
        erros: parseResult.error.errors.map((e) => ({ campo: e.path.join('.'), mensagem: e.message })),
      });
    }

    const data = parseResult.data;
    const cnpjNumeros = data.cnpj.replace(/\D/g, '');

    const cnpjExiste = await prisma.empresa.findUnique({ where: { cnpj: cnpjNumeros } });
    if (cnpjExiste) {
      return reply.status(409).send({
        sucesso: false,
        mensagem: 'CNPJ já cadastrado no sistema.',
      });
    }

    const emailExiste = await prisma.usuario.findUnique({ where: { email: data.emailAdmin } });
    if (emailExiste) {
      return reply.status(409).send({
        sucesso: false,
        mensagem: 'O e-mail informado já pertence a um usuário cadastrado.',
      });
    }

    const senhaHash = await bcrypt.hash(data.senhaAdmin, 10);

    // Transação ACID para criação conjunta de Empresa, Unidade e Admin (DOC-006, DOC-012)
    const resultado = await prisma.$transaction(async (tx) => {
      const empresa = await tx.empresa.create({
        data: {
          razaoSocial: data.razaoSocial,
          nomeFantasia: data.nomeFantasia || data.razaoSocial,
          cnpj: cnpjNumeros,
          telefone: data.telefone,
          cidade: data.cidade,
          uf: data.uf.toUpperCase(),
        },
      });

      const unidade = await tx.unidade.create({
        data: {
          empresaId: empresa.id,
          nome: data.nomeUnidade || 'Matriz',
          principal: true,
        },
      });

      const usuario = await tx.usuario.create({
        data: {
          nome: data.nomeAdmin,
          email: data.emailAdmin,
          senhaHash,
        },
      });

      const vinculo = await tx.vinculoUsuarioEmpresa.create({
        data: {
          usuarioId: usuario.id,
          empresaId: empresa.id,
          unidadeId: unidade.id,
          alcadaDesconto: 100.0,
        },
      });

      const perfilAdmin = await tx.perfil.findUnique({
        where: { codigo: PerfilAcesso.ADMIN_GERAL },
      });

      if (perfilAdmin) {
        await tx.vinculoPerfil.create({
          data: {
            vinculoId: vinculo.id,
            perfilId: perfilAdmin.id,
          },
        });
      }

      return { empresa, unidade, usuario };
    });

    // Auditoria
    await AuditoriaService.registrar({
      empresaId: resultado.empresa.id,
      unidadeId: resultado.unidade.id,
      usuarioId: resultado.usuario.id,
      operacao: TipoOperacaoAuditoria.CRIACAO,
      entidade: 'Empresa',
      entidadeId: resultado.empresa.id,
      detalhes: { razaoSocial: resultado.empresa.razaoSocial, cnpj: resultado.empresa.cnpj },
      ipOrigem: request.ip,
      userAgent: request.headers['user-agent'],
    });

    const token = app.jwt.sign(
      {
        usuarioId: resultado.usuario.id,
        nome: resultado.usuario.nome,
        email: resultado.usuario.email,
        empresaId: resultado.empresa.id,
        unidadeId: resultado.unidade.id,
      },
      { expiresIn: '8h' }
    );

    return reply.status(201).send({
      sucesso: true,
      mensagem: 'Oficina cadastrada com sucesso!',
      dados: {
        token,
        empresa: resultado.empresa,
        unidade: resultado.unidade,
        usuario: {
          id: resultado.usuario.id,
          nome: resultado.usuario.nome,
          email: resultado.usuario.email,
        },
      },
    });
  });
}
