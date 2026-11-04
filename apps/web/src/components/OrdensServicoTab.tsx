import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Play,
  Pause,
  CheckCircle2,
  Clock,
  Car,
  User,
  Plus,
  Package,
  X,
  Search,
  Layers,
  RotateCcw,
  Trash2,
  Camera,
  DollarSign,
  Calculator,
  BookOpen,
  Hammer,
  Upload,
} from 'lucide-react';
import {
  OrdemServico,
  AtividadeOS,
  Produto,
  ItemOSAvulso,
  FotoEtapaOS,
  ServicoCatalogo,
  Cliente,
} from '../types';
import { apiRequest } from '../api';
import { useDemoPlan } from '../context/DemoPlanContext';
import { CatalogoServicosModal, obterCatalogoServicos } from './CatalogoServicosModal';
import { ModalCalculadoraMaquininha } from './ModalCalculadoraMaquininha';

export const OrdensServicoTab: React.FC = () => {
  const { planoAtivo } = useDemoPlan();
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState<string>('TODAS');
  const [filtroClienteId, setFiltroClienteId] = useState<string>('TODOS');
  const [busca, setBusca] = useState('');

  // Catálogo de Serviços Padronizados
  const [modalCatalogoAberto, setModalCatalogoAberto] = useState(false);
  const [catalogoServicos, setCatalogoServicos] = useState<ServicoCatalogo[]>(() =>
    obterCatalogoServicos()
  );

  // Detalhes / Modal da OS
  const [osSelecionada, setOsSelecionada] = useState<OrdemServico | null>(null);
  const [modalDetalhes, setModalDetalhes] = useState(false);

  // Itens Avulsos / Serviços da OS (Modo Rápido / Sem Estoque - Plano Básico e Flexível)
  const [modalItemAvulso, setModalItemAvulso] = useState(false);
  const [itensAvulsos, setItensAvulsos] = useState<Record<string, ItemOSAvulso[]>>(() => {
    try {
      const salvo = localStorage.getItem('vortex_os_itens_avulsos');
      return salvo ? JSON.parse(salvo) : {};
    } catch {
      return {};
    }
  });
  const [novoTipoItem, setNovoTipoItem] = useState<'SERVICO' | 'PECA'>('SERVICO');
  const [novaDescItem, setNovaDescItem] = useState('');
  const [novaQtdItem, setNovaQtdItem] = useState(1);
  const [novoValorUnitItem, setNovoValorUnitItem] = useState(45);
  const [novoTempoItem, setNovoTempoItem] = useState(30);
  const [salvandoItemOS, setSalvandoItemOS] = useState(false);

  // Galeria de Fotos Antes / Durante / Depois por OS
  const [fotosOS, setFotosOS] = useState<Record<string, FotoEtapaOS[]>>(() => {
    try {
      const salvo = localStorage.getItem('vortex_os_fotos_etapas');
      return salvo ? JSON.parse(salvo) : {};
    } catch {
      return {};
    }
  });
  const [legendaNovaFoto, setLegendaNovaFoto] = useState('');
  const [fotoAmpliada, setFotoAmpliada] = useState<FotoEtapaOS | null>(null);

  // Faturamento Direto da OS + Simulador de Maquininha
  const [gerandoFaturamento, setGerandoFaturamento] = useState(false);
  const [modalCalculadoraOS, setModalCalculadoraOS] = useState(false);
  const [parcelasFaturamento, setParcelasFaturamento] = useState(1);

  // Ações em Atividade
  const [modalPausa, setModalPausa] = useState<AtividadeOS | null>(null);
  const [motivoPausa, setMotivoPausa] = useState('');
  const [tempoGastoPausa, setTempoGastoPausa] = useState(15);

  // Consumo de Peça na OS (Estoque WMS)
  const [modalConsumo, setModalConsumo] = useState(false);
  const [produtosDisponiveis, setProdutosDisponiveis] = useState<Produto[]>([]);
  const [prodConsumoId, setProdConsumoId] = useState('');
  const [qtdConsumo, setQtdConsumo] = useState(1);
  const [motivoConsumo, setMotivoConsumo] = useState('');
  const [salvandoConsumo, setSalvandoConsumo] = useState(false);

  // Devolução de Peça ao Estoque (HU-016)
  const [modalDevolucao, setModalDevolucao] = useState(false);
  const [prodDevolucaoId, setProdDevolucaoId] = useState('');
  const [qtdDevolucao, setQtdDevolucao] = useState(1);
  const [motivoDevolucao, setMotivoDevolucao] = useState('');
  const [salvandoDevolucao, setSalvandoDevolucao] = useState(false);

  const [feedbackMsg, setFeedbackMsg] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(
    null
  );

  const carregarClientes = async () => {
    const res = await apiRequest<Cliente[]>('/clientes');
    if (res.sucesso && res.dados) {
      setClientes(res.dados);
    }
  };

  const carregarOrdens = async () => {
    setLoading(true);
    let url = `/os?q=${encodeURIComponent(busca)}`;
    if (filtroStatus !== 'TODAS') {
      url += `&status=${filtroStatus}`;
    }
    if (filtroClienteId !== 'TODOS') {
      url += `&clienteId=${encodeURIComponent(filtroClienteId)}`;
    }
    const res = await apiRequest<OrdemServico[]>(url);
    if (res.sucesso && res.dados) {
      setOrdens(res.dados);
      if (osSelecionada) {
        const atualizada = res.dados.find((o) => o.id === osSelecionada.id);
        if (atualizada) setOsSelecionada(atualizada);
      }
    }
    setLoading(false);
  };

  const carregarProdutosParaConsumo = async () => {
    const res = await apiRequest<Produto[]>('/produtos');
    if (res.sucesso && res.dados) {
      setProdutosDisponiveis(res.dados);
      if (res.dados.length > 0 && !prodConsumoId) {
        setProdConsumoId(res.dados[0].id);
      }
      if (res.dados.length > 0 && !prodDevolucaoId) {
        setProdDevolucaoId(res.dados[0].id);
      }
    }
  };

  useEffect(() => {
    carregarClientes();
  }, []);

  useEffect(() => {
    carregarOrdens();
  }, [filtroStatus, filtroClienteId, busca]);

  const handleIniciarOS = async (osId: string) => {
    const res = await apiRequest(`/os/${osId}/iniciar`, { method: 'PATCH' });
    if (res.sucesso) {
      setFeedbackMsg({ tipo: 'sucesso', texto: 'Ordem de Serviço iniciada com sucesso!' });
      carregarOrdens();
    } else {
      setFeedbackMsg({ tipo: 'erro', texto: res.mensagem || 'Falha ao iniciar OS.' });
    }
  };

  const handleApontarAtividade = async (
    atividadeId: string,
    novoStatus: 'EM_EXECUCAO' | 'PAUSADA' | 'CONCLUIDA',
    tempoMinutos?: number,
    motivo?: string
  ) => {
    const res = await apiRequest(`/os/atividades/${atividadeId}/apontar`, {
      method: 'PATCH',
      body: JSON.stringify({
        novoStatus,
        tempoGastoMinutos: tempoMinutos,
        motivoPausa: motivo,
      }),
    });

    if (res.sucesso) {
      setFeedbackMsg({ tipo: 'sucesso', texto: `Atividade atualizada para '${novoStatus}'.` });
      carregarOrdens();
    } else {
      setFeedbackMsg({ tipo: 'erro', texto: res.mensagem || 'Erro ao atualizar atividade.' });
    }
  };

  const handleConfirmarPausa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalPausa) return;
    await handleApontarAtividade(modalPausa.id, 'PAUSADA', Number(tempoGastoPausa), motivoPausa);
    setModalPausa(null);
    setMotivoPausa('');
    setTempoGastoPausa(15);
  };

  const handleConsumirPeca = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!osSelecionada || !prodConsumoId) return;
    setSalvandoConsumo(true);

    const res = await apiRequest(`/os/${osSelecionada.id}/consumir-material`, {
      method: 'POST',
      body: JSON.stringify({
        produtoId: prodConsumoId,
        quantidade: Number(qtdConsumo),
        motivo: motivoConsumo || `Aplicado na OS ${osSelecionada.codigoFormatado}`,
      }),
    });

    if (res.sucesso) {
      setFeedbackMsg({
        tipo: 'sucesso',
        texto: 'Material consumido e estoque baixado com sucesso!',
      });
      setModalConsumo(false);
      setMotivoConsumo('');
      setQtdConsumo(1);
      carregarOrdens();
    } else {
      setFeedbackMsg({
        tipo: 'erro',
        texto: res.mensagem || 'Erro ao registrar consumo de peça.',
      });
    }
    setSalvandoConsumo(false);
  };

  const handleDevolverPeca = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!osSelecionada || !prodDevolucaoId) return;

    setSalvandoDevolucao(true);
    const res = await apiRequest(`/os/${osSelecionada.id}/devolver-material`, {
      method: 'POST',
      body: JSON.stringify({
        produtoId: prodDevolucaoId,
        quantidade: qtdDevolucao,
        motivo: motivoDevolucao || 'Sobra de peça devolvida ao almoxarifado',
      }),
    });

    if (res.sucesso) {
      setFeedbackMsg({
        tipo: 'sucesso',
        texto: 'Sobra de peça devolvida e estoque estornado com sucesso!',
      });
      setModalDevolucao(false);
      setMotivoDevolucao('');
      setQtdDevolucao(1);
      carregarOrdens();
    } else {
      setFeedbackMsg({
        tipo: 'erro',
        texto: res.mensagem || 'Erro ao devolver peça ao estoque.',
      });
    }
    setSalvandoDevolucao(false);
  };

  const handleSalvarItemAvulso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!osSelecionada || !novaDescItem.trim()) return;

    setSalvandoItemOS(true);

    const novoItem: ItemOSAvulso = {
      id: 'item-' + Date.now(),
      tipo: novoTipoItem,
      descricao: novaDescItem.trim(),
      quantidade: Number(novaQtdItem),
      valorUnitario: Number(novoValorUnitItem),
      valorTotal: Number(novaQtdItem) * Number(novoValorUnitItem),
    };

    // Persistir também no backend (cria AtividadeOS quando serviço e sincroniza Orçamento para faturamento e busca)
    await apiRequest(`/os/${osSelecionada.id}/adicionar-servico`, {
      method: 'POST',
      body: JSON.stringify({
        tipo: novoTipoItem,
        descricao: novaDescItem.trim(),
        quantidade: Number(novaQtdItem),
        valorUnitario: Number(novoValorUnitItem),
        tempoEstimadoMinutos: Number(novoTempoItem) || 30,
        criarAtividade: novoTipoItem === 'SERVICO',
      }),
    });

    const itensAtuais = itensAvulsos[osSelecionada.id] || [];
    const atualizados = {
      ...itensAvulsos,
      [osSelecionada.id]: [...itensAtuais, novoItem],
    };

    setItensAvulsos(atualizados);
    localStorage.setItem('vortex_os_itens_avulsos', JSON.stringify(atualizados));
    setSalvandoItemOS(false);

    setFeedbackMsg({
      tipo: 'sucesso',
      texto: `${novoTipoItem === 'PECA' ? 'Peça' : 'Serviço'} '${novaDescItem}' incluído na OS e liberado para faturamento!`,
    });
    setNovaDescItem('');
    setNovaQtdItem(1);
    setNovoValorUnitItem(45);
    setModalItemAvulso(false);
    carregarOrdens();
  };

  const handleRemoverItemAvulso = (osId: string, itemId: string) => {
    const filtrados = (itensAvulsos[osId] || []).filter((it) => it.id !== itemId);
    const atualizados = {
      ...itensAvulsos,
      [osId]: filtrados,
    };
    setItensAvulsos(atualizados);
    localStorage.setItem('vortex_os_itens_avulsos', JSON.stringify(atualizados));
  };

  // Upload de Foto Antes / Durante / Depois
  const handleUploadFotoEtapa = (
    osId: string,
    etapa: 'ANTES' | 'DURANTE' | 'DEPOIS',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const novaFoto: FotoEtapaOS = {
        id: 'foto-' + Date.now(),
        etapa,
        legenda:
          legendaNovaFoto.trim() ||
          (etapa === 'ANTES'
            ? 'Estado inicial antes do serviço'
            : etapa === 'DURANTE'
              ? 'Execução do serviço / solda / reparo'
              : 'Serviço concluído e inspecionado'),
        url: reader.result as string,
        dataHora: new Date().toLocaleString('pt-BR'),
      };

      const listaAtual = fotosOS[osId] || [];
      const atualizado = {
        ...fotosOS,
        [osId]: [...listaAtual, novaFoto],
      };
      setFotosOS(atualizado);
      localStorage.setItem('vortex_os_fotos_etapas', JSON.stringify(atualizado));
      setLegendaNovaFoto('');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAdicionarFotoDemo = (osId: string, etapa: 'ANTES' | 'DURANTE' | 'DEPOIS') => {
    const urlsDemo: Record<'ANTES' | 'DURANTE' | 'DEPOIS', string> = {
      ANTES:
        'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
      DURANTE:
        'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&w=600&q=80',
      DEPOIS:
        'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?auto=format&fit=crop&w=600&q=80',
    };

    const legendasDemo: Record<'ANTES' | 'DURANTE' | 'DEPOIS', string> = {
      ANTES: legendaNovaFoto.trim() || 'Antes: Peça/Ferramenta com trinca antes do reparo',
      DURANTE: legendaNovaFoto.trim() || 'Durante: Aplicação de cordão de solda e reforço',
      DEPOIS: legendaNovaFoto.trim() || 'Depois: Serviço finalizado, esmerilhado e pronto para entrega',
    };

    const novaFoto: FotoEtapaOS = {
      id: 'foto-' + Date.now(),
      etapa,
      legenda: legendasDemo[etapa],
      url: urlsDemo[etapa],
      dataHora: new Date().toLocaleString('pt-BR'),
    };

    const listaAtual = fotosOS[osId] || [];
    const atualizado = {
      ...fotosOS,
      [osId]: [...listaAtual, novaFoto],
    };
    setFotosOS(atualizado);
    localStorage.setItem('vortex_os_fotos_etapas', JSON.stringify(atualizado));
    setLegendaNovaFoto('');
  };

  const handleRemoverFotoEtapa = (osId: string, fotoId: string) => {
    const filtradas = (fotosOS[osId] || []).filter((f) => f.id !== fotoId);
    const atualizado = {
      ...fotosOS,
      [osId]: filtradas,
    };
    setFotosOS(atualizado);
    localStorage.setItem('vortex_os_fotos_etapas', JSON.stringify(atualizado));
  };

  // Calcular total financeiro da OS (somando itens avulsos ou valor base das atividades)
  const calcularValorTotalOS = (os: OrdemServico): number => {
    if (os.atendimento?.cobranca?.valorLiquido) {
      return Number(os.atendimento.cobranca.valorLiquido);
    }
    const avulsos = itensAvulsos[os.id] || [];
    if (avulsos.length > 0) {
      return avulsos.reduce((acc, i) => acc + i.valorTotal, 0);
    }
    return Math.max(45, os.atividades.length * 45);
  };

  // Gerar Faturamento / Cobrança diretamente pela OS
  const handleGerarFaturamentoOS = async (
    os: OrdemServico,
    valorCalculado?: number,
    numParcelas: number = parcelasFaturamento,
    detalheObs?: string
  ) => {
    setGerandoFaturamento(true);
    const valorFinal = valorCalculado ?? calcularValorTotalOS(os);

    const res = await apiRequest(`/atendimentos/${os.atendimento.id}/cobranca`, {
      method: 'POST',
      body: JSON.stringify({
        atendimentoId: os.atendimento.id,
        numeroParcelas: Number(numParcelas) || 1,
        primeiroVencimentoDias: 0,
        valorManual: valorFinal,
        observacoes:
          detalheObs ||
          `Faturamento gerado diretamente pela Ordem de Serviço ${os.codigoFormatado} (${os.atendimento.veiculo.modelo}).`,
      }),
    });

    setGerandoFaturamento(false);
    if (res.sucesso) {
      setFeedbackMsg({
        tipo: 'sucesso',
        texto: `Faturamento gerado com sucesso para a ${os.codigoFormatado}! Disponível na aba Financeiro & Cobranças.`,
      });
      carregarOrdens();
    } else {
      setFeedbackMsg({
        tipo: 'erro',
        texto: res.mensagem || 'Falha ao gerar cobrança desta OS.',
      });
    }
  };

  const handleConcluirOS = async (osId: string) => {
    if (
      !window.confirm(
        'Deseja realmente concluir esta Ordem de Serviço? O atendimento passará para "Aguardando Inspeção".'
      )
    ) {
      return;
    }

    const res = await apiRequest(`/os/${osId}/concluir`, { method: 'PATCH' });
    if (res.sucesso) {
      setFeedbackMsg({
        tipo: 'sucesso',
        texto: res.mensagem || 'Ordem de serviço concluída com sucesso!',
      });
      setModalDetalhes(false);
      carregarOrdens();
    } else {
      setFeedbackMsg({ tipo: 'erro', texto: res.mensagem || 'Falha ao concluir OS.' });
    }
  };

  // KPIs
  const totalOS = ordens.length;
  const emAndamentoOS = ordens.filter((o) => o.status === 'EM_ANDAMENTO').length;
  const planejadasOS = ordens.filter((o) => o.status === 'PLANEJADA').length;
  const concluidasOS = ordens.filter((o) => o.status === 'CONCLUIDA').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Banner KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        <div className="glass-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'rgba(59, 130, 246, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)',
            }}
          >
            <Wrench size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total de Ordens de Serviço</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{totalOS} Ordens</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'rgba(245, 158, 11, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-amber)',
            }}
          >
            <Play size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Em Execução na Oficina</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-amber)' }}>
              {emAndamentoOS} em andamento
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'rgba(139, 92, 246, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-purple)',
            }}
          >
            <Clock size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Planejadas / Aguardando</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{planejadasOS} planejadas</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'rgba(16, 185, 129, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#34d399',
            }}
          >
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Concluídas</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#34d399' }}>
              {concluidasOS} finalizadas
            </div>
          </div>
        </div>
      </div>

      {feedbackMsg && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-sm)',
            background:
              feedbackMsg.tipo === 'sucesso'
                ? 'rgba(16, 185, 129, 0.15)'
                : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${feedbackMsg.tipo === 'sucesso' ? '#10b981' : '#ef4444'}`,
            color: feedbackMsg.tipo === 'sucesso' ? '#34d399' : '#f87171',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: '0.88rem' }}>{feedbackMsg.texto}</span>
          <button
            onClick={() => setFeedbackMsg(null)}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Barra de Super Busca: Por Serviço Executado, Cliente, Nº da OS ou Veículo/Ferramenta */}
      <div
        className="glass-panel"
        style={{
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Campo de Busca Textual */}
          <div style={{ position: 'relative', flex: 2, minWidth: '260px' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              placeholder="Buscar por Serviço Executado (ex: Solda, Rastelo, Foice, Freio), Nº da OS, Placa ou Cliente..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="input-field"
              style={{ paddingLeft: '36px' }}
            />
          </div>

          {/* Filtro Direto por Cliente (Ver todos os serviços de um cliente) */}
          <div style={{ flex: 1, minWidth: '210px' }}>
            <select
              value={filtroClienteId}
              onChange={(e) => setFiltroClienteId(e.target.value)}
              className="input-field"
              title="Filtrar todos os serviços de um cliente específico"
            >
              <option value="TODOS">👤 Todos os Clientes ({clientes.length})</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  👤 {c.nomeRazao}
                </option>
              ))}
            </select>
          </div>

          {/* Botão do Catálogo de Serviços da Oficina */}
          <button
            type="button"
            onClick={() => {
              setCatalogoServicos(obterCatalogoServicos());
              setModalCatalogoAberto(true);
            }}
            className="btn btn-primary"
            style={{ whiteSpace: 'nowrap' }}
          >
            <BookOpen size={16} /> Catálogo de Serviços ({catalogoServicos.length})
          </button>
        </div>

        {/* Linha Inferior: Atalhos de Busca por Serviço + Filtro de Status */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '10px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              Busca rápida por serviço:
            </span>
            {['Solda', 'Rastelo', 'Foice', 'Bancada', 'Freio', 'Óleo'].map((termo) => (
              <button
                key={termo}
                type="button"
                onClick={() => setBusca(busca === termo ? '' : termo)}
                className="btn btn-secondary"
                style={{
                  padding: '3px 10px',
                  fontSize: '0.72rem',
                  borderColor: busca.toLowerCase() === termo.toLowerCase() ? 'var(--primary)' : undefined,
                  color: busca.toLowerCase() === termo.toLowerCase() ? 'var(--primary)' : undefined,
                }}
              >
                {termo}
              </button>
            ))}
            {(busca || filtroClienteId !== 'TODOS') && (
              <button
                type="button"
                onClick={() => {
                  setBusca('');
                  setFiltroClienteId('TODOS');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-red)',
                  fontSize: '0.74rem',
                  cursor: 'pointer',
                  fontWeight: 600,
                  marginLeft: '4px',
                }}
              >
                ✕ Limpar filtros
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {['TODAS', 'PLANEJADA', 'EM_ANDAMENTO', 'CONCLUIDA'].map((st) => (
              <button
                key={st}
                onClick={() => setFiltroStatus(st)}
                className={`btn ${filtroStatus === st ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '6px 12px', fontSize: '0.75rem' }}
              >
                {st === 'TODAS' ? 'Todas' : st.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grade de Cards de OS */}
      {loading ? (
        <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Carregando Ordens de Serviço da oficina...
        </div>
      ) : ordens.length === 0 ? (
        <div className="glass-panel" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Nenhuma Ordem de Serviço encontrada com os filtros atuais.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '18px' }}>
          {ordens.map((os) => {
            const statusColor =
              os.status === 'CONCLUIDA'
                ? 'badge-green'
                : os.status === 'EM_ANDAMENTO'
                  ? 'badge-amber'
                  : os.status === 'PLANEJADA'
                    ? 'badge-purple'
                    : 'badge-gray';

            const isBancada =
              os.atendimento?.veiculo?.placa?.startsWith('SRV') ||
              os.atendimento?.veiculo?.marca === 'Bancada / Avulso';
            const qtdFotosOS = (fotosOS[os.id] || []).length;
            const cobrancaOS = os.atendimento?.cobranca;

            return (
              <div
                key={os.id}
                className="glass-panel"
                style={{
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  borderLeft: `4px solid ${os.status === 'CONCLUIDA'
                      ? '#10b981'
                      : os.status === 'EM_ANDAMENTO'
                        ? '#f59e0b'
                        : '#8b5cf6'
                    }`,
                }}
              >
                {/* Header do Card */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)' }}>
                        {os.codigoFormatado}
                      </span>
                      <span className={`badge ${statusColor}`}>{os.status}</span>
                      {isBancada && (
                        <span className="badge badge-amber" style={{ fontSize: '0.66rem' }}>
                          🛠️ Ferramenta / Bancada
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Atendimento Ref: <span style={{ color: 'var(--text-main)' }}>{os.atendimento?.codigoFormatado}</span>
                    </div>
                  </div>

                  {os.status === 'PLANEJADA' && (
                    <button
                      onClick={() => handleIniciarOS(os.id)}
                      className="btn btn-primary"
                      style={{
                        padding: '6px 12px',
                        fontSize: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Play size={12} /> Iniciar OS
                    </button>
                  )}
                </div>

                {/* Veículo / Ferramenta e Cliente */}
                <div
                  style={{
                    background: 'var(--bg-subtle)',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                    {isBancada ? (
                      <Hammer size={14} color="var(--accent-amber)" />
                    ) : (
                      <Car size={14} color="var(--primary)" />
                    )}
                    <span>
                      {isBancada
                        ? os.atendimento?.veiculo?.modelo
                        : `${os.atendimento?.veiculo?.marca} ${os.atendimento?.veiculo?.modelo}`}
                    </span>
                    <span className="badge badge-gray" style={{ marginLeft: 'auto' }}>
                      {isBancada ? 'BANCADA' : os.atendimento?.veiculo?.placa}
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.78rem',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <User size={12} />
                      {os.atendimento?.cliente?.nomeRazao}
                    </span>
                    {qtdFotosOS > 0 && (
                      <span className="badge badge-blue" style={{ fontSize: '0.65rem' }}>
                        📸 {qtdFotosOS} foto(s)
                      </span>
                    )}
                  </div>
                </div>

                {/* Solicitação / Queixa */}
                {os.atendimento?.queixaPrincipal && (
                  <div
                    style={{
                      fontSize: '0.76rem',
                      color: 'var(--text-muted)',
                      background: 'var(--bg-subtle)',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      borderLeft: '2px solid var(--primary)',
                    }}
                  >
                    <strong>Serviço solicitado:</strong> {os.atendimento.queixaPrincipal}
                  </div>
                )}

                {/* Barra de Progresso de Atividades */}
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      marginBottom: '4px',
                    }}
                  >
                    <span>Progresso dos Serviços</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                      {os.progresso.concluidas}/{os.progresso.totalAtividades} ({os.progresso.progressoPercent}%)
                    </span>
                  </div>
                  <div
                    style={{
                      width: '100%',
                      height: '8px',
                      background: 'var(--bg-subtle)',
                      borderRadius: '4px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${os.progresso.progressoPercent}%`,
                        height: '100%',
                        background: os.status === 'CONCLUIDA' ? '#10b981' : 'var(--primary)',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                </div>

                {/* Lista Rápida dos Serviços Executados */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {os.atividades.slice(0, 3).map((ativ) => (
                    <div
                      key={ativ.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.78rem',
                        padding: '6px 8px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-subtle)',
                      }}
                    >
                      <span
                        style={{
                          textDecoration: ativ.status === 'CONCLUIDA' ? 'line-through' : 'none',
                          color: ativ.status === 'CONCLUIDA' ? 'var(--text-muted)' : 'inherit',
                        }}
                      >
                        🔧 {ativ.descricao}
                      </span>
                      <span
                        className={`badge ${ativ.status === 'CONCLUIDA'
                            ? 'badge-green'
                            : ativ.status === 'EM_EXECUCAO'
                              ? 'badge-amber'
                              : 'badge-gray'
                          }`}
                        style={{ fontSize: '0.68rem', padding: '2px 6px' }}
                      >
                        {ativ.status}
                      </span>
                    </div>
                  ))}
                  {os.atividades.length > 3 && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                      + {os.atividades.length - 3} outro(s) serviço(s)...
                    </div>
                  )}
                </div>

                {/* Footer do Card: Status Financeiro + Botão de Abrir */}
                <div
                  style={{
                    marginTop: 'auto',
                    paddingTop: '10px',
                    borderTop: '1px solid var(--border-subtle)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <div>
                    {cobrancaOS ? (
                      <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>
                        <DollarSign size={12} /> Faturado ({cobrancaOS.codigoFormatado})
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--primary)' }}>
                        Total est.:{' '}
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                          calcularValorTotalOS(os)
                        )}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setOsSelecionada(os);
                      setModalDetalhes(true);
                    }}
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                  >
                    Abrir OS • Fotos & Faturamento
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Completo de Gestão da OS */}
      {modalDetalhes && osSelecionada && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <div
            className="glass-panel"
            style={{
              maxWidth: '960px',
              width: '100%',
              maxHeight: '92vh',
              background: 'var(--bg-surface)',
              display: 'flex',
              flexDirection: 'column',
              padding: '24px',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <Wrench size={22} color="var(--primary)" />
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{osSelecionada.codigoFormatado}</h3>
                  <span className={`badge ${osSelecionada.status === 'CONCLUIDA' ? 'badge-green' : 'badge-amber'}`}>
                    {osSelecionada.status}
                  </span>
                  {osSelecionada.atendimento?.cobranca && (
                    <span className="badge badge-green">
                      💰 Faturado: {osSelecionada.atendimento.cobranca.codigoFormatado}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Atendimento {osSelecionada.atendimento?.codigoFormatado} • Objeto/Veículo:{' '}
                  <strong>{osSelecionada.atendimento?.veiculo?.modelo}</strong> (
                  {osSelecionada.atendimento?.veiculo?.placa}) • Cliente:{' '}
                  <strong>{osSelecionada.atendimento?.cliente?.nomeRazao}</strong>
                </div>
              </div>
              <button
                onClick={() => setModalDetalhes(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={22} />
              </button>
            </div>

            {/* Conteúdo com Scroll */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', paddingRight: '6px' }}>
              {/* Seção 1: Apontamento de Atividades e Serviços Executados */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Layers size={16} color="var(--primary)" /> 1. Serviços e Atividades Executadas na OS
                  </h4>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {osSelecionada.atividades.map((ativ) => (
                    <div
                      key={ativ.id}
                      style={{
                        padding: '12px 16px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-subtle)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{ativ.descricao}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Estimado: {ativ.tempoEstimadoMinutos} min • Realizado: {ativ.tempoRealizadoMinutos} min •
                          Responsável: {ativ.mecanico?.nome || 'Oficina'}
                          {ativ.motivoPausa && ` • Motivo Pausa: ${ativ.motivoPausa}`}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          className={`badge ${ativ.status === 'CONCLUIDA'
                              ? 'badge-green'
                              : ativ.status === 'EM_EXECUCAO'
                                ? 'badge-amber'
                                : ativ.status === 'PAUSADA'
                                  ? 'badge-purple'
                                  : 'badge-gray'
                            }`}
                        >
                          {ativ.status}
                        </span>

                        {osSelecionada.status !== 'CONCLUIDA' && ativ.status !== 'CONCLUIDA' && (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            {ativ.status !== 'EM_EXECUCAO' && (
                              <button
                                onClick={() => handleApontarAtividade(ativ.id, 'EM_EXECUCAO')}
                                className="btn btn-secondary"
                                style={{ padding: '6px 8px', fontSize: '0.72rem', color: '#34d399' }}
                              >
                                <Play size={12} /> Iniciar
                              </button>
                            )}

                            {ativ.status === 'EM_EXECUCAO' && (
                              <button
                                onClick={() => setModalPausa(ativ)}
                                className="btn btn-secondary"
                                style={{ padding: '6px 8px', fontSize: '0.72rem', color: 'var(--accent-amber)' }}
                              >
                                <Pause size={12} /> Pausar
                              </button>
                            )}

                            <button
                              onClick={() => handleApontarAtividade(ativ.id, 'CONCLUIDA')}
                              className="btn btn-primary"
                              style={{ padding: '6px 8px', fontSize: '0.72rem' }}
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

              {/* Seção 2: Serviços do Catálogo e Peças da OS */}
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '10px',
                    flexWrap: 'wrap',
                    gap: '8px',
                  }}
                >
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Package size={16} color="var(--primary)" /> 2. Lançamento de Serviços (Solda, Bancada, Mecânica) & Peças
                    </h4>
                  </div>

                  {osSelecionada.status !== 'CONCLUIDA' && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => {
                          setCatalogoServicos(obterCatalogoServicos());
                          setModalItemAvulso(true);
                        }}
                        className="btn btn-primary"
                        style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                      >
                        <Plus size={14} /> + Incluir Serviço ou Peça
                      </button>

                      {planoAtivo !== 'BASICO' && (
                        <>
                          <button
                            onClick={() => {
                              carregarProdutosParaConsumo();
                              setModalConsumo(true);
                            }}
                            className="btn btn-secondary"
                            style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                          >
                            <Package size={14} /> Baixar Peça do Estoque
                          </button>
                          <button
                            onClick={() => {
                              carregarProdutosParaConsumo();
                              setModalDevolucao(true);
                            }}
                            className="btn btn-secondary"
                            style={{
                              padding: '6px 10px',
                              fontSize: '0.75rem',
                              borderColor: 'rgba(239, 68, 68, 0.4)',
                              color: '#f87171',
                            }}
                          >
                            <RotateCcw size={14} /> Devolver Sobra
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {(itensAvulsos[osSelecionada.id] || []).length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                    {(itensAvulsos[osSelecionada.id] || []).map((it) => (
                      <div
                        key={it.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--bg-subtle)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span
                            className={`badge ${it.tipo === 'PECA' ? 'badge-amber' : 'badge-blue'}`}
                            style={{ fontSize: '0.68rem' }}
                          >
                            {it.tipo === 'PECA' ? 'Peça' : 'Serviço'}
                          </span>
                          <div>
                            <div style={{ fontSize: '0.86rem', fontWeight: 600 }}>{it.descricao}</div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                              Qtd: {it.quantidade} ×{' '}
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                                it.valorUnitario
                              )}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <strong style={{ fontSize: '0.9rem', color: 'var(--primary)' }}>
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                              it.valorTotal
                            )}
                          </strong>
                          {osSelecionada.status !== 'CONCLUIDA' && (
                            <button
                              type="button"
                              onClick={() => handleRemoverItemAvulso(osSelecionada.id, it.id)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#f87171',
                                cursor: 'pointer',
                                padding: '4px',
                              }}
                              title="Remover item"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '6px 0' }}>
                    Clique em <strong>"+ Incluir Serviço ou Peça"</strong> para puxar um serviço do catálogo (ex: Solda em Rastelo/Foice) ou lançar novos itens.
                  </div>
                )}
              </div>

              {/* Seção 3: Galeria Fotográfica ANTES, DURANTE e DEPOIS */}
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '12px',
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}
                >
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Camera size={16} color="var(--primary)" /> 3. Fotos do Serviço: Antes • Durante • Depois
                    </h4>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Registre a condição inicial da ferramenta/veículo, o processo de execução (solda/reparo) e o resultado final entregue.
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="Observação/legenda da foto (opcional)..."
                      value={legendaNovaFoto}
                      onChange={(e) => setLegendaNovaFoto(e.target.value)}
                      className="input-field"
                      style={{ width: '240px', padding: '6px 10px', fontSize: '0.78rem' }}
                    />
                  </div>
                </div>

                {/* 3 Colunas: ANTES | DURANTE | DEPOIS */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
                  {(
                    [
                      {
                        key: 'ANTES',
                        titulo: '1️⃣ ANTES do Serviço',
                        sub: 'Estado inicial / Avaria / Trinca',
                        cor: '#f59e0b',
                      },
                      {
                        key: 'DURANTE',
                        titulo: '2️⃣ DURANTE a Execução',
                        sub: 'Solda / Desmontagem / Bancada',
                        cor: '#0ea5e9',
                      },
                      {
                        key: 'DEPOIS',
                        titulo: '3️⃣ DEPOIS (Finalizado)',
                        sub: 'Acabamento pronto para entrega',
                        cor: '#10b981',
                      },
                    ] as const
                  ).map((col) => {
                    const fotosDaEtapa = (fotosOS[osSelecionada.id] || []).filter((f) => f.etapa === col.key);

                    return (
                      <div
                        key={col.key}
                        style={{
                          background: 'var(--bg-subtle)',
                          border: '1px solid var(--border-subtle)',
                          borderTop: `3px solid ${col.cor}`,
                          borderRadius: 'var(--radius-sm)',
                          padding: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: '0.84rem', fontWeight: 700 }}>{col.titulo}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{col.sub}</div>
                          </div>
                          <span className="badge badge-gray" style={{ fontSize: '0.68rem' }}>
                            {fotosDaEtapa.length}
                          </span>
                        </div>

                        {/* Botões de Upload e Foto Demo */}
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <label
                            className="btn btn-secondary"
                            style={{
                              flex: 1,
                              padding: '6px 8px',
                              fontSize: '0.72rem',
                              cursor: 'pointer',
                            }}
                          >
                            <Upload size={13} /> Enviar Foto
                            <input
                              type="file"
                              accept="image/*"
                              style={{ display: 'none' }}
                              onChange={(e) => handleUploadFotoEtapa(osSelecionada.id, col.key, e)}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => handleAdicionarFotoDemo(osSelecionada.id, col.key)}
                            className="btn btn-secondary"
                            style={{ padding: '6px 8px', fontSize: '0.72rem' }}
                            title="Inserir foto ilustrativa rápida para teste"
                          >
                            + Exemplo
                          </button>
                        </div>

                        {/* Miniaturas das Fotos da Etapa */}
                        {fotosDaEtapa.length === 0 ? (
                          <div
                            style={{
                              padding: '18px 8px',
                              textAlign: 'center',
                              fontSize: '0.73rem',
                              color: 'var(--text-dim)',
                              border: '1px dashed var(--border-subtle)',
                              borderRadius: '6px',
                            }}
                          >
                            Sem fotos do "{col.key}"
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {fotosDaEtapa.map((foto) => (
                              <div
                                key={foto.id}
                                style={{
                                  borderRadius: '6px',
                                  overflow: 'hidden',
                                  border: '1px solid var(--border-subtle)',
                                  background: 'var(--bg-surface)',
                                }}
                              >
                                <div
                                  style={{ position: 'relative', height: '110px', cursor: 'pointer' }}
                                  onClick={() => setFotoAmpliada(foto)}
                                >
                                  <img
                                    src={foto.url}
                                    alt={foto.legenda}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  />
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoverFotoEtapa(osSelecionada.id, foto.id);
                                    }}
                                    style={{
                                      position: 'absolute',
                                      top: '6px',
                                      right: '6px',
                                      background: 'rgba(239, 68, 68, 0.9)',
                                      color: '#fff',
                                      border: 'none',
                                      borderRadius: '50%',
                                      width: '22px',
                                      height: '22px',
                                      cursor: 'pointer',
                                      fontSize: '0.7rem',
                                    }}
                                    title="Remover foto"
                                  >
                                    ✕
                                  </button>
                                </div>
                                <div style={{ padding: '6px 8px', fontSize: '0.72rem' }}>
                                  <div style={{ fontWeight: 600 }}>{foto.legenda}</div>
                                  <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>{foto.dataHora}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Seção 4: Faturamento Direto da OS & Simulador de Maquininha */}
              <div
                style={{
                  borderTop: '1px solid var(--border-subtle)',
                  paddingTop: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                  background: 'var(--bg-subtle)',
                  padding: '14px 18px',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <DollarSign size={18} color="var(--accent-green)" /> 4. Faturamento & Cobrança desta Ordem de Serviço
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Valor Total Calculado da OS:{' '}
                    <strong style={{ color: 'var(--primary)', fontSize: '0.95rem' }}>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                        calcularValorTotalOS(osSelecionada)
                      )}
                    </strong>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setModalCalculadoraOS(true)}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.78rem', padding: '8px 12px' }}
                  >
                    <Calculator size={15} color="var(--accent-green)" /> Simular Taxa Maquininha / PIX
                  </button>

                  {osSelecionada.atendimento?.cobranca ? (
                    <span className="badge badge-green" style={{ padding: '8px 14px', fontSize: '0.8rem' }}>
                      ✅ Cobrança Emitida ({osSelecionada.atendimento.cobranca.codigoFormatado})
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={gerandoFaturamento}
                      onClick={() => handleGerarFaturamentoOS(osSelecionada)}
                      className="btn btn-primary"
                      style={{
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        color: '#ffffff',
                        fontSize: '0.8rem',
                        padding: '8px 16px',
                      }}
                    >
                      <DollarSign size={15} />{' '}
                      {gerandoFaturamento ? 'Gerando Cobrança...' : 'Gerar Faturamento / Cobrança'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                marginTop: '16px',
                paddingTop: '14px',
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {osSelecionada.status === 'CONCLUIDA'
                  ? 'Ordem de serviço finalizada.'
                  : 'Conclua as atividades para finalizar a execução técnica.'}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setModalDetalhes(false)} className="btn btn-secondary">
                  Fechar
                </button>

                {osSelecionada.status !== 'CONCLUIDA' && (
                  <button
                    onClick={() => handleConcluirOS(osSelecionada.id)}
                    className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <CheckCircle2 size={16} /> Concluir OS
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Modal Inclusão de Serviço (com Catálogo) ou Peça na OS */}
      {modalItemAvulso && osSelecionada && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '16px',
          }}
        >
          <div className="glass-panel" style={{ maxWidth: '520px', width: '100%', padding: '22px', background: 'var(--bg-surface)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Plus size={18} color="var(--primary)" /> Incluir Serviço ou Peça na OS
                </h4>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  Selecione do catálogo de serviços (ex: Solda em Rastelo/Foice) ou digite livremente.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalItemAvulso(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSalvarItemAvulso} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Tipo de Lançamento *
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <label
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: `1px solid ${novoTipoItem === 'SERVICO' ? 'var(--primary)' : 'var(--border-subtle)'}`,
                      background: novoTipoItem === 'SERVICO' ? 'var(--primary-glow)' : 'var(--bg-subtle)',
                      cursor: 'pointer',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                    }}
                  >
                    <input
                      type="radio"
                      name="tipoItem"
                      checked={novoTipoItem === 'SERVICO'}
                      onChange={() => setNovoTipoItem('SERVICO')}
                    />
                    🔧 Serviço / Mão de Obra / Solda
                  </label>

                  <label
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: `1px solid ${novoTipoItem === 'PECA' ? 'var(--primary)' : 'var(--border-subtle)'}`,
                      background: novoTipoItem === 'PECA' ? 'var(--primary-glow)' : 'var(--bg-subtle)',
                      cursor: 'pointer',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                    }}
                  >
                    <input
                      type="radio"
                      name="tipoItem"
                      checked={novoTipoItem === 'PECA'}
                      onChange={() => setNovoTipoItem('PECA')}
                    />
                    📦 Peça / Material / Eletrodo
                  </label>
                </div>
              </div>

              {novoTipoItem === 'SERVICO' && (
                <div>
                  <label className="input-label">📋 Puxar do Catálogo de Serviços da Oficina</label>
                  <select
                    onChange={(e) => {
                      const srv = catalogoServicos.find((s) => s.id === e.target.value);
                      if (srv) {
                        setNovaDescItem(srv.nome);
                        setNovoValorUnitItem(srv.valorSugerido);
                        setNovoTempoItem(srv.tempoEstimadoMinutos);
                      }
                    }}
                    className="input-field"
                    defaultValue=""
                  >
                    <option value="">-- Escolha um serviço cadastrado ou digite abaixo --</option>
                    {catalogoServicos.map((s) => (
                      <option key={s.id} value={s.id}>
                        [{s.codigo}] {s.nome} — R$ {s.valorSugerido.toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="input-label">Descrição Detalhada do Serviço ou Peça *</label>
                <input
                  type="text"
                  required
                  placeholder={
                    novoTipoItem === 'SERVICO'
                      ? 'Ex: Solda MIG no rastelo de 14 dentes e afiação de foice'
                      : 'Ex: Eletrodo revestido E6013 / Disco de desbaste'
                  }
                  value={novaDescItem}
                  onChange={(e) => setNovaDescItem(e.target.value)}
                  className="input-field"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="input-label">Quantidade *</label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    required
                    value={novaQtdItem}
                    onChange={(e) => setNovaQtdItem(Number(e.target.value))}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="input-label">Valor Unitário (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={novoValorUnitItem}
                    onChange={(e) => setNovoValorUnitItem(Number(e.target.value))}
                    className="input-field"
                  />
                </div>
              </div>

              <div
                style={{
                  background: 'var(--bg-subtle)',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Subtotal deste lançamento:</span>
                <strong style={{ fontSize: '1.05rem', color: '#34d399' }}>
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                    Number(novaQtdItem) * Number(novoValorUnitItem)
                  )}
                </strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button type="button" onClick={() => setModalItemAvulso(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" disabled={salvandoItemOS} className="btn btn-primary">
                  {salvandoItemOS ? 'Salvando...' : 'Incluir na Ordem de Serviço'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Catálogo de Serviços Padronizados */}
      {modalCatalogoAberto && (
        <CatalogoServicosModal
          onClose={() => {
            setCatalogoServicos(obterCatalogoServicos());
            setModalCatalogoAberto(false);
          }}
          onSelecionarServico={
            osSelecionada
              ? (srv) => {
                setNovoTipoItem('SERVICO');
                setNovaDescItem(srv.nome);
                setNovoValorUnitItem(srv.valorSugerido);
                setNovoTempoItem(srv.tempoEstimadoMinutos);
                setModalItemAvulso(true);
              }
              : undefined
          }
        />
      )}

      {/* Modal Calculadora de Maquininha & PIX integrada à OS */}
      {modalCalculadoraOS && osSelecionada && (
        <ModalCalculadoraMaquininha
          valorBase={calcularValorTotalOS(osSelecionada)}
          onClose={() => setModalCalculadoraOS(false)}
          onAplicarValorFinal={(valorCalc, parcelas, _taxa, detalhe) => {
            setParcelasFaturamento(parcelas);
            handleGerarFaturamentoOS(
              osSelecionada,
              valorCalc,
              parcelas,
              `Faturamento OS ${osSelecionada.codigoFormatado} — ${detalhe}`
            );
          }}
        />
      )}

      {/* Sub-Modal Pausa de Atividade */}
      {modalPausa && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '16px',
          }}
        >
          <div className="glass-panel" style={{ maxWidth: '420px', width: '100%', padding: '20px', background: 'var(--bg-surface)' }}>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '12px' }}>Pausar Atividade Técnica</h4>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
              {modalPausa.descricao}
            </div>

            <form onSubmit={handleConfirmarPausa} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label className="input-label">Tempo trabalhado até agora (minutos)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={tempoGastoPausa}
                  onChange={(e) => setTempoGastoPausa(Number(e.target.value))}
                  className="input-field"
                />
              </div>

              <div>
                <label className="input-label">Motivo da Pausa *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Aguardando esfriamento da solda / Peça"
                  value={motivoPausa}
                  onChange={(e) => setMotivoPausa(e.target.value)}
                  className="input-field"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button type="button" onClick={() => setModalPausa(null)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Confirmar Pausa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sub-Modal Consumo de Peça */}
      {modalConsumo && osSelecionada && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '16px',
          }}
        >
          <div className="glass-panel" style={{ maxWidth: '480px', width: '100%', padding: '20px', background: 'var(--bg-surface)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Baixa de Material na OS</h4>
              <button
                onClick={() => setModalConsumo(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConsumirPeca} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label className="input-label">Selecione a Peça do Estoque *</label>
                <select
                  value={prodConsumoId}
                  onChange={(e) => setProdConsumoId(e.target.value)}
                  className="input-field"
                >
                  {produtosDisponiveis.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.codigo}] {p.descricao} (Disp: {p.saldoDisponivel} {p.unidadeMedida})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="input-label">Quantidade Utilizada *</label>
                <input
                  type="number"
                  step="0.001"
                  min="0.001"
                  required
                  value={qtdConsumo}
                  onChange={(e) => setQtdConsumo(Number(e.target.value))}
                  className="input-field"
                />
              </div>

              <div>
                <label className="input-label">Observação / Justificativa</label>
                <input
                  type="text"
                  placeholder="Ex: Aplicado no reparo"
                  value={motivoConsumo}
                  onChange={(e) => setMotivoConsumo(e.target.value)}
                  className="input-field"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button type="button" onClick={() => setModalConsumo(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" disabled={salvandoConsumo} className="btn btn-primary">
                  {salvandoConsumo ? 'Baixando...' : 'Confirmar Consumo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sub-Modal Devolução de Sobra ao Estoque */}
      {modalDevolucao && osSelecionada && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '16px',
          }}
        >
          <div className="glass-panel" style={{ maxWidth: '480px', width: '100%', padding: '20px', background: 'var(--bg-surface)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f87171', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <RotateCcw size={18} /> Devolução de Sobra de Material
              </h4>
              <button
                onClick={() => setModalDevolucao(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleDevolverPeca} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label className="input-label">Peça a Devolver *</label>
                <select
                  value={prodDevolucaoId}
                  onChange={(e) => setProdDevolucaoId(e.target.value)}
                  className="input-field"
                >
                  {produtosDisponiveis.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.codigo}] {p.descricao}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="input-label">Quantidade Devolvida *</label>
                <input
                  type="number"
                  step="0.001"
                  min="0.001"
                  required
                  value={qtdDevolucao}
                  onChange={(e) => setQtdDevolucao(Number(e.target.value))}
                  className="input-field"
                />
              </div>

              <div>
                <label className="input-label">Motivo / Justificativa *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Sobra de material não utilizado"
                  value={motivoDevolucao}
                  onChange={(e) => setMotivoDevolucao(e.target.value)}
                  className="input-field"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button type="button" onClick={() => setModalDevolucao(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" disabled={salvandoDevolucao} className="btn btn-primary" style={{ background: '#ef4444' }}>
                  {salvandoDevolucao ? 'Estornando...' : 'Confirmar Devolução'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox para Ampliar Foto do Antes / Durante / Depois */}
      {fotoAmpliada && (
        <div
          onClick={() => setFotoAmpliada(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.9)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass-panel"
            style={{
              maxWidth: '720px',
              width: '100%',
              padding: '16px',
              background: 'var(--bg-surface)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div>
                <span className="badge badge-blue" style={{ marginRight: '8px' }}>
                  {fotoAmpliada.etapa}
                </span>
                <strong>{fotoAmpliada.legenda}</strong>
              </div>
              <button onClick={() => setFotoAmpliada(null)} className="btn btn-secondary" style={{ padding: '4px 10px' }}>
                ✕
              </button>
            </div>
            <img
              src={fotoAmpliada.url}
              alt={fotoAmpliada.legenda}
              style={{ width: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: '8px' }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
