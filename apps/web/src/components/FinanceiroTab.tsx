import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  CreditCard,
  CheckCircle2,
  Clock,
  Search,
  Eye,
  X,
  TrendingUp,
  Receipt,
  Car,
  Calculator,
} from 'lucide-react';
import { Cobranca } from '../types';
import { apiRequest } from '../api';
import { ModalCalculadoraMaquininha } from './ModalCalculadoraMaquininha';

export const FinanceiroTab: React.FC = () => {
  const [cobrancas, setCobrancas] = useState<Cobranca[]>([]);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('TODAS');

  // Modal Detalhes e Recebimento
  const [cobrancaSelecionada, setCobrancaSelecionada] = useState<Cobranca | null>(null);
  const [modalDetalhes, setModalDetalhes] = useState(false);
  const [carregandoDetalhes, setCarregandoDetalhes] = useState(false);

  // Modal Simulador de Maquininha e PIX
  const [modalCalculadora, setModalCalculadora] = useState(false);
  const [valorBaseCalculadora, setValorBaseCalculadora] = useState(1200);

  // Form Recebimento
  const [valorReceber, setValorReceber] = useState<number>(0);
  const [meioPagamento, setMeioPagamento] = useState<string>('PIX');
  const [detalhesRecebimento, setDetalhesRecebimento] = useState<string>('');
  const [salvandoRecebimento, setSalvandoRecebimento] = useState(false);

  const [feedbackMsg, setFeedbackMsg] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  const carregarCobrancas = async () => {
    setLoading(true);
    let url = `/cobrancas?q=${encodeURIComponent(busca)}`;
    if (filtroStatus !== 'TODAS') {
      url += `&status=${filtroStatus}`;
    }
    const res = await apiRequest<Cobranca[]>(url);
    if (res.sucesso && res.dados) {
      setCobrancas(res.dados);
    }
    setLoading(false);
  };

  useEffect(() => {
    carregarCobrancas();
  }, [busca, filtroStatus]);

  const abrirDetalhesCobranca = async (cob: Cobranca) => {
    setModalDetalhes(true);
    setCarregandoDetalhes(true);
    const res = await apiRequest<Cobranca>(`/cobrancas/${cob.id}`);
    if (res.sucesso && res.dados) {
      setCobrancaSelecionada(res.dados);
      setValorReceber(res.dados.saldoDevedor > 0 ? res.dados.saldoDevedor : 0);
    }
    setCarregandoDetalhes(false);
  };

  const handleRegistrarRecebimento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cobrancaSelecionada) return;

    if (valorReceber <= 0) {
      setFeedbackMsg({ tipo: 'erro', texto: 'Informe um valor maior que zero para o recebimento.' });
      return;
    }

    setSalvandoRecebimento(true);
    const res = await apiRequest(`/cobrancas/${cobrancaSelecionada.id}/recebimentos`, {
      method: 'POST',
      body: JSON.stringify({
        valor: Number(valorReceber),
        meioPagamento,
        detalhes: detalhesRecebimento || `Recebimento referente à ${cobrancaSelecionada.codigoFormatado}`,
      }),
    });

    setSalvandoRecebimento(false);
    if (res.sucesso) {
      setFeedbackMsg({ tipo: 'sucesso', texto: 'Pagamento registrado e baixado com sucesso!' });
      setDetalhesRecebimento('');
      // Recarregar cobrança aberta e lista
      abrirDetalhesCobranca(cobrancaSelecionada);
      carregarCobrancas();
    } else {
      setFeedbackMsg({ tipo: 'erro', texto: res.mensagem || 'Falha ao registrar recebimento.' });
    }
  };

  // KPIs
  const totalFaturado = cobrancas.reduce((acc, c) => acc + c.valorLiquido, 0);
  const totalRecebido = cobrancas.reduce((acc, c) => acc + c.valorRecebido, 0);
  const saldoPendenteGeral = cobrancas.reduce((acc, c) => acc + c.saldoDevedor, 0);
  const totalLiquidadas = cobrancas.filter((c) => c.status === 'LIQUIDADA').length;

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
            <Receipt size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Faturamento Total (HU-020)</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalFaturado)}
            </div>
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
            <TrendingUp size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Efetivamente Recebido</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#34d399' }}>
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalRecebido)}
            </div>
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
            <Clock size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Saldo Pendente a Receber</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: saldoPendenteGeral > 0 ? 'var(--accent-amber)' : 'inherit' }}>
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(saldoPendenteGeral)}
            </div>
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
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cobranças 100% Quitadas</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{totalLiquidadas} de {cobrancas.length}</div>
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
            placeholder="Buscar por código de cobrança, cliente ou placa..."
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

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {['TODAS', 'PENDENTE', 'PARCIALMENTE_LIQUIDADA', 'LIQUIDADA'].map((st) => (
            <button
              key={st}
              onClick={() => setFiltroStatus(st)}
              className={`btn ${filtroStatus === st ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '8px 12px', fontSize: '0.78rem' }}
            >
              {st === 'TODAS' ? 'Todas' : st.replace('_', ' ')}
            </button>
          ))}

          <button
            type="button"
            onClick={() => {
              setValorBaseCalculadora(1500);
              setModalCalculadora(true);
            }}
            className="btn btn-primary"
            style={{
              padding: '8px 14px',
              fontSize: '0.78rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#10b981',
              borderColor: '#10b981',
            }}
          >
            <Calculator size={15} /> Simular Maquininha & PIX
          </button>
        </div>
      </div>

      {/* Tabela de Cobranças */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.02)' }}>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>CÓDIGO</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>ATENDIMENTO / CLIENTE</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>VEÍCULO</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>VALOR LÍQUIDO</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>RECEBIDO</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>SALDO DEVEDOR</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>STATUS</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'right' }}>AÇÕES</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Consultando contas a receber...
                  </td>
                </tr>
              ) : cobrancas.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Nenhuma cobrança registrada com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                cobrancas.map((cob) => {
                  const statusColor =
                    cob.status === 'LIQUIDADA' ? 'badge-green' :
                    cob.status === 'PARCIALMENTE_LIQUIDADA' ? 'badge-blue' : 'badge-amber';

                  return (
                    <tr key={cob.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--primary)' }}>
                        {cob.codigoFormatado}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600 }}>{cob.atendimento?.cliente?.nomeRazao}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Ref: {cob.atendimento?.codigoFormatado}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Car size={14} color="var(--primary)" />
                          <span>{cob.atendimento?.veiculo?.modelo}</span>
                          <span className="badge badge-gray">{cob.atendimento?.veiculo?.placa}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cob.valorLiquido)}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#34d399', fontWeight: 600 }}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cob.valorRecebido)}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: cob.saldoDevedor > 0 ? 'var(--accent-amber)' : 'var(--text-muted)' }}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cob.saldoDevedor)}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span className={`badge ${statusColor}`}>
                          {cob.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <button
                          onClick={() => abrirDetalhesCobranca(cob)}
                          className="btn btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                        >
                          <Eye size={14} /> Detalhes & Baixa
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detalhes da Cobrança e Recebimento */}
      {modalDetalhes && (
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
            maxWidth: '840px',
            width: '100%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            padding: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <DollarSign size={22} color="var(--primary)" />
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                    {cobrancaSelecionada?.codigoFormatado}
                  </h3>
                  <span className={`badge ${
                    cobrancaSelecionada?.status === 'LIQUIDADA' ? 'badge-green' : 'badge-amber'
                  }`}>
                    {cobrancaSelecionada?.status.replace('_', ' ')}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Cliente: {cobrancaSelecionada?.atendimento?.cliente?.nomeRazao} • Veículo: {cobrancaSelecionada?.atendimento?.veiculo?.modelo} ({cobrancaSelecionada?.atendimento?.veiculo?.placa})
                </div>
              </div>
              <button onClick={() => setModalDetalhes(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {carregandoDetalhes ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Carregando dados da cobrança...
              </div>
            ) : cobrancaSelecionada && (
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Resumo financeiro em cards */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '12px',
                  background: 'rgba(255,255,255,0.02)',
                  padding: '16px',
                  borderRadius: 'var(--radius-sm)',
                }}>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>VALOR BRUTO</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cobrancaSelecionada.valorTotal)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>DESCONTO APLICADO</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-amber)' }}>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cobrancaSelecionada.valorDesconto)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>VALOR LÍQUIDO</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)' }}>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cobrancaSelecionada.valorLiquido)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>SALDO PENDENTE</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: cobrancaSelecionada.saldoDevedor > 0 ? '#f87171' : '#34d399' }}>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cobrancaSelecionada.saldoDevedor)}
                    </div>
                  </div>
                </div>

                {/* Grade de Parcelas */}
                <div>
                  <h4 style={{ fontSize: '0.92rem', fontWeight: 700, marginBottom: '8px' }}>
                    Parcelamento ({cobrancaSelecionada.parcelas?.length || 0} parcelas)
                  </h4>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.02)' }}>
                        <th style={{ padding: '8px 12px' }}>PARCELA</th>
                        <th style={{ padding: '8px 12px' }}>VENCIMENTO</th>
                        <th style={{ padding: '8px 12px' }}>VALOR</th>
                        <th style={{ padding: '8px 12px' }}>PAGO</th>
                        <th style={{ padding: '8px 12px' }}>SALDO</th>
                        <th style={{ padding: '8px 12px' }}>STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cobrancaSelecionada.parcelas?.map((p) => (
                        <tr key={p.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '8px 12px', fontWeight: 600 }}>{p.numeroParcela}ª Parcela</td>
                          <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>
                            {new Date(p.dataVencimento).toLocaleDateString('pt-BR')}
                          </td>
                          <td style={{ padding: '8px 12px', fontWeight: 600 }}>
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.valor)}
                          </td>
                          <td style={{ padding: '8px 12px', color: '#34d399' }}>
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.valorPago)}
                          </td>
                          <td style={{ padding: '8px 12px', fontWeight: 700 }}>
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.saldoDevedor)}
                          </td>
                          <td style={{ padding: '8px 12px' }}>
                            <span className={`badge ${p.status === 'PAGA' ? 'badge-green' : 'badge-amber'}`}>
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Formulário de Recebimento de Pagamento (HU-021) */}
                {cobrancaSelecionada.saldoDevedor > 0 && (
                  <div style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '16px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CreditCard size={16} color="var(--primary)" /> Baixar Pagamento / Recebimento (HU-021)
                      </h4>
                      <button
                        type="button"
                        onClick={() => {
                          setValorBaseCalculadora(cobrancaSelecionada.saldoDevedor);
                          setModalCalculadora(true);
                        }}
                        className="btn btn-secondary"
                        style={{ padding: '5px 10px', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '4px', borderColor: '#10b981', color: '#34d399' }}
                      >
                        <Calculator size={14} /> Repassar Taxa Maquininha
                      </button>
                    </div>

                    <form onSubmit={handleRegistrarRecebimento} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', alignItems: 'flex-end' }}>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Valor a Receber (R$) *</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          max={cobrancaSelecionada.saldoDevedor}
                          required
                          value={valorReceber}
                          onChange={(e) => setValorReceber(Number(e.target.value))}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.03)', color: 'inherit' }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Meio de Pagamento *</label>
                        <select
                          value={meioPagamento}
                          onChange={(e) => setMeioPagamento(e.target.value)}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: '#181b22', color: 'inherit' }}
                        >
                          <option value="PIX">PIX - Transferência Instantânea</option>
                          <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                          <option value="CARTAO_DEBITO">Cartão de Débito</option>
                          <option value="DINHEIRO">Dinheiro em Espécie</option>
                          <option value="BOLETO">Boleto Bancário</option>
                          <option value="TRANSFERENCIA">Transferência / TED</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Detalhes / Comprovante</label>
                        <input
                          type="text"
                          placeholder="Ex: NSU 9482 / Depósito conta bancária"
                          value={detalhesRecebimento}
                          onChange={(e) => setDetalhesRecebimento(e.target.value)}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.03)', color: 'inherit' }}
                        />
                      </div>

                      <div>
                        <button
                          type="submit"
                          disabled={salvandoRecebimento}
                          className="btn btn-primary"
                          style={{ width: '100%', padding: '9px 12px' }}
                        >
                          {salvandoRecebimento ? 'Processando...' : 'Confirmar Recebimento'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Histórico de Recebimentos Realizados */}
                {cobrancaSelecionada.recebimentos && cobrancaSelecionada.recebimentos.length > 0 && (
                  <div>
                    <h4 style={{ fontSize: '0.92rem', fontWeight: 700, marginBottom: '8px' }}>
                      Pagamentos Registrados ({cobrancaSelecionada.recebimentos.length})
                    </h4>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.02)' }}>
                          <th style={{ padding: '6px 10px' }}>RECIBO</th>
                          <th style={{ padding: '6px 10px' }}>DATA/HORA</th>
                          <th style={{ padding: '6px 10px' }}>MEIO</th>
                          <th style={{ padding: '6px 10px' }}>VALOR</th>
                          <th style={{ padding: '6px 10px' }}>DETALHES</th>
                          <th style={{ padding: '6px 10px' }}>OPERADOR</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cobrancaSelecionada.recebimentos.map((r) => (
                          <tr key={r.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            <td style={{ padding: '6px 10px', fontWeight: 700, color: 'var(--primary)' }}>
                              {r.codigoFormatado}
                            </td>
                            <td style={{ padding: '6px 10px', color: 'var(--text-muted)' }}>
                              {new Date(r.dataHoraRecebimento).toLocaleString('pt-BR')}
                            </td>
                            <td style={{ padding: '6px 10px' }}>
                              <span className="badge badge-blue">{r.meioPagamento}</span>
                            </td>
                            <td style={{ padding: '6px 10px', fontWeight: 700, color: '#34d399' }}>
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(r.valor)}
                            </td>
                            <td style={{ padding: '6px 10px' }}>{r.detalhes || '-'}</td>
                            <td style={{ padding: '6px 10px', color: 'var(--text-muted)' }}>{r.usuarioNome}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setModalDetalhes(false)} className="btn btn-secondary">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Simulador de Maquininha e PIX (Repassar Taxas) */}
      {modalCalculadora && (
        <ModalCalculadoraMaquininha
          valorBase={valorBaseCalculadora}
          onClose={() => setModalCalculadora(false)}
          onAplicarValorFinal={(valorCalc, parcelas, _taxa, detalhe) => {
            setValorReceber(valorCalc);
            if (parcelas > 1) {
              setMeioPagamento('CARTAO_CREDITO');
            }
            setDetalhesRecebimento(detalhe);
            setFeedbackMsg({
              tipo: 'sucesso',
              texto: `Valor ajustado para ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorCalc)} (${detalhe}).`,
            });
          }}
        />
      )}
    </div>
  );
};

