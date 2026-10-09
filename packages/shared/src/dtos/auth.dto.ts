import { z } from 'zod';
import { PerfilAcesso } from '../domain/enums.js';

export const LoginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  senha: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
});

export type LoginDto = z.infer<typeof LoginSchema>;

export const CadastroInicialEmpresaSchema = z.object({
  // Dados da Empresa
  razaoSocial: z.string().min(3, 'Razão social deve ter no mínimo 3 caracteres'),
  nomeFantasia: z.string().optional(),
  cnpj: z.string().min(14, 'CNPJ inválido').max(18, 'CNPJ inválido'),
  telefone: z.string().min(10, 'Telefone inválido'),
  cidade: z.string().min(2, 'Cidade obrigatória'),
  uf: z.string().length(2, 'UF deve ter 2 caracteres'),
  
  // Unidade Principal (MVP: 1 unidade ativa por empresa)
  nomeUnidade: z.string().min(2, 'Nome da unidade obrigatório').default('Matriz'),
  
  // Usuário Administrador Inicial
  nomeAdmin: z.string().min(3, 'Nome do administrador obrigatório'),
  emailAdmin: z.string().email('E-mail do administrador inválido'),
  senhaAdmin: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
});

export type CadastroInicialEmpresaDto = z.infer<typeof CadastroInicialEmpresaSchema>;

export const SelecionarTenantSchema = z.object({
  empresaId: z.string().uuid('ID de empresa inválido'),
  unidadeId: z.string().uuid('ID de unidade inválido'),
});

export type SelecionarTenantDto = z.infer<typeof SelecionarTenantSchema>;

export const CriarUsuarioVinculoSchema = z.object({
  nome: z.string().min(3, 'Nome obrigatório'),
  email: z.string().email('E-mail inválido'),
  senha: z.string().min(6, 'Senha mínima de 6 caracteres'),
  perfis: z.array(z.nativeEnum(PerfilAcesso)).min(1, 'Selecione pelo menos um perfil de acesso'),
});

export type CriarUsuarioVinculoDto = z.infer<typeof CriarUsuarioVinculoSchema>;
