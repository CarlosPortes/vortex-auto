import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import { ResumoRelatorio, ServicoTerceiro, GarantiaAtendimento, Produto } from '../types';
import {
  TrendingUp,
  DollarSign,
  CheckCircle,
  Clock,
  AlertTriangle,
  Download,
  Truck,
  ShieldCheck,
  RefreshCw,
  Layers,
  Wrench,
  Percent,
  Calendar,
  Package,
  Car,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert,
  Eye,
  X,
} from 'lucide-react';
import { ModalFichaTecnicaProduto } from './ModalFichaTecnicaProduto';

type AbaRelatorio = 'cockpit' | 'dre' | 'estoque' | 'produtividade' | 'terceiros';

export const RelatoriosTab: React.FC = () => {
  const [abaAtiva, setAbaAtiva] = useState<AbaRelatorio>('cockpit');
  const [resumo, setResumo] = useState<ResumoRelatorio | null>(null);
  const [servicosTerceiros, setServicosTerceiros] = useState<ServicoTerceiro[]>([]);
  const [garantias, setGarantias] = useState<GarantiaAtendimento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);

  // Modal para receber serviço de terceiro
  const [servicoParaReceber, setServicoParaReceber] = useState<ServicoTerceiro | null>(null);
  const [observacoesRetorno, setObservacoesRetorno] = useState('');
  const [recebendo, setRecebendo] = useState(false);

  // Modal para exibir ficha técnica do item da validade
  const [produtoFichaTecnica, setProdutoFichaTecnica] = useState<Produto | null>(null);

  const carregarDados = async () => {
    try {
      setCarregando(true);
      setErro(null);

      const [resumoResp, terceirosResp, garantiasResp] = await Promise.all([
        apiRequest<ResumoRelatorio>('/relatorios/resumo'),
        apiRequest<ServicoTerceiro[]>('/servicos-terceiros'),
        apiRequest<GarantiaAtendimento[]>('/garantias'),
      ]);

      if (resumoResp.sucesso && resumoResp.dados) {
        setResumo(resumoResp.dados);
      }
      if (terceirosResp.sucesso && terceirosResp.dados) {
        setServicosTerceiros(terceirosResp.dados);
      }
      if (garantiasResp.sucesso && garantiasResp.dados) {
        setGarantias(garantiasResp.dados);
      }
    } catch (err: any) {
      setErro(err.message || 'Erro ao carregar dados dos relatórios e indicadores.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const handleExportarCSV = () => {
    const token = localStorage.getItem('vortex_token');
    const url = `/api/relatorios/exportar-csv`;
    fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.blob())
      .then((blob) => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `relatorio-vortex-fechamento-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch(() => {
        setErro('Falha ao exportar relatório em formato CSV.');
      });
  };

  const handleConfirmarRecebimentoTerceiro = async () => {
    if (!servicoParaReceber) return;
    try {
      setRecebendo(true);
      const resp = await apiRequest(`/servicos-terceiros/${servicoParaReceber.id}/receber`, {
        method: 'PATCH',
        body: JSON.stringify({ observacoesRetorno }),
      });
      if (resp.sucesso) {
        setMensagemSucesso(resp.mensagem || 'Serviço de terceiro recebido com sucesso!');
        setServicoParaReceber(null);
        setObservacoesRetorno('');
        carregarDados();
        setTimeout(() => setMensagemSucesso(null), 4000);
      } else {
        setErro(resp.mensagem || 'Erro ao registrar recebimento do serviço de terceiros.');
      }
    } catch (err: any) {
      setErro(err.message || 'Erro ao registrar recebimento do serviço de terceiros.');
    } finally {
      setRecebendo(false);
    }
  };

  const abrirFichaTecnica = async (produtoId: string) => {
    try {
      const resp = await apiRequest<Produto>(`/produtos/${produtoId}`);
      if (resp.sucesso && resp.dados) {
        setProdutoFichaTecnica(resp.dados);
      }
    } catch (e) {
      // Ignora erro silenciosamente
    }
  };

  if (carregando) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
        <RefreshCw size={36} color="var(--primary)" style={{ animation: 'spin 1.5s linear infinite', marginBottom: '16px' }} />
        <p style={{ fontSize: '1rem', fontWeight: 500 }}>Consolidando indicadores executivos e BI da oficina...</p>
      </div>
    );
  }

  const radarValidades = resumo?.estoque?.radarValidades || [];
  const dre = resumo?.dre;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header Card */}
      <div
        className="glass-panel"
        style={{
          padding: '20px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'rgba(14, 165, 233, 0.15)',
              border: '1px solid rgba(14, 165, 233, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)',
            }}
          >
            <TrendingUp size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
              Business Intelligence & Indicadores Executivos
            </h2>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Visão estratégica da oficina: Faturamento, DRE, Produtividade, Radar de Validades e Retíficas.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={carregarDados}
            className="btn btn-secondary"
            style={{ fontSize: '0.84rem', padding: '8px 14px' }}
            title="Recalcular métricas"
          >
            <RefreshCw size={14} /> Atualizar BI
          </button>
          <button
            onClick={handleExportarCSV}
            className="btn btn-primary"
            style={{ fontSize: '0.84rem', padding: '8px 16px', fontWeight: 700 }}
          >
            <Download size={15} /> Exportar CSV
          </button>
        </div>
      </div>

      {/* Feedback Banners */}
      {erro && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid #f87171',
            color: '#f87171',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.88rem',
          }}
        >
          <span>{erro}</span>
          <button onClick={() => setErro(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
        </div>
      )}

      {mensagemSucesso && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid var(--accent-green)',
            color: '#34d399',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.88rem',
          }}
        >
          <span>{mensagemSucesso}</span>
          <button onClick={() => setMensagemSucesso(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
        </div>
      )}

      {/* Barra de Sub-Abas do BI */}
      <div
        className="glass-panel"
        style={{
          padding: '8px 12px',
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          overflowX: 'auto',
        }}
      >
        <button
          onClick={() => setAbaAtiva('cockpit')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '9px 16px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.84rem',
            fontWeight: 700,
            cursor: 'pointer',
            border: abaAtiva === 'cockpit' ? '1px solid var(--primary)' : '1px solid transparent',
            background: abaAtiva === 'cockpit' ? 'linear-gradient(135deg, rgba(14, 165, 233, 0.25), rgba(2, 132, 199, 0.35))' : 'transparent',
            color: abaAtiva === 'cockpit' ? '#38bdf8' : 'var(--text-muted)',
            transition: 'all 0.15s',
          }}
        >
          <BarChart3 size={16} /> Cockpit Executivo
        </button>

        <button
          onClick={() => setAbaAtiva('dre')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '9px 16px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.84rem',
            fontWeight: 700,
            cursor: 'pointer',
            border: abaAtiva === 'dre' ? '1px solid var(--accent-green)' : '1px solid transparent',
            background: abaAtiva === 'dre' ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(5, 150, 105, 0.35))' : 'transparent',
            color: abaAtiva === 'dre' ? '#34d399' : 'var(--text-muted)',
            transition: 'all 0.15s',
          }}
        >
          <DollarSign size={16} /> DRE & Lucratividade
        </button>

        <button
          onClick={() => setAbaAtiva('estoque')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '9px 16px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.84rem',
            fontWeight: 700,
            cursor: 'pointer',
            border: abaAtiva === 'estoque' ? '1px solid var(--accent-amber)' : '1px solid transparent',
            background: abaAtiva === 'estoque' ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.25), rgba(217, 119, 6, 0.35))' : 'transparent',
            color: abaAtiva === 'estoque' ? '#fbbf24' : 'var(--text-muted)',
            transition: 'all 0.15s',
          }}
        >
          <Package size={16} /> Estoque & Radar de Validades
          {((resumo?.estoque.itensValidadeVencida || 0) > 0 || (resumo?.estoque.itensValidadeAlerta || 0) > 0) && (
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
          )}
        </button>

        <button
          onClick={() => setAbaAtiva('produtividade')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '9px 16px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.84rem',
            fontWeight: 700,
            cursor: 'pointer',
            border: abaAtiva === 'produtividade' ? '1px solid var(--accent-purple)' : '1px solid transparent',
            background: abaAtiva === 'produtividade' ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(124, 58, 237, 0.35))' : 'transparent',
            color: abaAtiva === 'produtividade' ? '#c084fc' : 'var(--text-muted)',
            transition: 'all 0.15s',
          }}
        >
          <Wrench size={16} /> Boxes & Produtividade
        </button>

        <button
          onClick={() => setAbaAtiva('terceiros')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '9px 16px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.84rem',
            fontWeight: 700,
            cursor: 'pointer',
            border: abaAtiva === 'terceiros' ? '1px solid #38bdf8' : '1px solid transparent',
            background: abaAtiva === 'terceiros' ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.25), rgba(14, 165, 233, 0.35))' : 'transparent',
            color: abaAtiva === 'terceiros' ? '#38bdf8' : 'var(--text-muted)',
            transition: 'all 0.15s',
          }}
        >
          <Truck size={16} /> Retíficas & Garantias
        </button>
      </div>

      {/* ============================================================== */}
      {/* ABA 1: COCKPIT EXECUTIVO & VISÃO GERAL */}
      {/* ============================================================== */}
      {abaAtiva === 'cockpit' && resumo && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Grid de KPIs Principais */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            {/* Card Faturamento Realizado */}
            <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--accent-green)', letterSpacing: '0.04em' }}>
                  Faturamento Realizado
                </span>
                <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-green)' }}>
                  <DollarSign size={18} />
                </div>
              </div>
              <div style={{ marginTop: '14px' }}>
                <div style={{ fontSize: '1.65rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                  R$ {resumo.financeiro.faturamentoTotalRealizado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ArrowUpRight size={14} color="var(--accent-green)" />
                  {resumo.financeiro.totalRecebimentos} recebimento(s) compensado(s)
                </div>
              </div>
            </div>

            {/* Card A Receber / Em Aberto */}
            <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--accent-amber)', letterSpacing: '0.04em' }}>
                  A Receber / Em Aberto
                </span>
                <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-amber)' }}>
                  <Clock size={18} />
                </div>
              </div>
              <div style={{ marginTop: '14px' }}>
                <div style={{ fontSize: '1.65rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                  R$ {resumo.financeiro.totalSaldoPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Parcelas pendentes de quitação
                </div>
              </div>
            </div>

            {/* Card Ticket Médio */}
            <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.04em' }}>
                  Ticket Médio por Veículo
                </span>
                <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(14, 165, 233, 0.15)', color: 'var(--primary)' }}>
                  <Percent size={18} />
                </div>
              </div>
              <div style={{ marginTop: '14px' }}>
                <div style={{ fontSize: '1.65rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                  R$ {resumo.financeiro.ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Base: {resumo.atendimentos.entregues} veículo(s) entregue(s)
                </div>
              </div>
            </div>

            {/* Card Eficiência OS */}
            <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--accent-purple)', letterSpacing: '0.04em' }}>
                  Taxa Conclusão de OS
                </span>
                <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(139, 92, 246, 0.15)', color: 'var(--accent-purple)' }}>
                  <Wrench size={18} />
                </div>
              </div>
              <div style={{ marginTop: '14px' }}>
                <div style={{ fontSize: '1.65rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                  {resumo.ordensServico.taxaConclusaoPercent}%
                </div>
                <div style={{ width: '100%', height: '6px', background: '#1f2937', borderRadius: '4px', overflow: 'hidden', marginTop: '8px' }}>
                  <div style={{ width: `${resumo.ordensServico.taxaConclusaoPercent}%`, height: '100%', background: 'var(--accent-purple)', borderRadius: '4px' }} />
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {resumo.ordensServico.concluidas} de {resumo.ordensServico.total} ordens finalizadas
                </div>
              </div>
            </div>
          </div>

          {/* Seção Central: Pátio de Atendimentos & Radar de Alertas */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
            {/* Status do Pátio */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Car size={18} color="var(--primary)" /> Fluxo de Atendimentos no Pátio ({resumo.atendimentos.total} total)
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {resumo.atendimentos.porStatus.map((item, idx) => {
                  const percent = resumo.atendimentos.total > 0 ? Math.round((item.total / resumo.atendimentos.total) * 100) : 0;
                  return (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{item.status}</span>
                        <span style={{ color: 'var(--text-muted)' }}>{item.total} veículo(s) ({percent}%)</span>
                      </div>
                      <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${percent}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, #0ea5e9, #38bdf8)',
                            borderRadius: '4px',
                            transition: 'width 0.5s ease',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Radar de Alertas Operacionais */}
            <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <ShieldAlert size={18} color="var(--accent-amber)" /> Radar de Alertas Operacionais
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Alerta 1 */}
                  <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ padding: '6px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
                        <AlertTriangle size={16} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)' }}>Peças Abaixo do Mínimo</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Risco de ruptura no box mecânico</div>
                      </div>
                    </div>
                    <span style={{ fontSize: '1rem', fontWeight: 800, color: '#f87171' }}>
                      {resumo.estoque.itensEstoqueCritico}
                    </span>
                  </div>

                  {/* Alerta 2 */}
                  <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(245, 158, 11, 0.08)',
                      border: '1px solid rgba(245, 158, 11, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ padding: '6px', borderRadius: '6px', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
                        <Calendar size={16} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)' }}>Validade Vencida ou Próxima</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Fluidos, óleos lubrificantes e aditivos</div>
                      </div>
                    </div>
                    <span style={{ fontSize: '1rem', fontWeight: 800, color: '#fbbf24' }}>
                      {(resumo.estoque.itensValidadeVencida || 0) + (resumo.estoque.itensValidadeAlerta || 0)}
                    </span>
                  </div>

                  {/* Alerta 3 */}
                  <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(139, 92, 246, 0.08)',
                      border: '1px solid rgba(139, 92, 246, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ padding: '6px', borderRadius: '6px', background: 'rgba(139, 92, 246, 0.15)', color: '#c084fc' }}>
                        <ShieldCheck size={16} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)' }}>Garantias Acionadas</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Histórico formal de reanálises</div>
                      </div>
                    </div>
                    <span style={{ fontSize: '1rem', fontWeight: 800, color: '#c084fc' }}>
                      {resumo.garantias.total}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '16px', textAlign: 'right' }}>
                <button
                  onClick={() => setAbaAtiva('estoque')}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.78rem', padding: '6px 12px' }}
                >
                  Auditar Radar de Estoque &rarr;
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* ABA 2: DRE FINANCEIRO & LUCRATIVIDADE DA OFICINA */}
      {/* ============================================================== */}
      {abaAtiva === 'dre' && resumo && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <DollarSign size={20} color="var(--accent-green)" />
                  Demonstrativo de Resultado do Exercício (DRE da Oficina)
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Apuração de receitas brutas, Custo das Mercadorias Vendidas (CMV), despesas de parceiros e margem operacional líquida.
                </p>
              </div>
              {dre && (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Margem Bruta Geral</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--accent-green)' }}>
                    {dre.margemBrutaPercentual}%
                  </div>
                </div>
              )}
            </div>

            {dre ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '20px' }}>
                {/* Linha 1: Receita Bruta */}
                <div
                  style={{
                    padding: '16px 20px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-green)' }}>
                      <ArrowUpRight size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-main)' }}>
                        Receita Bruta Realizada (Oficina + Balcão)
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total de recebimentos faturados e compensados</div>
                    </div>
                  </div>
                  <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--accent-green)', fontFamily: 'monospace' }}>
                    R$ {dre.faturamentoBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Linha 2: (-) CMV Custo das Mercadorias */}
                <div
                  style={{
                    padding: '16px 20px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
                      <ArrowDownRight size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-main)' }}>
                        (-) Custo das Mercadorias Vendidas (CMV)
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Peças e materiais consumidos em OS e Balcão pelo Custo Médio Ponderado</div>
                    </div>
                  </div>
                  <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f87171', fontFamily: 'monospace' }}>
                    - R$ {dre.cmvTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Linha 3: (-) Custos com Serviços Terceirizados */}
                <div
                  style={{
                    padding: '16px 20px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-amber)' }}>
                      <Truck size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-main)' }}>
                        (-) Custos de Serviços Terceirizados & Retíficas
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Valores pagos a retíficas, tornos e parceiros externos</div>
                    </div>
                  </div>
                  <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--accent-amber)', fontFamily: 'monospace' }}>
                    - R$ {dre.custosTerceiros.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Linha 4: Lucro Bruto Operacional */}
                <div
                  style={{
                    padding: '20px 24px',
                    borderRadius: 'var(--radius-lg)',
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(6, 78, 59, 0.4))',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: '0 8px 24px rgba(16, 185, 129, 0.15)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ padding: '10px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.25)', color: '#34d399' }}>
                      <Percent size={22} />
                    </div>
                    <div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#ffffff' }}>
                        (=) LUCRO BRUTO OPERACIONAL
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#a7f3d0' }}>Margem de contribuição líquida da oficina</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#34d399', fontFamily: 'monospace' }}>
                      R$ {dre.lucroBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#a7f3d0' }}>
                      Margem Real: {dre.margemBrutaPercentual}%
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Nenhum dado consolidado de DRE encontrado.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* ABA 3: ESTOQUE & RADAR DE VALIDADES PREVENTIVAS */}
      {/* ============================================================== */}
      {abaAtiva === 'estoque' && resumo && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Cards de Patrimônio e Riscos de Validade */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            <div className="glass-panel" style={{ padding: '20px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Layers size={16} color="var(--primary)" /> Patrimônio em Estoque (Custo)
              </span>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--text-main)', marginTop: '8px' }}>
                R$ {resumo.estoque.valorTotalEstoqueCusto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px', display: 'block' }}>
                {resumo.estoque.totalItensCadastrados} itens cadastrados no catálogo
              </span>
            </div>

            <div className="glass-panel" style={{ padding: '20px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <DollarSign size={16} color="var(--accent-green)" /> Potencial de Venda (Preço Balcão)
              </span>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--accent-green)', marginTop: '8px' }}>
                R$ {resumo.estoque.valorTotalEstoqueVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px', display: 'block' }}>
                Valor projetado de tabela de venda
              </span>
            </div>

            <div className="glass-panel" style={{ padding: '20px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={16} color="var(--accent-amber)" /> Radar Preventivo de Validades
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
                <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.4)' }}>
                  {resumo.estoque.itensValidadeVencida || 0} Vencido(s)
                </span>
                <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.4)' }}>
                  {resumo.estoque.itensValidadeAlerta || 0} Próximos
                </span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '6px', display: 'block' }}>
                Auditoria de fluidos de freio, lubrificantes e químicos
              </span>
            </div>
          </div>

          {/* Tabela do Radar de Validades Preventivas */}
          <div className="glass-panel" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={18} color="var(--accent-amber)" />
                Radar Preventivo de Validades (Lubrificantes, Fluidos e Químicos)
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Evite prejuízos e riscos a motores de clientes utilizando itens fora da especificação ou com validade expirada.
              </p>
            </div>

            {radarValidades.length === 0 ? (
              <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Nenhum produto cadastrado com validade vencida ou vencendo nos próximos 60 dias. Estoque químico em total conformidade!
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.02)' }}>
                      <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-muted)' }}>CÓDIGO</th>
                      <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-muted)' }}>DESCRIÇÃO DA PEÇA</th>
                      <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-muted)' }}>MARCA</th>
                      <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-muted)' }}>LOTE</th>
                      <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-muted)' }}>DATA VALIDADE</th>
                      <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-muted)' }}>SALDO FÍSICO</th>
                      <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-muted)' }}>STATUS</th>
                      <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'right' }}>AÇÃO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {radarValidades.map((item) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '12px 14px', fontWeight: 800, color: 'var(--primary)', fontFamily: 'monospace' }}>
                          {item.codigo}
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-main)' }}>
                          {item.descricao}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span className="badge badge-blue">{item.marca}</span>
                        </td>
                        <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                          {item.lote}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          {new Date(item.dataValidade).toLocaleDateString('pt-BR')}
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--text-main)' }}>
                          {item.saldoFisico}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          {item.status === 'VENCIDO' ? (
                            <span className="badge badge-danger">
                              <AlertTriangle size={12} /> Vencido ({Math.abs(item.diasParaVencer)}d)
                            </span>
                          ) : (
                            <span className="badge badge-amber">
                              <Clock size={12} /> Vence em {item.diasParaVencer}d
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                          <button
                            onClick={() => abrirFichaTecnica(item.id)}
                            className="btn btn-secondary"
                            style={{ padding: '4px 10px', fontSize: '0.74rem', color: 'var(--primary)' }}
                            title="Ver Ficha Técnica"
                          >
                            <Eye size={12} /> Ficha
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* ABA 4: BOXES & PRODUTIVIDADE */}
      {/* ============================================================== */}
      {abaAtiva === 'produtividade' && resumo && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            <div className="glass-panel" style={{ padding: '20px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Wrench size={16} color="var(--accent-purple)" /> Ordens de Serviço Totais
              </span>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--text-main)', marginTop: '8px' }}>
                {resumo.ordensServico.total}
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px', display: 'block' }}>
                Registradas na oficina
              </span>
            </div>

            <div className="glass-panel" style={{ padding: '20px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle size={16} color="var(--accent-green)" /> OS Concluídas
              </span>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--accent-green)', marginTop: '8px' }}>
                {resumo.ordensServico.concluidas}
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px', display: 'block' }}>
                Veículos liberados
              </span>
            </div>

            <div className="glass-panel" style={{ padding: '20px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={16} color="var(--accent-amber)" /> Em Execução nos Boxes
              </span>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--accent-amber)', marginTop: '8px' }}>
                {resumo.ordensServico.emAndamento}
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px', display: 'block' }}>
                Atividade técnica em andamento
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* ABA 5: RETÍFICAS (TERCEIROS) & GARANTIAS */}
      {/* ============================================================== */}
      {abaAtiva === 'terceiros' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Serviços de Terceiros */}
          <div className="glass-panel" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Truck size={18} color="var(--accent-amber)" /> Serviços Externos e Retíficas Parceiras (HU-025)
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Acompanhamento de envio, custos e conferência de recebimento de peças terceirizadas.
              </p>
            </div>

            {servicosTerceiros.length === 0 ? (
              <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Nenhum serviço terceirizado registrado até o momento.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.02)' }}>
                      <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-muted)' }}>ATENDIMENTO</th>
                      <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-muted)' }}>FORNECEDOR</th>
                      <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-muted)' }}>SERVIÇO SOLICITADO</th>
                      <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-muted)' }}>CUSTO</th>
                      <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-muted)' }}>COBRADO</th>
                      <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-muted)' }}>STATUS</th>
                      <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'right' }}>AÇÃO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {servicosTerceiros.map((servico) => (
                      <tr key={servico.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '12px 14px', fontWeight: 800, color: 'var(--primary)', fontFamily: 'monospace' }}>
                          {servico.atendimento?.codigoFormatado || 'N/A'}
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-main)' }}>
                          {servico.fornecedorNome}
                        </td>
                        <td style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>
                          {servico.descricaoServico}
                        </td>
                        <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                          R$ {Number(servico.valorCusto).toFixed(2)}
                        </td>
                        <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-green)' }}>
                          R$ {Number(servico.valorCobradoCliente).toFixed(2)}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span
                            className={`badge ${
                              servico.status === 'RECEBIDO'
                                ? 'badge-green'
                                : servico.status === 'ENVIADO'
                                ? 'badge-blue'
                                : 'badge-amber'
                            }`}
                          >
                            {servico.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                          {servico.status !== 'RECEBIDO' && servico.status !== 'CANCELADO' && (
                            <button
                              onClick={() => setServicoParaReceber(servico)}
                              className="btn btn-primary"
                              style={{ padding: '4px 10px', fontSize: '0.74rem' }}
                            >
                              Receber
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Garantias */}
          <div className="glass-panel" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={18} color="var(--accent-green)" />
                Controle de Garantias e Retornos de Veículos (HU-023)
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Registro formal de análises técnicas de garantia, pareceres e atendimentos de retorno.
              </p>
            </div>

            {garantias.length === 0 ? (
              <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Nenhuma garantia acionada até o momento.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.02)' }}>
                      <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-muted)' }}>CÓDIGO GARANTIA</th>
                      <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-muted)' }}>ORIGEM</th>
                      <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-muted)' }}>VEÍCULO / CLIENTE</th>
                      <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-muted)' }}>DECISÃO</th>
                      <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-muted)' }}>NOVO ATENDIMENTO</th>
                      <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-muted)' }}>DATA DECISÃO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {garantias.map((gar) => (
                      <tr key={gar.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '12px 14px', fontWeight: 800, color: 'var(--accent-amber)', fontFamily: 'monospace' }}>
                          {gar.codigoFormatado}
                        </td>
                        <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: 'var(--primary)' }}>
                          {gar.atendimentoOrigem?.codigoFormatado || 'N/A'}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                            {gar.atendimentoOrigem?.veiculo.modelo} ({gar.atendimentoOrigem?.veiculo.placa})
                          </div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{gar.atendimentoOrigem?.cliente.nomeRazao}</div>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span
                            className={`badge ${
                              gar.decisao === 'COBERTA_TOTAL'
                                ? 'badge-green'
                                : gar.decisao === 'COBERTA_PARCIAL'
                                ? 'badge-amber'
                                : 'badge-danger'
                            }`}
                          >
                            {gar.decisao}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: 'var(--primary)' }}>
                          {gar.atendimentoGarantia?.codigoFormatado ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#38bdf8' }}>
                              <CheckCircle size={14} color="var(--accent-green)" />
                              {gar.atendimentoGarantia.codigoFormatado}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-dim)', fontSize: '0.74rem' }}>Sem novo atendimento</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>
                          {new Date(gar.dataDecisao).toLocaleDateString('pt-BR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Receber Serviço de Terceiro */}
      {servicoParaReceber && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <div className="glass-panel" style={{ maxWidth: '520px', width: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Truck size={20} color="var(--accent-amber)" />
                Conferência de Retorno de Terceiro
              </h3>
              <button
                onClick={() => setServicoParaReceber(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', marginBottom: '16px', fontSize: '0.84rem' }}>
              <p style={{ color: 'var(--text-muted)' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>Fornecedor:</span> {servicoParaReceber.fornecedorNome}
              </p>
              <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>Serviço:</span> {servicoParaReceber.descricaoServico}
              </p>
              <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>Custo:</span> R$ {Number(servicoParaReceber.valorCusto).toFixed(2)}
              </p>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label className="input-label">Observações de Conferência / Qualidade da Peça</label>
              <textarea
                value={observacoesRetorno}
                onChange={(e) => setObservacoesRetorno(e.target.value)}
                placeholder="Ex: Peça conferida, retífica realizada conforme tolerância exigida, sem trincas."
                rows={3}
                className="input-field"
                style={{ resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setServicoParaReceber(null)}
                disabled={recebendo}
                className="btn btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarRecebimentoTerceiro}
                disabled={recebendo}
                className="btn btn-primary"
              >
                {recebendo ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle size={15} />}
                Confirmar Recebimento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ficha Técnica acionado a partir do radar de validades */}
      {produtoFichaTecnica && (
        <ModalFichaTecnicaProduto
          produto={produtoFichaTecnica}
          onClose={() => setProdutoFichaTecnica(null)}
        />
      )}
    </div>
  );
};
