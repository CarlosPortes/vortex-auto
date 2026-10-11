import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  AlertTriangle,
  Package,
  TrendingDown,
  CheckCircle2,
  Plus,
  Search,
  FileText,
  DollarSign,
  Layers,
  Image as ImageIcon,
  Calculator,
  RefreshCw,
  X,
} from 'lucide-react';
import { Produto, Compra, ResumoMRP } from '../types';
import { apiRequest } from '../api';

export const ComprasMRPTab: React.FC = () => {
  const [subAba, setSubAba] = useState<'MRP' | 'HISTORICO'>('MRP');
  const [resumoMRP, setResumoMRP] = useState<ResumoMRP | null>(null);
  const [compras, setCompras] = useState<Compra[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtroCriticidade, setFiltroCriticidade] = useState<string>('TODOS');
  const [busca, setBusca] = useState('');

  // Modal Nova Compra / Lançar NF-e
  const [modalNovaCompra, setModalNovaCompra] = useState(false);
  const [fornecedorNome, setFornecedorNome] = useState('');
  const [fornecedorCnpj, setFornecedorCnpj] = useState('');
  const [numeroNota, setNumeroNota] = useState('');
  const [chaveAcesso, setChaveAcesso] = useState('');
  const [dataEmissao, setDataEmissao] = useState(new Date().toISOString().slice(0, 10));
  const [statusCompra, setStatusCompra] = useState<'RECEBIDO' | 'PEDIDO_CONFIRMADO' | 'COTACAO'>('RECEBIDO');
  const [observacoes, setObservacoes] = useState('');
  const [itensCompra, setItensCompra] = useState<Array<{ produtoId: string; quantidade: number; precoUnitario: number }>>([]);
  const [salvandoCompra, setSalvandoCompra] = useState(false);

  // Modal Detalhes da Compra
  const [compraDetalhe, setCompraDetalhe] = useState<Compra | null>(null);

  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  const carregarMRP = async () => {
    setLoading(true);
    const res = await apiRequest<ResumoMRP>('/compras/mrp/sugestoes');
    if (res.sucesso && res.dados) {
      setResumoMRP(res.dados);
    }
    setLoading(false);
  };

  const carregarCompras = async () => {
    const res = await apiRequest<Compra[]>('/compras');
    if (res.sucesso && res.dados) {
      setCompras(res.dados);
    }
  };

  const carregarProdutos = async () => {
    const res = await apiRequest<Produto[]>('/produtos');
    if (res.sucesso && res.dados) {
      setProdutos(res.dados);
    }
  };

  useEffect(() => {
    carregarMRP();
    carregarCompras();
    carregarProdutos();
  }, []);

  const abrirNovaCompraComItens = (itensIniciais?: Array<{ produtoId: string; quantidade: number; precoUnitario: number }>) => {
    setFornecedorNome('');
    setFornecedorCnpj('');
    setNumeroNota('');
    setChaveAcesso('');
    setDataEmissao(new Date().toISOString().slice(0, 10));
    setStatusCompra('RECEBIDO');
    setObservacoes('');

    if (itensIniciais && itensIniciais.length > 0) {
      setItensCompra(itensIniciais);
    } else if (produtos.length > 0) {
      setItensCompra([{ produtoId: produtos[0].id, quantidade: 1, precoUnitario: produtos[0].custoMedio || produtos[0].precoCusto || 0 }]);
    } else {
      setItensCompra([]);
    }
    setModalNovaCompra(true);
  };

  const gerarPedidoComCriticos = () => {
    if (!resumoMRP) return;
    const criticos = resumoMRP.itens.filter((i) => i.criticidade === 'CRITICO');
    if (criticos.length === 0) {
      alert('Nenhum item com criticidade crítica (carros parados/aguardando peças) no momento.');
      return;
    }
    const itens = criticos.map((c) => ({
      produtoId: c.produtoId,
      quantidade: c.necessidadeLiquida,
      precoUnitario: c.ultimoPrecoCompra || c.custoMedio || c.precoCustoAtual || 0,
    }));
    abrirNovaCompraComItens(itens);
  };

  const adicionarItemCompra = () => {
    if (produtos.length === 0) return;
    setItensCompra([
      ...itensCompra,
      { produtoId: produtos[0].id, quantidade: 1, precoUnitario: produtos[0].custoMedio || produtos[0].precoCusto || 0 },
    ]);
  };

  const removerItemCompra = (idx: number) => {
    setItensCompra(itensCompra.filter((_, i) => i !== idx));
  };

  const atualizarItemCompra = (idx: number, campo: 'produtoId' | 'quantidade' | 'precoUnitario', valor: any) => {
    const novos = [...itensCompra];
    novos[idx] = { ...novos[idx], [campo]: valor };
    if (campo === 'produtoId') {
      const prod = produtos.find((p) => p.id === valor);
      if (prod) {
        novos[idx].precoUnitario = prod.custoMedio || prod.precoCusto || 0;
      }
    }
    setItensCompra(novos);
  };

  const handleSalvarCompra = async (e: React.FormEvent) => {
    e.preventDefault();
    if (itensCompra.length === 0) {
      alert('Adicione ao menos um item à compra.');
      return;
    }

    setSalvandoCompra(true);
    setFeedback(null);

    const res = await apiRequest('/compras', {
      method: 'POST',
      body: JSON.stringify({
        fornecedorNome,
        fornecedorCnpj: fornecedorCnpj.trim() || undefined,
        numeroNota: numeroNota.trim() || undefined,
        chaveAcesso: chaveAcesso.trim() || undefined,
        dataEmissao,
        status: statusCompra,
        itens: itensCompra.map((it) => ({
          produtoId: it.produtoId,
          quantidade: Number(it.quantidade),
          precoUnitario: Number(it.precoUnitario),
        })),
        observacoes: observacoes.trim() || undefined,
      }),
    });

    setSalvandoCompra(false);
    if (res.sucesso) {
      setFeedback({ tipo: 'sucesso', texto: 'Compra/NF-e registrada com sucesso! Estoque e Custo Médio atualizados.' });
      setModalNovaCompra(false);
      carregarMRP();
      carregarCompras();
      carregarProdutos();
    } else {
      setFeedback({ tipo: 'erro', texto: res.mensagem || 'Falha ao lançar compra.' });
    }
  };

  // Filtragem dos itens sugeridos no MRP
  const itensMRPFiltrados = (resumoMRP?.itens || []).filter((item) => {
    if (filtroCriticidade !== 'TODOS' && item.criticidade !== filtroCriticidade) return false;
    if (busca.trim()) {
      const b = busca.toLowerCase();
      const matchCod = item.codigo.toLowerCase().includes(b);
      const matchDesc = item.descricao.toLowerCase().includes(b);
      const matchLoc = (item.localizacao || '').toLowerCase().includes(b);
      return matchCod || matchDesc || matchLoc;
    }
    return true;
  });

  const totalCalculadoNovaCompra = itensCompra.reduce((acc, it) => acc + (it.quantidade || 0) * (it.precoUnitario || 0), 0);

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

      {/* Top Banner KPI do MRP */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        <div className="glass-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
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
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Peças Críticas (OS Aguardando)</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: (resumoMRP?.totalItensCriticos || 0) > 0 ? '#f87171' : 'inherit' }}>
              {resumoMRP?.totalItensCriticos || 0} itens
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
            <TrendingDown size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Reposição de Estoque Mínimo</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>
              {resumoMRP?.totalItensReposicao || 0} itens
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
            <Package size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Necessidade Total (Peças)</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>
              {resumoMRP?.totalPecasNecessarias || 0} unidades
            </div>
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
              color: 'var(--accent-green)',
            }}
          >
            <DollarSign size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Orçamento Previsto de Compras</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(resumoMRP?.custoTotalSugerido || 0)}
            </div>
          </div>
        </div>
      </div>

      {/* Navegação entre Sub-abas e Ações Rápidas */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setSubAba('MRP')}
            className={`btn ${subAba === 'MRP' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Calculator size={16} /> Sugestões MRP & Demanda de OS
          </button>
          <button
            onClick={() => setSubAba('HISTORICO')}
            className={`btn ${subAba === 'HISTORICO' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <FileText size={16} /> Notas Fiscais & Pedidos de Compra ({compras.length})
          </button>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {subAba === 'MRP' && (
            <button
              onClick={gerarPedidoComCriticos}
              className="btn btn-secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                borderColor: '#ef4444',
                color: '#f87171',
                fontWeight: 700,
              }}
            >
              <AlertTriangle size={16} /> Comprar Todos os Críticos
            </button>
          )}

          <button
            onClick={() => abrirNovaCompraComItens()}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}
          >
            <Plus size={16} /> Nova Compra / Lançar NF-e
          </button>
        </div>
      </div>

      {/* -------------------- SUB-ABA 1: MRP SUGESTÕES -------------------- */}
      {subAba === 'MRP' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Barra de Filtros */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Filtrar por código, descrição ou prateleira..."
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
                onClick={() => setFiltroCriticidade('TODOS')}
                className={`btn ${filtroCriticidade === 'TODOS' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.78rem', padding: '6px 12px' }}
              >
                Todos ({resumoMRP?.itens.length || 0})
              </button>
              <button
                onClick={() => setFiltroCriticidade('CRITICO')}
                className={`btn ${filtroCriticidade === 'CRITICO' ? 'btn-danger' : 'btn-secondary'}`}
                style={{ fontSize: '0.78rem', padding: '6px 12px' }}
              >
                🔴 Crítico / OS ({resumoMRP?.totalItensCriticos || 0})
              </button>
              <button
                onClick={() => setFiltroCriticidade('REPOSICAO')}
                className={`btn ${filtroCriticidade === 'REPOSICAO' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.78rem', padding: '6px 12px', background: filtroCriticidade === 'REPOSICAO' ? '#f59e0b' : undefined }}
              >
                🟡 Reposição Mínimo ({resumoMRP?.totalItensReposicao || 0})
              </button>
            </div>

            <button
              onClick={carregarMRP}
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem', padding: '7px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCw size={14} /> Atualizar Motor MRP
            </button>
          </div>

          {/* Tabela de Sugestões do MRP */}
          <div className="glass-panel" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.02)' }}>
                    <th style={{ padding: '12px 14px', width: '50px' }}>FOTO</th>
                    <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-muted)' }}>CÓDIGO / ITEM</th>
                    <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-muted)' }}>LOCAL</th>
                    <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-muted)' }}>FÍSICO</th>
                    <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-muted)' }}>MÍNIMO</th>
                    <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-muted)' }}>DEMANDA OS</th>
                    <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-muted)' }}>NECESSIDADE</th>
                    <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-muted)' }}>CUSTO MÉDIO</th>
                    <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-muted)' }}>ÚLT. COMPRA</th>
                    <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-muted)' }}>SUBTOTAL PREV.</th>
                    <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-muted)' }}>CRITICIDADE</th>
                    <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'right' }}>AÇÃO</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={12} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        Calculando balanço de estoques e demandas das Ordens de Serviço...
                      </td>
                    </tr>
                  ) : itensMRPFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={12} style={{ padding: '36px', textAlign: 'center', color: 'var(--accent-green)' }}>
                        ✨ Excelente! Todos os produtos estão com níveis de estoque confortáveis para atender a demanda atual.
                      </td>
                    </tr>
                  ) : (
                    itensMRPFiltrados.map((item) => (
                      <tr
                        key={item.produtoId}
                        style={{
                          borderBottom: '1px solid var(--border-subtle)',
                          background: item.criticidade === 'CRITICO' ? 'rgba(239, 68, 68, 0.05)' : 'transparent',
                        }}
                      >
                        {/* Foto */}
                        <td style={{ padding: '10px 14px' }}>
                          <div
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '8px',
                              background: '#000',
                              overflow: 'hidden',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: '1px solid var(--border-subtle)',
                            }}
                          >
                            {item.fotoUrl ? (
                              <img src={item.fotoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <ImageIcon size={18} color="var(--text-dim)" />
                            )}
                          </div>
                        </td>

                        {/* Código e Descrição */}
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: 800, color: 'var(--primary)' }}>{item.codigo}</div>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)', marginTop: '2px' }}>{item.descricao}</div>
                        </td>

                        {/* Local */}
                        <td style={{ padding: '12px 14px', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                          {item.localizacao || '—'}
                        </td>

                        {/* Físico */}
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ fontWeight: 700 }}>{item.saldoFisico}</span>
                        </td>

                        {/* Mínimo */}
                        <td style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>
                          {item.estoqueMinimo}
                        </td>

                        {/* Demanda OS */}
                        <td style={{ padding: '12px 14px' }}>
                          {item.demandaOS > 0 ? (
                            <div>
                              <span className="badge badge-purple" style={{ fontWeight: 800 }}>
                                {item.demandaOS} UN
                              </span>
                              {item.ordensRelacionadas.length > 0 && (
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                                  {item.ordensRelacionadas.map((o) => o.osCodigo).join(', ')}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-dim)' }}>0</span>
                          )}
                        </td>

                        {/* Necessidade Líquida */}
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ fontSize: '1rem', fontWeight: 800, color: item.criticidade === 'CRITICO' ? '#f87171' : 'var(--text-main)' }}>
                            {item.necessidadeLiquida} UN
                          </span>
                        </td>

                        {/* Custo Médio */}
                        <td style={{ padding: '12px 14px', fontWeight: 600 }}>
                          R$ {item.custoMedio.toFixed(2)}
                        </td>

                        {/* Último Preço Compra */}
                        <td style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>
                          R$ {item.ultimoPrecoCompra.toFixed(2)}
                        </td>

                        {/* Subtotal Previsto */}
                        <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--accent-green)' }}>
                          R$ {item.custoTotalEstimado.toFixed(2)}
                        </td>

                        {/* Criticidade */}
                        <td style={{ padding: '12px 14px' }}>
                          {item.criticidade === 'CRITICO' ? (
                            <span className="badge badge-red" style={{ fontWeight: 700 }}>
                              🔴 Crítico (OS)
                            </span>
                          ) : (
                            <span className="badge badge-orange" style={{ fontWeight: 700 }}>
                              🟡 Reposição
                            </span>
                          )}
                        </td>

                        {/* Ação */}
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                          <button
                            onClick={() =>
                              abrirNovaCompraComItens([
                                {
                                  produtoId: item.produtoId,
                                  quantidade: item.necessidadeLiquida,
                                  precoUnitario: item.ultimoPrecoCompra || item.custoMedio,
                                },
                              ])
                            }
                            className="btn btn-secondary"
                            style={{ fontSize: '0.76rem', padding: '5px 10px', gap: '4px' }}
                          >
                            <ShoppingCart size={13} /> Comprar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- SUB-ABA 2: HISTÓRICO DE COMPRAS -------------------- */}
      {subAba === 'HISTORICO' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="glass-panel" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.02)' }}>
                    <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-muted)' }}>DATA</th>
                    <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-muted)' }}>NF-e / PEDIDO</th>
                    <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-muted)' }}>FORNECEDOR</th>
                    <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-muted)' }}>ITENS</th>
                    <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-muted)' }}>VALOR TOTAL</th>
                    <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-muted)' }}>STATUS</th>
                    <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-muted)' }}>RESPONSÁVEL</th>
                    <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'right' }}>AÇÕES</th>
                  </tr>
                </thead>
                <tbody>
                  {compras.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        Nenhuma compra ou Nota Fiscal lançada até o momento.
                      </td>
                    </tr>
                  ) : (
                    compras.map((comp) => (
                      <tr key={comp.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>
                          {new Date(comp.criadoEm).toLocaleDateString('pt-BR')}
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--primary)' }}>
                          {comp.numeroNota ? `NF-e ${comp.numeroNota}` : `COMPRA #${comp.id.slice(0, 8).toUpperCase()}`}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: 600 }}>{comp.fornecedorNome}</div>
                          {comp.fornecedorCnpj && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>CNPJ: {comp.fornecedorCnpj}</div>
                          )}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span className="badge badge-blue">{comp.itens.length} {comp.itens.length === 1 ? 'item' : 'itens'}</span>
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 800, color: 'var(--accent-green)' }}>
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(comp.valorTotal)}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          {comp.status === 'RECEBIDO' ? (
                            <span className="badge badge-green">RECEBIDO (ESTOQUE ATUALIZADO)</span>
                          ) : comp.status === 'PEDIDO_CONFIRMADO' ? (
                            <span className="badge badge-blue">PEDIDO CONFIRMADO</span>
                          ) : (
                            <span className="badge badge-gray">{comp.status}</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 14px', color: 'var(--text-dim)', fontSize: '0.78rem' }}>
                          {comp.usuario?.nome || '—'}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                          <button
                            onClick={() => setCompraDetalhe(comp)}
                            className="btn btn-secondary"
                            style={{ fontSize: '0.76rem', padding: '4px 10px' }}
                          >
                            Ver Detalhes
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- MODAL DE NOVA COMPRA / LANÇAR NF-E -------------------- */}
      {modalNovaCompra && (
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
              maxWidth: '920px',
              maxHeight: '92vh',
              overflowY: 'auto',
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                  }}
                >
                  <ShoppingCart size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Lançamento de Compra / Nota Fiscal de Entrada</h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Recalcula automaticamente o Custo Médio Ponderado (CMP) e atualiza o estoque físico.
                  </p>
                </div>
              </div>
              <button onClick={() => setModalNovaCompra(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSalvarCompra} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                <div>
                  <label className="input-label">Fornecedor / Razão Social *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Pellegrino Distribuidora Automotiva"
                    value={fornecedorNome}
                    onChange={(e) => setFornecedorNome(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="input-label">CNPJ do Fornecedor</label>
                  <input
                    type="text"
                    placeholder="00.000.000/0000-00"
                    value={fornecedorCnpj}
                    onChange={(e) => setFornecedorCnpj(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="input-label">Número da NF-e</label>
                  <input
                    type="text"
                    placeholder="Ex: 009841"
                    value={numeroNota}
                    onChange={(e) => setNumeroNota(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="input-label">Status da Operação</label>
                  <select
                    value={statusCompra}
                    onChange={(e) => setStatusCompra(e.target.value as any)}
                    className="input-field"
                  >
                    <option value="RECEBIDO">RECEBIDO (Dar entrada imediata no estoque e calcular CMP)</option>
                    <option value="PEDIDO_CONFIRMADO">PEDIDO CONFIRMADO (Aguardando entrega física)</option>
                    <option value="COTACAO">COTAÇÃO (Apenas proposta orçamentária)</option>
                  </select>
                </div>
              </div>

              {/* Tabela de Itens da Compra */}
              <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '16px', background: 'rgba(15, 23, 42, 0.4)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ fontSize: '0.92rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Layers size={16} color="var(--primary)" /> Peças & Valores da Compra ({itensCompra.length})
                  </h4>
                  <button
                    type="button"
                    onClick={adicionarItemCompra}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.76rem', padding: '5px 10px' }}
                  >
                    <Plus size={14} /> Adicionar Linha
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {itensCompra.map((item, idx) => {
                    const prod = produtos.find((p) => p.id === item.produtoId);
                    const saldoAnt = prod ? prod.saldoFisico : 0;
                    const custoAnt = prod ? prod.custoMedio || prod.precoCusto || 0 : 0;
                    const novoSaldo = saldoAnt + (item.quantidade || 0);
                    const novoCMP = novoSaldo > 0 ? (saldoAnt * custoAnt + (item.quantidade || 0) * (item.precoUnitario || 0)) / novoSaldo : item.precoUnitario;

                    return (
                      <div
                        key={idx}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 110px 140px 140px 40px',
                          gap: '10px',
                          alignItems: 'center',
                          background: 'rgba(255, 255, 255, 0.02)',
                          padding: '10px',
                          borderRadius: '8px',
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                        }}
                      >
                        {/* Seletor de Peça */}
                        <div>
                          <label style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Peça do Catálogo</label>
                          <select
                            value={item.produtoId}
                            onChange={(e) => atualizarItemCompra(idx, 'produtoId', e.target.value)}
                            className="input-field"
                            style={{ fontSize: '0.82rem', padding: '6px 8px' }}
                          >
                            {produtos.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.codigo} — {p.descricao} (Saldo Atual: {p.saldoFisico} {p.unidadeMedida})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Quantidade */}
                        <div>
                          <label style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Quantidade</label>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={item.quantidade}
                            onChange={(e) => atualizarItemCompra(idx, 'quantidade', Number(e.target.value))}
                            className="input-field"
                            style={{ fontSize: '0.85rem', padding: '6px 8px' }}
                          />
                        </div>

                        {/* Preço Unitário de Compra */}
                        <div>
                          <label style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Preço Compra (R$)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.precoUnitario}
                            onChange={(e) => atualizarItemCompra(idx, 'precoUnitario', Number(e.target.value))}
                            className="input-field"
                            style={{ fontSize: '0.85rem', padding: '6px 8px' }}
                          />
                        </div>

                        {/* Preview do Custo Médio Ponderado */}
                        <div>
                          <label style={{ fontSize: '0.7rem', color: '#38bdf8' }}>Novo CMP Estimado</label>
                          <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#38bdf8', padding: '6px 0' }}>
                            R$ {novoCMP.toFixed(2)}
                          </div>
                        </div>

                        {/* Botão Remover */}
                        <div style={{ paddingTop: '14px' }}>
                          <button
                            type="button"
                            onClick={() => removerItemCompra(idx)}
                            style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer' }}
                          >
                            <X size={18} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Total da Compra */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '14px', marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Valor Total da Compra:</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-green)' }}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalCalculadoNovaCompra)}
                  </span>
                </div>
              </div>

              {/* Botões do Rodapé */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setModalNovaCompra(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoCompra || itensCompra.length === 0}
                  className="btn btn-primary"
                  style={{ fontWeight: 700, padding: '10px 24px' }}
                >
                  <CheckCircle2 size={16} /> {salvandoCompra ? 'Gravando Entrada...' : 'Confirmar e Atualizar Estoque'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------- MODAL DETALHES DA COMPRA -------------------- */}
      {compraDetalhe && (
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
              maxWidth: '750px',
              maxHeight: '90vh',
              overflowY: 'auto',
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>
                  {compraDetalhe.numeroNota ? `Nota Fiscal de Entrada: ${compraDetalhe.numeroNota}` : `Registro de Compra #${compraDetalhe.id.slice(0, 8)}`}
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Fornecedor: <strong>{compraDetalhe.fornecedorNome}</strong> • Lançado em: {new Date(compraDetalhe.criadoEm).toLocaleString('pt-BR')}
                </p>
              </div>
              <button onClick={() => setCompraDetalhe(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {compraDetalhe.itens.map((it) => (
                  <div
                    key={it.id}
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
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{it.produto.descricao}</div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        Código: {it.produto.codigo} • Qtd: {it.quantidade} {it.produto.unidadeMedida} × R$ {it.precoUnitario.toFixed(2)}
                      </div>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--accent-green)' }}>
                      R$ {it.subtotal.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderTop: '1px solid var(--border-subtle)', marginTop: '8px' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Total da Nota Fiscal:</span>
                <span style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent-green)' }}>
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(compraDetalhe.valorTotal)}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button onClick={() => setCompraDetalhe(null)} className="btn btn-secondary">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
