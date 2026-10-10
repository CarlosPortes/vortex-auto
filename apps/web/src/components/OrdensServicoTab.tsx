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
} from 'lucide-react';
import { OrdemServico, AtividadeOS, Produto } from '../types';
import { apiRequest } from '../api';

export const OrdensServicoTab: React.FC = () => {
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState<string>('TODAS');
  const [busca, setBusca] = useState('');

  // Detalhes / Modal da OS
  const [osSelecionada, setOsSelecionada] = useState<OrdemServico | null>(null);
  const [modalDetalhes, setModalDetalhes] = useState(false);

  // Ações em Atividade
  const [modalPausa, setModalPausa] = useState<AtividadeOS | null>(null);
  const [motivoPausa, setMotivoPausa] = useState('');
  const [tempoGastoPausa, setTempoGastoPausa] = useState(15);

  // Consumo de Peça na OS
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

  const [feedbackMsg, setFeedbackMsg] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  const carregarOrdens = async () => {
    setLoading(true);
    let url = `/os?q=${encodeURIComponent(busca)}`;
    if (filtroStatus !== 'TODAS') {
      url += `&status=${filtroStatus}`;
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
    carregarOrdens();
  }, [filtroStatus, busca]);

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
      setFeedbackMsg({ tipo: 'sucesso', texto: 'Material consumido e estoque baixado com sucesso!' });
      setModalConsumo(false);
      setMotivoConsumo('');
      setQtdConsumo(1);
      carregarOrdens();
    } else {
      setFeedbackMsg({ tipo: 'erro', texto: res.mensagem || 'Erro ao registrar consumo de peça.' });
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
      setFeedbackMsg({ tipo: 'sucesso', texto: 'Sobra de peça devolvida e estoque estornado com sucesso!' });
      setModalDevolucao(false);
      setMotivoDevolucao('');
      setQtdDevolucao(1);
      carregarOrdens();
    } else {
      setFeedbackMsg({ tipo: 'erro', texto: res.mensagem || 'Erro ao devolver peça ao estoque.' });
    }
    setSalvandoDevolucao(false);
  };

  const handleConcluirOS = async (osId: string) => {
    if (!window.confirm('Deseja realmente concluir esta Ordem de Serviço? O atendimento passará para "Aguardando Inspeção".')) {
      return;
    }

    const res = await apiRequest(`/os/${osId}/concluir`, { method: 'PATCH' });
    if (res.sucesso) {
      setFeedbackMsg({ tipo: 'sucesso', texto: res.mensagem || 'Ordem de serviço concluída com sucesso!' });
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
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: 'rgba(59, 130, 246, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary)',
          }}>
            <Wrench size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total de Ordens de Serviço</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{totalOS} Ordens</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: 'rgba(245, 158, 11, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-amber)',
          }}>
            <Play size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Em Execução na Oficina</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-amber)' }}>{emAndamentoOS} em andamento</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: 'rgba(139, 92, 246, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-purple)',
          }}>
            <Clock size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Planejadas / Aguardando</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{planejadasOS} planejadas</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: 'rgba(16, 185, 129, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#34d399',
          }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Concluídas</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#34d399' }}>{concluidasOS} finalizadas</div>
          </div>
        </div>
      </div>

      {feedbackMsg && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 'var(--radius-sm)',
          background: feedbackMsg.tipo === 'sucesso' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          border: `1px solid ${feedbackMsg.tipo === 'sucesso' ? '#10b981' : '#ef4444'}`,
          color: feedbackMsg.tipo === 'sucesso' ? '#34d399' : '#f87171',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: '0.88rem' }}>{feedbackMsg.texto}</span>
          <button onClick={() => setFeedbackMsg(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Barra de Filtros */}
      <div className="glass-panel" style={{ padding: '16px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Buscar por código de OS, placa, modelo ou cliente..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px 10px 36px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
              background: 'rgba(255,255,255,0.03)',
              color: 'var(--text)',
              fontSize: '0.88rem',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          {['TODAS', 'PLANEJADA', 'EM_ANDAMENTO', 'CONCLUIDA'].map((st) => (
            <button
              key={st}
              onClick={() => setFiltroStatus(st)}
              className={`btn ${filtroStatus === st ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '8px 12px', fontSize: '0.78rem' }}
            >
              {st === 'TODAS' ? 'Todas' : st}
            </button>
          ))}
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
              os.status === 'CONCLUIDA' ? 'badge-green' :
              os.status === 'EM_ANDAMENTO' ? 'badge-amber' :
              os.status === 'PLANEJADA' ? 'badge-purple' : 'badge-gray';

            return (
              <div
                key={os.id}
                className="glass-panel"
                style={{
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  borderLeft: `4px solid ${
                    os.status === 'CONCLUIDA' ? '#10b981' :
                    os.status === 'EM_ANDAMENTO' ? '#f59e0b' : '#8b5cf6'
                  }`,
                }}
              >
                {/* Header do Card */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)' }}>
                        {os.codigoFormatado}
                      </span>
                      <span className={`badge ${statusColor}`}>{os.status}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Atendimento Ref: <span style={{ color: 'var(--text)' }}>{os.atendimento?.codigoFormatado}</span>
                    </div>
                  </div>

                  {os.status === 'PLANEJADA' && (
                    <button
                      onClick={() => handleIniciarOS(os.id)}
                      className="btn btn-primary"
                      style={{ padding: '6px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Play size={12} /> Iniciar OS
                    </button>
                  )}
                </div>

                {/* Veículo e Cliente */}
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                    <Car size={14} color="var(--primary)" />
                    <span>{os.atendimento?.veiculo?.marca} {os.atendimento?.veiculo?.modelo}</span>
                    <span className="badge badge-gray" style={{ marginLeft: 'auto' }}>{os.atendimento?.veiculo?.placa}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    <User size={12} />
                    <span>{os.atendimento?.cliente?.nomeRazao}</span>
                  </div>
                </div>

                {/* Barra de Progresso de Atividades */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    <span>Progresso das Atividades</span>
                    <span style={{ fontWeight: 600, color: 'var(--text)' }}>
                      {os.progresso.concluidas}/{os.progresso.totalAtividades} ({os.progresso.progressoPercent}%)
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${os.progresso.progressoPercent}%`,
                      height: '100%',
                      background: os.status === 'CONCLUIDA' ? '#10b981' : 'var(--primary)',
                      transition: 'width 0.3s ease',
                    }} />
                  </div>
                </div>

                {/* Lista Rápida das Atividades */}
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
                        background: 'rgba(255,255,255,0.015)',
                      }}
                    >
                      <span style={{
                        textDecoration: ativ.status === 'CONCLUIDA' ? 'line-through' : 'none',
                        color: ativ.status === 'CONCLUIDA' ? 'var(--text-muted)' : 'inherit',
                      }}>
                        {ativ.descricao}
                      </span>
                      <span className={`badge ${
                        ativ.status === 'CONCLUIDA' ? 'badge-green' :
                        ativ.status === 'EM_EXECUCAO' ? 'badge-amber' : 'badge-gray'
                      }`} style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                        {ativ.status}
                      </span>
                    </div>
                  ))}
                  {os.atividades.length > 3 && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                      + {os.atividades.length - 3} outra(s) atividade(s)...
                    </div>
                  )}
                </div>

                {/* Footer do Card */}
                <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Mecânico: {os.mecanicoResponsavel || 'Não atribuído'}
                  </div>
                  <button
                    onClick={() => {
                      setOsSelecionada(os);
                      setModalDetalhes(true);
                    }}
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                  >
                    Gerenciar OS & Atividades
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Completo de Gestão da OS */}
      {modalDetalhes && osSelecionada && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px',
        }}>
          <div className="glass-panel" style={{
            maxWidth: '920px',
            width: '100%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            padding: '24px',
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Wrench size={22} color="var(--primary)" />
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{osSelecionada.codigoFormatado}</h3>
                  <span className={`badge ${osSelecionada.status === 'CONCLUIDA' ? 'badge-green' : 'badge-amber'}`}>
                    {osSelecionada.status}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Atendimento {osSelecionada.atendimento?.codigoFormatado} • Veículo: {osSelecionada.atendimento?.veiculo?.modelo} ({osSelecionada.atendimento?.veiculo?.placa}) • Cliente: {osSelecionada.atendimento?.cliente?.nomeRazao}
                </div>
              </div>
              <button onClick={() => setModalDetalhes(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={22} />
              </button>
            </div>

            {/* Conteúdo com Scroll */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', paddingRight: '6px' }}>
              {/* Barra de Progresso Superior */}
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '6px' }}>
                  <span>Progresso Geral da Execução</span>
                  <span style={{ fontWeight: 700 }}>
                    {osSelecionada.progresso.concluidas} de {osSelecionada.progresso.totalAtividades} atividades concluídas ({osSelecionada.progresso.progressoPercent}%)
                  </span>
                </div>
                <div style={{ width: '100%', height: '10px', background: 'rgba(255,255,255,0.08)', borderRadius: '5px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${osSelecionada.progresso.progressoPercent}%`,
                    height: '100%',
                    background: osSelecionada.status === 'CONCLUIDA' ? '#10b981' : 'var(--primary)',
                  }} />
                </div>
              </div>

              {/* Seção 1: Apontamento de Atividades */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Layers size={16} color="var(--primary)" /> Atividades Técnicas e Apontamentos (HU-015)
                  </h4>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {osSelecionada.atividades.map((ativ) => (
                    <div
                      key={ativ.id}
                      style={{
                        padding: '12px 16px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{ativ.descricao}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Estimado: {ativ.tempoEstimadoMinutos} min • Realizado: {ativ.tempoRealizadoMinutos} min • Mecânico: {ativ.mecanico?.nome || 'Não atribuído'}
                          {ativ.motivoPausa && ` • Motivo Pausa: ${ativ.motivoPausa}`}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className={`badge ${
                          ativ.status === 'CONCLUIDA' ? 'badge-green' :
                          ativ.status === 'EM_EXECUCAO' ? 'badge-amber' :
                          ativ.status === 'PAUSADA' ? 'badge-purple' : 'badge-gray'
                        }`}>
                          {ativ.status}
                        </span>

                        {osSelecionada.status !== 'CONCLUIDA' && ativ.status !== 'CONCLUIDA' && (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            {ativ.status !== 'EM_EXECUCAO' && (
                              <button
                                onClick={() => handleApontarAtividade(ativ.id, 'EM_EXECUCAO')}
                                className="btn btn-secondary"
                                style={{ padding: '6px 8px', fontSize: '0.72rem', color: '#34d399' }}
                                title="Iniciar Execução"
                              >
                                <Play size={12} /> Iniciar
                              </button>
                            )}

                            {ativ.status === 'EM_EXECUCAO' && (
                              <button
                                onClick={() => setModalPausa(ativ)}
                                className="btn btn-secondary"
                                style={{ padding: '6px 8px', fontSize: '0.72rem', color: 'var(--accent-amber)' }}
                                title="Pausar Atividade"
                              >
                                <Pause size={12} /> Pausar
                              </button>
                            )}

                            <button
                              onClick={() => handleApontarAtividade(ativ.id, 'CONCLUIDA')}
                              className="btn btn-primary"
                              style={{ padding: '6px 8px', fontSize: '0.72rem' }}
                              title="Concluir Atividade"
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

              {/* Seção 2: Consumo de Peças na OS */}
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Package size={16} color="var(--primary)" /> Consumo e Aplicação de Peças (HU-016)
                  </h4>
                  {osSelecionada.status !== 'CONCLUIDA' && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => {
                          carregarProdutosParaConsumo();
                          setModalConsumo(true);
                        }}
                        className="btn btn-secondary"
                        style={{ padding: '6px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Plus size={14} /> Aplicar Peça
                      </button>
                      <button
                        onClick={() => {
                          carregarProdutosParaConsumo();
                          setModalDevolucao(true);
                        }}
                        className="btn btn-secondary"
                        style={{ padding: '6px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', borderColor: 'rgba(239, 68, 68, 0.4)', color: '#f87171' }}
                      >
                        <RotateCcw size={14} /> Devolver Sobra (HU-016)
                      </button>
                    </div>
                  )}
                </div>

                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  A cada peça aplicada no veículo, o estoque físico é baixado imediatamente com rastreabilidade da OS e vínculo à garantia do serviço.
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {osSelecionada.status === 'CONCLUIDA'
                  ? 'Ordem de serviço finalizada. Pronta para Inspeção Final (ENT-005).'
                  : 'Todas as atividades devem estar concluídas para finalizar a OS.'}
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
                    <CheckCircle2 size={16} /> Concluir OS e Liberar p/ Inspeção
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Modal Pausa de Atividade */}
      {modalPausa && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '16px',
        }}>
          <div className="glass-panel" style={{ maxWidth: '420px', width: '100%', padding: '20px' }}>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '12px' }}>Pausar Atividade Técnica</h4>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
              {modalPausa.descricao}
            </div>

            <form onSubmit={handleConfirmarPausa} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tempo trabalhado até agora (minutos)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={tempoGastoPausa}
                  onChange={(e) => setTempoGastoPausa(Number(e.target.value))}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.03)', color: 'inherit' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Motivo da Pausa *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Aguardando esfriamento / Ferramenta especial"
                  value={motivoPausa}
                  onChange={(e) => setMotivoPausa(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.03)', color: 'inherit' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button type="button" onClick={() => setModalPausa(null)} className="btn btn-secondary">Cancelar</button>
                <button type="submit" className="btn btn-primary">Confirmar Pausa</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sub-Modal Consumo de Peça */}
      {modalConsumo && osSelecionada && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '16px',
        }}>
          <div className="glass-panel" style={{ maxWidth: '480px', width: '100%', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Baixa de Material na OS</h4>
              <button onClick={() => setModalConsumo(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConsumirPeca} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Selecione a Peça do Estoque *</label>
                <select
                  value={prodConsumoId}
                  onChange={(e) => setProdConsumoId(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: '#181b22', color: 'inherit' }}
                >
                  {produtosDisponiveis.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.codigo}] {p.descricao} (Disp: {p.saldoDisponivel} {p.unidadeMedida})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Quantidade Utilizada *</label>
                <input
                  type="number"
                  step="0.001"
                  min="0.001"
                  required
                  value={qtdConsumo}
                  onChange={(e) => setQtdConsumo(Number(e.target.value))}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.03)', color: 'inherit' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Observação / Justificativa</label>
                <input
                  type="text"
                  placeholder="Ex: Instalado no cubo de roda dianteiro direito"
                  value={motivoConsumo}
                  onChange={(e) => setMotivoConsumo(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.03)', color: 'inherit' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button type="button" onClick={() => setModalConsumo(false)} className="btn btn-secondary">Cancelar</button>
                <button type="submit" disabled={salvandoConsumo} className="btn btn-primary">
                  {salvandoConsumo ? 'Baixando...' : 'Confirmar Consumo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sub-Modal Devolução de Sobra ao Estoque (HU-016) */}
      {modalDevolucao && osSelecionada && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '16px',
        }}>
          <div className="glass-panel" style={{ maxWidth: '480px', width: '100%', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f87171', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <RotateCcw size={18} /> Devolução de Sobra de Material (HU-016)
              </h4>
              <button onClick={() => setModalDevolucao(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
              Devolve sobras de peças aplicadas previamente nesta OS ({osSelecionada.codigoFormatado}), recompondo o saldo físico no almoxarifado.
            </p>

            <form onSubmit={handleDevolverPeca} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Peça a Devolver *</label>
                <select
                  value={prodDevolucaoId}
                  onChange={(e) => setProdDevolucaoId(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: '#181b22', color: 'inherit' }}
                >
                  {produtosDisponiveis.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.codigo}] {p.descricao}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Quantidade Devolvida *</label>
                <input
                  type="number"
                  step="0.001"
                  min="0.001"
                  required
                  value={qtdDevolucao}
                  onChange={(e) => setQtdDevolucao(Number(e.target.value))}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.03)', color: 'inherit' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Motivo / Justificativa *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Sobra de kit de reparo não utilizado na montagem"
                  value={motivoDevolucao}
                  onChange={(e) => setMotivoDevolucao(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.03)', color: 'inherit' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button type="button" onClick={() => setModalDevolucao(false)} className="btn btn-secondary">Cancelar</button>
                <button type="submit" disabled={salvandoDevolucao} className="btn btn-primary" style={{ background: '#ef4444' }}>
                  {salvandoDevolucao ? 'Estornando...' : 'Confirmar Devolução'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
