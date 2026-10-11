import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Scan,
  Barcode,
  Wrench,
  ShoppingCart,
  ArrowDownCircle,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  Image as ImageIcon,
} from 'lucide-react';
import { Produto, OrdemServico } from '../types';
import { apiRequest } from '../api';

interface TerminalWMSModalProps {
  onClose: () => void;
  onEstoqueAtualizado: () => void;
}

interface ItemCarrinhoBalcao {
  produto: Produto;
  quantidade: number;
  valorUnitario: number;
}

export const TerminalWMSModal: React.FC<TerminalWMSModalProps> = ({
  onClose,
  onEstoqueAtualizado,
}) => {
  const [modoWMS, setModoWMS] = useState<'ENTRADA' | 'OS' | 'VENDA_BALCAO'>('ENTRADA');
  const [codigoInput, setCodigoInput] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [produtoEscaneado, setProdutoEscaneado] = useState<Produto | null>(null);
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  const inputScanRef = useRef<HTMLInputElement>(null);

  // Estados Modo 1: ENTRADA DE COMPRAS
  const [entradaQtd, setEntradaQtd] = useState(1);
  const [entradaCusto, setEntradaCusto] = useState<number | ''>('');
  const [entradaDocRef, setEntradaDocRef] = useState('');
  const [salvandoEntrada, setSalvandoEntrada] = useState(false);

  // Estados Modo 2: BAIXA PARA ORDEM DE SERVIÇO
  const [ordensAtivas, setOrdensAtivas] = useState<OrdemServico[]>([]);
  const [osSelecionadaId, setOsSelecionadaId] = useState<string>('');
  const [baixaQtd, setBaixaQtd] = useState(1);
  const [salvandoBaixaOS, setSalvandoBaixaOS] = useState(false);

  // Estados Modo 3: VENDA DIRETA BALCÃO
  const [carrinho, setCarrinho] = useState<ItemCarrinhoBalcao[]>([]);
  const [formaPagamento, setFormaPagamento] = useState<'PIX' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO' | 'DINHEIRO'>('PIX');
  const [clienteBalcao, setClienteBalcao] = useState('Consumidor Final');
  const [finalizandoVenda, setFinalizandoVenda] = useState(false);
  const [vendaConcluida, setVendaConcluida] = useState<{ codigo: string; total: number } | null>(null);

  // Foco automático no leitor ao abrir e ao trocar de aba
  useEffect(() => {
    inputScanRef.current?.focus();
  }, [modoWMS]);

  // Carregar lista de Ordens de Serviço quando no modo OS
  useEffect(() => {
    if (modoWMS === 'OS') {
      apiRequest<OrdemServico[]>('/os').then((res) => {
        if (res.sucesso && res.dados) {
          const ativas = res.dados.filter((o) => o.status !== 'CONCLUIDA' && o.status !== 'CANCELADA');
          setOrdensAtivas(ativas);
          if (ativas.length > 0 && !osSelecionadaId) {
            setOsSelecionadaId(ativas[0].id);
          }
        }
      });
    }
  }, [modoWMS]);

  const tocarBeep = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // nota Lá 880Hz
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {
      // Ignora se o navegador bloquear autoplay de áudio
    }
  };

  const buscarPorCodigo = async (codigoParaBuscar?: string) => {
    const cod = (codigoParaBuscar || codigoInput).trim();
    if (!cod) return;

    setBuscando(true);
    setFeedback(null);

    // Se no modo OS o usuário bipou um código de OS (ex: OS-2026-0001)
    if (modoWMS === 'OS' && cod.toUpperCase().startsWith('OS-')) {
      const osEncontrada = ordensAtivas.find((o) => o.codigoFormatado.toUpperCase() === cod.toUpperCase());
      if (osEncontrada) {
        setOsSelecionadaId(osEncontrada.id);
        tocarBeep();
        setFeedback({ tipo: 'sucesso', texto: `Ordem de Serviço ${osEncontrada.codigoFormatado} identificada!` });
        setCodigoInput('');
        setBuscando(false);
        return;
      }
    }

    const res = await apiRequest<Produto>(`/produtos/scan/${encodeURIComponent(cod)}`);
    setBuscando(false);

    if (res.sucesso && res.dados) {
      tocarBeep();
      const prod = res.dados;
      setProdutoEscaneado(prod);
      setEntradaCusto(prod.precoCusto);

      if (modoWMS === 'VENDA_BALCAO') {
        // No modo venda balcão, adiciona direto ao carrinho
        adicionarAoCarrinho(prod);
        setFeedback({ tipo: 'sucesso', texto: `${prod.descricao} adicionado à venda balcão!` });
      } else {
        setFeedback({ tipo: 'sucesso', texto: `Peça identificada: ${prod.descricao}` });
      }

      setCodigoInput('');
      inputScanRef.current?.focus();
    } else {
      setFeedback({ tipo: 'erro', texto: res.mensagem || `Código '${cod}' não localizado no catálogo.` });
    }
  };

  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    buscarPorCodigo();
  };

  // --- MODO 1: CONFIRMAR ENTRADA WMS ---
  const handleConfirmarEntrada = async () => {
    if (!produtoEscaneado) return;
    setSalvandoEntrada(true);
    setFeedback(null);

    const res = await apiRequest('/produtos/wms/entrada', {
      method: 'POST',
      body: JSON.stringify({
        produtoId: produtoEscaneado.id,
        quantidade: Number(entradaQtd),
        precoCusto: entradaCusto !== '' ? Number(entradaCusto) : undefined,
        documentoRef: entradaDocRef.trim() || undefined,
      }),
    });

    setSalvandoEntrada(false);
    if (res.sucesso) {
      tocarBeep();
      setFeedback({ tipo: 'sucesso', texto: res.mensagem || 'Entrada de compras processada com sucesso!' });
      setProdutoEscaneado(null);
      setEntradaQtd(1);
      setEntradaDocRef('');
      onEstoqueAtualizado();
      inputScanRef.current?.focus();
    } else {
      setFeedback({ tipo: 'erro', texto: res.mensagem || 'Falha ao processar entrada no WMS.' });
    }
  };

  // --- MODO 2: CONFIRMAR BAIXA PARA OS ---
  const handleConfirmarBaixaOS = async () => {
    if (!produtoEscaneado || !osSelecionadaId) {
      setFeedback({ tipo: 'erro', texto: 'Selecione uma Ordem de Serviço e bipe a peça a ser entregue.' });
      return;
    }
    setSalvandoBaixaOS(true);
    setFeedback(null);

    const res = await apiRequest('/produtos/wms/baixa-os', {
      method: 'POST',
      body: JSON.stringify({
        ordemServicoId: osSelecionadaId,
        produtoId: produtoEscaneado.id,
        quantidade: Number(baixaQtd),
      }),
    });

    setSalvandoBaixaOS(false);
    if (res.sucesso) {
      tocarBeep();
      setFeedback({ tipo: 'sucesso', texto: res.mensagem || 'Baixa de peça para a OS processada com sucesso!' });
      setProdutoEscaneado(null);
      setBaixaQtd(1);
      onEstoqueAtualizado();
      inputScanRef.current?.focus();
    } else {
      setFeedback({ tipo: 'erro', texto: res.mensagem || 'Falha ao baixar peça para a OS.' });
    }
  };

  // --- MODO 3: CARRINHO VENDA BALCÃO ---
  const adicionarAoCarrinho = (prod: Produto) => {
    setCarrinho((prev) => {
      const idx = prev.findIndex((item) => item.produto.id === prod.id);
      if (idx >= 0) {
        const novo = [...prev];
        novo[idx].quantidade += 1;
        return novo;
      }
      return [...prev, { produto: prod, quantidade: 1, valorUnitario: prod.precoVenda }];
    });
  };

  const alterarQtdCarrinho = (index: number, delta: number) => {
    setCarrinho((prev) => {
      const novo = [...prev];
      const novaQtd = novo[index].quantidade + delta;
      if (novaQtd <= 0) {
        return novo.filter((_, i) => i !== index);
      }
      novo[index].quantidade = novaQtd;
      return novo;
    });
  };

  const removerDoCarrinho = (index: number) => {
    setCarrinho((prev) => prev.filter((_, i) => i !== index));
  };

  const totalVendaBalcao = carrinho.reduce((acc, item) => acc + item.quantidade * item.valorUnitario, 0);

  const handleFinalizarVendaBalcao = async () => {
    if (carrinho.length === 0) return;
    setFinalizandoVenda(true);
    setFeedback(null);

    const res = await apiRequest<{ codigoVenda: string; valorTotal: number }>('/produtos/wms/venda-balcao', {
      method: 'POST',
      body: JSON.stringify({
        itens: carrinho.map((c) => ({
          produtoId: c.produto.id,
          quantidade: c.quantidade,
          valorUnitario: c.valorUnitario,
        })),
        formaPagamento,
        clienteNome: clienteBalcao.trim() || 'Consumidor Final',
      }),
    });

    setFinalizandoVenda(false);
    if (res.sucesso && res.dados) {
      tocarBeep();
      setVendaConcluida({
        codigo: res.dados.codigoVenda,
        total: res.dados.valorTotal,
      });
      setCarrinho([]);
      onEstoqueAtualizado();
    } else {
      setFeedback({ tipo: 'erro', texto: res.mensagem || 'Falha ao processar venda balcão.' });
    }
  };

  return (
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
          maxWidth: '1000px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
        }}
      >
        {/* Top Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(15, 23, 42, 0.8)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 4px 12px rgba(14, 165, 233, 0.35)',
              }}
            >
              <Scan size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
                Terminal WMS & Bipagem de Peças
              </h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Entrada rápida por leitor de código de barras, separação para OS e venda balcão.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Seletor de Modo WMS */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'rgba(15, 23, 42, 0.5)',
            padding: '8px 24px',
            gap: '10px',
          }}
        >
          <button
            onClick={() => {
              setModoWMS('ENTRADA');
              setProdutoEscaneado(null);
            }}
            className={`btn ${modoWMS === 'ENTRADA' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.82rem', padding: '8px 16px', gap: '8px' }}
          >
            <ArrowDownCircle size={16} /> 1. Entrada de Compras (Recebimento)
          </button>
          <button
            onClick={() => {
              setModoWMS('OS');
              setProdutoEscaneado(null);
            }}
            className={`btn ${modoWMS === 'OS' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.82rem', padding: '8px 16px', gap: '8px' }}
          >
            <Wrench size={16} /> 2. Separação / Baixa para OS
          </button>
          <button
            onClick={() => {
              setModoWMS('VENDA_BALCAO');
              setProdutoEscaneado(null);
            }}
            className={`btn ${modoWMS === 'VENDA_BALCAO' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.82rem', padding: '8px 16px', gap: '8px' }}
          >
            <ShoppingCart size={16} /> 3. Venda Direta no Balcão
          </button>
        </div>

        {/* Barra Central de Escaneamento (Bipagem Rápida) */}
        <div style={{ padding: '16px 24px', background: 'rgba(0, 0, 0, 0.25)', borderBottom: '1px solid var(--border-subtle)' }}>
          <form onSubmit={handleScanSubmit} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Barcode
                size={22}
                color="var(--primary)"
                style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                ref={inputScanRef}
                type="text"
                placeholder={
                  modoWMS === 'OS'
                    ? 'Aponte o leitor no código de barras da peça ou bipe a OS (ex: OS-2026-0001)...'
                    : 'Aponte o leitor de código de barras ou digite o código/EAN da peça e pressione Enter...'
                }
                value={codigoInput}
                onChange={(e) => setCodigoInput(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 46px',
                  borderRadius: 'var(--radius-sm)',
                  border: '2px solid var(--primary)',
                  background: 'rgba(15, 23, 42, 0.9)',
                  color: '#ffffff',
                  fontSize: '0.96rem',
                  fontWeight: 600,
                  outline: 'none',
                  boxShadow: '0 0 16px rgba(14, 165, 233, 0.2)',
                }}
              />
            </div>
            <button type="submit" disabled={buscando} className="btn btn-primary" style={{ height: '48px', padding: '0 20px' }}>
              <Scan size={18} /> {buscando ? 'Buscando...' : 'Bipar / Buscar'}
            </button>
          </form>

          {/* Feedback Toast */}
          {feedback && (
            <div
              style={{
                marginTop: '10px',
                padding: '8px 14px',
                borderRadius: '6px',
                background: feedback.tipo === 'sucesso' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                border: `1px solid ${feedback.tipo === 'sucesso' ? '#10b981' : '#ef4444'}`,
                color: feedback.tipo === 'sucesso' ? '#34d399' : '#f87171',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {feedback.tipo === 'sucesso' ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
              {feedback.texto}
            </div>
          )}
        </div>

        {/* Conteúdo Dinâmico por Modo */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* ---------------- MODO 1: ENTRADA DE COMPRAS ---------------- */}
          {modoWMS === 'ENTRADA' && (
            <div style={{ display: 'grid', gridTemplateColumns: produtoEscaneado ? '380px 1fr' : '1fr', gap: '20px' }}>
              {produtoEscaneado ? (
                <>
                  {/* Card do Produto com Foto */}
                  <div
                    style={{
                      background: 'rgba(30, 41, 59, 0.6)',
                      borderRadius: 'var(--radius-md)',
                      padding: '18px',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px',
                    }}
                  >
                    {/* Foto da Peça */}
                    <div
                      style={{
                        width: '100%',
                        height: '200px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(15, 23, 42, 0.8)',
                        border: '1px solid var(--border-subtle)',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                      }}
                    >
                      {produtoEscaneado.fotoUrl ? (
                        <img
                          src={produtoEscaneado.fotoUrl}
                          alt={produtoEscaneado.descricao}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <div style={{ textAlign: 'center', color: 'var(--text-dim)' }}>
                          <ImageIcon size={44} style={{ marginBottom: '6px' }} />
                          <div style={{ fontSize: '0.75rem' }}>Sem foto cadastrada</div>
                        </div>
                      )}
                      {produtoEscaneado.codigoBarras && (
                        <span
                          style={{
                            position: 'absolute',
                            bottom: '8px',
                            right: '8px',
                            background: 'rgba(0, 0, 0, 0.75)',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '0.72rem',
                            fontFamily: 'monospace',
                            color: '#e0f2fe',
                            border: '1px solid rgba(255,255,255,0.2)',
                          }}
                        >
                          EAN: {produtoEscaneado.codigoBarras}
                        </span>
                      )}
                    </div>

                    <div>
                      <span className="badge badge-blue" style={{ marginBottom: '6px' }}>
                        {produtoEscaneado.codigo}
                      </span>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>{produtoEscaneado.descricao}</h3>
                      {produtoEscaneado.localizacao && (
                        <div style={{ fontSize: '0.76rem', color: '#38bdf8', marginTop: '4px' }}>
                          📍 Local: {produtoEscaneado.localizacao}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.8rem' }}>
                      <div style={{ background: 'rgba(255,255,255,0.03)', padding: '8px', borderRadius: '6px' }}>
                        <div style={{ color: 'var(--text-dim)', fontSize: '0.7rem' }}>Saldo Físico Atual</div>
                        <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>
                          {produtoEscaneado.saldoFisico} {produtoEscaneado.unidadeMedida}
                        </div>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.03)', padding: '8px', borderRadius: '6px' }}>
                        <div style={{ color: 'var(--text-dim)', fontSize: '0.7rem' }}>Preço Custo Atual</div>
                        <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>
                          R$ {produtoEscaneado.precoCusto.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Formulário de Confirmação de Entrada */}
                  <div
                    style={{
                      background: 'rgba(30, 41, 59, 0.4)',
                      borderRadius: 'var(--radius-md)',
                      padding: '24px',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <h4 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Confirmar Recebimento de Mercadoria</h4>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                        <div>
                          <label className="input-label">Quantidade Recebida ({produtoEscaneado.unidadeMedida}) *</label>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={entradaQtd}
                            onChange={(e) => setEntradaQtd(Number(e.target.value))}
                            className="input-field"
                            style={{ fontSize: '1.1rem', fontWeight: 700 }}
                          />
                        </div>
                        <div>
                          <label className="input-label">Novo Preço de Custo Unitário (R$)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={entradaCusto}
                            onChange={(e) => setEntradaCusto(e.target.value === '' ? '' : Number(e.target.value))}
                            className="input-field"
                            style={{ fontSize: '1.1rem', fontWeight: 700 }}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="input-label">Documento de Origem / Número da NF-e (Opcional)</label>
                        <input
                          type="text"
                          placeholder="Ex: NF-e 04892 - Distribuidora Pellegrino"
                          value={entradaDocRef}
                          onChange={(e) => setEntradaDocRef(e.target.value)}
                          className="input-field"
                        />
                      </div>

                      <div style={{ background: 'rgba(14, 165, 233, 0.08)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(14, 165, 233, 0.2)' }}>
                        <div style={{ fontSize: '0.8rem', color: '#e0f2fe' }}>
                          <strong>Resultado da Entrada:</strong> O saldo físico passará de{' '}
                          <strong>{produtoEscaneado.saldoFisico}</strong> para{' '}
                          <strong style={{ color: '#34d399' }}>{produtoEscaneado.saldoFisico + entradaQtd} {produtoEscaneado.unidadeMedida}</strong>.
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                      <button
                        onClick={() => setProdutoEscaneado(null)}
                        className="btn btn-secondary"
                        style={{ flex: 1 }}
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleConfirmarEntrada}
                        disabled={salvandoEntrada || entradaQtd <= 0}
                        className="btn btn-primary"
                        style={{ flex: 2, padding: '12px', fontWeight: 700 }}
                      >
                        <CheckCircle2 size={18} /> {salvandoEntrada ? 'Gravando Entrada...' : 'Confirmar Entrada no Estoque'}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div
                  style={{
                    padding: '60px 20px',
                    textAlign: 'center',
                    border: '2px dashed rgba(255, 255, 255, 0.1)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-muted)',
                  }}
                >
                  <Barcode size={48} color="var(--primary)" style={{ marginBottom: '14px' }} />
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    Aguardando Leitura de Código de Barras
                  </h3>
                  <p style={{ fontSize: '0.84rem', marginTop: '4px' }}>
                    Aponte o leitor físico na etiqueta da caixa ou digite o código da peça acima para dar entrada de compras.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ---------------- MODO 2: BAIXA PARA ORDEM DE SERVIÇO ---------------- */}
          {modoWMS === 'OS' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Seleção / Bipagem da OS */}
              <div
                style={{
                  background: 'rgba(30, 41, 59, 0.5)',
                  padding: '16px 20px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                    Ordem de Serviço de Destino (Box):
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#38bdf8', marginTop: '2px' }}>
                    {ordensAtivas.find((o) => o.id === osSelecionadaId)?.codigoFormatado || 'Nenhuma OS selecionada'}
                  </div>
                  {ordensAtivas.find((o) => o.id === osSelecionadaId) && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Veículo: {ordensAtivas.find((o) => o.id === osSelecionadaId)?.atendimento.veiculo.modelo} (
                      {ordensAtivas.find((o) => o.id === osSelecionadaId)?.atendimento.veiculo.placa}) • Cliente:{' '}
                      {ordensAtivas.find((o) => o.id === osSelecionadaId)?.atendimento.cliente.nomeRazao}
                    </div>
                  )}
                </div>

                <div style={{ minWidth: '280px' }}>
                  <label className="input-label">Selecione ou mude a OS ativa:</label>
                  <select
                    value={osSelecionadaId}
                    onChange={(e) => setOsSelecionadaId(e.target.value)}
                    className="input-field"
                    style={{ fontSize: '0.85rem' }}
                  >
                    {ordensAtivas.map((os) => (
                      <option key={os.id} value={os.id}>
                        {os.codigoFormatado} - {os.atendimento.veiculo.modelo} ({os.atendimento.veiculo.placa})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Peça a Baixar */}
              {produtoEscaneado ? (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '360px 1fr',
                    gap: '20px',
                    background: 'rgba(30, 41, 59, 0.4)',
                    padding: '20px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  {/* Foto e Detalhes */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div
                      style={{
                        width: '100%',
                        height: '180px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(15, 23, 42, 0.8)',
                        border: '1px solid var(--border-subtle)',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {produtoEscaneado.fotoUrl ? (
                        <img
                          src={produtoEscaneado.fotoUrl}
                          alt={produtoEscaneado.descricao}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <ImageIcon size={40} color="var(--text-dim)" />
                      )}
                    </div>
                    <h4 style={{ fontSize: '1rem', fontWeight: 800 }}>{produtoEscaneado.descricao}</h4>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Código: {produtoEscaneado.codigo} • Saldo Disponível: <strong>{produtoEscaneado.saldoDisponivel} {produtoEscaneado.unidadeMedida}</strong>
                    </span>
                  </div>

                  {/* Confirmação de Entrega ao Mecânico */}
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '14px' }}>
                        Requisição de Material para o Box
                      </h4>
                      <div>
                        <label className="input-label">Quantidade Entregue ({produtoEscaneado.unidadeMedida}) *</label>
                        <input
                          type="number"
                          min="1"
                          max={produtoEscaneado.saldoDisponivel}
                          value={baixaQtd}
                          onChange={(e) => setBaixaQtd(Number(e.target.value))}
                          className="input-field"
                          style={{ width: '180px', fontSize: '1.1rem', fontWeight: 700 }}
                        />
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '12px' }}>
                        Esta ação realiza a baixa física imediata do almoxarifado e vincula o consumo da peça à Ordem de Serviço selecionada.
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                      <button onClick={() => setProdutoEscaneado(null)} className="btn btn-secondary">
                        Cancelar
                      </button>
                      <button
                        onClick={handleConfirmarBaixaOS}
                        disabled={salvandoBaixaOS || baixaQtd <= 0 || baixaQtd > produtoEscaneado.saldoFisico}
                        className="btn btn-primary"
                        style={{ padding: '10px 24px', fontWeight: 700 }}
                      >
                        <CheckCircle2 size={16} /> {salvandoBaixaOS ? 'Gravando Baixa...' : 'Confirmar Saída para a OS'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    padding: '50px 20px',
                    textAlign: 'center',
                    border: '2px dashed rgba(255, 255, 255, 0.1)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-muted)',
                  }}
                >
                  <Wrench size={42} color="#38bdf8" style={{ marginBottom: '12px' }} />
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    Bipe a peça que está sendo retirada para o Box
                  </h3>
                  <p style={{ fontSize: '0.82rem', marginTop: '4px' }}>
                    Aponte o leitor na peça para registrar a saída associada à OS selecionada.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ---------------- MODO 3: VENDA DIRETA NO BALCÃO ---------------- */}
          {modoWMS === 'VENDA_BALCAO' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px' }}>
              {/* Tabela do Carrinho Balcão */}
              <div
                style={{
                  background: 'rgba(30, 41, 59, 0.5)',
                  borderRadius: 'var(--radius-md)',
                  padding: '18px',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>Itens da Venda Balcão ({carrinho.length})</h4>
                  {carrinho.length > 0 && (
                    <button
                      onClick={() => setCarrinho([])}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.74rem', padding: '4px 8px' }}
                    >
                      Limpar Carrinho
                    </button>
                  )}
                </div>

                {carrinho.length === 0 ? (
                  <div
                    style={{
                      padding: '40px 10px',
                      textAlign: 'center',
                      color: 'var(--text-dim)',
                      fontSize: '0.85rem',
                      border: '1px dashed rgba(255, 255, 255, 0.08)',
                      borderRadius: '6px',
                    }}
                  >
                    <ShoppingCart size={32} style={{ marginBottom: '8px' }} />
                    <div>Nenhum item adicionado à venda.</div>
                    <div style={{ fontSize: '0.75rem', marginTop: '4px' }}>
                      Bipe as peças acima para adicionar diretamente ao carrinho.
                    </div>
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
                          background: 'rgba(15, 23, 42, 0.6)',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          {/* Miniatura da Foto */}
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
                              Unit: R$ {item.valorUnitario.toFixed(2)} • Estoque: {item.produto.saldoFisico} {item.produto.unidadeMedida}
                            </div>
                          </div>
                        </div>

                        {/* Quantidade e Subtotal */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button
                              onClick={() => alterarQtdCarrinho(idx, -1)}
                              className="btn btn-secondary"
                              style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                            >
                              <Minus size={12} />
                            </button>
                            <span style={{ fontWeight: 800, minWidth: '24px', textAlign: 'center', fontSize: '0.9rem' }}>
                              {item.quantidade}
                            </span>
                            <button
                              onClick={() => alterarQtdCarrinho(idx, 1)}
                              className="btn btn-secondary"
                              style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                            >
                              <Plus size={12} />
                            </button>
                          </div>

                          <span style={{ fontWeight: 800, fontSize: '0.95rem', minWidth: '80px', textAlign: 'right' }}>
                            R$ {(item.quantidade * item.valorUnitario).toFixed(2)}
                          </span>

                          <button
                            onClick={() => removerDoCarrinho(idx)}
                            style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: '4px' }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Painel de Pagamento e Finalização */}
              <div
                style={{
                  background: 'rgba(30, 41, 59, 0.6)',
                  borderRadius: 'var(--radius-md)',
                  padding: '20px',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '16px',
                }}
              >
                <div>
                  <h4 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '14px' }}>Fechamento da Venda</h4>

                  <div style={{ marginBottom: '12px' }}>
                    <label className="input-label">Nome do Cliente / Consumidor</label>
                    <input
                      type="text"
                      value={clienteBalcao}
                      onChange={(e) => setClienteBalcao(e.target.value)}
                      className="input-field"
                    />
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label className="input-label">Forma de Pagamento *</label>
                    <select
                      value={formaPagamento}
                      onChange={(e) => setFormaPagamento(e.target.value as any)}
                      className="input-field"
                      style={{ fontWeight: 600 }}
                    >
                      <option value="PIX">PIX (Instantâneo)</option>
                      <option value="CARTAO_DEBITO">Cartão de Débito</option>
                      <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                      <option value="DINHEIRO">Dinheiro / Espécie</option>
                    </select>
                  </div>

                  {/* Totalizador */}
                  <div
                    style={{
                      background: 'rgba(15, 23, 42, 0.8)',
                      padding: '14px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>VALOR TOTAL A PAGAR</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--accent-green)', marginTop: '2px' }}>
                      R$ {totalVendaBalcao.toFixed(2)}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleFinalizarVendaBalcao}
                  disabled={finalizandoVenda || carrinho.length === 0}
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    padding: '14px',
                    fontSize: '0.96rem',
                    fontWeight: 800,
                    boxShadow: '0 6px 20px rgba(16, 185, 129, 0.35)',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                  }}
                >
                  <DollarSign size={18} /> {finalizandoVenda ? 'Processando Venda...' : 'Finalizar Venda & Baixar Estoque'}
                </button>
              </div>
            </div>
          )}

          {/* Modal de Sucesso da Venda Concluída */}
          {vendaConcluida && (
            <div
              style={{
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid #10b981',
                padding: '16px 20px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontWeight: 800, color: '#34d399', fontSize: '1rem' }}>
                  ✓ Venda Balcão #{vendaConcluida.codigo} Concluída com Sucesso!
                </div>
                <div style={{ fontSize: '0.82rem', color: '#e0f2fe' }}>
                  Total recebido: R$ {vendaConcluida.total.toFixed(2)} • Baixa de estoque registrada na auditoria.
                </div>
              </div>
              <button onClick={() => setVendaConcluida(null)} className="btn btn-secondary" style={{ fontSize: '0.78rem' }}>
                Nova Venda
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
