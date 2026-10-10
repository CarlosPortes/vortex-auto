import { z } from 'zod';

// -------------------------------------------------------------
// DTOs de Devolução de Materiais ao Estoque (HU-016)
// -------------------------------------------------------------
export const DevolverMaterialOSSchema = z.object({
  ordemServicoId: z.string().uuid('ID da Ordem de Serviço inválido'),
  produtoId: z.string().uuid('ID do Produto inválido'),
  quantidade: z.number().positive('Quantidade a devolver deve ser positiva'),
  motivo: z.string().min(5, 'Informe o motivo da devolução ao estoque'),
});

export type DevolverMaterialOSDto = z.infer<typeof DevolverMaterialOSSchema>;

// -------------------------------------------------------------
// DTOs de Gestão de Garantia e Retorno (HU-023)
// -------------------------------------------------------------
export const DecisaoGarantiaEnum = z.enum([
  'COBERTA_TOTAL',
  'COBERTA_PARCIAL',
  'RECUSADA',
]);

export const RegistrarGarantiaSchema = z.object({
  atendimentoOrigemId: z.string().uuid('ID do Atendimento de origem inválido'),
  reclamacaoCliente: z.string().min(5, 'Reclamação ou queixa do cliente obrigatória'),
  parecerTecnico: z.string().min(5, 'Parecer técnico da avaliação inicial obrigatório'),
  decisao: DecisaoGarantiaEnum,
  justificativaDecisao: z.string().min(5, 'Justificativa da decisão de cobertura obrigatória'),
  itensCobertos: z.array(z.string()).default([]),
});

export type RegistrarGarantiaDto = z.infer<typeof RegistrarGarantiaSchema>;

// -------------------------------------------------------------
// DTOs de Serviços de Terceiros e Retíficas Externas (HU-025)
// -------------------------------------------------------------
export const StatusServicoTerceiroEnum = z.enum([
  'ENVIADO',
  'EM_EXECUCAO',
  'RECEBIDO',
  'CANCELADO',
]);

export const CriarServicoTerceiroSchema = z.object({
  atendimentoId: z.string().uuid('ID do Atendimento inválido'),
  fornecedorNome: z.string().min(3, 'Nome do parceiro/fornecedor obrigatório'),
  descricaoServico: z.string().min(5, 'Descrição do serviço externo obrigatória'),
  valorCusto: z.number().min(0).default(0),
  valorCobradoCliente: z.number().min(0).default(0),
  dataRetornoPrevista: z.string().optional(),
  observacoes: z.string().optional(),
});

export type CriarServicoTerceiroDto = z.infer<typeof CriarServicoTerceiroSchema>;

export const AtualizarServicoTerceiroSchema = z.object({
  status: StatusServicoTerceiroEnum,
  observacoesRetorno: z.string().optional(),
});

export type AtualizarServicoTerceiroDto = z.infer<typeof AtualizarServicoTerceiroSchema>;
