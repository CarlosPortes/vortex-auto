import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  History,
  TrendingUp,
  Boxes,
  CheckCircle2,
  X,
} from 'lucide-react';
import { Produto, MovimentoEstoque } from '../types';
import { apiRequest } from '../api';

export const EstoqueTab: React.FC = () => {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState('');
  const [apenasAbaixoMinimo, setApenasAbaixoMinimo] = useState(false);

  // Modais
  const [modalNovoProduto, setModalNovoProduto] = useState(false);
  const [modalMovimento, setModalMovimento] = useState(false);
  const [modalExtrato, setModalExtrato] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null);

  // Form Novo Produto
  const [formCodigo, setFormCodigo] = useState('');
  const [formDescricao, setFormDescricao] = useState('');
  const [formUnidade, setFormUnidade] = useState('UN');
  const [formPrecoCusto, setFormPrecoCusto] = useState(0);
  const [formPrecoVenda, setFormPrecoVenda] = useState(0);
  const [formEstoqueMinimo, setFormEstoqueMinimo] = useState(2);
  const [formSaldoInicial, setFormSaldoInicial] = useState(0);
  const [salvandoProduto, setSalvandoProduto] = useState(false);

  // Form Movimento
  const [movTipo, setMovTipo] = useState<'ENTRADA' | 'AJUSTE_POSITIVO' | 'AJUSTE_NEGATIVO'>('ENTRADA');
  const [movQuantidade, setMovQuantidade] = useState(1);
  const [movMotivo, setMovMotivo] = useState('');
  const [movDocRef, setMovDocRef] = useState('');
  const [salvandoMov, setSalvandoMov] = useState(false);

  // Extrato
  const [movimentos, setMovimentos] = useState<MovimentoEstoque[]>([]);
  const [carregandoExtrato, setCarregandoExtrato] = useState(false);

  const [feedbackMsg, setFeedbackMsg] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  const carregarProdutos = async () => {
    setLoading(true);
    let url = `/produtos?q=${encodeURIComponent(busca)}`;
    if (apenasAbaixoMinimo) {
      url += '&apenasAbaixoMinimo=true';
    }
    const res = await apiRequest<Produto[]>(url);
    if (res.sucesso && res.dados) {
      setProdutos(res.dados);
    }
    setLoading(false);
  };

  useEffect(() => {
    carregarProdutos();
  }, [busca, apenasAbaixoMinimo]);

  const handleSalvarProduto = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvandoProduto(true);
    setFeedbackMsg(null);

    const res = await apiRequest('/produtos', {
      method: 'POST',
      body: JSON.stringify({
        codigo: formCodigo,
        descricao: formDescricao,
        unidadeMedida: formUnidade,
        precoCusto: Number(formPrecoCusto),
        precoVenda: Number(formPrecoVenda),
        estoqueMinimo: Number(formEstoqueMinimo),
        saldoInicial: Number(formSaldoInicial),
      }),
    });

    if (res.sucesso) {
      setFeedbackMsg({ tipo: 'sucesso', texto: 'Produto cadastrado com sucesso no catálogo!' });
      setModalNovoProduto(false);
      setFormCodigo('');
      setFormDescricao('');
      setFormPrecoCusto(0);
      setFormPrecoVenda(0);
      setFormSaldoInicial(0);
      carregarProdutos();
    } else {
      setFeedbackMsg({ tipo: 'erro', texto: res.mensagem || 'Falha ao cadastrar produto.' });
    }
    setSalvandoProduto(false);
  };

  const handleSalvarMovimento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!produtoSelecionado) return;
    setSalvandoMov(true);
    setFeedbackMsg(null);

    const res = await apiRequest(`/produtos/${produtoSelecionado.id}/movimento`, {
      method: 'POST',
      body: JSON.stringify({
        tipo: movTipo,
        quantidade: Number(movQuantidade),
        motivo: movMotivo,
        documentoRef: movDocRef,
      }),
    });

    if (res.sucesso) {
      setFeedbackMsg({ tipo: 'sucesso', texto: 'Movimentação de estoque lançada com sucesso!' });
      setModalMovimento(false);
      setMovQuantidade(1);
      setMovMotivo('');
      setMovDocRef('');
      carregarProdutos();
    } else {
      setFeedbackMsg({ tipo: 'erro', texto: res.mensagem || 'Erro ao registrar movimentação.' });
    }
    setSalvandoMov(false);
  };

  const abrirExtrato = async (prod: Produto) => {
    setProdutoSelecionado(prod);
    setModalExtrato(true);
    setCarregandoExtrato(true);
    const res = await apiRequest<MovimentoEstoque[]>(`/produtos/${prod.id}/movimentos`);
    if (res.sucesso && res.dados) {
      setMovimentos(res.dados);
    }
    setCarregandoExtrato(false);
  };

  // Indicadores
  const totalProdutos = produtos.length;
  const produtosAbaixoMinimo = produtos.filter((p) => p.abaixoMinimo).length;
  const valorTotalEstoque = produtos.reduce((acc, p) => acc + p.saldoFisico * p.precoCusto, 0);
  const totalReservado = produtos.reduce((acc, p) => acc + p.saldoReservado, 0);

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
            <Package size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Itens no Catálogo (HU-017)</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{totalProdutos} Peças / Insumos</div>
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
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Patrimônio em Estoque (Custo)</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorTotalEstoque)}
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: 'rgba(239, 68, 68, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#f87171',
          }}>
            <AlertTriangle size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Alerta de Estoque Mínimo</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: produtosAbaixoMinimo > 0 ? '#f87171' : 'inherit' }}>
              {produtosAbaixoMinimo} {produtosAbaixoMinimo === 1 ? 'item crítico' : 'itens críticos'}
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
            <Boxes size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Peças Reservadas p/ OS</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{totalReservado} unidades</div>
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

      {/* Barra de Filtros e Ações */}
      <div className="glass-panel" style={{ padding: '16px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Buscar por código ou descrição da peça..."
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

        <button
          onClick={() => setApenasAbaixoMinimo(!apenasAbaixoMinimo)}
          className={`btn ${apenasAbaixoMinimo ? 'btn-danger' : 'btn-secondary'}`}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <AlertTriangle size={15} />
          {apenasAbaixoMinimo ? 'Exibindo Críticos' : 'Abaixo do Mínimo'}
        </button>

        <button
          onClick={() => setModalNovoProduto(true)}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Plus size={16} /> Novo Produto (HU-017)
        </button>
      </div>

      {/* Tabela de Produtos */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.02)' }}>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>CÓDIGO</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>DESCRIÇÃO</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>UN</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>PREÇO VENDA</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>FÍSICO</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>RESERVADO</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>DISPONÍVEL</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>STATUS</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'right' }}>AÇÕES</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Consultando estoque de peças...
                  </td>
                </tr>
              ) : produtos.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Nenhuma peça ou produto encontrado com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                produtos.map((prod) => (
                  <tr
                    key={prod.id}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      background: prod.abaixoMinimo ? 'rgba(239, 68, 68, 0.04)' : 'transparent',
                    }}
                  >
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--primary)' }}>
                      {prod.codigo}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600 }}>{prod.descricao}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Custo: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prod.precoCusto)} • Mínimo: {prod.estoqueMinimo} {prod.unidadeMedida}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className="badge badge-gray">{prod.unidadeMedida}</span>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prod.precoVenda)}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                      {prod.saldoFisico}
                    </td>
                    <td style={{ padding: '12px 16px', color: prod.saldoReservado > 0 ? 'var(--accent-amber)' : 'var(--text-muted)' }}>
                      {prod.saldoReservado}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: prod.saldoDisponivel <= 0 ? '#f87171' : '#34d399' }}>
                      {prod.saldoDisponivel}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {prod.abaixoMinimo ? (
                        <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <AlertTriangle size={12} /> Abaixo Mínimo
                        </span>
                      ) : (
                        <span className="badge badge-green" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle2 size={12} /> Normal
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          onClick={() => {
                            setProdutoSelecionado(prod);
                            setModalMovimento(true);
                          }}
                          className="btn btn-secondary"
                          style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                          title="Lançar Entrada ou Ajuste"
                        >
                          <Boxes size={14} /> Movimentar
                        </button>
                        <button
                          onClick={() => abrirExtrato(prod)}
                          className="btn btn-secondary"
                          style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                          title="Extrato de Movimentações"
                        >
                          <History size={14} /> Extrato
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Novo Produto */}
      {modalNovoProduto && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px',
        }}>
          <div className="glass-panel" style={{ maxWidth: '520px', width: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Package size={20} color="var(--primary)" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Cadastrar Novo Produto (HU-017)</h3>
              </div>
              <button onClick={() => setModalNovoProduto(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSalvarProduto} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Código Interno / SKU *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: PEC-004"
                    value={formCodigo}
                    onChange={(e) => setFormCodigo(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.03)', color: 'inherit' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Unidade de Medida</label>
                  <select
                    value={formUnidade}
                    onChange={(e) => setFormUnidade(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: '#181b22', color: 'inherit' }}
                  >
                    <option value="UN">UN - Unidade</option>
                    <option value="JOGO">JOGO - Jogo</option>
                    <option value="PAR">PAR - Par</option>
                    <option value="LITRO">LITRO - Litro</option>
                    <option value="FRASCO">FRASCO - Frasco</option>
                    <option value="KG">KG - Quilo</option>
                    <option value="METRO">METRO - Metro</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Descrição do Produto / Peça *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Amortecedor Dianteiro Direito Cofap"
                  value={formDescricao}
                  onChange={(e) => setFormDescricao(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.03)', color: 'inherit' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Preço de Custo (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formPrecoCusto}
                    onChange={(e) => setFormPrecoCusto(Number(e.target.value))}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.03)', color: 'inherit' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Preço de Venda (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formPrecoVenda}
                    onChange={(e) => setFormPrecoVenda(Number(e.target.value))}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.03)', color: 'inherit' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Estoque Mínimo</label>
                  <input
                    type="number"
                    min="0"
                    value={formEstoqueMinimo}
                    onChange={(e) => setFormEstoqueMinimo(Number(e.target.value))}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.03)', color: 'inherit' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Saldo Inicial Físico</label>
                  <input
                    type="number"
                    min="0"
                    value={formSaldoInicial}
                    onChange={(e) => setFormSaldoInicial(Number(e.target.value))}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.03)', color: 'inherit' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" onClick={() => setModalNovoProduto(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" disabled={salvandoProduto} className="btn btn-primary">
                  {salvandoProduto ? 'Cadastrando...' : 'Confirmar Cadastro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Movimentar Estoque */}
      {modalMovimento && produtoSelecionado && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px',
        }}>
          <div className="glass-panel" style={{ maxWidth: '480px', width: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Movimentar Estoque (HU-018)</h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  [{produtoSelecionado.codigo}] {produtoSelecionado.descricao}
                </div>
              </div>
              <button onClick={() => setModalMovimento(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{
              background: 'rgba(255,255,255,0.03)',
              padding: '12px',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '16px',
              display: 'flex',
              justifyContent: 'space-around',
              textAlign: 'center',
            }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>SALDO FÍSICO</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{produtoSelecionado.saldoFisico} {produtoSelecionado.unidadeMedida}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>RESERVADO</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-amber)' }}>{produtoSelecionado.saldoReservado} {produtoSelecionado.unidadeMedida}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>DISPONÍVEL</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#34d399' }}>{produtoSelecionado.saldoDisponivel} {produtoSelecionado.unidadeMedida}</div>
              </div>
            </div>

            <form onSubmit={handleSalvarMovimento} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Tipo de Movimentação *</label>
                <select
                  value={movTipo}
                  onChange={(e) => setMovTipo(e.target.value as any)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: '#181b22', color: 'inherit' }}
                >
                  <option value="ENTRADA">Entrada / Recebimento de Compra</option>
                  <option value="AJUSTE_POSITIVO">Ajuste Positivo de Balanço</option>
                  <option value="AJUSTE_NEGATIVO">Ajuste Negativo (Perda / Quebra / Contagem)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Quantidade *</label>
                <input
                  type="number"
                  step="0.001"
                  min="0.001"
                  required
                  value={movQuantidade}
                  onChange={(e) => setMovQuantidade(Number(e.target.value))}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.03)', color: 'inherit' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Documento / NF de Referência</label>
                <input
                  type="text"
                  placeholder="Ex: NF-e 45218"
                  value={movDocRef}
                  onChange={(e) => setMovDocRef(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.03)', color: 'inherit' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Justificativa / Motivo</label>
                <textarea
                  rows={2}
                  placeholder="Informe o motivo da movimentação para registro na auditoria..."
                  value={movMotivo}
                  onChange={(e) => setMovMotivo(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.03)', color: 'inherit' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" onClick={() => setModalMovimento(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" disabled={salvandoMov} className="btn btn-primary">
                  {salvandoMov ? 'Lançando...' : 'Confirmar Lançamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Extrato de Movimentações */}
      {modalExtrato && produtoSelecionado && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px',
        }}>
          <div className="glass-panel" style={{ maxWidth: '720px', width: '100%', padding: '24px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <History size={18} color="var(--primary)" />
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Extrato de Movimentações</h3>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  [{produtoSelecionado.codigo}] {produtoSelecionado.descricao}
                </div>
              </div>
              <button onClick={() => setModalExtrato(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {carregandoExtrato ? (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Carregando extrato de movimentações...
                </div>
              ) : movimentos.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Nenhuma movimentação registrada para este produto.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.02)' }}>
                      <th style={{ padding: '8px 12px' }}>DATA/HORA</th>
                      <th style={{ padding: '8px 12px' }}>TIPO</th>
                      <th style={{ padding: '8px 12px' }}>QTD</th>
                      <th style={{ padding: '8px 12px' }}>SALDO NOVO</th>
                      <th style={{ padding: '8px 12px' }}>DOC/MOTIVO</th>
                      <th style={{ padding: '8px 12px' }}>USUÁRIO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movimentos.map((m) => (
                      <tr key={m.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>
                          {new Date(m.criadoEm).toLocaleString('pt-BR')}
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <span className={`badge ${
                            m.tipo === 'ENTRADA' || m.tipo === 'AJUSTE_POSITIVO' ? 'badge-green' :
                            m.tipo === 'CONSUMO' ? 'badge-blue' :
                            m.tipo === 'RESERVA' ? 'badge-amber' : 'badge-gray'
                          }`}>
                            {m.tipo}
                          </span>
                        </td>
                        <td style={{ padding: '8px 12px', fontWeight: 600 }}>
                          {m.tipo === 'AJUSTE_NEGATIVO' || m.tipo === 'CONSUMO' ? '-' : '+'}{m.quantidade}
                        </td>
                        <td style={{ padding: '8px 12px', fontWeight: 700 }}>
                          {m.saldoFisicoNovo}
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <div style={{ fontWeight: 600 }}>{m.origemDocumento || 'Sem doc'}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{m.motivo || '-'}</div>
                        </td>
                        <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>
                          {m.usuarioNome}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setModalExtrato(false)} className="btn btn-secondary">
                Fechar Extrato
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
