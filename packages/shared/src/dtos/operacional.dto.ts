import { z } from 'zod';

export enum TipoPessoa {
  FISICA = 'FISICA',
  JURIDICA = 'JURIDICA',
}

export enum PapelClienteVeiculo {
  PROPRIETARIO = 'PROPRIETARIO',
  CONDUTOR = 'CONDUTOR',
  FROTA = 'FROTA',
  OUTRO = 'OUTRO',
}

export enum NivelCombustivel {
  RESERVA = 'RESERVA',
  UM_QUARTO = 'UM_QUARTO',
  MEIO = 'MEIO',
  TRES_QUARTOS = 'TRES_QUARTOS',
  CHEIO = 'CHEIO',
}

// -------------------------------------------------------------
// DTOs e Schemas de Clientes (HU-006)
// -------------------------------------------------------------
export const CriarClienteSchema = z.object({
  tipo: z.nativeEnum(TipoPessoa).default(TipoPessoa.FISICA),
  nomeRazao: z.string().min(2, 'Nome ou Razão Social é obrigatório'),
  apelidoFantasia: z.string().optional(),
  cpfCnpj: z.string().min(11, 'Documento inválido').max(18, 'Documento inválido'),
  telefone: z.string().min(10, 'Telefone principal obrigatório'),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  cep: z.string().optional(),
  logradouro: z.string().optional(),
  numero: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  uf: z.string().max(2).optional(),
  observacoes: z.string().optional(),
});

export type CriarClienteDto = z.infer<typeof CriarClienteSchema>;

// -------------------------------------------------------------
// DTOs e Schemas de Veículos (HU-007)
// -------------------------------------------------------------
export const CriarVeiculoSchema = z.object({
  placa: z.string().min(7, 'Placa deve ter no mínimo 7 caracteres').max(8, 'Placa inválida'),
  chassi: z.string().optional(),
  marca: z.string().min(2, 'Marca obrigatória'),
  modelo: z.string().min(2, 'Modelo obrigatório'),
  anoFabricacao: z.number().int().min(1950).max(2035).optional(),
  anoModelo: z.number().int().min(1950).max(2035).optional(),
  cor: z.string().optional(),
  combustivel: z.string().optional(),
  categoriaCodigo: z.string().default('PASSEIO'),
  clienteId: z.string().uuid('ID de cliente inválido para vínculo'),
  papel: z.nativeEnum(PapelClienteVeiculo).default(PapelClienteVeiculo.PROPRIETARIO),
});

export type CriarVeiculoDto = z.infer<typeof CriarVeiculoSchema>;

// -------------------------------------------------------------
// DTOs e Schemas de Atendimento & Recepção (HU-008 e HU-009)
// -------------------------------------------------------------
export const AbrirAtendimentoSchema = z.object({
  clienteId: z.string().uuid('Cliente obrigatório'),
  veiculoId: z.string().uuid('Veículo obrigatório'),
  queixaPrincipal: z.string().min(5, 'Relato ou queixa principal do cliente é obrigatório'),
  previsaoEntrega: z.string().optional(), // ISO Date String
  
  // Medições e Entrada (HU-009)
  quilometragem: z.number().int().min(0, 'Quilometragem deve ser positiva'),
  nivelCombustivel: z.nativeEnum(NivelCombustivel).default(NivelCombustivel.MEIO),
  pertencesDeixados: z.string().optional(),
  avariasPrevias: z.string().optional(),
  
  // Checklist Rápido de Recepção
  temEstepe: z.boolean().default(true),
  temMacaco: z.boolean().default(true),
  temChaveRoda: z.boolean().default(true),
  temManualChaveReserva: z.boolean().default(false),
});

export type AbrirAtendimentoDto = z.infer<typeof AbrirAtendimentoSchema>;
