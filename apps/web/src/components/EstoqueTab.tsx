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
  Scan,
  Barcode,
  Image as ImageIcon,
  Edit3,
  MapPin,
} from 'lucide-react';
import { Produto, MovimentoEstoque } from '../types';
import { apiRequest } from '../api';
import { TerminalWMSModal } from './TerminalWMSModal';

export const EstoqueTab: React.FC = () => {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState('');
  const [apenasAbaixoMinimo, setApenasAbaixoMinimo] = useState(false);

  // Modais
  const [modalNovoProduto, setModalNovoProduto] = useState(false);
  const [modalEditarProduto, setModalEditarProduto] = useState(false);
  const [modalMovimento, setModalMovimento] = useState(false);
  const [modalExtrato, setModalExtrato] = useState(false);
  const [modalWMS, setModalWMS] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null);

  // Form Novo / Editar Produto
  const [formCodigo, setFormCodigo] = useState('');
  const [formCodigoBarras, setFormCodigoBarras] = useState('');
  const [formDescricao, setFormDescricao] = useState('');
  const [formLocalizacao, setFormLocalizacao] = useState('');
  const [formFotoUrl, setFormFotoUrl] = useState('');
  const [formUnidade, setFormUnidade] = useState('UN');
  const [formPrecoCusto, setFormPrecoCusto] = useState(0);
  const [formPrecoVenda, setFormPrecoVenda] = useState(0);
  const [formEstoqueMinimo, setFormEstoqueMinimo] = useState(2);
  const [formSaldoInicial, setFormSaldoInicial] = useState(0);
  const [salvandoProduto, setSalvandoProduto] = useState(false);

  // Form Movimento Manual
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

  const handleUploadFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormFotoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSalvarProduto = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvandoProduto(true);
    setFeedbackMsg(null);

    const res = await apiRequest('/produtos', {
      method: 'POST',
      body: JSON.stringify({
        codigo: formCodigo,
        codigoBarras: formCodigoBarras.trim() || undefined,
        descricao: formDescricao,
        localizacao: formLocalizacao.trim() || undefined,
        fotoUrl: formFotoUrl.trim() || undefined,
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
      limparFormProduto();
      carregarProdutos();
    } else {
      setFeedbackMsg({ tipo: 'erro', texto: res.mensagem || 'Falha ao cadastrar produto.' });
    }
    setSalvandoProduto(false);
  };

  const abrirEdicaoProduto = (prod: Produto) => {
    setProdutoSelecionado(prod);
    setFormCodigo(prod.codigo);
    setFormCodigoBarras(prod.codigoBarras || '');
    setFormDescricao(prod.descricao);
    setFormLocalizacao(prod.localizacao || '');
    setFormFotoUrl(prod.fotoUrl || '');
    setFormUnidade(prod.unidadeMedida);
    setFormPrecoCusto(prod.precoCusto);
    setFormPrecoVenda(prod.precoVenda);
    setFormEstoqueMinimo(prod.estoqueMinimo);
    setModalEditarProduto(true);
  };

  const handleSalvarEdicao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!produtoSelecionado) return;
    setSalvandoProduto(true);
    setFeedbackMsg(null);

    const res = await apiRequest(`/produtos/${produtoSelecionado.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        descricao: formDescricao,
        codigoBarras: formCodigoBarras.trim() || null,
        localizacao: formLocalizacao.trim() || null,
        fotoUrl: formFotoUrl.trim() || null,
        unidadeMedida: formUnidade,
        precoCusto: Number(formPrecoCusto),
        precoVenda: Number(formPrecoVenda),
        estoqueMinimo: Number(formEstoqueMinimo),
      }),
    });

    if (res.sucesso) {
      setFeedbackMsg({ tipo: 'sucesso', texto: 'Produto e dados WMS atualizados com sucesso!' });
      setModalEditarProduto(false);
      limparFormProduto();
      carregarProdutos();
    } else {
      setFeedbackMsg({ tipo: 'erro', texto: res.mensagem || 'Falha ao atualizar produto.' });
    }
    setSalvandoProduto(false);
  };

  const limparFormProduto = () => {
    setFormCodigo('');
    setFormCodigoBarras('');
    setFormDescricao('');
    setFormLocalizacao('');
    setFormFotoUrl('');
    setFormPrecoCusto(0);
    setFormPrecoVenda(0);
    setFormSaldoInicial(0);
    setFormEstoqueMinimo(2);
  };

  const handleSalvarMovimento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!produtoSelecionado) return;
    setSalvandoMov(true);
    setFeedbackMsg(null);

    const res = await apiRequest(`/produtos/${produtoSelecionado.id}/movimentar`, {
      method: 'POST',
      body: JSON.stringify({
        tipo: movTipo,
        quantidade: Number(movQuantidade),
        motivo: movMotivo,
        documentoRef: movDocRef,
      }),
    });

    if (res.sucesso) {
      setFeedbackMsg({ tipo: 'sucesso', texto: 'Movimentação manual lançada com sucesso!' });
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
    const res = await apiRequest<{ dados: MovimentoEstoque[] }>(`/produtos/${prod.id}/movimentos`);
    if (res.sucesso && res.dados) {
      setMovimentos(res.dados.dados || []);
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
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Itens no Catálogo</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{totalProdutos} produtos</div>
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
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Alerta de Estoque Mínimo</div>
            <div
              style={{
                fontSize: '1.2rem',
                fontWeight: 700,
                color: produtosAbaixoMinimo > 0 ? '#f87171' : 'inherit',
              }}
            >
              {produtosAbaixoMinimo} {produtosAbaixoMinimo === 1 ? 'item crítico' : 'itens críticos'}
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
              color: 'var(--accent-amber)',
            }}
          >
            <Boxes size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Peças Reservadas p/ OS</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{totalReservado} unidades</div>
          </div>
        </div>
      </div>

      {feedbackMsg && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-sm)',
            background: feedbackMsg.tipo === 'sucesso' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
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

      {/* Barra de Filtros e Ações com Botão Terminal WMS */}
      <div className="glass-panel" style={{ padding: '16px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search
            size={16}
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
          />
          <input
            type="text"
            placeholder="Buscar por código, EAN, descrição ou prateleira..."
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

        {/* BOTÃO DESTAQUE DO TERMINAL WMS */}
        <button
          onClick={() => setModalWMS(true)}
          className="btn btn-primary"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
            boxShadow: '0 4px 14px rgba(14, 165, 233, 0.4)',
            fontWeight: 700,
          }}
        >
          <Scan size={17} /> Terminal WMS & Bipagem
        </button>

        <button
          onClick={() => {
            limparFormProduto();
            setModalNovoProduto(true);
          }}
          className="btn btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Plus size={16} /> Novo Produto
        </button>
      </div>

      {/* Tabela de Produtos */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.02)' }}>
                <th style={{ padding: '12px 14px', width: '50px' }}>FOTO</th>
                <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-muted)' }}>CÓDIGO / EAN</th>
                <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-muted)' }}>DESCRIÇÃO / LOCAL</th>
                <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-muted)' }}>UN</th>
                <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-muted)' }}>PREÇO VENDA</th>
                <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-muted)' }}>FÍSICO</th>
                <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-muted)' }}>RESERVADO</th>
                <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-muted)' }}>DISPONÍVEL</th>
                <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-muted)' }}>STATUS</th>
                <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'right' }}>AÇÕES</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Consultando estoque de peças...
                  </td>
                </tr>
              ) : produtos.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
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
                    {/* Miniatura da Foto */}
                    <td style={{ padding: '10px 14px' }}>
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '8px',
                          background: 'rgba(15, 23, 42, 0.8)',
                          border: '1px solid var(--border-subtle)',
                          overflow: 'hidden',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {prod.fotoUrl ? (
                          <img
                            src={prod.fotoUrl}
                            alt={prod.descricao}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <ImageIcon size={18} color="var(--text-dim)" />
                        )}
                      </div>
                    </td>

                    {/* Código SKU e EAN */}
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 800, color: 'var(--primary)' }}>{prod.codigo}</div>
                      {prod.codigoBarras ? (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
                          <Barcode size={12} /> {prod.codigoBarras}
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Sem EAN</div>
                      )}
                    </td>

                    {/* Descrição e Localização */}
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 600 }}>{prod.descricao}</div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'flex', gap: '8px', marginTop: '2px' }}>
                        <span>Custo: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prod.precoCusto)}</span>
                        {prod.localizacao && (
                          <span style={{ color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '2px' }}>
                            <MapPin size={11} /> {prod.localizacao}
                          </span>
                        )}
                      </div>
                    </td>

                    <td style={{ padding: '12px 14px' }}>
                      <span className="badge badge-gray">{prod.unidadeMedida}</span>
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 600 }}>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prod.precoVenda)}
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 600 }}>{prod.saldoFisico}</td>
                    <td
                      style={{
                        padding: '12px 14px',
                        color: prod.saldoReservado > 0 ? 'var(--accent-amber)' : 'var(--text-muted)',
                      }}
                    >
                      {prod.saldoReservado}
                    </td>
                    <td
                      style={{
                        padding: '12px 14px',
                        fontWeight: 700,
                        color: prod.saldoDisponivel <= 0 ? '#f87171' : '#34d399',
                      }}
                    >
                      {prod.saldoDisponivel}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
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
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => abrirEdicaoProduto(prod)}
                          className="btn btn-secondary"
                          style={{ padding: '5px 8px', fontSize: '0.74rem' }}
                          title="Editar Peça / Foto / Código de Barras"
                        >
                          <Edit3 size={13} /> Editar
                        </button>
                        <button
                          onClick={() => {
                            setProdutoSelecionado(prod);
                            setMovQuantidade(1);
                            setModalMovimento(true);
                          }}
                          className="btn btn-secondary"
                          style={{ padding: '5px 8px', fontSize: '0.74rem' }}
                          title="Lançar Ajuste Manual"
                        >
                          <Boxes size={13} /> Ajuste
                        </button>
                        <button
                          onClick={() => abrirExtrato(prod)}
                          className="btn btn-secondary"
                          style={{ padding: '5px 8px', fontSize: '0.74rem' }}
                          title="Extrato de Movimentações"
                        >
                          <History size={13} />
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

      {/* Modal Terminal WMS & Bipagem */}
      {modalWMS && (
        <TerminalWMSModal
          onClose={() => setModalWMS(false)}
          onEstoqueAtualizado={() => carregarProdutos()}
        />
      )}

      {/* Modal Novo Produto */}
      {modalNovoProduto && (
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
          <div className="glass-panel" style={{ maxWidth: '580px', width: '100%', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Package size={20} color="var(--primary)" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Cadastrar Novo Produto (HU-017)</h3>
              </div>
              <button
                onClick={() => setModalNovoProduto(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSalvarProduto} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="input-label">Código Interno / SKU *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: PEC-004"
                    value={formCodigo}
                    onChange={(e) => setFormCodigo(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="input-label">Código de Barras / EAN-13 (WMS)</label>
                  <input
                    type="text"
                    placeholder="Ex: 7891234567890"
                    value={formCodigoBarras}
                    onChange={(e) => setFormCodigoBarras(e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label className="input-label">Descrição do Produto / Peça *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Amortecedor Dianteiro Direito Cofap"
                  value={formDescricao}
                  onChange={(e) => setFormDescricao(e.target.value)}
                  className="input-field"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="input-label">Localização no Almoxarifado (WMS)</label>
                  <input
                    type="text"
                    placeholder="Ex: Corredor B - Prat. 3 - Gav. 1"
                    value={formLocalizacao}
                    onChange={(e) => setFormLocalizacao(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="input-label">Unidade de Medida</label>
                  <select
                    value={formUnidade}
                    onChange={(e) => setFormUnidade(e.target.value)}
                    className="input-field"
                    style={{ background: '#181b22' }}
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

              {/* Upload / Inclusão da Foto da Peça */}
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ImageIcon size={14} color="var(--primary)" /> Foto da Peça (Para identificação no WMS)
                </label>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '6px' }}>
                  {formFotoUrl && (
                    <div style={{ width: '60px', height: '60px', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-subtle)', background: '#000' }}>
                      <img src={formFotoUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadFoto}
                      style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}
                    />
                    <input
                      type="text"
                      placeholder="Ou cole a URL da imagem aqui..."
                      value={formFotoUrl}
                      onChange={(e) => setFormFotoUrl(e.target.value)}
                      className="input-field"
                      style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="input-label">Preço de Custo (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formPrecoCusto}
                    onChange={(e) => setFormPrecoCusto(Number(e.target.value))}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="input-label">Preço de Venda (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formPrecoVenda}
                    onChange={(e) => setFormPrecoVenda(Number(e.target.value))}
                    className="input-field"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="input-label">Estoque Mínimo</label>
                  <input
                    type="number"
                    min="0"
                    value={formEstoqueMinimo}
                    onChange={(e) => setFormEstoqueMinimo(Number(e.target.value))}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="input-label">Saldo Inicial Físico</label>
                  <input
                    type="number"
                    min="0"
                    value={formSaldoInicial}
                    onChange={(e) => setFormSaldoInicial(Number(e.target.value))}
                    className="input-field"
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

      {/* Modal Editar Produto e Foto */}
      {modalEditarProduto && produtoSelecionado && (
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
          <div className="glass-panel" style={{ maxWidth: '580px', width: '100%', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Edit3 size={20} color="var(--primary)" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Editar Peça: {produtoSelecionado.codigo}</h3>
              </div>
              <button
                onClick={() => setModalEditarProduto(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSalvarEdicao} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="input-label">Descrição do Produto / Peça *</label>
                <input
                  type="text"
                  required
                  value={formDescricao}
                  onChange={(e) => setFormDescricao(e.target.value)}
                  className="input-field"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="input-label">Código de Barras / EAN-13</label>
                  <input
                    type="text"
                    placeholder="Ex: 7891234567890"
                    value={formCodigoBarras}
                    onChange={(e) => setFormCodigoBarras(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="input-label">Localização no Almoxarifado</label>
                  <input
                    type="text"
                    placeholder="Ex: Corredor A - Prat. 2"
                    value={formLocalizacao}
                    onChange={(e) => setFormLocalizacao(e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>

              {/* Upload / Inclusão da Foto */}
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ImageIcon size={14} color="var(--primary)" /> Foto da Peça (WMS)
                </label>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '6px' }}>
                  {formFotoUrl ? (
                    <div style={{ width: '64px', height: '64px', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-subtle)', background: '#000' }}>
                      <img src={formFotoUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ) : (
                    <div style={{ width: '64px', height: '64px', borderRadius: '6px', border: '1px dashed var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ImageIcon size={22} color="var(--text-dim)" />
                    </div>
                  )}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadFoto}
                      style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}
                    />
                    <input
                      type="text"
                      placeholder="Ou informe a URL da imagem..."
                      value={formFotoUrl}
                      onChange={(e) => setFormFotoUrl(e.target.value)}
                      className="input-field"
                      style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="input-label">Preço de Custo (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formPrecoCusto}
                    onChange={(e) => setFormPrecoCusto(Number(e.target.value))}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="input-label">Preço de Venda (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formPrecoVenda}
                    onChange={(e) => setFormPrecoVenda(Number(e.target.value))}
                    className="input-field"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" onClick={() => setModalEditarProduto(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" disabled={salvandoProduto} className="btn btn-primary">
                  {salvandoProduto ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Movimentação Manual */}
      {modalMovimento && produtoSelecionado && (
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
          <div className="glass-panel" style={{ maxWidth: '480px', width: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Boxes size={20} color="var(--primary)" />
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Ajuste Manual de Saldo</h3>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  [{produtoSelecionado.codigo}] {produtoSelecionado.descricao}
                </div>
              </div>
              <button onClick={() => setModalMovimento(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSalvarMovimento} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="input-label">Tipo de Movimentação *</label>
                <select
                  value={movTipo}
                  onChange={(e) => setMovTipo(e.target.value as any)}
                  className="input-field"
                  style={{ background: '#181b22' }}
                >
                  <option value="ENTRADA">ENTRADA (Acréscimo de compra)</option>
                  <option value="AJUSTE_POSITIVO">AJUSTE POSITIVO (Contagem / Inventário)</option>
                  <option value="AJUSTE_NEGATIVO">AJUSTE NEGATIVO (Quebra / Perda / Inventário)</option>
                </select>
              </div>

              <div>
                <label className="input-label">Quantidade ({produtoSelecionado.unidadeMedida}) *</label>
                <input
                  type="number"
                  required
                  min="0.001"
                  step="any"
                  value={movQuantidade}
                  onChange={(e) => setMovQuantidade(Number(e.target.value))}
                  className="input-field"
                  style={{ fontSize: '1.1rem', fontWeight: 700 }}
                />
              </div>

              <div>
                <label className="input-label">Justificativa / Motivo</label>
                <input
                  type="text"
                  placeholder="Ex: Acerto de contagem física no armazém"
                  value={movMotivo}
                  onChange={(e) => setMovMotivo(e.target.value)}
                  className="input-field"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" onClick={() => setModalMovimento(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" disabled={salvandoMov} className="btn btn-primary">
                  {salvandoMov ? 'Gravando...' : 'Confirmar Ajuste'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Extrato de Movimentações */}
      {modalExtrato && produtoSelecionado && (
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
          <div className="glass-panel" style={{ maxWidth: '820px', width: '100%', padding: '24px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <History size={18} color="var(--primary)" />
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Extrato de Movimentações (HU-018)</h3>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  [{produtoSelecionado.codigo}] {produtoSelecionado.descricao} • Saldo Atual: {produtoSelecionado.saldoFisico} {produtoSelecionado.unidadeMedida}
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
                          <span
                            className={`badge ${
                              m.tipo === 'ENTRADA' || m.tipo === 'AJUSTE_POSITIVO'
                                ? 'badge-green'
                                : m.tipo === 'CONSUMO' || m.tipo === 'VENDA_DIRETA'
                                ? 'badge-blue'
                                : m.tipo === 'RESERVA'
                                ? 'badge-amber'
                                : 'badge-gray'
                            }`}
                          >
                            {m.tipo}
                          </span>
                        </td>
                        <td style={{ padding: '8px 12px', fontWeight: 600 }}>
                          {m.tipo === 'AJUSTE_NEGATIVO' || m.tipo === 'CONSUMO' || m.tipo === 'VENDA_DIRETA' ? '-' : '+'}
                          {m.quantidade}
                        </td>
                        <td style={{ padding: '8px 12px', fontWeight: 700 }}>{m.saldoFisicoNovo}</td>
                        <td style={{ padding: '8px 12px' }}>
                          <div style={{ fontWeight: 600 }}>{m.origemDocumento || 'Sem doc'}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{m.motivo || '-'}</div>
                        </td>
                        <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>{m.usuarioNome}</td>
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
