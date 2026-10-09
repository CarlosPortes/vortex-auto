export interface UserTenantContext {
  empresaId: string;
  unidadeId: string;
  usuarioId: string;
  vinculoId: string;
  perfis: string[];
  permissoes: string[];
  nomeUsuario: string;
  emailUsuario: string;
  razaoSocialEmpresa: string;
}

export interface Colaborador {
  vinculoId: string;
  usuarioId: string;
  nome: string;
  email: string;
  ativo: boolean;
  alcadaDesconto: number;
  perfis: Array<{ codigo: string; nome: string }>;
  dataEntrada: string;
}

export interface RegistroAuditoria {
  id: string;
  empresaId: string;
  unidadeId?: string | null;
  usuarioId?: string | null;
  operacao: string;
  entidade: string;
  entidadeId?: string | null;
  detalhes?: any;
  ipOrigem?: string;
  userAgent?: string;
  correlacaoId?: string;
  criadoEm: string;
  usuario?: {
    id: string;
    nome: string;
    email: string;
  } | null;
}
