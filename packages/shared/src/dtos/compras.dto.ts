import { z } from 'zod';
import { StatusCompra, StatusVendaBalcao, CriticidadeMRP } from '../domain/enums.js';

// -------------------------------------------------------------
// DTOs de Compras e Recebimento de NF-e
// -------------------------------------------------------------
export const ItemCompraInputSchema = z.object({
  produtoId: z.string().uuid('ID de produto inválido'),
  quantidade: z.number().positive('Quantidade comprada deve ser positiva'),
  precoUnitario: z.number().min(0, 'Preço unitário de compra deve ser maior ou igual a zero'),
});

export type ItemCompraInputDto = z.infer<typeof ItemCompraInputSchema>;

export const CriarCompraSchema = z.object({
  fornecedorNome: z.string().min(2, 'Nome do fornecedor obrigatório'),
  fornecedorCnpj: z.string().optional(),
  numeroNota: z.string().optional(),
  serie: z.string().optional(),
  chaveAcesso: z.string().optional(),
  dataEmissao: z.string().optional(),
  dataRecebimento: z.string().optional(),
  status: z.nativeEnum(StatusCompra).default(StatusCompra.RECEBIDO),
  itens: z.array(ItemCompraInputSchema).min(1, 'A compra/nota deve conter ao menos um item'),
  observacoes: z.string().optional(),
});

export type CriarCompraDto = z.infer<typeof CriarCompraSchema>;

// -------------------------------------------------------------
// DTOs do Módulo Dedicado de Vendas Balcão
// -------------------------------------------------------------
export const ItemVendaBalcaoInputSchema = z.object({
  produtoId: z.string().uuid('ID de produto inválido'),
  quantidade: z.number().positive('Quantidade deve ser positiva'),
  precoUnitario: z.number().min(0, 'Preço de venda inválido'),
});

export type ItemVendaBalcaoInputDto = z.infer<typeof ItemVendaBalcaoInputSchema>;

export const CriarVendaBalcaoSchema = z.object({
  clienteNome: z.string().min(2).default('Consumidor Final'),
  clienteDocumento: z.string().optional(),
  clienteTelefone: z.string().optional(),
  formaPagamento: z.enum(['PIX', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'DINHEIRO']).default('PIX'),
  desconto: z.number().min(0).default(0),
  itens: z.array(ItemVendaBalcaoInputSchema).min(1, 'A venda balcão deve conter ao menos um item'),
  observacoes: z.string().optional(),
});

export type CriarVendaBalcaoDto = z.infer<typeof CriarVendaBalcaoSchema>;

// -------------------------------------------------------------
// Interfaces do MRP (Material Requirements Planning)
// -------------------------------------------------------------
export interface DemandaOSInfo {
  osId: string;
  osCodigo: string;
  veiculo: string;
  cliente: string;
  quantidadeNecessaria: number;
}

export interface ItemSugestaoMRP {
  produtoId: string;
  codigo: string;
  descricao: string;
  fotoUrl?: string | null;
  localizacao?: string | null;
  saldoFisico: number;
  saldoReservado: number;
  saldoDisponivel: number;
  estoqueMinimo: number;
  demandaOS: number;
  necessidadeLiquida: number;
  custoMedio: number;
  ultimoPrecoCompra: number;
  ultimoPrecoVenda: number;
  precoCustoAtual: number;
  custoTotalEstimado: number;
  criticidade: CriticidadeMRP;
  motivoUrgencia: string;
  ordensRelacionadas: DemandaOSInfo[];
}

export interface ResumoMRP {
  totalItensCriticos: number;
  totalItensReposicao: number;
  totalPecasNecessarias: number;
  custoTotalSugerido: number;
  itens: ItemSugestaoMRP[];
}
