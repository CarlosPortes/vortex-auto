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

export interface Cliente {
  id: string;
  tipo: string;
  nomeRazao: string;
  apelidoFantasia?: string | null;
  cpfCnpj: string;
  telefone: string;
  email?: string | null;
  cidade?: string | null;
  uf?: string | null;
  veiculosCount?: number;
  veiculos?: Array<{
    vinculoId: string;
    veiculoId: string;
    placa: string;
    modelo: string;
    categoria: string;
    papel: string;
  }>;
}

export interface CategoriaVeiculo {
  id: string;
  codigo: string;
  nome: string;
}

export interface Veiculo {
  id: string;
  placa: string;
  chassi?: string | null;
  marca: string;
  modelo: string;
  anoFabricacao?: number | null;
  anoModelo?: number | null;
  cor?: string | null;
  combustivel?: string | null;
  categoria: string;
  categoriaCodigo: string;
  proprietario?: {
    id: string;
    nome: string;
    telefone: string;
  } | null;
}

export interface MedicaoVeiculo {
  id: string;
  quilometragem: number;
  nivelCombustivel: string;
  pertencesDeixados?: string | null;
  avariasPrevias?: string | null;
  temEstepe: boolean;
  temMacaco: boolean;
  temChaveRoda: boolean;
  temManualChaveReserva: boolean;
}

export interface Atendimento {
  id: string;
  numeroSequencial: number;
  codigoFormatado: string;
  status: string;
  queixaPrincipal: string;
  dataEntrada: string;
  previsaoEntrega?: string | null;
  cliente: Cliente;
  veiculo: Veiculo;
  usuarioAbertura?: { id: string; nome: string; email?: string } | null;
  medicao?: MedicaoVeiculo | null;
}

// -------------------------------------------------------------
// ENT-003: Tipos de Diagnóstico e Orçamento
// -------------------------------------------------------------
export interface Diagnostico {
  id: string;
  atendimentoId: string;
  relatoTecnico: string;
  constatacoes: string;
  causaRaiz?: string | null;
  conclusao: string;
  procedimentoRecomendado?: string | null;
  criadoEm: string;
  responsavelTecnico?: { id: string; nome: string; email?: string } | null;
}

export interface ItemOrcamento {
  id: string;
  versaoOrcamentoId: string;
  tipo: 'PECA' | 'SERVICO';
  descricao: string;
  quantidade: number;
  unidadeMedida: string;
  valorUnitario: number;
  valorDesconto: number;
  valorTotal: number;
  decisao: 'PENDENTE' | 'APROVADO' | 'RECUSADO' | 'RETIRADO';
  justificativaDecisao?: string | null;
}

export interface DecisaoComercial {
  id: string;
  versaoOrcamentoId: string;
  canal: string;
  autorizadorNome: string;
  documentoAutorizador?: string | null;
  evidenciaTexto?: string | null;
  dataDecisao: string;
  usuarioRegistrador?: { id: string; nome: string } | null;
}

export interface VersaoOrcamento {
  id: string;
  orcamentoId: string;
  numeroVersao: number;
  status: string; // RASCUNHO, APRESENTADA, APROVADA_PARCIAL, APROVADA_TOTAL, RECUSADA
  validadeDias: number;
  apresentadaEm?: string | null;
  observacoesComerciais?: string | null;
  valorTotalPecas: number;
  valorTotalServicos: number;
  valorDescontoGeral: number;
  valorTotalFinal: number;
  criadoEm: string;
  itens: ItemOrcamento[];
  decisoes?: DecisaoComercial[];
}
