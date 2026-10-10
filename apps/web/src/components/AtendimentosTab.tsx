import React, { useState, useEffect } from 'react';
import {
  ClipboardPlus,
  Search,
  Car,
  User,
  Gauge,
  Fuel,
  Clock,
  ArrowRight,
  CheckCircle,
  List,
  LayoutGrid,
} from 'lucide-react';
import { Atendimento } from '../types';
import { apiRequest } from '../api';
import { NovoAtendimentoModal } from './NovoAtendimentoModal';
import { AtendimentoDetalhesModal } from './AtendimentoDetalhesModal';
import { AtendimentosKanban } from './AtendimentosKanban';

export const AtendimentosTab: React.FC = () => {
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('TODOS');
  const [showModal, setShowModal] = useState(false);
  const [atendimentoSelecionado, setAtendimentoSelecionado] = useState<Atendimento | null>(null);
  const [subAbaInicial, setSubAbaInicial] = useState<
    | 'DIAGNOSTICO'
    | 'ORCAMENTOS'
    | 'APROVACAO'
    | 'ORDEM_SERVICO'
    | 'INSPECAO'
    | 'FINANCEIRO_ENTREGA'
    | 'COMPLEMENTOS_GARANTIA'
  >('DIAGNOSTICO');

  // Modo de visualização com persistência por terminal
  const [modoVisualizacao, setModoVisualizacao] = useState<'LISTA' | 'KANBAN'>(() => {
    return (localStorage.getItem('vortex_view_mode') as 'LISTA' | 'KANBAN') || 'KANBAN';
  });

  const carregarAtendimentos = async () => {
    setLoading(true);
    let url = `/atendimentos?status=${filtroStatus}`;
    if (busca.trim()) {
      url += `&busca=${encodeURIComponent(busca.trim())}`;
    }
    const res = await apiRequest<Atendimento[]>(url);
    if (res.sucesso && res.dados) {
      setAtendimentos(res.dados);
    }
    setLoading(false);
  };

  useEffect(() => {
    carregarAtendimentos();
  }, [filtroStatus]);

  const handleBuscar = (e: React.FormEvent) => {
    e.preventDefault();
    carregarAtendimentos();
  };

  const handleTrocarModo = (modo: 'LISTA' | 'KANBAN') => {
    setModoVisualizacao(modo);
    localStorage.setItem('vortex_view_mode', modo);
  };

  const handleAbrirDetalhes = (
    atend: Atendimento,
    subAba:
      | 'DIAGNOSTICO'
      | 'ORCAMENTOS'
      | 'APROVACAO'
      | 'ORDEM_SERVICO'
      | 'INSPECAO'
      | 'FINANCEIRO_ENTREGA'
      | 'COMPLEMENTOS_GARANTIA' = 'DIAGNOSTICO'
  ) => {
    setSubAbaInicial(subAba);
    setAtendimentoSelecionado(atend);
  };

  const handleAvancarStatus = async (id: string, proximoStatus: string) => {
    const res = await apiRequest(`/atendimentos/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ novoStatus: proximoStatus }),
    });

    if (res.sucesso) {
      carregarAtendimentos();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMADO':
        return <span className="badge badge-blue">Confirmado / Recepção</span>;
      case 'EM_DIAGNOSTICO':
        return <span className="badge badge-purple">Em Diagnóstico</span>;
      case 'ORCAMENTO_PENDENTE':
        return <span className="badge badge-amber">Orçamento Pendente</span>;
      case 'AGUARDANDO_APROVACAO':
        return <span className="badge badge-amber">Aguardando Aprovação</span>;
      case 'EM_EXECUCAO':
        return <span className="badge badge-amber">Em Execução Mecânica</span>;
      case 'AGUARDANDO_INSPECAO':
        return <span className="badge badge-purple">Aguardando Inspeção</span>;
      case 'PRONTO_PARA_ENTREGA':
        return <span className="badge badge-green">Pronto para Entrega</span>;
      case 'ENTREGUE':
        return <span className="badge badge-green">Entregue / Concluído</span>;
      default:
        return <span className="badge badge-blue">{status}</span>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Bar de Controle */}
      <div
        className="glass-panel"
        style={{
          padding: '20px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
              Visão Operacional da Esteira de Atendimentos
            </h2>
            <span className="badge badge-blue" style={{ fontSize: '0.72rem' }}>
              DOC-003 & DOC-014
            </span>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Monitoramento em tempo real do fluxo de entrada à entrega final.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Alternador de Modo de Visualização (Lista vs Kanban) */}
          <div
            style={{
              display: 'flex',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: 'var(--radius-sm)',
              padding: '3px',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <button
              type="button"
              onClick={() => handleTrocarModo('KANBAN')}
              className={`btn ${modoVisualizacao === 'KANBAN' ? 'btn-primary' : ''}`}
              style={{
                padding: '6px 12px',
                fontSize: '0.8rem',
                background: modoVisualizacao === 'KANBAN' ? undefined : 'transparent',
                boxShadow: modoVisualizacao === 'KANBAN' ? undefined : 'none',
              }}
            >
              <LayoutGrid size={15} /> Quadro Kanban
            </button>
            <button
              type="button"
              onClick={() => handleTrocarModo('LISTA')}
              className={`btn ${modoVisualizacao === 'LISTA' ? 'btn-primary' : ''}`}
              style={{
                padding: '6px 12px',
                fontSize: '0.8rem',
                background: modoVisualizacao === 'LISTA' ? undefined : 'transparent',
                boxShadow: modoVisualizacao === 'LISTA' ? undefined : 'none',
              }}
            >
              <List size={15} /> Modo Lista
            </button>
          </div>

          {/* Campo de Busca Rápida */}
          <form onSubmit={handleBuscar} style={{ display: 'flex', gap: '8px' }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar placa, cliente ou código..."
                className="input-field"
                style={{ width: '250px', paddingLeft: '34px' }}
              />
              <Search
                size={16}
                color="var(--text-dim)"
                style={{ position: 'absolute', left: '10px', top: '12px' }}
              />
            </div>
            <button type="submit" className="btn btn-secondary">
              Filtrar
            </button>
          </form>

          <button
            onClick={() => setShowModal(true)}
            className="btn btn-primary"
            style={{ whiteSpace: 'nowrap' }}
          >
            <ClipboardPlus size={18} /> Abrir Atendimento
          </button>
        </div>
      </div>

      {/* Barra de Filtros Rápidos (Visível no modo Lista ou para refinar o Kanban) */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
        {['TODOS', 'CONFIRMADO', 'EM_DIAGNOSTICO', 'EM_EXECUCAO', 'PRONTO_PARA_ENTREGA'].map((st) => (
          <button
            key={st}
            onClick={() => setFiltroStatus(st)}
            className={`btn ${filtroStatus === st ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.8rem', padding: '6px 14px' }}
          >
            {st === 'TODOS' ? 'Todos os Status' : st.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Renderização Condicional: MODO KANBAN vs MODO LISTA */}
      {modoVisualizacao === 'KANBAN' ? (
        <AtendimentosKanban
          atendimentos={atendimentos}
          onAvancarStatus={handleAvancarStatus}
          onAbrirDetalhes={handleAbrirDetalhes}
          onNovoAtendimento={() => setShowModal(true)}
          loading={loading}
        />
      ) : (
        /* MODO LISTA / GRADE TRADICIONAL */
        <div>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Carregando atendimentos...
            </div>
          ) : atendimentos.length === 0 ? (
            <div className="glass-panel" style={{ padding: '60px', textAlign: 'center' }}>
              <Car size={42} color="var(--text-dim)" style={{ marginBottom: '12px' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Nenhum atendimento encontrado</h3>
              <p
                style={{
                  fontSize: '0.85rem',
                  color: 'var(--text-muted)',
                  marginTop: '4px',
                  marginBottom: '20px',
                }}
              >
                Abra um novo atendimento para iniciar o fluxo operacional na oficina.
              </p>
              <button onClick={() => setShowModal(true)} className="btn btn-primary">
                <ClipboardPlus size={16} /> Abrir Primeiro Atendimento
              </button>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
                gap: '16px',
              }}
            >
              {atendimentos.map((atend) => {
                const dataFormatada = new Date(atend.dataEntrada).toLocaleString('pt-BR');
                return (
                  <div
                    key={atend.id}
                    className="glass-panel"
                    style={{
                      padding: '22px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      {/* Top line: Code and Status */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '14px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span
                            style={{
                              fontSize: '1.1rem',
                              fontWeight: 800,
                              color: 'var(--primary)',
                              fontFamily: 'var(--font-heading)',
                            }}
                          >
                            {atend.codigoFormatado}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                            #{atend.numeroSequencial}
                          </span>
                        </div>
                        {getStatusBadge(atend.status)}
                      </div>

                      {/* Vehicle and Client */}
                      <div
                        style={{
                          background: 'rgba(255, 255, 255, 0.02)',
                          padding: '14px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-subtle)',
                          marginBottom: '14px',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '8px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Car size={18} color="var(--primary)" />
                            <span style={{ fontWeight: 700, fontSize: '0.98rem' }}>
                              {atend.veiculo.marca} {atend.veiculo.modelo}
                            </span>
                          </div>

                          {/* Placa Padrão Mercosul */}
                          <div
                            style={{
                              display: 'inline-flex',
                              flexDirection: 'column',
                              background: '#ffffff',
                              border: '1.5px solid #1e3a8a',
                              borderRadius: '4px',
                              overflow: 'hidden',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                            }}
                          >
                            <div
                              style={{
                                background: '#1e3a8a',
                                color: '#ffffff',
                                fontSize: '0.45rem',
                                fontWeight: 900,
                                textAlign: 'center',
                                padding: '1px 4px',
                                letterSpacing: '0.5px',
                              }}
                            >
                              BRASIL
                            </div>
                            <div
                              style={{
                                color: '#111827',
                                fontFamily: 'monospace',
                                fontWeight: 900,
                                fontSize: '0.76rem',
                                padding: '0px 5px',
                                letterSpacing: '1px',
                                textAlign: 'center',
                              }}
                            >
                              {atend.veiculo.placa}
                            </div>
                          </div>
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '0.82rem',
                            color: 'var(--text-muted)',
                          }}
                        >
                          <User size={14} /> {atend.cliente.nomeRazao} ({atend.cliente.telefone})
                        </div>
                      </div>

                      {/* Queixa do Cliente */}
                      <div style={{ marginBottom: '14px' }}>
                        <div
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: 'var(--text-dim)',
                            textTransform: 'uppercase',
                            marginBottom: '4px',
                          }}
                        >
                          Queixa Relatada:
                        </div>
                        <div
                          style={{ fontSize: '0.86rem', color: 'var(--text-main)', lineHeight: 1.4 }}
                        >
                          "{atend.queixaPrincipal}"
                        </div>
                      </div>

                      {/* Medições de Entrada (KM e Combustível) */}
                      {atend.medicao && (
                        <div
                          style={{
                            display: 'flex',
                            gap: '16px',
                            fontSize: '0.78rem',
                            color: 'var(--text-muted)',
                            marginBottom: '14px',
                            borderTop: '1px solid rgba(255,255,255,0.05)',
                            paddingTop: '10px',
                          }}
                        >
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Gauge size={14} color="#38bdf8" />{' '}
                            {atend.medicao.quilometragem.toLocaleString()} km
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Fuel size={14} color="#f59e0b" /> {atend.medicao.nivelCombustivel}
                          </span>
                          {atend.medicao.temEstepe && (
                            <span
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                color: '#34d399',
                              }}
                            >
                              <CheckCircle size={13} /> Estepe OK
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Footer and Next Steps */}
                    <div
                      style={{
                        borderTop: '1px solid var(--border-subtle)',
                        paddingTop: '12px',
                        marginTop: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '0.72rem',
                          color: 'var(--text-dim)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Clock size={12} /> {dataFormatada}
                      </span>

                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => handleAbrirDetalhes(atend, 'DIAGNOSTICO')}
                          className="btn btn-secondary"
                          style={{ fontSize: '0.78rem', padding: '6px 12px' }}
                        >
                          Diagnóstico & Orçamento
                        </button>

                        {atend.status === 'CONFIRMADO' && (
                          <button
                            onClick={() => handleAvancarStatus(atend.id, 'EM_DIAGNOSTICO')}
                            className="btn btn-primary"
                            style={{ fontSize: '0.78rem', padding: '6px 10px' }}
                          >
                            Diagnosticar <ArrowRight size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal de Criação de Novo Atendimento */}
      {showModal && (
        <NovoAtendimentoModal
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            carregarAtendimentos();
          }}
        />
      )}

      {/* Modal de Detalhes da Jornada do Atendimento */}
      {atendimentoSelecionado && (
        <AtendimentoDetalhesModal
          atendimento={atendimentoSelecionado}
          initialSubAba={subAbaInicial}
          onClose={() => setAtendimentoSelecionado(null)}
          onUpdated={() => {
            carregarAtendimentos();
          }}
        />
      )}
    </div>
  );
};
