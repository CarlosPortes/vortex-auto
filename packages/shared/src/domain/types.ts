import { PerfilAcesso, PermissaoAcesso, TipoOperacaoAuditoria } from './enums.js';

/**
 * Contexto do Tenant (Empresa e Unidade ativas)
 * Conforme exigido por DOC-006, DOC-012 (Defesa em Profundidade) e DOC-013.
 */
export interface ITenantContext {
  empresaId: string;
  unidadeId: string;
  usuarioId: string;
  vinculoId: string;
  perfis: PerfilAcesso[];
  permissoes: PermissaoAcesso[];
  nomeUsuario: string;
  emailUsuario: string;
  razaoSocialEmpresa: string;
}

/**
 * Informações do Usuário Autenticado na Sessão
 */
export interface IAuthUserSession {
  usuarioId: string;
  nome: string;
  email: string;
  empresasVinculadas: Array<{
    empresaId: string;
    razaoSocial: string;
    nomeFantasia?: string | null;
    unidadeId: string;
    nomeUnidade: string;
    vinculoId: string;
    ativo: boolean;
    perfis: PerfilAcesso[];
  }>;
}

/**
 * Registro de Auditoria Obrigatório (HU-029)
 */
export interface IAuditoriaPayload {
  empresaId: string;
  unidadeId?: string | null;
  usuarioId?: string | null;
  operacao: TipoOperacaoAuditoria;
  entidade: string;
  entidadeId?: string | null;
  detalhes?: Record<string, unknown>;
  ipOrigem?: string;
  userAgent?: string;
  correlacaoId?: string;
}

/**
 * Envelope Padrão de Respostas da API (DOC-013)
 */
export interface IApiResponse<T = unknown> {
  sucesso: boolean;
  dados?: T;
  mensagem?: string;
  erros?: Array<{
    campo?: string;
    mensagem: string;
  }>;
  meta?: {
    total?: number;
    pagina?: number;
    limite?: number;
    correlacaoId?: string;
  };
}
