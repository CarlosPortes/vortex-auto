import React, { useState, useEffect, useRef } from 'react';
import {
  Store,
  ShoppingCart,
  Plus,
  Search,
  Printer,
  X,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  Barcode,
  Image as ImageIcon,
  Ban,
  TrendingUp,
} from 'lucide-react';
import { VendaBalcao, Produto } from '../types';
import { apiRequest } from '../api';

export const VendasBalcaoTab: React.FC = () => {
  const [vendas, setVendas] = useState<VendaBalcao[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('TODAS');

  // Modal Nova Venda Balcão
  const [modalNovaVenda, setModalNovaVenda] = useState(false);
  const [codigoScan, setCodigoScan] = useState('');
  const [clienteNome, setClienteNome] = useState('Consumidor Final');
  const [clienteDocumento, setClienteDocumento] = useState('');
  const [clienteTelefone, setClienteTelefone] = useState('');
  const [formaPagamento, setFormaPagamento] = useState<'PIX' | 'CARTAO_DEBITO' | 'CARTAO_CREDITO' | 'DINHEIRO'>('PIX');
  const [desconto, setDesconto] = useState(0);
  const [carrinho, setCarrinho] = useState<Array<{ produto: Produto; quantidade: number; precoUnitario: number }>>([]);
  const [finalizandoVenda, setFinalizandoVenda] = useState(false);

  // Modal Comprovante / Recibo
  const [vendaComprovante, setVendaComprovante] = useState<VendaBalcao | null>(null);

  // Modal Cancelamento
  const [vendaParaCancelar, setVendaParaCancelar] = useState<VendaBalcao | null>(null);
  const [motivoCancelamento, setMotivoCancelamento] = useState('');
  const [cancelando, setCancelando] = useState(false);

  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);
  const inputScanRef = useRef<HTMLInputElement>(null);

  const carregarVendas = async () => {
    setLoading(true);
    const res = await apiRequest<VendaBalcao[]>('/vendas-balcao');
    if (res.sucesso && res.dados) {
      setVendas(res.dados);
    }
    setLoading(false);
  };

  const carregarProdutos = async () => {
    const res = await apiRequest<Produto[]>('/produtos');
    if (res.sucesso && res.dados) {
      setProdutos(res.dados);
    }
  };

  useEffect(() => {
    carregarVendas();
    carregarProdutos();
  }, []);

  const tocarBeep = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {
      // Ignora erro de áudio
    }
  };

  const abrirNovaVenda = () => {
    setClienteNome('Consumidor Final');
    setClienteDocumento('');
    setClienteTelefone('');
    setFormaPagamento('PIX');
    setDesconto(0);
    setCarrinho([]);
    setCodigoScan('');
    setModalNovaVenda(true);
    setTimeout(() => inputScanRef.current?.focus(), 150);
  };

  const biparCodigo = async (e: React.FormEvent) => {
    e.preventDefault();
    const termo = codigoScan.trim();
    if (!termo) return;

    const res = await apiRequest<Produto>(`/produtos/scan/${encodeURIComponent(termo)}`);
    if (res.sucesso && res.dados) {
      tocarBeep();
      adicionarAoCarrinho(res.dados);
      setCodigoScan('');
    } else {
      alert(`Peça não localizada com o código '${termo}'`);
    }
    inputScanRef.current?.focus();
  };

  const adicionarAoCarrinho = (prod: Produto) => {
    const idx = carrinho.findIndex((c) => c.produto.id === prod.id);
    if (idx >= 0) {
      if (carrinho[idx].quantidade + 1 > prod.saldoFisico) {
        alert(`Saldo físico insuficiente para '${prod.descricao}'. Máximo disponível: ${prod.saldoFisico}`);
        return;
      }
      const novo = [...carrinho];
      novo[idx].quantidade += 1;
      setCarrinho(novo);
    } else {
      if (prod.saldoFisico < 1) {
        alert(`Produto '${prod.descricao}' sem estoque físico disponível!`);
        return;
      }
      setCarrinho([
        ...carrinho,
        {
          produto: prod,
          quantidade: 1,
          precoUnitario: prod.precoVenda || prod.precoCusto * 1.4,
        },
      ]);
    }
  };

  const alterarQtdCarrinho = (idx: number, delta: number) => {
    const item = carrinho[idx];
    const novaQtd = item.quantidade + delta;
    if (novaQtd <= 0) {
      setCarrinho(carrinho.filter((_, i) => i !== idx));
      return;
    }
    if (novaQtd > item.produto.saldoFisico) {
      alert(`Quantidade excede o saldo físico (${item.produto.saldoFisico} ${item.produto.unidadeMedida}).`);
      return;
    }
    const novo = [...carrinho];
    novo[idx].quantidade = novaQtd;
    setCarrinho(novo);
  };

  const alterarPrecoCarrinho = (idx: number, novoPreco: number) => {
    const novo = [...carrinho];
    novo[idx].precoUnitario = novoPreco;
    setCarrinho(novo);
  };

  const subtotalCarrinho = carrinho.reduce((acc, c) => acc + c.quantidade * c.precoUnitario, 0);
  const totalCarrinho = Math.max(0, subtotalCarrinho - (desconto || 0));

  const handleFinalizarVenda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (carrinho.length === 0) {
      alert('O carrinho está vazio.');
      return;
    }

    setFinalizandoVenda(true);
    setFeedback(null);

    const res = await apiRequest<{ vendaId: string; codigoVenda: string }>('/vendas-balcao', {
      method: 'POST',
      body: JSON.stringify({
        clienteNome: clienteNome.trim() || 'Consumidor Final',
        clienteDocumento: clienteDocumento.trim() || undefined,
        clienteTelefone: clienteTelefone.trim() || undefined,
        formaPagamento,
        desconto: Number(desconto),
        itens: carrinho.map((c) => ({
          produtoId: c.produto.id,
          quantidade: c.quantidade,
          precoUnitario: c.precoUnitario,
        })),
      }),
    });

    setFinalizandoVenda(false);
    if (res.sucesso && res.dados) {
      tocarBeep();
      setModalNovaVenda(false);
      setFeedback({
        tipo: 'sucesso',
        texto: `Venda ${res.dados.codigoVenda} finalizada com sucesso! Estoque baixado e valor recebido no caixa.`,
      });
      carregarVendas();
      carregarProdutos();

      // Abrir recibo da venda recém concluída
      const resVenda = await apiRequest<VendaBalcao>(`/vendas-balcao/${res.dados.vendaId}`);
      if (resVenda.sucesso && resVenda.dados) {
        setVendaComprovante(resVenda.dados);
      }
    } else {
      setFeedback({ tipo: 'erro', texto: res.mensagem || 'Falha ao processar venda balcão.' });
    }
  };

  const handleCancelarVenda = async () => {
    if (!vendaParaCancelar) return;
    setCancelando(true);
    const res = await apiRequest(`/vendas-balcao/${vendaParaCancelar.id}/cancelar`, {
      method: 'POST',
      body: JSON.stringify({ motivo: motivoCancelamento }),
    });
    setCancelando(false);
    if (res.sucesso) {
      setFeedback({ tipo: 'sucesso', texto: `Venda ${vendaParaCancelar.codigoVenda} cancelada e peças estornadas ao estoque!` });
      setVendaParaCancelar(null);
      setMotivoCancelamento('');
      carregarVendas();
      carregarProdutos();
    } else {
      alert(res.mensagem || 'Falha ao cancelar venda.');
    }
  };

  // KPIs
  const vendasConcluidas = vendas.filter((v) => v.status === 'CONCLUIDA');
  const faturamentoTotal = vendasConcluidas.reduce((acc, v) => acc + v.valorTotal, 0);
  const ticketMedio = vendasConcluidas.length > 0 ? faturamentoTotal / vendasConcluidas.length : 0;
  const totalPecasVendidas = vendasConcluidas.reduce(
    (acc, v) => acc + v.itens.reduce((sum, it) => sum + it.quantidade, 0),
    0
  );

  const vendasFiltradas = vendas.filter((v) => {
    if (filtroStatus !== 'TODAS' && v.status !== filtroStatus) return false;
    if (busca.trim()) {
      const b = busca.toLowerCase();
      const matchCod = v.codigoVenda.toLowerCase().includes(b);
      const matchCli = v.clienteNome.toLowerCase().includes(b);
      const matchDoc = (v.clienteDocumento || '').toLowerCase().includes(b);
      return matchCod || matchCli || matchDoc;
    }
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Feedback Banner */}
      {feedback && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: 'var(--radius-md)',
            background: feedback.tipo === 'sucesso' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${feedback.tipo === 'sucesso' ? 'var(--accent-green)' : '#f87171'}`,
            color: feedback.tipo === 'sucesso' ? '#34d399' : '#f87171',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.88rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {feedback.tipo === 'sucesso' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            {feedback.texto}
          </div>
          <button onClick={() => setFeedback(null)} style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
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
              color: 'var(--accent-green)',
            }}
          >
            <DollarSign size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Faturamento Balcão Realizado</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(faturamentoTotal)}
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'rgba(14, 165, 233, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)',
            }}
          >
            <Store size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Vendas de Peças Finalizadas</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>
              {vendasConcluidas.length} vendas
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'rgba(99, 102, 241, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#818cf8',
            }}
          >
            <TrendingUp size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ticket Médio Balcão</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(ticketMedio)}
            </div>
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
              color: '#fbbf24',
            }}
          >
            <ShoppingCart size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Peças / Itens Entregues</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>
              {totalPecasVendidas} unidades
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Botão Nova Venda */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: 1, minWidth: '280px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Buscar por código (#VB-...), cliente ou CPF..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                background: 'rgba(255,255,255,0.03)',
                color: 'var(--text)',
                fontSize: '0.85rem',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => setFiltroStatus('TODAS')}
              className={`btn ${filtroStatus === 'TODAS' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.78rem', padding: '6px 12px' }}
            >
              Todas ({vendas.length})
            </button>
            <button
              onClick={() => setFiltroStatus('CONCLUIDA')}
              className={`btn ${filtroStatus === 'CONCLUIDA' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.78rem', padding: '6px 12px' }}
            >
              Concluídas ({vendasConcluidas.length})
            </button>
            <button
              onClick={() => setFiltroStatus('CANCELADA')}
              className={`btn ${filtroStatus === 'CANCELADA' ? 'btn-danger' : 'btn-secondary'}`}
              style={{ fontSize: '0.78rem', padding: '6px 12px' }}
            >
              Canceladas ({vendas.filter((v) => v.status === 'CANCELADA').length})
            </button>
          </div>
        </div>

        <button
          onClick={abrirNovaVenda}
          className="btn btn-primary"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'linear-gradient(135deg, #10b981, #0ea5e9)',
            fontWeight: 800,
            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
          }}
        >
          <Plus size={17} /> Nova Venda Balcão (PDV)
        </button>
      </div>

      {/* Tabela de Vendas */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.02)' }}>
                <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-muted)' }}>CÓDIGO</th>
                <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-muted)' }}>DATA / HORA</th>
                <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-muted)' }}>CLIENTE</th>
                <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-muted)' }}>PAGAMENTO</th>
                <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-muted)' }}>ITENS</th>
                <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-muted)' }}>DESCONTO</th>
                <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-muted)' }}>VALOR FINAL</th>
                <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-muted)' }}>STATUS</th>
                <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-muted)' }}>VENDEDOR</th>
                <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'right' }}>AÇÕES</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Consultando histórico de vendas de balcão...
                  </td>
                </tr>
              ) : vendasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Nenhuma venda de balcão encontrada com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                vendasFiltradas.map((v) => (
                  <tr
                    key={v.id}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      background: v.status === 'CANCELADA' ? 'rgba(239, 68, 68, 0.04)' : 'transparent',
                    }}
                  >
                    <td style={{ padding: '12px 14px', fontWeight: 800, color: 'var(--primary)' }}>
                      {v.codigoVenda}
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>
                      {new Date(v.criadoEm).toLocaleString('pt-BR')}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 600 }}>{v.clienteNome}</div>
                      {v.clienteDocumento && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{v.clienteDocumento}</div>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span className="badge badge-purple" style={{ fontWeight: 700 }}>
                        {v.formaPagamento}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span className="badge badge-blue">{v.itens.length} {v.itens.length === 1 ? 'item' : 'itens'}</span>
                    </td>
                    <td style={{ padding: '12px 14px', color: v.desconto > 0 ? '#f87171' : 'var(--text-dim)' }}>
                      {v.desconto > 0 ? `- R$ ${v.desconto.toFixed(2)}` : 'R$ 0,00'}
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 800, color: 'var(--accent-green)', fontSize: '0.95rem' }}>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v.valorTotal)}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {v.status === 'CONCLUIDA' ? (
                        <span className="badge badge-green">PAGO / CONCLUÍDO</span>
                      ) : (
                        <span className="badge badge-red">CANCELADO</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                      {v.usuario?.nome || '—'}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                        <button
                          onClick={() => setVendaComprovante(v)}
                          className="btn btn-secondary"
                          style={{ fontSize: '0.75rem', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                          title="Visualizar Comprovante / Recibo"
                        >
                          <Printer size={13} /> Recibo
                        </button>
                        {v.status === 'CONCLUIDA' && (
                          <button
                            onClick={() => setVendaParaCancelar(v)}
                            className="btn btn-secondary"
                            style={{ fontSize: '0.75rem', padding: '4px 8px', color: '#f87171' }}
                            title="Cancelar Venda e Estornar Peças"
                          >
                            <Ban size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* -------------------- MODAL DE NOVA VENDA BALCÃO -------------------- */}
      {modalNovaVenda && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
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
              width: '100%',
              maxWidth: '960px',
              maxHeight: '94vh',
              overflowY: 'auto',
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #10b981, #0ea5e9)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                  }}
                >
                  <Store size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Ponto de Venda de Peças (Balcão Express)</h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Bipe ou selecione as peças, confirme o pagamento e emita o comprovante na hora.
                  </p>
                </div>
              </div>
              <button onClick={() => setModalNovaVenda(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {/* Leitor de Código de Barras / SKU */}
            <form onSubmit={biparCodigo} style={{ marginBottom: '18px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Barcode size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)' }} />
                  <input
                    ref={inputScanRef}
                    type="text"
                    placeholder="Bipe o código de barras da peça (EAN-13) ou digite o SKU..."
                    value={codigoScan}
                    onChange={(e) => setCodigoScan(e.target.value)}
                    className="input-field"
                    style={{ paddingLeft: '38px', fontSize: '0.95rem' }}
                  />
                </div>
                <button type="submit" className="btn btn-primary" style={{ padding: '0 18px', fontWeight: 700 }}>
                  Adicionar
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Ou selecione pelo catálogo:</span>
                <select
                  onChange={(e) => {
                    const p = produtos.find((prod) => prod.id === e.target.value);
                    if (p) {
                      tocarBeep();
                      adicionarAoCarrinho(p);
                    }
                    e.target.value = '';
                  }}
                  className="input-field"
                  style={{ fontSize: '0.8rem', padding: '5px 8px', flex: 1 }}
                  defaultValue=""
                >
                  <option value="" disabled>-- Selecionar peça do estoque para adicionar --</option>
                  {produtos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.codigo} — {p.descricao} (Estoque: {p.saldoFisico} {p.unidadeMedida} • R$ {p.precoVenda.toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>
            </form>

            <form onSubmit={handleFinalizarVenda} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                <div>
                  <label className="input-label">Nome do Cliente</label>
                  <input
                    type="text"
                    required
                    value={clienteNome}
                    onChange={(e) => setClienteNome(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="input-label">CPF / CNPJ (Opcional)</label>
                  <input
                    type="text"
                    placeholder="000.000.000-00"
                    value={clienteDocumento}
                    onChange={(e) => setClienteDocumento(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="input-label">Forma de Pagamento *</label>
                  <select
                    value={formaPagamento}
                    onChange={(e) => setFormaPagamento(e.target.value as any)}
                    className="input-field"
                  >
                    <option value="PIX">PIX (Quitação Instantânea)</option>
                    <option value="CARTAO_DEBITO">Cartão de Débito</option>
                    <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                    <option value="DINHEIRO">Dinheiro em Espécie</option>
                  </select>
                </div>
              </div>

              {/* Tabela do Carrinho */}
              <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '16px', background: 'rgba(15, 23, 42, 0.4)' }}>
                <h4 style={{ fontSize: '0.92rem', fontWeight: 700, marginBottom: '12px' }}>
                  Itens Selecionados ({carrinho.length})
                </h4>

                {carrinho.length === 0 ? (
                  <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                    <ShoppingCart size={32} style={{ marginBottom: '8px' }} />
                    <div>Nenhum item adicionado à venda. Bipe uma peça acima para começar.</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {carrinho.map((item, idx) => (
                      <div
                        key={item.produto.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: 'rgba(255, 255, 255, 0.02)',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: '42px',
                              height: '42px',
                              borderRadius: '6px',
                              background: '#000',
                              overflow: 'hidden',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {item.produto.fotoUrl ? (
                              <img src={item.produto.fotoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <ImageIcon size={18} color="var(--text-dim)" />
                            )}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{item.produto.descricao}</div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                              SKU: {item.produto.codigo} • Estoque: {item.produto.saldoFisico} {item.produto.unidadeMedida}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          {/* Quantidade */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => alterarQtdCarrinho(idx, -1)}
                              className="btn btn-secondary"
                              style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                            >
                              -
                            </button>
                            <span style={{ minWidth: '24px', textAlign: 'center', fontWeight: 700 }}>
                              {item.quantidade}
                            </span>
                            <button
                              type="button"
                              onClick={() => alterarQtdCarrinho(idx, 1)}
                              className="btn btn-secondary"
                              style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                            >
                              +
                            </button>
                          </div>

                          {/* Preço Unitário */}
                          <div style={{ width: '100px' }}>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.precoUnitario}
                              onChange={(e) => alterarPrecoCarrinho(idx, Number(e.target.value))}
                              className="input-field"
                              style={{ fontSize: '0.82rem', padding: '4px 6px', textAlign: 'right' }}
                            />
                          </div>

                          {/* Subtotal */}
                          <div style={{ minWidth: '90px', textAlign: 'right', fontWeight: 800, color: 'var(--accent-green)' }}>
                            R$ {(item.quantidade * item.precoUnitario).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Totais do Carrinho */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '20px', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Desconto (R$):</label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={desconto}
                      onChange={(e) => setDesconto(Number(e.target.value))}
                      className="input-field"
                      style={{ width: '90px', padding: '4px 8px', fontSize: '0.85rem' }}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Total a Pagar:</span>
                    <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-green)' }}>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalCarrinho)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Botões do Rodapé */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setModalNovaVenda(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={finalizandoVenda || carrinho.length === 0}
                  className="btn btn-primary"
                  style={{
                    fontWeight: 800,
                    padding: '10px 24px',
                    background: 'linear-gradient(135deg, #10b981, #0ea5e9)',
                  }}
                >
                  <CheckCircle2 size={16} /> {finalizandoVenda ? 'Concluindo Venda...' : 'Finalizar Venda & Emitir Recibo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------- MODAL DO COMPROVANTE DE VENDA BALCÃO -------------------- */}
      {vendaComprovante && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
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
              width: '100%',
              maxWidth: '680px',
              maxHeight: '92vh',
              overflowY: 'auto',
              borderRadius: 'var(--radius-lg)',
              padding: '28px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              background: '#0f172a',
            }}
          >
            {/* Cabeçalho do Recibo */}
            <div style={{ textAlign: 'center', borderBottom: '2px dashed var(--border-subtle)', paddingBottom: '16px', marginBottom: '16px' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--primary)' }}>
                VORTEX AUTO • CENTRO AUTOMOTIVO
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                CNPJ: 12.345.678/0001-90 • Telefone: (11) 98765-4321 • São Paulo - SP
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: '10px' }}>
                COMPROVANTE DE VENDA BALCÃO #{vendaComprovante.codigoVenda}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                Data de Emissão: {new Date(vendaComprovante.criadoEm).toLocaleString('pt-BR')} • Vendedor: {vendaComprovante.usuario?.nome}
              </div>
            </div>

            {/* Dados do Cliente */}
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '10px 14px', borderRadius: '6px', marginBottom: '16px', fontSize: '0.82rem' }}>
              <div><strong>Cliente:</strong> {vendaComprovante.clienteNome}</div>
              {vendaComprovante.clienteDocumento && (
                <div><strong>CPF/CNPJ:</strong> {vendaComprovante.clienteDocumento}</div>
              )}
              <div><strong>Forma de Pagamento:</strong> {vendaComprovante.formaPagamento}</div>
            </div>

            {/* Tabela de Itens */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', marginBottom: '16px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '8px 0', textAlign: 'left' }}>Item / Descrição</th>
                  <th style={{ padding: '8px 0', textAlign: 'center' }}>Qtd</th>
                  <th style={{ padding: '8px 0', textAlign: 'right' }}>Unitário</th>
                  <th style={{ padding: '8px 0', textAlign: 'right' }}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {vendaComprovante.itens.map((it) => (
                  <tr key={it.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '8px 0' }}>
                      <div style={{ fontWeight: 600 }}>{it.produto.descricao}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>SKU: {it.produto.codigo}</div>
                    </td>
                    <td style={{ padding: '8px 0', textAlign: 'center' }}>
                      {it.quantidade} {it.produto.unidadeMedida}
                    </td>
                    <td style={{ padding: '8px 0', textAlign: 'right' }}>
                      R$ {it.precoUnitario.toFixed(2)}
                    </td>
                    <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 700 }}>
                      R$ {it.subtotal.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totais */}
            <div style={{ borderTop: '2px dashed var(--border-subtle)', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.88rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Subtotal:</span>
                <span>R$ {vendaComprovante.subtotal.toFixed(2)}</span>
              </div>
              {vendaComprovante.desconto > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f87171' }}>
                  <span>Desconto:</span>
                  <span>- R$ {vendaComprovante.desconto.toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-green)', marginTop: '4px' }}>
                <span>TOTAL PAGO:</span>
                <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(vendaComprovante.valorTotal)}</span>
              </div>
            </div>

            {/* Rodapé Legal */}
            <div style={{ textAlign: 'center', marginTop: '20px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
              Peças de reposição automotiva possuem garantia legal de 90 dias contra defeitos de fabricação (Art. 26 do CDC).
              <br />Apresente este comprovante para eventuais trocas ou suporte.
            </div>

            {/* Ações */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => setVendaComprovante(null)} className="btn btn-secondary">
                Fechar
              </button>
              <button
                onClick={() => window.print()}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
              >
                <Printer size={16} /> Imprimir Comprovante
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- MODAL DE CANCELAMENTO -------------------- */}
      {vendaParaCancelar && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
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
              width: '100%',
              maxWidth: '520px',
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
              border: '1px solid rgba(239, 68, 68, 0.3)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#f87171',
                }}
              >
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Cancelar Venda {vendaParaCancelar.codigoVenda}</h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  As peças vendidas retornarão automaticamente ao saldo físico do estoque.
                </p>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label className="input-label">Motivo do Cancelamento</label>
              <textarea
                rows={3}
                placeholder="Ex: Desistência do cliente ou troca de mercadoria..."
                value={motivoCancelamento}
                onChange={(e) => setMotivoCancelamento(e.target.value)}
                className="input-field"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setVendaParaCancelar(null)} className="btn btn-secondary">
                Voltar
              </button>
              <button
                onClick={handleCancelarVenda}
                disabled={cancelando}
                className="btn btn-danger"
                style={{ fontWeight: 700 }}
              >
                {cancelando ? 'Estornando...' : 'Confirmar Cancelamento e Estornar Peças'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
