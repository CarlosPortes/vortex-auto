import { z } from 'zod';
import { MeioPagamento, CondicaoDevolucaoVeiculo } from '../domain/enums.js';

// -------------------------------------------------------------
// DTOs de Inspeção de Qualidade (HU-019)
// -------------------------------------------------------------
export const ResultadoInspecaoEnum = z.enum([
  'APROVADO_TOTAL',
  'APROVADO_COM_RESSALVA',
  'REPROVADO',
]);

export const RegistrarInspecaoSchema = z.object({
  atendimentoId: z.string().uuid('ID de atendimento inválido'),
  resultado: ResultadoInspecaoEnum,
  constatacoes: z.string().min(5, 'Constatações da inspeção devem ter ao menos 5 caracteres'),
  itensInspecionados: z.array(z.string()).min(1, 'Ao menos um item inspecionado deve ser indicado'),
  quilometragemTeste: z.number().int().min(0).optional(),
});

export type RegistrarInspecaoDto = z.infer<typeof RegistrarInspecaoSchema>;

// -------------------------------------------------------------
// DTOs de Contas a Receber e Cobrança (HU-020)
// -------------------------------------------------------------
export const GerarCobrancaSchema = z.object({
  atendimentoId: z.string().uuid('ID de atendimento inválido'),
  numeroParcelas: z.number().int().min(1).max(12).default(1),
  primeiroVencimentoDias: z.number().int().min(0).default(0), // 0 = hoje (à vista)
  observacoes: z.string().optional(),
});

export type GerarCobrancaDto = z.infer<typeof GerarCobrancaSchema>;

// -------------------------------------------------------------
// DTOs de Recebimento de Pagamentos (HU-021)
// -------------------------------------------------------------
export const RegistrarRecebimentoSchema = z.object({
  cobrancaId: z.string().uuid('ID de cobrança inválido'),
  parcelaId: z.string().uuid('ID de parcela inválido').optional(),
  valor: z.number().positive('Valor do recebimento deve ser positivo'),
  meioPagamento: z.nativeEnum(MeioPagamento),
  detalhes: z.string().optional(),
});

export type RegistrarRecebimentoDto = z.infer<typeof RegistrarRecebimentoSchema>;

// -------------------------------------------------------------
// DTOs de Liberação e Entrega do Veículo (HU-022)
// -------------------------------------------------------------
export const RegistrarEntregaSchema = z.object({
  atendimentoId: z.string().uuid('ID de atendimento inválido'),
  condicaoDevolucao: z.nativeEnum(CondicaoDevolucaoVeiculo),
  nomeRecebedor: z.string().min(3, 'Nome de quem está retirando o veículo obrigatório'),
  documentoRecebedor: z.string().optional(),
  quilometragemSaida: z.number().int().min(0, 'Quilometragem de saída inválida'),
  observacoes: z.string().optional(),
  motivoLiberacaoComDebito: z.string().optional(),
});

export type RegistrarEntregaDto = z.infer<typeof RegistrarEntregaSchema>;
