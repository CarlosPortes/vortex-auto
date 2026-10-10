import React, { useState, useEffect } from 'react';
import {
  X,
  Stethoscope,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Plus,
  Send,
  UserCheck,
  Trash2,
  AlertCircle,
  Car,
  User,
  Check,
  Wrench,
  Play,
  ShieldCheck,
  DollarSign,
  KeyRound,
  Truck,
  ShieldAlert,
} from 'lucide-react';
import {
  Atendimento,
  Diagnostico,
  VersaoOrcamento,
  OrdemServico,
  InspecaoQualidade,
  Cobranca,
  EntregaVeiculo,
  ServicoTerceiro,
  GarantiaAtendimento,
} from '../types';
import { apiRequest } from '../api';

interface AtendimentoDetalhesModalProps {
  atendimento: Atendimento;
  onClose: () => void;
  onUpdated: () => void;
}

export const AtendimentoDetalhesModal: React.FC<AtendimentoDetalhesModalProps> = ({
  atendimento,
  onClose,
  onUpdated,
}) => {
  const [subAba, setSubAba] = useState<
    'DIAGNOSTICO' | 'ORCAMENTOS' | 'APROVACAO' | 'ORDEM_SERVICO' | 'INSPECAO' | 'FINANCEIRO_ENTREGA' | 'COMPLEMENTOS_GARANTIA'
  >('DIAGNOSTICO');
  const [osVinculada, setOsVinculada] = useState<OrdemServico | null>(null);
  const [planejandoOS, setPlanejandoOS] = useState(false);

  // Estados ENT-005: Inspeção, Cobrança e Entrega
  const [inspecoes, setInspecoes] = useState<InspecaoQualidade[]>([]);
  const [cobranca, setCobranca] = useState<Cobranca | null>(null);
  const [entrega, setEntrega] = useState<EntregaVeiculo | null>(null);

  // Form Inspeção
  const [inspResultado, setInspResultado] = useState<'APROVADO_TOTAL' | 'APROVADO_COM_RESSALVA' | 'REPROVADO'>('APROVADO_TOTAL');
  const [inspConstatacoes, setInspConstatacoes] = useState('');
  const [inspKmTeste, setInspKmTeste] = useState<number>(atendimento.medicao?.quilometragem || 0);
  const [salvandoInsp, setSalvandoInsp] = useState(false);

  // Form Cobrança & Recebimento
  const [cobNumParcelas, setCobNumParcelas] = useState(1);
  const [gerandoCob, setGerandoCob] = useState(false);
  const [recValor, setRecValor] = useState(0);
  const [recMeio, setRecMeio] = useState('PIX');
  const [salvandoRec, setSalvandoRec] = useState(false);

  // Form Entrega
  const [entCondicao, setEntCondicao] = useState('APROVADO_TOTAL');
  const [entRecebedor, setEntRecebedor] = useState(atendimento.cliente.nomeRazao);
  const [entDoc, setEntDoc] = useState(atendimento.cliente.cpfCnpj || '');
  const [entKmSaida, setEntKmSaida] = useState<number>(atendimento.medicao?.quilometragem || 0);
  const [entObs, setEntObs] = useState('');
  const [entMotivoDebito, setEntMotivoDebito] = useState('');
  const [salvandoEnt, setSalvandoEnt] = useState(false);

  // Estados ENT-006: Serviços de Terceiros e Garantias
  const [servicosTerceiros, setServicosTerceiros] = useState<ServicoTerceiro[]>([]);
  const [garantiasOrigem, setGarantiasOrigem] = useState<GarantiaAtendimento[]>([]);

  // Form Terceirização (HU-025)
  const [tercFornecedor, setTercFornecedor] = useState('');
  const [tercDescricao, setTercDescricao] = useState('');
  const [tercCusto, setTercCusto] = useState<number>(0);
  const [tercCobrado, setTercCobrado] = useState<number>(0);
  const [tercDataRetorno, setTercDataRetorno] = useState('');
  const [tercObs, setTercObs] = useState('');
  const [salvandoTerc, setSalvandoTerc] = useState(false);

  // Form Garantia (HU-023)
  const [garReclamacao, setGarReclamacao] = useState('');
  const [garParecer, setGarParecer] = useState('');
  const [garDecisao, setGarDecisao] = useState<'COBERTA_TOTAL' | 'COBERTA_PARCIAL' | 'RECUSADA'>('COBERTA_TOTAL');
  const [garJustificativa, setGarJustificativa] = useState('');
  const [garItensStr, setGarItensStr] = useState('');
  const [salvandoGar, setSalvandoGar] = useState(false);

  // Estado Diagnóstico
  const [diagnosticos, setDiagnosticos] = useState<Diagnostico[]>([]);
  const [relatoTecnico, setRelatoTecnico] = useState('');
  const [constatacoes, setConstatacoes] = useState('');
  const [conclusao, setConclusao] = useState('PROCEDE_REPARO');
  const [procedimentoRecomendado, setProcedimentoRecomendado] = useState('');
  const [salvandoDiag, setSalvandoDiag] = useState(false);

  // Estado Orçamentos
  const [versoes, setVersoes] = useState<VersaoOrcamento[]>([]);
  const [versaoSelecionada, setVersaoSelecionada] = useState<VersaoOrcamento | null>(null);

  // Form Novo Orçamento
  const [criandoVersao, setCriandoVersao] = useState(false);
  const [itensNovoOrcamento, setItensNovoOrcamento] = useState<
    Array<{ tipo: 'PECA' | 'SERVICO'; descricao: string; quantidade: number; unidadeMedida: string; valorUnitario: number; valorDesconto: number }>
  >([
    { tipo: 'SERVICO', descricao: 'Diagnóstico e Mão de Obra de Troca de Pastilhas', quantidade: 1, unidadeMedida: 'HR', valorUnitario: 180, valorDesconto: 0 },
    { tipo: 'PECA', descricao: 'Jogo de Pastilhas de Freio Dianteiro Cerâmica', quantidade: 1, unidadeMedida: 'JG', valorUnitario: 320, valorDesconto: 0 },
  ]);
  const [validadeDias, setValidadeDias] = useState(10);
  const [obsComerciais, setObsComerciais] = useState('');
  const [salvandoOrc, setSalvandoOrc] = useState(false);

  // Decisão Comercial
  const [decisoesItens, setDecisoesItens] = useState<Record<string, 'APROVADO' | 'RECUSADO'>>({});
  const [canalAprovacao, setCanalAprovacao] = useState<'WHATSAPP' | 'PRESENCIAL' | 'TELEFONE' | 'EMAIL'>('WHATSAPP');
  const [autorizadorNome, setAutorizadorNome] = useState(atendimento.cliente.nomeRazao);
  const [evidenciaTexto, setEvidenciaTexto] = useState('Cliente confirmou orçamento completo via WhatsApp.');
  const [salvandoDecisao, setSalvandoDecisao] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [sucessoMsg, setSucessoMsg] = useState('');

  const carregarDadosComerciais = async () => {
    setErrorMsg('');
    const [resDiag, resOrc, resOS, resInsp, resCob, resEnt, resDetalhe] = await Promise.all([
      apiRequest<Diagnostico[]>(`/atendimentos/${atendimento.id}/diagnostico`),
      apiRequest<VersaoOrcamento[]>(`/atendimentos/${atendimento.id}/orcamentos`),
      apiRequest<OrdemServico>(`/os/atendimento/${atendimento.id}`),
      apiRequest<InspecaoQualidade[]>(`/atendimentos/${atendimento.id}/inspecoes`),
      apiRequest<Cobranca>(`/atendimentos/${atendimento.id}/cobranca`),
      apiRequest<EntregaVeiculo>(`/atendimentos/${atendimento.id}/entrega`),
      apiRequest<any>(`/atendimentos/${atendimento.id}`),
    ]);

    if (resDiag.sucesso && resDiag.dados) {
      setDiagnosticos(resDiag.dados);
    }
    if (resOrc.sucesso && resOrc.dados) {
      setVersoes(resOrc.dados);
      if (resOrc.dados.length > 0) {
        setVersaoSelecionada(resOrc.dados[0]);
        // Inicializar decisões padrão como APROVADO
        const inicial: Record<string, 'APROVADO' | 'RECUSADO'> = {};
        resOrc.dados[0].itens.forEach((it) => {
          inicial[it.id] = 'APROVADO';
        });
        setDecisoesItens(inicial);
      }
    }
    if (resOS.sucesso && resOS.dados) {
      setOsVinculada(resOS.dados);
    } else {
      setOsVinculada(null);
    }
    if (resInsp.sucesso && resInsp.dados) {
      setInspecoes(resInsp.dados);
    }
    if (resCob.sucesso && resCob.dados) {
      setCobranca(resCob.dados);
      setRecValor(resCob.dados.saldoDevedor > 0 ? resCob.dados.saldoDevedor : 0);
    } else {
      setCobranca(null);
    }
    if (resEnt.sucesso && resEnt.dados) {
      setEntrega(resEnt.dados);
    } else {
      setEntrega(null);
    }
    if (resDetalhe.sucesso && resDetalhe.dados) {
      if (resDetalhe.dados.servicosTerceiros) {
        setServicosTerceiros(resDetalhe.dados.servicosTerceiros);
      }
      if (resDetalhe.dados.garantiasOrigem) {
        setGarantiasOrigem(resDetalhe.dados.garantiasOrigem);
      }
    }
  };

  const handleCadastrarServicoTerceiro = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvandoTerc(true);
    setErrorMsg('');

    const res = await apiRequest(`/atendimentos/${atendimento.id}/servicos-terceiros`, {
      method: 'POST',
      body: JSON.stringify({
        atendimentoId: atendimento.id,
        fornecedorNome: tercFornecedor,
        descricaoServico: tercDescricao,
        valorCusto: Number(tercCusto),
        valorCobradoCliente: Number(tercCobrado),
        dataRetornoPrevista: tercDataRetorno ? tercDataRetorno : undefined,
        observacoes: tercObs || undefined,
      }),
    });

    setSalvandoTerc(false);
    if (res.sucesso) {
      setSucessoMsg('Serviço de terceiro registrado com sucesso!');
      setTercFornecedor('');
      setTercDescricao('');
      setTercCusto(0);
      setTercCobrado(0);
      setTercDataRetorno('');
      setTercObs('');
      carregarDadosComerciais();
    } else {
      setErrorMsg(res.mensagem || 'Falha ao registrar serviço de terceiro.');
    }
  };

  const handleRegistrarGarantia = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvandoGar(true);
    setErrorMsg('');

    const itensCobertos = garItensStr
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const res = await apiRequest<any>(`/atendimentos/${atendimento.id}/garantia`, {
      method: 'POST',
      body: JSON.stringify({
        atendimentoOrigemId: atendimento.id,
        reclamacaoCliente: garReclamacao,
        parecerTecnico: garParecer,
        decisao: garDecisao,
        justificativaDecisao: garJustificativa,
        itensCobertos,
      }),
    });

    setSalvandoGar(false);
    if (res.sucesso) {
      setSucessoMsg(res.mensagem || 'Garantia registrada com sucesso!');
      setGarReclamacao('');
      setGarParecer('');
      setGarJustificativa('');
      setGarItensStr('');
      carregarDadosComerciais();
      onUpdated();
    } else {
      setErrorMsg(res.mensagem || 'Falha ao registrar garantia.');
    }
  };

  useEffect(() => {
    carregarDadosComerciais();
  }, [atendimento.id]);

  // Handlers ENT-005
  const handleRegistrarInspecao = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvandoInsp(true);
    setErrorMsg('');
    setSucessoMsg('');

    const res = await apiRequest(`/atendimentos/${atendimento.id}/inspecoes`, {
      method: 'POST',
      body: JSON.stringify({
        atendimentoId: atendimento.id,
        resultado: inspResultado,
        constatacoes: inspConstatacoes,
        itensInspecionados: ['Sistema de Freios', 'Teste de Rodagem', 'Verificação de Apertos', 'Fluidos e Vazamentos'],
        quilometragemTeste: Number(inspKmTeste),
      }),
    });

    setSalvandoInsp(false);
    if (res.sucesso) {
      setSucessoMsg(res.mensagem || 'Inspeção de qualidade registrada com sucesso!');
      setInspConstatacoes('');
      carregarDadosComerciais();
      onUpdated();
    } else {
      setErrorMsg(res.mensagem || 'Falha ao registrar inspeção.');
    }
  };

  const handleGerarCobranca = async () => {
    setGerandoCob(true);
    setErrorMsg('');
    setSucessoMsg('');

    const res = await apiRequest(`/atendimentos/${atendimento.id}/cobranca`, {
      method: 'POST',
      body: JSON.stringify({
        atendimentoId: atendimento.id,
        numeroParcelas: Number(cobNumParcelas),
        primeiroVencimentoDias: 0,
        observacoes: `Faturado diretamente no encerramento do atendimento ${atendimento.codigoFormatado}.`,
      }),
    });

    setGerandoCob(false);
    if (res.sucesso) {
      setSucessoMsg(res.mensagem || 'Cobrança gerada com sucesso!');
      carregarDadosComerciais();
      onUpdated();
    } else {
      setErrorMsg(res.mensagem || 'Falha ao emitir cobrança.');
    }
  };

  const handleRegistrarRecebimentoNoModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cobranca) return;
    setSalvandoRec(true);
    setErrorMsg('');
    setSucessoMsg('');

    const res = await apiRequest(`/cobrancas/${cobranca.id}/recebimentos`, {
      method: 'POST',
      body: JSON.stringify({
        valor: Number(recValor),
        meioPagamento: recMeio,
        detalhes: `Recebimento presencial na entrega`,
      }),
    });

    setSalvandoRec(false);
    if (res.sucesso) {
      setSucessoMsg(res.mensagem || 'Pagamento registrado com sucesso!');
      carregarDadosComerciais();
      onUpdated();
    } else {
      setErrorMsg(res.mensagem || 'Falha ao registrar pagamento.');
    }
  };

  const handleRegistrarEntrega = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvandoEnt(true);
    setErrorMsg('');
    setSucessoMsg('');

    const res = await apiRequest(`/atendimentos/${atendimento.id}/entrega`, {
      method: 'POST',
      body: JSON.stringify({
        atendimentoId: atendimento.id,
        condicaoDevolucao: entCondicao,
        nomeRecebedor: entRecebedor,
        documentoRecebedor: entDoc,
        quilometragemSaida: Number(entKmSaida),
        observacoes: entObs,
        motivoLiberacaoComDebito: entMotivoDebito,
      }),
    });

    setSalvandoEnt(false);
    if (res.sucesso) {
      setSucessoMsg(res.mensagem || 'Veículo entregue e atendimento concluído com sucesso!');
      carregarDadosComerciais();
      onUpdated();
    } else {
      setErrorMsg(res.mensagem || 'Falha ao registrar entrega.');
    }
  };

  // Planejar OS automática a partir dos itens do orçamento
  const handlePlanejarOSAutomatico = async () => {
    setPlanejandoOS(true);
    setErrorMsg('');
    setSucessoMsg('');

    // Extrair atividades dos itens aprovados do orçamento
    let atividades: Array<{ descricao: string; itemOrcamentoId?: string; tempoEstimadoMinutos: number }> = [];

    if (versaoSelecionada && versaoSelecionada.itens.length > 0) {
      atividades = versaoSelecionada.itens
        .filter((it) => it.decisao === 'APROVADO' || it.decisao === 'PENDENTE')
        .map((it) => ({
          descricao: `${it.tipo === 'SERVICO' ? 'Execução' : 'Instalação'}: ${it.descricao}`,
          itemOrcamentoId: it.id,
          tempoEstimadoMinutos: it.tipo === 'SERVICO' ? 60 : 30,
        }));
    }

    if (atividades.length === 0) {
      atividades = [
        { descricao: `Revisão e reparo técnico: ${atendimento.queixaPrincipal}`, tempoEstimadoMinutos: 90 },
      ];
    }

    const res = await apiRequest('/os/planejar', {
      method: 'POST',
      body: JSON.stringify({
        atendimentoId: atendimento.id,
        observacoesTecnicas: `Planejada a partir do atendimento ${atendimento.codigoFormatado}.`,
        atividades,
      }),
    });

    setPlanejandoOS(false);
    if (res.sucesso) {
      setSucessoMsg(res.mensagem || 'Ordem de Serviço criada com sucesso!');
      carregarDadosComerciais();
      onUpdated();
    } else {
      setErrorMsg(res.mensagem || 'Falha ao planejar Ordem de Serviço.');
    }
  };

  const handleApontarAtividadeNoModal = async (atividadeId: string, novoStatus: 'EM_EXECUCAO' | 'CONCLUIDA') => {
    const res = await apiRequest(`/os/atividades/${atividadeId}/apontar`, {
      method: 'PATCH',
      body: JSON.stringify({ novoStatus }),
    });

    if (res.sucesso) {
      carregarDadosComerciais();
      onUpdated();
    } else {
      setErrorMsg(res.mensagem || 'Erro ao apontar atividade.');
    }
  };

  const handleConcluirOSNoModal = async (osId: string) => {
    const res = await apiRequest(`/os/${osId}/concluir`, { method: 'PATCH' });
    if (res.sucesso) {
      setSucessoMsg(res.mensagem || 'Ordem de serviço concluída com sucesso!');
      carregarDadosComerciais();
      onUpdated();
    } else {
      setErrorMsg(res.mensagem || 'Falha ao concluir OS.');
    }
  };

  // Salvar Diagnóstico
  const handleSalvarDiagnostico = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvandoDiag(true);
    setErrorMsg('');
    setSucessoMsg('');

    const res = await apiRequest(`/atendimentos/${atendimento.id}/diagnostico`, {
      method: 'POST',
      body: JSON.stringify({
        relatoTecnico,
        constatacoes,
        conclusao,
        procedimentoRecomendado,
      }),
    });

    setSalvandoDiag(false);
    if (res.sucesso) {
      setSucessoMsg('Diagnóstico técnico registrado com sucesso!');
      setRelatoTecnico('');
      setConstatacoes('');
      setProcedimentoRecomendado('');
      carregarDadosComerciais();
      onUpdated();
    } else {
      setErrorMsg(res.mensagem || 'Falha ao salvar diagnóstico');
    }
  };

  // Manipular Itens Novo Orçamento
  const handleAddItem = () => {
    setItensNovoOrcamento([
      ...itensNovoOrcamento,
      { tipo: 'PECA', descricao: '', quantidade: 1, unidadeMedida: 'UN', valorUnitario: 0, valorDesconto: 0 },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItensNovoOrcamento(itensNovoOrcamento.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, campo: string, valor: any) => {
    const novos = [...itensNovoOrcamento];
    (novos[index] as any)[campo] = valor;
    setItensNovoOrcamento(novos);
  };

  // Salvar Nova Versão de Orçamento
  const handleSalvarVersaoOrcamento = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvandoOrc(true);
    setErrorMsg('');
    setSucessoMsg('');

    const res = await apiRequest(`/atendimentos/${atendimento.id}/orcamentos`, {
      method: 'POST',
      body: JSON.stringify({
        validadeDias: Number(validadeDias),
        observacoesComerciais: obsComerciais,
        itens: itensNovoOrcamento.map((it) => ({
          ...it,
          quantidade: Number(it.quantidade),
          valorUnitario: Number(it.valorUnitario),
          valorDesconto: Number(it.valorDesconto),
        })),
      }),
    });

    setSalvandoOrc(false);
    if (res.sucesso) {
      setCriandoVersao(false);
      setSucessoMsg('Nova versão de orçamento criada com sucesso!');
      carregarDadosComerciais();
      onUpdated();
    } else {
      setErrorMsg(res.mensagem || 'Falha ao criar orçamento');
    }
  };

  // Apresentar Proposta ao Cliente
  const handleApresentarProposta = async (versaoId: string) => {
    setErrorMsg('');
    const res = await apiRequest(`/orcamentos/versoes/${versaoId}/apresentar`, {
      method: 'POST',
    });

    if (res.sucesso) {
      setSucessoMsg('Orçamento apresentado! Status avançado para Aguardando Aprovação.');
      carregarDadosComerciais();
      onUpdated();
    } else {
      setErrorMsg(res.mensagem || 'Falha ao apresentar proposta');
    }
  };

  // Registrar Decisão Comercial por Item
  const handleConfirmarDecisao = async (versaoId: string) => {
    setSalvandoDecisao(true);
    setErrorMsg('');

    const decisoesFormatadas = Object.entries(decisoesItens).map(([itemId, decisao]) => ({
      itemId,
      decisao,
    }));

    const res = await apiRequest(`/orcamentos/versoes/${versaoId}/decisao`, {
      method: 'POST',
      body: JSON.stringify({
        canal: canalAprovacao,
        autorizadorNome,
        evidenciaTexto,
        decisoesItens: decisoesFormatadas,
      }),
    });

    setSalvandoDecisao(false);
    if (res.sucesso) {
      setSucessoMsg('Decisão comercial registrada com sucesso! Veículo liberado para execução mecânica.');
      carregarDadosComerciais();
      onUpdated();
    } else {
      setErrorMsg(res.mensagem || 'Falha ao registrar decisão comercial');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.8)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px',
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '920px',
        maxHeight: '92vh',
        overflowY: 'auto',
        background: '#0d1322',
        padding: '30px',
        borderRadius: 'var(--radius-lg)',
      }}>
        {/* Header com dados do Atendimento */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '18px', marginBottom: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)', fontFamily: 'var(--font-heading)' }}>
                {atendimento.codigoFormatado}
              </span>
              <span className="badge badge-blue">{atendimento.status}</span>
            </div>
            <div style={{ display: 'flex', gap: '16px', fontSize: '0.84rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Car size={15} color="var(--primary)" /> {atendimento.veiculo.marca} {atendimento.veiculo.modelo} ({atendimento.veiculo.placa})
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <User size={15} /> {atendimento.cliente.nomeRazao}
              </span>
            </div>
          </div>

          <button onClick={onClose} className="btn btn-secondary" style={{ padding: '6px', borderRadius: '50%' }}>
            <X size={18} />
          </button>
        </div>

        {/* Alertas */}
        {errorMsg && (
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', padding: '10px 14px', borderRadius: '6px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem' }}>
            <AlertCircle size={16} /> {errorMsg}
          </div>
        )}
        {sucessoMsg && (
          <div style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', padding: '10px 14px', borderRadius: '6px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem' }}>
            <CheckCircle2 size={16} /> {sucessoMsg}
          </div>
        )}

        {/* Sub-Abas do Fluxo Técnico e Comercial */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', marginBottom: '20px' }}>
          <button
            onClick={() => setSubAba('DIAGNOSTICO')}
            className={`btn ${subAba === 'DIAGNOSTICO' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.84rem', padding: '8px 16px' }}
          >
            <Stethoscope size={16} /> 1. Diagnóstico Técnico ({diagnosticos.length})
          </button>

          <button
            onClick={() => setSubAba('ORCAMENTOS')}
            className={`btn ${subAba === 'ORCAMENTOS' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.84rem', padding: '8px 16px' }}
          >
            <FileSpreadsheet size={16} /> 2. Orçamento Versionado ({versoes.length})
          </button>

          <button
            onClick={() => setSubAba('APROVACAO')}
            className={`btn ${subAba === 'APROVACAO' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.84rem', padding: '8px 16px' }}
          >
            <UserCheck size={16} /> 3. Decisão Comercial por Item
          </button>

          <button
            onClick={() => setSubAba('ORDEM_SERVICO')}
            className={`btn ${subAba === 'ORDEM_SERVICO' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.84rem', padding: '8px 16px' }}
          >
            <Wrench size={16} /> 4. Execução Técnica & OS {osVinculada ? `(${osVinculada.codigoFormatado})` : ''}
          </button>

          <button
            onClick={() => setSubAba('INSPECAO')}
            className={`btn ${subAba === 'INSPECAO' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.84rem', padding: '8px 16px' }}
          >
            <ShieldCheck size={16} /> 5. Inspeção de Qualidade ({inspecoes.length})
          </button>

          <button
            onClick={() => setSubAba('FINANCEIRO_ENTREGA')}
            className={`btn ${subAba === 'FINANCEIRO_ENTREGA' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.84rem', padding: '8px 16px' }}
          >
            <KeyRound size={16} /> 6. Cobrança & Entrega {entrega ? '✓' : ''}
          </button>

          <button
            onClick={() => setSubAba('COMPLEMENTOS_GARANTIA')}
            className={`btn ${subAba === 'COMPLEMENTOS_GARANTIA' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.84rem', padding: '8px 16px' }}
          >
            <Truck size={16} /> 7. Terceiros & Garantia ({servicosTerceiros.length + garantiasOrigem.length})
          </button>
        </div>

        {/* SUB-ABA 1: DIAGNÓSTICO TÉCNICO (HU-010) */}
        {subAba === 'DIAGNOSTICO' && (
          <div>
            {/* Lista de Diagnósticos Anteriores */}
            {diagnosticos.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '10px', color: '#38bdf8' }}>
                  Pareceres Técnicos Emitidos:
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {diagnosticos.map((diag) => (
                    <div key={diag.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.92rem' }}>
                          Mecânico: {diag.responsavelTecnico?.nome || 'Técnico Responsável'}
                        </span>
                        <span className="badge badge-blue">{diag.conclusao.replace(/_/g, ' ')}</span>
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginBottom: '6px' }}>
                        <strong>Constatações:</strong> {diag.constatacoes}
                      </p>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        <strong>Procedimento Recomendado:</strong> {diag.procedimentoRecomendado || diag.relatoTecnico}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Formulário Novo Diagnóstico */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '20px' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Stethoscope size={18} color="var(--primary)" /> Registrar Novo Diagnóstico Técnico (HU-010)
              </h4>

              <form onSubmit={handleSalvarDiagnostico} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label className="input-label">Constatações da Desmontagem / Falhas Identificadas</label>
                  <textarea
                    required
                    rows={2}
                    value={constatacoes}
                    onChange={(e) => setConstatacoes(e.target.value)}
                    placeholder="Ex: Pastilhas de freio dianteiras gastas abaixo do limite mínimo (menos de 2mm), discos com sulcos acentuados..."
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="input-label">Relato Detalhado dos Procedimentos e Testes Realizados</label>
                  <textarea
                    required
                    rows={2}
                    value={relatoTecnico}
                    onChange={(e) => setRelatoTecnico(e.target.value)}
                    placeholder="Ex: Teste de rodagem comprovou trepidação no pedal. Verificação em elevador constatou folga zero nos pivôs, porém desgaste crítico no sistema de frenagem..."
                    className="input-field"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="input-label">Conclusão Técnica</label>
                    <select
                      value={conclusao}
                      onChange={(e) => setConclusao(e.target.value)}
                      className="input-field"
                    >
                      <option value="PROCEDE_REPARO">Procede Reparo Imediato</option>
                      <option value="AGUARDANDO_DESMONTAGEM">Aguardando Desmontagem Adicional</option>
                      <option value="INCONCLUSIVO">Inconclusivo / Teste em Andamento</option>
                      <option value="SEM_DEFEITO_CONSTATADO">Sem Defeito Constatado</option>
                    </select>
                  </div>

                  <div>
                    <label className="input-label">Procedimento Recomendado</label>
                    <input
                      type="text"
                      value={procedimentoRecomendado}
                      onChange={(e) => setProcedimentoRecomendado(e.target.value)}
                      placeholder="Ex: Substituição das pastilhas e retífica/troca dos discos dianteiros"
                      className="input-field"
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                  <button type="submit" disabled={salvandoDiag} className="btn btn-primary">
                    {salvandoDiag ? 'Registrando...' : 'Gravar Parecer Técnico'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* SUB-ABA 2: ORÇAMENTO VERSIONADO (HU-011) */}
        {subAba === 'ORCAMENTOS' && (
          <div>
            {!criandoVersao ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>Versões Comerciais da Proposta</h4>
                  <button onClick={() => setCriandoVersao(true)} className="btn btn-primary">
                    <Plus size={16} /> Nova Revisão de Orçamento
                  </button>
                </div>

                {versoes.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Nenhum orçamento emitido ainda. Clique em "Nova Revisão de Orçamento" para adicionar peças e serviços.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {versoes.map((v) => (
                      <div key={v.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                          <div>
                            <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)' }}>
                              Orçamento — Versão {v.numeroVersao}
                            </span>
                            <span className="badge badge-purple" style={{ marginLeft: '10px' }}>
                              {v.status}
                            </span>
                          </div>

                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#34d399' }}>
                              R$ {Number(v.valorTotalFinal).toFixed(2)}
                            </span>
                            {v.status === 'RASCUNHO' && (
                              <button
                                onClick={() => handleApresentarProposta(v.id)}
                                className="btn btn-secondary"
                                style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                              >
                                <Send size={14} /> Apresentar ao Cliente
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Itens da Versão */}
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem', marginTop: '10px' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                              <th style={{ padding: '8px' }}>Tipo</th>
                              <th style={{ padding: '8px' }}>Descrição</th>
                              <th style={{ padding: '8px' }}>Qtd</th>
                              <th style={{ padding: '8px' }}>Unitário</th>
                              <th style={{ padding: '8px' }}>Total</th>
                              <th style={{ padding: '8px' }}>Decisão</th>
                            </tr>
                          </thead>
                          <tbody>
                            {v.itens.map((it) => (
                              <tr key={it.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                <td style={{ padding: '8px' }}>
                                  <span className={`badge ${it.tipo === 'PECA' ? 'badge-amber' : 'badge-blue'}`}>
                                    {it.tipo}
                                  </span>
                                </td>
                                <td style={{ padding: '8px', fontWeight: 500 }}>{it.descricao}</td>
                                <td style={{ padding: '8px' }}>{Number(it.quantidade)} {it.unidadeMedida}</td>
                                <td style={{ padding: '8px' }}>R$ {Number(it.valorUnitario).toFixed(2)}</td>
                                <td style={{ padding: '8px', fontWeight: 600 }}>R$ {Number(it.valorTotal).toFixed(2)}</td>
                                <td style={{ padding: '8px' }}>
                                  <span className={`badge ${it.decisao === 'APROVADO' ? 'badge-green' : it.decisao === 'RECUSADO' ? 'badge-amber' : 'badge-blue'}`}>
                                    {it.decisao}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Formulário Criar Versão */
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>Nova Revisão de Orçamento</h4>
                  <button onClick={() => setCriandoVersao(false)} className="btn btn-secondary" style={{ fontSize: '0.8rem' }}>
                    Voltar
                  </button>
                </div>

                <form onSubmit={handleSalvarVersaoOrcamento} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Tabela de Itens */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="input-label">Itens de Peças e Mão de Obra</span>
                      <button type="button" onClick={handleAddItem} className="btn btn-secondary" style={{ fontSize: '0.74rem', padding: '4px 8px' }}>
                        <Plus size={13} /> Adicionar Item
                      </button>
                    </div>

                    {itensNovoOrcamento.map((it, idx) => (
                      <div key={idx} style={{ display: 'grid', gridTemplateColumns: '100px 2fr 70px 60px 100px 36px', gap: '8px', alignItems: 'center' }}>
                        <select
                          value={it.tipo}
                          onChange={(e) => handleItemChange(idx, 'tipo', e.target.value)}
                          className="input-field"
                        >
                          <option value="SERVICO">Serviço</option>
                          <option value="PECA">Peça</option>
                        </select>

                        <input
                          type="text"
                          required
                          value={it.descricao}
                          onChange={(e) => handleItemChange(idx, 'descricao', e.target.value)}
                          placeholder="Descrição do item"
                          className="input-field"
                        />

                        <input
                          type="number"
                          required
                          min={0.1}
                          step="any"
                          value={it.quantidade}
                          onChange={(e) => handleItemChange(idx, 'quantidade', e.target.value)}
                          className="input-field"
                          placeholder="Qtd"
                        />

                        <input
                          type="text"
                          value={it.unidadeMedida}
                          onChange={(e) => handleItemChange(idx, 'unidadeMedida', e.target.value)}
                          className="input-field"
                          placeholder="UN"
                        />

                        <input
                          type="number"
                          required
                          min={0}
                          step="0.01"
                          value={it.valorUnitario}
                          onChange={(e) => handleItemChange(idx, 'valorUnitario', e.target.value)}
                          className="input-field"
                          placeholder="R$ Unit"
                        />

                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="btn btn-secondary"
                          style={{ padding: '8px', color: '#f87171' }}
                          title="Remover Item"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                    <div>
                      <label className="input-label">Validade da Proposta (Dias)</label>
                      <input
                        type="number"
                        value={validadeDias}
                        onChange={(e) => setValidadeDias(Number(e.target.value))}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="input-label">Observações Comerciais / Condições</label>
                      <input
                        type="text"
                        value={obsComerciais}
                        onChange={(e) => setObsComerciais(e.target.value)}
                        placeholder="Ex: Peças originais com garantia de 1 ano, pagamento em até 6x sem juros"
                        className="input-field"
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                    <button type="button" onClick={() => setCriandoVersao(false)} className="btn btn-secondary">
                      Cancelar
                    </button>
                    <button type="submit" disabled={salvandoOrc} className="btn btn-primary">
                      {salvandoOrc ? 'Criando Versão...' : 'Criar Versão do Orçamento'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* SUB-ABA 3: DECISÃO COMERCIAL POR ITEM (HU-012/013) */}
        {subAba === 'APROVACAO' && (
          <div>
            {versoes.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Crie um orçamento antes de registrar a decisão comercial.
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                      Registro de Aprovação Rastreável por Item (DOC-003, DOC-004)
                    </h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      O cliente pode aprovar integralmente ou selecionar apenas os itens prioritários.
                    </p>
                  </div>

                  {/* Seletor de versão */}
                  <select
                    value={versaoSelecionada?.id}
                    onChange={(e) => {
                      const v = versoes.find((item) => item.id === e.target.value);
                      if (v) setVersaoSelecionada(v);
                    }}
                    className="input-field"
                    style={{ width: '180px' }}
                  >
                    {versoes.map((v) => (
                      <option key={v.id} value={v.id}>
                        Versão {v.numeroVersao} ({v.status})
                      </option>
                    ))}
                  </select>
                </div>

                {versaoSelecionada && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Lista de itens para decisão */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {versaoSelecionada.itens.map((it) => {
                        const decisaoAtual = decisoesItens[it.id] || 'APROVADO';
                        return (
                          <div
                            key={it.id}
                            style={{
                              background: 'rgba(255,255,255,0.02)',
                              border: `1px solid ${decisaoAtual === 'APROVADO' ? '#10b98140' : '#ef444440'}`,
                              borderRadius: 'var(--radius-sm)',
                              padding: '12px 16px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{it.descricao}</div>
                              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                {it.tipo} • {Number(it.quantidade)} {it.unidadeMedida} • R$ {Number(it.valorTotal).toFixed(2)}
                              </div>
                            </div>

                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                type="button"
                                onClick={() => setDecisoesItens({ ...decisoesItens, [it.id]: 'APROVADO' })}
                                className={`btn ${decisaoAtual === 'APROVADO' ? 'btn-primary' : 'btn-secondary'}`}
                                style={{ fontSize: '0.78rem', padding: '6px 12px' }}
                              >
                                <CheckCircle2 size={14} /> Aprovar
                              </button>
                              <button
                                type="button"
                                onClick={() => setDecisoesItens({ ...decisoesItens, [it.id]: 'RECUSADO' })}
                                className="btn btn-secondary"
                                style={{
                                  fontSize: '0.78rem',
                                  padding: '6px 12px',
                                  borderColor: decisaoAtual === 'RECUSADO' ? '#ef4444' : undefined,
                                  color: decisaoAtual === 'RECUSADO' ? '#f87171' : undefined,
                                }}
                              >
                                <XCircle size={14} /> Recusar
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Dados da Autorização Rastreável */}
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '16px' }}>
                      <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#38bdf8', marginBottom: '12px' }}>
                        Evidência da Autorização Comercial (DOC-004 e DOC-013)
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '10px' }}>
                        <div>
                          <label className="input-label">Canal de Autorização</label>
                          <select
                            value={canalAprovacao}
                            onChange={(e) => setCanalAprovacao(e.target.value as any)}
                            className="input-field"
                          >
                            <option value="WHATSAPP">WhatsApp (Mensagem de Áudio/Texto)</option>
                            <option value="PRESENCIAL">Presencial (Assinatura no Balcão)</option>
                            <option value="TELEFONE">Ligação Telefônica Gravada</option>
                            <option value="EMAIL">E-mail Formal</option>
                          </select>
                        </div>

                        <div>
                          <label className="input-label">Nome do Autorizador / Cliente</label>
                          <input
                            type="text"
                            required
                            value={autorizadorNome}
                            onChange={(e) => setAutorizadorNome(e.target.value)}
                            className="input-field"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="input-label">Evidência / Observações da Aprovação</label>
                        <input
                          type="text"
                          value={evidenciaTexto}
                          onChange={(e) => setEvidenciaTexto(e.target.value)}
                          className="input-field"
                          placeholder="Ex: Áudio do cliente às 14:32 autorizando a troca das pastilhas"
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                      <button
                        type="button"
                        disabled={salvandoDecisao}
                        onClick={() => handleConfirmarDecisao(versaoSelecionada.id)}
                        className="btn btn-primary"
                        style={{ minWidth: '220px' }}
                      >
                        <Check size={16} /> {salvandoDecisao ? 'Gravando...' : 'Confirmar Decisão e Liberar OS'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* SUB-ABA 4: ORDEM DE SERVIÇO & EXECUÇÃO TÉCNICA (HU-014 a HU-016) */}
        {subAba === 'ORDEM_SERVICO' && (
          <div>
            {!osVinculada ? (
              <div style={{
                textAlign: 'center',
                padding: '40px 20px',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: 'var(--radius-sm)',
                border: '1px dashed var(--border-subtle)',
              }}>
                <Wrench size={40} color="var(--primary)" style={{ margin: '0 auto 12px auto' }} />
                <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '6px' }}>
                  Nenhuma Ordem de Serviço Planejada
                </h4>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', maxWidth: '480px', margin: '0 auto 20px auto' }}>
                  A Ordem de Serviço consolida as tarefas dos mecânicos e vincula as reservas de peças a serem consumidas do estoque.
                </p>

                <button
                  type="button"
                  disabled={planejandoOS}
                  onClick={handlePlanejarOSAutomatico}
                  className="btn btn-primary"
                  style={{ padding: '10px 20px' }}
                >
                  <Wrench size={16} /> {planejandoOS ? 'Planejando OS...' : 'Gerar Ordem de Serviço com Itens Aprovados (HU-014)'}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Header da OS */}
                <div style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '18px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)' }}>
                        {osVinculada.codigoFormatado}
                      </span>
                      <span className={`badge ${
                        osVinculada.status === 'CONCLUIDA' ? 'badge-green' :
                        osVinculada.status === 'EM_ANDAMENTO' ? 'badge-amber' : 'badge-purple'
                      }`}>
                        {osVinculada.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Mecânico Responsável: <strong>{osVinculada.mecanicoResponsavel || 'Equipe Geral'}</strong> • Criada em: {new Date(osVinculada.criadoEm).toLocaleString('pt-BR')}
                    </div>
                  </div>

                  {osVinculada.status !== 'CONCLUIDA' && (
                    <button
                      onClick={() => handleConcluirOSNoModal(osVinculada.id)}
                      className="btn btn-primary"
                      style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <CheckCircle2 size={16} /> Finalizar OS & Liberar P/ Inspeção
                    </button>
                  )}
                </div>

                {/* Progresso */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '6px' }}>
                    <span>Progresso das Atividades</span>
                    <span style={{ fontWeight: 700 }}>
                      {osVinculada.atividades.filter((a) => a.status === 'CONCLUIDA').length} de {osVinculada.atividades.length} concluídas
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${osVinculada.atividades.length > 0 ? (osVinculada.atividades.filter((a) => a.status === 'CONCLUIDA').length / osVinculada.atividades.length) * 100 : 0}%`,
                      height: '100%',
                      background: osVinculada.status === 'CONCLUIDA' ? '#10b981' : 'var(--primary)',
                    }} />
                  </div>
                </div>

                {/* Lista de Atividades com Apontamento Rápido */}
                <div>
                  <h5 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '10px' }}>Atividades da Oficina:</h5>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {osVinculada.atividades.map((ativ) => (
                      <div
                        key={ativ.id}
                        style={{
                          padding: '12px 16px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid var(--border-subtle)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.86rem' }}>{ativ.descricao}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            Estimado: {ativ.tempoEstimadoMinutos} min • Realizado: {ativ.tempoRealizadoMinutos} min • Mecânico: {ativ.mecanico?.nome || 'Atribuído na bancada'}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className={`badge ${
                            ativ.status === 'CONCLUIDA' ? 'badge-green' :
                            ativ.status === 'EM_EXECUCAO' ? 'badge-amber' : 'badge-gray'
                          }`}>
                            {ativ.status}
                          </span>

                          {osVinculada.status !== 'CONCLUIDA' && ativ.status !== 'CONCLUIDA' && (
                            <div style={{ display: 'flex', gap: '6px' }}>
                              {ativ.status !== 'EM_EXECUCAO' && (
                                <button
                                  type="button"
                                  onClick={() => handleApontarAtividadeNoModal(ativ.id, 'EM_EXECUCAO')}
                                  className="btn btn-secondary"
                                  style={{ padding: '4px 8px', fontSize: '0.72rem', color: '#34d399' }}
                                  title="Iniciar"
                                >
                                  <Play size={12} /> Iniciar
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleApontarAtividadeNoModal(ativ.id, 'CONCLUIDA')}
                                className="btn btn-primary"
                                style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                                title="Concluir"
                              >
                                <CheckCircle2 size={12} /> Concluir
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SUB-ABA 5: INSPEÇÃO FINAL DE QUALIDADE (HU-019) */}
        {subAba === 'INSPECAO' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Lista de Inspeções Anteriores */}
            {inspecoes.length > 0 && (
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '10px', color: '#38bdf8' }}>
                  Inspeções Realizadas ({inspecoes.length})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {inspecoes.map((insp) => (
                    <div
                      key={insp.id}
                      style={{
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '16px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div>
                          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                            Inspetor: {insp.inspetor?.nome || 'Inspetor de Qualidade'}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '8px' }}>
                            • {new Date(insp.criadoEm).toLocaleString('pt-BR')}
                          </span>
                        </div>
                        <span className={`badge ${
                          insp.resultado === 'APROVADO_TOTAL' ? 'badge-green' :
                          insp.resultado === 'APROVADO_COM_RESSALVA' ? 'badge-amber' : 'badge-danger'
                        }`}>
                          {insp.resultado.replace(/_/g, ' ')}
                        </span>
                      </div>

                      <p style={{ fontSize: '0.85rem', marginBottom: '6px' }}>
                        <strong>Constatações:</strong> {insp.constatacoes}
                      </p>
                      {insp.quilometragemTeste && (
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          Odômetro no teste de rodagem: <strong>{insp.quilometragemTeste} km</strong>
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Form Nova Inspeção */}
            {atendimento.status !== 'ENTREGUE' && (
              <div style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '20px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                  <ShieldCheck size={18} color="var(--primary)" />
                  <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>Registrar Inspeção de Qualidade (HU-019)</h4>
                </div>

                <form onSubmit={handleRegistrarInspecao} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Resultado do Check-out *</label>
                      <select
                        value={inspResultado}
                        onChange={(e) => setInspResultado(e.target.value as any)}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: '#181b22', color: 'inherit' }}
                      >
                        <option value="APROVADO_TOTAL">Aprovado Total (Liberado p/ Entrega)</option>
                        <option value="APROVADO_COM_RESSALVA">Aprovado com Ressalva Operacional</option>
                        <option value="REPROVADO">Reprovado (Retorna para Oficina)</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Km após teste de rodagem</label>
                      <input
                        type="number"
                        min="0"
                        value={inspKmTeste}
                        onChange={(e) => setInspKmTeste(Number(e.target.value))}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.03)', color: 'inherit' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Parecer Técnico / Constatações *</label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Descreva o teste de rodagem, funcionamento dos itens reparados, ausência de ruídos ou anomalias..."
                      value={inspConstatacoes}
                      onChange={(e) => setInspConstatacoes(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.03)', color: 'inherit' }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="submit" disabled={salvandoInsp} className="btn btn-primary">
                      {salvandoInsp ? 'Gravando...' : 'Emitir Laudo de Inspeção'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* SUB-ABA 6: FINANCEIRO & ENTREGA DO VEÍCULO (HU-020 a HU-022) */}
        {subAba === 'FINANCEIRO_ENTREGA' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Bloco 1: Cobrança */}
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '20px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <DollarSign size={18} color="var(--primary)" />
                  <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>Contas a Receber / Cobrança (HU-020)</h4>
                </div>
                {cobranca && (
                  <span className={`badge ${cobranca.status === 'LIQUIDADA' ? 'badge-green' : 'badge-amber'}`}>
                    {cobranca.status.replace('_', ' ')}
                  </span>
                )}
              </div>

              {!cobranca ? (
                <div style={{ textAlign: 'center', padding: '24px' }}>
                  <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
                    A cobrança consolida os valores dos itens aprovados no orçamento para emissão e parcelamento financeiro.
                  </p>
                  <div style={{ display: 'inline-flex', gap: '10px', alignItems: 'center' }}>
                    <select
                      value={cobNumParcelas}
                      onChange={(e) => setCobNumParcelas(Number(e.target.value))}
                      style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: '#181b22', color: 'inherit', fontSize: '0.85rem' }}
                    >
                      <option value={1}>1x À Vista</option>
                      <option value={2}>2x Parcelado</option>
                      <option value={3}>3x Parcelado</option>
                      <option value={4}>4x Parcelado</option>
                      <option value={6}>6x Parcelado</option>
                    </select>

                    <button
                      type="button"
                      disabled={gerandoCob}
                      onClick={handleGerarCobranca}
                      className="btn btn-primary"
                    >
                      <DollarSign size={16} /> {gerandoCob ? 'Gerando...' : 'Gerar Cobrança (HU-020)'}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                    gap: '12px',
                    background: 'rgba(255,255,255,0.02)',
                    padding: '12px',
                    borderRadius: 'var(--radius-sm)',
                  }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>CÓDIGO COBRANÇA</div>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary)' }}>{cobranca.codigoFormatado}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>VALOR LÍQUIDO</div>
                      <div style={{ fontSize: '1rem', fontWeight: 700 }}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cobranca.valorLiquido)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>VALOR RECEBIDO</div>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: '#34d399' }}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cobranca.valorRecebido)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>SALDO PENDENTE</div>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: cobranca.saldoDevedor > 0 ? '#f87171' : '#34d399' }}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cobranca.saldoDevedor)}
                      </div>
                    </div>
                  </div>

                  {/* Baixa rápida de pagamento se houver saldo */}
                  {cobranca.saldoDevedor > 0 && (
                    <form onSubmit={handleRegistrarRecebimentoNoModal} style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: '130px' }}>
                        <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Valor a Baixar (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          max={cobranca.saldoDevedor}
                          value={recValor}
                          onChange={(e) => setRecValor(Number(e.target.value))}
                          style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.03)', color: 'inherit', fontSize: '0.82rem' }}
                        />
                      </div>
                      <div style={{ flex: 1, minWidth: '140px' }}>
                        <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Meio de Pagamento</label>
                        <select
                          value={recMeio}
                          onChange={(e) => setRecMeio(e.target.value)}
                          style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: '#181b22', color: 'inherit', fontSize: '0.82rem' }}
                        >
                          <option value="PIX">PIX</option>
                          <option value="CARTAO_CREDITO">Cartão Crédito</option>
                          <option value="CARTAO_DEBITO">Cartão Débito</option>
                          <option value="DINHEIRO">Dinheiro</option>
                        </select>
                      </div>
                      <button type="submit" disabled={salvandoRec} className="btn btn-secondary" style={{ padding: '7px 14px', fontSize: '0.82rem' }}>
                        {salvandoRec ? 'Baixando...' : 'Registrar Recebimento (HU-021)'}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>

            {/* Bloco 2: Liberação e Entrega do Veículo */}
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '20px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <KeyRound size={18} color="var(--primary)" />
                  <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>Liberação e Entrega Técnica do Veículo (HU-022)</h4>
                </div>
                {entrega && <span className="badge badge-green">ENTREGUE</span>}
              </div>

              {entrega ? (
                <div style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid #10b981', borderRadius: 'var(--radius-sm)', padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#34d399', fontWeight: 700, marginBottom: '6px' }}>
                    <CheckCircle2 size={18} /> Veículo Entregue com Sucesso!
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', marginTop: '10px' }}>
                    <div><strong>Retirado por:</strong> {entrega.nomeRecebedor} ({entrega.documentoRecebedor || 'Doc não informado'})</div>
                    <div><strong>Odômetro Final:</strong> {entrega.quilometragemSaida} km</div>
                    <div><strong>Data da Entrega:</strong> {new Date(entrega.dataHoraEntrega).toLocaleString('pt-BR')}</div>
                    <div><strong>Condição Técnica:</strong> {entrega.condicaoDevolucao.replace(/_/g, ' ')}</div>
                  </div>
                  {entrega.liberadaComDebito && (
                    <div style={{ marginTop: '8px', color: 'var(--accent-amber)', fontSize: '0.78rem' }}>
                      ⚠️ <strong>Entregue com Débito Autorizado:</strong> {entrega.motivoLiberacaoComDebito}
                    </div>
                  )}
                </div>
              ) : (
                <form onSubmit={handleRegistrarEntrega} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {cobranca && cobranca.saldoDevedor > 0 && (
                    <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid var(--accent-amber)', borderRadius: 'var(--radius-sm)', padding: '12px', fontSize: '0.82rem', color: 'var(--accent-amber)' }}>
                      ⚠️ <strong>Atenção:</strong> Há saldo financeiro pendente de <strong>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cobranca.saldoDevedor)}</strong>. A liberação exige autorização de gestor (permissão de alçada <code>ENTREGA_COM_DEBITO</code>) e justificativa formal.
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Nome de Quem Está Retirando *</label>
                      <input
                        type="text"
                        required
                        value={entRecebedor}
                        onChange={(e) => setEntRecebedor(e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.03)', color: 'inherit' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Documento do Recebedor (CPF/RG)</label>
                      <input
                        type="text"
                        value={entDoc}
                        onChange={(e) => setEntDoc(e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.03)', color: 'inherit' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Condição Técnica de Devolução *</label>
                      <select
                        value={entCondicao}
                        onChange={(e) => setEntCondicao(e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: '#181b22', color: 'inherit' }}
                      >
                        <option value="APROVADO_TOTAL">Aprovado Total (Todos reparos concluídos)</option>
                        <option value="APROVADO_COM_RESSALVA">Aprovado com Ressalva Informada</option>
                        <option value="SEM_REPARO_RETIRADA_SOLICITADA">Sem Reparo (Retirada Solicitada pelo Cliente)</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Odômetro de Saída (Km) *</label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={entKmSaida}
                        onChange={(e) => setEntKmSaida(Number(e.target.value))}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.03)', color: 'inherit' }}
                      />
                    </div>
                  </div>

                  {cobranca && cobranca.saldoDevedor > 0 && (
                    <div>
                      <label style={{ fontSize: '0.78rem', color: 'var(--accent-amber)' }}>Justificativa para Liberação com Débito *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Faturado para 15 dias para cliente frotista cadastrado"
                        value={entMotivoDebito}
                        onChange={(e) => setEntMotivoDebito(e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--accent-amber)', background: 'rgba(255,255,255,0.03)', color: 'inherit' }}
                      />
                    </div>
                  )}

                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Observações de Saída</label>
                    <input
                      type="text"
                      placeholder="Ex: Pertences conferidos e devolvidos, manual e chave entregues"
                      value={entObs}
                      onChange={(e) => setEntObs(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.03)', color: 'inherit' }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                    <button type="submit" disabled={salvandoEnt} className="btn btn-primary" style={{ padding: '10px 20px' }}>
                      <CheckCircle2 size={16} /> {salvandoEnt ? 'Finalizando...' : 'Confirmar Entrega e Concluir Atendimento'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* SUB-ABA 7: SERVIÇOS DE TERCEIROS E GARANTIA (ENT-006 / HU-023 e HU-025) */}
        {subAba === 'COMPLEMENTOS_GARANTIA' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Seção 1: Serviços de Terceiros e Retíficas */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Truck size={18} /> Serviços Externos & Retíficas Parceiras (HU-025)
                </h4>
                <span className="badge badge-blue">
                  {servicosTerceiros.length} serviço(s) registrado(s)
                </span>
              </div>

              {servicosTerceiros.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                  {servicosTerceiros.map((st) => (
                    <div
                      key={st.id}
                      style={{
                        padding: '12px 16px',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '12px',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text)' }}>
                          {st.fornecedorNome} — <span style={{ color: 'var(--primary)' }}>{st.descricaoServico}</span>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Custo: <strong style={{ color: '#cbd5e1' }}>R$ {Number(st.valorCusto).toFixed(2)}</strong> | Cobrado do Cliente: <strong style={{ color: '#34d399' }}>R$ {Number(st.valorCobradoCliente).toFixed(2)}</strong>
                          {st.dataRetornoPrevista && ` | Previsão: ${new Date(st.dataRetornoPrevista).toLocaleDateString('pt-BR')}`}
                        </div>
                      </div>

                      <span
                        className={`badge ${
                          st.status === 'RECEBIDO' ? 'badge-green' : st.status === 'ENVIADO' ? 'badge-blue' : 'badge-amber'
                        }`}
                      >
                        {st.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Formulário Novo Envio para Terceiro */}
              <form onSubmit={handleCadastrarServicoTerceiro} style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(255,255,255,0.01)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  Registrar Novo Envio Externo (Ex: Retífica, Torneiro, Reparo de Módulo)
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Fornecedor / Parceiro *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Retífica ABC de Motores"
                      value={tercFornecedor}
                      onChange={(e) => setTercFornecedor(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.03)', color: 'inherit' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Serviço Solicitado *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Plainamento e brunimento de bloco"
                      value={tercDescricao}
                      onChange={(e) => setTercDescricao(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.03)', color: 'inherit' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Custo do Fornecedor (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={tercCusto}
                      onChange={(e) => setTercCusto(Number(e.target.value))}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.03)', color: 'inherit' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Valor Cobrado do Cliente (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={tercCobrado}
                      onChange={(e) => setTercCobrado(Number(e.target.value))}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.03)', color: 'inherit' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                  <button type="submit" disabled={salvandoTerc} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.84rem' }}>
                    <Plus size={14} /> {salvandoTerc ? 'Enviando...' : 'Cadastrar Serviço de Terceiro'}
                  </button>
                </div>
              </form>
            </div>

            {/* Seção 2: Gestão de Garantia e Retorno de Atendimento (HU-023) */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent-amber)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldAlert size={18} /> Avaliação de Garantia & Retorno do Veículo (HU-023)
                </h4>
                <span className="badge badge-purple">
                  {garantiasOrigem.length} garantia(s) registrada(s)
                </span>
              </div>

              {/* Lista de Garantias Já Registradas */}
              {garantiasOrigem.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                  {garantiasOrigem.map((g) => (
                    <div
                      key={g.id}
                      style={{
                        padding: '14px',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, color: 'var(--accent-amber)' }}>{g.codigoFormatado}</span>
                        <span
                          className={`badge ${
                            g.decisao === 'COBERTA_TOTAL' ? 'badge-green' : g.decisao === 'COBERTA_PARCIAL' ? 'badge-amber' : 'badge-red'
                          }`}
                        >
                          {g.decisao}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text)' }}>
                        <strong>Reclamação do Cliente:</strong> {g.reclamacaoCliente}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        <strong>Parecer Técnico:</strong> {g.parecerTecnico}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--primary)', marginTop: '2px' }}>
                        {g.atendimentoGarantia?.codigoFormatado ? (
                          <span>✓ Novo Atendimento Aberto em Garantia: <strong>{g.atendimentoGarantia.codigoFormatado}</strong></span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>Garantia Recusada (Sem abertura de atendimento em cortesia)</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Formulário de Acionamento de Garantia */}
              {atendimento.status === 'ENTREGUE' ? (
                <form onSubmit={handleRegistrarGarantia} style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(255,255,255,0.01)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-amber)' }}>
                    Acionar Formalização de Garantia para este Veículo Entregue
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Reclamação do Cliente (Sintoma relatado) *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Barulho na frenagem após troca das pastilhas há 15 dias"
                      value={garReclamacao}
                      onChange={(e) => setGarReclamacao(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.03)', color: 'inherit' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Parecer Técnico da Análise Inicial *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Constatada folga na presilha de assentamento"
                      value={garParecer}
                      onChange={(e) => setGarParecer(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.03)', color: 'inherit' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Decisão de Cobertura *</label>
                      <select
                        value={garDecisao}
                        onChange={(e) => setGarDecisao(e.target.value as any)}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: '#181b22', color: 'inherit' }}
                      >
                        <option value="COBERTA_TOTAL">COBERTA_TOTAL (100% Cortesia da Oficina)</option>
                        <option value="COBERTA_PARCIAL">COBERTA_PARCIAL (Peça em Garantia)</option>
                        <option value="RECUSADA">RECUSADA (Mau Uso / Fora do Prazo)</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Justificativa Formal da Decisão *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Reparo realizado dentro dos 90 dias legais do CDC"
                        value={garJustificativa}
                        onChange={(e) => setGarJustificativa(e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.03)', color: 'inherit' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Itens Cobertos (separados por vírgula)</label>
                    <input
                      type="text"
                      placeholder="Ex: Jogo de pastilhas, Mão de obra de ajuste"
                      value={garItensStr}
                      onChange={(e) => setGarItensStr(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.03)', color: 'inherit' }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                    <button type="submit" disabled={salvandoGar} className="btn btn-primary" style={{ padding: '8px 20px', background: 'var(--accent-amber)' }}>
                      <ShieldCheck size={16} /> {salvandoGar ? 'Formalizando...' : 'Formalizar Decisão de Garantia'}
                    </button>
                  </div>
                </form>
              ) : (
                <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', fontSize: '0.84rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                  ℹ️ O acionamento formal de garantia fica habilitado após a finalização e liberação do atendimento como <strong>ENTREGUE</strong>.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
