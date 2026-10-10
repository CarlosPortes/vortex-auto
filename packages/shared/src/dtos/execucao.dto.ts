import { z } from 'zod';
import { TipoMovimentoEstoque, StatusOS, StatusAtividade } from '../domain/enums.js';

// -------------------------------------------------------------
// DTOs de Produtos e Estoque (HU-017 e HU-018)
// -------------------------------------------------------------
export const CriarProdutoSchema = z.object({
  codigo: z.string().min(2, 'Código do produto obrigatório'),
  descricao: z.string().min(3, 'Descrição do produto obrigatória'),
  unidadeMedida: z.string().min(1).default('UN'),
  precoCusto: z.number().min(0).default(0),
  precoVenda: z.number().min(0).default(0),
  estoqueMinimo: z.number().min(0).default(0),
  saldoInicial: z.number().min(0).default(0),
});

export type CriarProdutoDto = z.infer<typeof CriarProdutoSchema>;

export const MovimentarEstoqueSchema = z.object({
  produtoId: z.string().uuid('ID de produto inválido'),
  tipo: z.nativeEnum(TipoMovimentoEstoque),
  quantidade: z.number().positive('Quantidade deve ser positiva'),
  motivo: z.string().optional(),
  documentoRef: z.string().optional(),
});

export type MovimentarEstoqueDto = z.infer<typeof MovimentarEstoqueSchema>;

// -------------------------------------------------------------
// DTOs de Ordem de Serviço e Atividades (HU-014 e HU-015)
// -------------------------------------------------------------
export const AtividadeInputSchema = z.object({
  descricao: z.string().min(3, 'Descrição da atividade obrigatória'),
  itemOrcamentoId: z.string().uuid().optional(),
  mecanicoId: z.string().uuid().optional(),
  tempoEstimadoMinutos: z.number().int().min(1).default(60),
});

export const PlanejarOSSchema = z.object({
  atendimentoId: z.string().uuid('ID de atendimento inválido'),
  responsavelMecanicoId: z.string().uuid().optional(),
  observacoesTecnicas: z.string().optional(),
  atividades: z.array(AtividadeInputSchema).min(1, 'A OS deve conter ao menos uma atividade técnica'),
});

export type PlanejarOSDto = z.infer<typeof PlanejarOSSchema>;

export const ApontarAtividadeSchema = z.object({
  atividadeId: z.string().uuid('ID da atividade inválido'),
  novoStatus: z.nativeEnum(StatusAtividade),
  motivoPausa: z.string().optional(),
  tempoGastoMinutos: z.number().int().min(0).optional(),
});

export type ApontarAtividadeDto = z.infer<typeof ApontarAtividadeSchema>;

export const ConsumirMaterialOSSchema = z.object({
  ordemServicoId: z.string().uuid('ID de OS inválido'),
  produtoId: z.string().uuid('ID de produto inválido'),
  quantidade: z.number().positive('Quantidade consumida deve ser positiva'),
  motivo: z.string().optional(),
});

export type ConsumirMaterialOSDto = z.infer<typeof ConsumirMaterialOSSchema>;
