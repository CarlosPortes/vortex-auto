import { z } from 'zod';
import { CanalAprovacao, DecisaoItemOrcamento } from '../domain/enums.js';

export enum TipoItemOrcamento {
  PECA = 'PECA',
  SERVICO = 'SERVICO',
}

export enum ConclusaoDiagnostico {
  PROCEDE_REPARO = 'PROCEDE_REPARO',
  INCONCLUSIVO = 'INCONCLUSIVO',
  SEM_DEFEITO_CONSTATADO = 'SEM_DEFEITO_CONSTATADO',
  AGUARDANDO_DESMONTAGEM = 'AGUARDANDO_DESMONTAGEM',
}

// -------------------------------------------------------------
// DTOs de Diagnóstico Técnico (HU-010)
// -------------------------------------------------------------
export const RegistrarDiagnosticoSchema = z.object({
  atendimentoId: z.string().uuid('ID de atendimento inválido'),
  relatoTecnico: z.string().min(5, 'Relato técnico detalhado é obrigatório'),
  constatacoes: z.string().min(5, 'Constatações e causas identificadas são obrigatórias'),
  conclusao: z.nativeEnum(ConclusaoDiagnostico).default(ConclusaoDiagnostico.PROCEDE_REPARO),
  procedimentoRecomendado: z.string().optional(),
});

export type RegistrarDiagnosticoDto = z.infer<typeof RegistrarDiagnosticoSchema>;

// -------------------------------------------------------------
// DTOs de Orçamento Versionado (HU-011)
// -------------------------------------------------------------
export const ItemOrcamentoInputSchema = z.object({
  tipo: z.nativeEnum(TipoItemOrcamento).default(TipoItemOrcamento.SERVICO),
  descricao: z.string().min(2, 'Descrição do item obrigatória'),
  quantidade: z.number().positive('Quantidade deve ser maior que zero'),
  unidadeMedida: z.string().default('UN'),
  valorUnitario: z.number().min(0, 'Valor unitário inválido'),
  valorDesconto: z.number().min(0).default(0),
});

export const CriarVersaoOrcamentoSchema = z.object({
  atendimentoId: z.string().uuid('ID de atendimento inválido'),
  validadeDias: z.number().int().positive().default(10),
  observacoesComerciais: z.string().optional(),
  itens: z.array(ItemOrcamentoInputSchema).min(1, 'O orçamento deve conter pelo menos um item'),
});

export type CriarVersaoOrcamentoDto = z.infer<typeof CriarVersaoOrcamentoSchema>;

// -------------------------------------------------------------
// DTOs de Decisão Comercial por Item (HU-012 e HU-013)
// -------------------------------------------------------------
export const DecisaoItemInputSchema = z.object({
  itemId: z.string().uuid('ID do item de orçamento inválido'),
  decisao: z.nativeEnum(DecisaoItemOrcamento),
  justificativa: z.string().optional(),
});

export const RegistrarDecisaoComercialSchema = z.object({
  versaoOrcamentoId: z.string().uuid('ID da versão de orçamento inválido'),
  canal: z.nativeEnum(CanalAprovacao).default(CanalAprovacao.WHATSAPP),
  autorizadorNome: z.string().min(2, 'Nome do autorizador/cliente obrigatório'),
  documentoAutorizador: z.string().optional(),
  evidenciaTexto: z.string().optional(), // Registro do log da mensagem ou recibo
  decisoesItens: z.array(DecisaoItemInputSchema).min(1, 'Informe a decisão para os itens'),
});

export type RegistrarDecisaoComercialDto = z.infer<typeof RegistrarDecisaoComercialSchema>;
