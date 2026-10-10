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
  cobranca?: Cobranca | null;
  entrega?: EntregaVeiculo | null;
  garantiasOrigem?: GarantiaAtendimento[];
  garantiaGerada?: GarantiaAtendimento | null;
  servicosTerceiros?: ServicoTerceiro[];
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

// -------------------------------------------------------------
// ENT-004: Tipos de Estoque e Execução Técnica (OS)
// -------------------------------------------------------------
export interface Produto {
  id: string;
  codigo: string;
  descricao: string;
  unidadeMedida: string;
  precoCusto: number;
  precoVenda: number;
  saldoFisico: number;
  saldoReservado: number;
  saldoDisponivel: number;
  estoqueMinimo: number;
  abaixoMinimo: boolean;
  ativo: boolean;
  criadoEm: string;
}

export interface MovimentoEstoque {
  id: string;
  tipo: string;
  quantidade: number;
  saldoFisicoAnterior: number;
  saldoFisicoNovo: number;
  saldoReservadoAnterior: number;
  saldoReservadoNovo: number;
  origemDocumento?: string | null;
  motivo?: string | null;
  usuarioNome: string;
  criadoEm: string;
}

export interface AtividadeOS {
  id: string;
  descricao: string;
  status: string; // PENDENTE, EM_EXECUCAO, PAUSADA, CONCLUIDA, CANCELADA
  tempoEstimadoMinutos: number;
  tempoRealizadoMinutos: number;
  mecanico?: { id: string; nome: string } | null;
  motivoPausa?: string | null;
  iniciadoEm?: string | null;
  concluidoEm?: string | null;
}

export interface OrdemServico {
  id: string;
  numeroOS: number;
  codigoFormatado: string;
  status: string; // PLANEJADA, EM_ANDAMENTO, PAUSADA, CONCLUIDA, CANCELADA
  dataInicio?: string | null;
  dataConclusao?: string | null;
  observacoesTecnicas?: string | null;
  mecanicoResponsavel?: string | null;
  atendimento: {
    id: string;
    codigoFormatado: string;
    status: string;
    queixaPrincipal: string;
    cliente: { id: string; nomeRazao: string; telefone: string };
    veiculo: { id: string; placa: string; modelo: string; marca: string };
  };
  progresso: {
    totalAtividades: number;
    concluidas: number;
    progressoPercent: number;
  };
  atividades: AtividadeOS[];
  criadoEm: string;
}

// -------------------------------------------------------------
// ENT-005: Tipos de Inspeção, Financeiro e Entrega
// -------------------------------------------------------------
export interface InspecaoQualidade {
  id: string;
  atendimentoId: string;
  resultado: string; // APROVADO_TOTAL, APROVADO_COM_RESSALVA, REPROVADO
  constatacoes: string;
  itensInspecionados: string[];
  quilometragemTeste?: number | null;
  criadoEm: string;
  inspetor?: { id: string; nome: string; email?: string } | null;
}

export interface ParcelaCobranca {
  id: string;
  numeroParcela: number;
  valor: number;
  valorPago: number;
  saldoDevedor: number;
  dataVencimento: string;
  status: string; // PENDENTE, PAGA, VENCIDA, CANCELADA
}

export interface Recebimento {
  id: string;
  codigoFormatado: string;
  valor: number;
  meioPagamento: string;
  detalhes?: string | null;
  dataHoraRecebimento: string;
  usuarioNome?: string;
}

export interface Cobranca {
  id: string;
  codigoFormatado: string;
  status: string; // PENDENTE, PARCIALMENTE_LIQUIDADA, LIQUIDADA, CANCELADA
  valorTotal: number;
  valorDesconto: number;
  valorLiquido: number;
  valorRecebido: number;
  saldoDevedor: number;
  observacoes?: string | null;
  criadoEm: string;
  totalParcelas?: number;
  parcelasPagas?: number;
  atendimento?: {
    id: string;
    codigoFormatado: string;
    status: string;
    cliente: { id: string; nomeRazao: string; cpfCnpj?: string; telefone: string };
    veiculo: { id: string; placa: string; modelo: string; marca: string };
  };
  parcelas?: ParcelaCobranca[];
  recebimentos?: Recebimento[];
}

export interface EntregaVeiculo {
  id: string;
  atendimentoId: string;
  condicaoDevolucao: string;
  nomeRecebedor: string;
  documentoRecebedor?: string | null;
  quilometragemSaida: number;
  liberadaComDebito: boolean;
  motivoLiberacaoComDebito?: string | null;
  observacoes?: string | null;
  dataHoraEntrega: string;
  usuarioEntrega?: { id: string; nome: string; email?: string } | null;
}

// -------------------------------------------------------------
// ENT-006: Garantias, Terceiros e Relatórios
// -------------------------------------------------------------
export interface GarantiaAtendimento {
  id: string;
  codigoFormatado: string;
  numeroSequencial: number;
  reclamacaoCliente: string;
  parecerTecnico: string;
  decisao: 'COBERTA_TOTAL' | 'COBERTA_PARCIAL' | 'RECUSADA';
  justificativaDecisao: string;
  itensCobertos: string[];
  dataDecisao: string;
  usuarioDecisao?: { id: string; nome: string; email?: string } | null;
  atendimentoOrigem?: {
    id: string;
    codigoFormatado: string;
    dataEntrada: string;
    cliente: { id: string; nomeRazao: string; telefone: string };
    veiculo: { id: string; placa: string; modelo: string; marca: string };
  };
  atendimentoGarantia?: {
    id: string;
    codigoFormatado: string;
    status: string;
    ordemServico?: { id: string; codigoFormatado: string; status: string } | null;
  } | null;
  criadoEm: string;
}

export interface ServicoTerceiro {
  id: string;
  atendimentoId: string;
  fornecedorNome: string;
  descricaoServico: string;
  valorCusto: number;
  valorCobradoCliente: number;
  status: 'ENVIADO' | 'EM_EXECUCAO' | 'RECEBIDO' | 'CANCELADO';
  dataEnvio: string;
  dataRetornoPrevista?: string | null;
  dataRecebimento?: string | null;
  observacoes?: string | null;
  observacoesRetorno?: string | null;
  atendimento?: {
    id: string;
    codigoFormatado: string;
    cliente?: { id: string; nomeRazao: string };
    veiculo?: { id: string; placa: string; modelo: string };
  };
}

export interface ResumoRelatorio {
  financeiro: {
    faturamentoTotalRealizado: number;
    totalSaldoPendente: number;
    ticketMedio: number;
    totalRecebimentos: number;
  };
  atendimentos: {
    total: number;
    entregues: number;
    porStatus: Array<{ status: string; total: number }>;
  };
  ordensServico: {
    total: number;
    concluidas: number;
    emAndamento: number;
    taxaConclusaoPercent: number;
  };
  servicosTerceiros: {
    total: number;
    totalCusto: number;
    totalCobrado: number;
    margemBruta: number;
  };
  estoque: {
    totalItensCadastrados: number;
    itensEstoqueCritico: number;
    valorTotalEstoqueCusto: number;
    valorTotalEstoqueVenda: number;
  };
  garantias: {
    total: number;
    cobertas: number;
    recusadas: number;
  };
}


