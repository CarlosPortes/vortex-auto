import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Plus,
  Search,
  Trash2,
  X,
  Check,
} from 'lucide-react';
import { ServicoCatalogo } from '../types';
import { apiRequest } from '../api';

export const SERVICOS_CATALOGO_PADRAO: ServicoCatalogo[] = [
  {
    id: 'srv-1',
    codigo: 'SRV-001',
    nome: 'Solda Elétrica / MIG em Ferramenta (Rastelo, Foice, Enxada)',
    categoria: 'SOLDA_SERRALHERIA',
    valorSugerido: 45,
    tempoEstimadoMinutos: 30,
    descricaoPadrao: 'Preparação, ponteamento, cordão de solda reforçado e acabamento com esmerilhadeira.',
  },
  {
    id: 'srv-2',
    codigo: 'SRV-002',
    nome: 'Solda e Reforço Estrutural em Peça / Suporte Metálico',
    categoria: 'SOLDA_SERRALHERIA',
    valorSugerido: 85,
    tempoEstimadoMinutos: 45,
    descricaoPadrao: 'Recuperação estrutural com solda de alta penetração e alinhamento da peça.',
  },
  {
    id: 'srv-3',
    codigo: 'SRV-003',
    nome: 'Afiação, Desempeno e Ajuste de Ferramenta (Foice, Facão, Lâmina)',
    categoria: 'FERRAMENTAS_BANCADA',
    valorSugerido: 35,
    tempoEstimadoMinutos: 25,
    descricaoPadrao: 'Desbaste, afiação de fio de corte na bancada e fixação do encaixe/cabo.',
  },
  {
    id: 'srv-4',
    codigo: 'SRV-004',
    nome: 'Solda em Escapamento / Silencioso / Suporte',
    categoria: 'SOLDA_SERRALHERIA',
    valorSugerido: 95,
    tempoEstimadoMinutos: 40,
    descricaoPadrao: 'Vedação de furo ou fixação de flange/suporte de escapamento.',
  },
  {
    id: 'srv-5',
    codigo: 'SRV-005',
    nome: 'Serviço de Bancada / Sacar Parafuso Quebrado / Abrir Rosca',
    categoria: 'FERRAMENTAS_BANCADA',
    valorSugerido: 110,
    tempoEstimadoMinutos: 60,
    descricaoPadrao: 'Extração de prisioneiro/parafuso quebrado e reabertura de rosca com macho.',
  },
  {
    id: 'srv-6',
    codigo: 'SRV-006',
    nome: 'Troca de Óleo do Motor e Filtro',
    categoria: 'MECANICA_GERAL',
    valorSugerido: 80,
    tempoEstimadoMinutos: 30,
    descricaoPadrao: 'Esgotamento do óleo usado, substituição do filtro e abastecimento no nível.',
  },
  {
    id: 'srv-7',
    codigo: 'SRV-007',
    nome: 'Substituição de Pastilhas de Freio',
    categoria: 'FREIOS_SUSPENSAO',
    valorSugerido: 140,
    tempoEstimadoMinutos: 60,
    descricaoPadrao: 'Limpeza das pinças, troca do jogo de pastilhas e verificação do fluido.',
  },
  {
    id: 'srv-8',
    codigo: 'SRV-008',
    nome: 'Diagnóstico Eletrônico Computadorizado (Scanner)',
    categoria: 'ELETRICA_DIAGNOSTICO',
    valorSugerido: 120,
    tempoEstimadoMinutos: 40,
    descricaoPadrao: 'Leitura de códigos de falha (DTC) e análise de sensores em tempo real.',
  },
  {
    id: 'srv-9',
    codigo: 'SRV-009',
    nome: 'Revisão Preventiva Geral',
    categoria: 'MECANICA_GERAL',
    valorSugerido: 280,
    tempoEstimadoMinutos: 120,
    descricaoPadrao: 'Inspeção completa de freios, suspensão, correias, velas, filtros e fluidos.',
  },
];

export function obterCatalogoServicos(): ServicoCatalogo[] {
  try {
    const salvo = localStorage.getItem('vortex_catalogo_servicos');
    if (salvo) {
      const parsed = JSON.parse(salvo);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // fallback
  }
  localStorage.setItem('vortex_catalogo_servicos', JSON.stringify(SERVICOS_CATALOGO_PADRAO));
  return SERVICOS_CATALOGO_PADRAO;
}

export function salvarCatalogoServicos(lista: ServicoCatalogo[]) {
  localStorage.setItem('vortex_catalogo_servicos', JSON.stringify(lista));
}

export const CATEGORIAS_SERVICO_LABEL: Record<ServicoCatalogo['categoria'], { label: string; badge: string }> = {
  SOLDA_SERRALHERIA: { label: '🔥 Solda & Serralheria', badge: 'badge-amber' },
  FERRAMENTAS_BANCADA: { label: '🛠️ Ferramentas & Bancada', badge: 'badge-purple' },
  MECANICA_GERAL: { label: '🚗 Mecânica Geral', badge: 'badge-blue' },
  FREIOS_SUSPENSAO: { label: '🛞 Freios & Suspensão', badge: 'badge-green' },
  ELETRICA_DIAGNOSTICO: { label: '⚡ Elétrica & Diagnóstico', badge: 'badge-blue' },
  OUTROS: { label: '📋 Outros Serviços', badge: 'badge-gray' },
};

interface CatalogoServicosModalProps {
  onClose: () => void;
  onSelecionarServico?: (servico: ServicoCatalogo) => void;
}

export const CatalogoServicosModal: React.FC<CatalogoServicosModalProps> = ({
  onClose,
  onSelecionarServico,
}) => {
  const [servicos, setServicos] = useState<ServicoCatalogo[]>(() => obterCatalogoServicos());
  const [busca, setBusca] = useState('');
  const [filtroCat, setFiltroCat] = useState<string>('TODAS');
  const [criandoNovo, setCriandoNovo] = useState(false);

  // Form Novo Serviço
  const [novoNome, setNovoNome] = useState('');
  const [novaCat, setNovaCat] = useState<ServicoCatalogo['categoria']>('SOLDA_SERRALHERIA');
  const [novoValor, setNovoValor] = useState<number>(50);
  const [novoTempo, setNovoTempo] = useState<number>(30);
  const [novaDesc, setNovaDesc] = useState('');

  // Sincroniza o catálogo do PostgreSQL ao abrir o modal
  useEffect(() => {
    apiRequest<ServicoCatalogo[]>('/os/catalogo-servicos')
      .then((res) => {
        if (res.sucesso && Array.isArray(res.dados) && res.dados.length > 0) {
          setServicos(res.dados);
          salvarCatalogoServicos(res.dados);
        }
      })
      .catch(() => {});
  }, []);

  const handleCriarServico = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNome.trim()) return;

    const proximoNum = servicos.length + 1;
    const codigoGerado = `SRV-${String(proximoNum).padStart(3, '0')}`;

    const res = await apiRequest<ServicoCatalogo>('/os/catalogo-servicos', {
      method: 'POST',
      body: JSON.stringify({
        codigo: codigoGerado,
        nome: novoNome.trim(),
        categoria: novaCat,
        valorSugerido: Number(novoValor) || 0,
        tempoEstimadoMinutos: Number(novoTempo) || 30,
        descricaoPadrao: novaDesc.trim() || undefined,
      }),
    });

    const novo: ServicoCatalogo = res.sucesso && res.dados
      ? res.dados
      : {
          id: 'srv-' + Date.now(),
          codigo: codigoGerado,
          nome: novoNome.trim(),
          categoria: novaCat,
          valorSugerido: Number(novoValor) || 0,
          tempoEstimadoMinutos: Number(novoTempo) || 30,
          descricaoPadrao: novaDesc.trim() || undefined,
        };

    const atualizados = [novo, ...servicos.filter((s) => s.codigo !== novo.codigo)];
    setServicos(atualizados);
    salvarCatalogoServicos(atualizados);
    setNovoNome('');
    setNovaDesc('');
    setCriandoNovo(false);
  };

  const handleExcluir = async (id: string) => {
    const atualizados = servicos.filter((s) => s.id !== id);
    setServicos(atualizados);
    salvarCatalogoServicos(atualizados);
    await apiRequest(`/os/catalogo-servicos/${id}`, { method: 'DELETE' }).catch(() => {});
  };

  const servicosFiltrados = servicos.filter((s) => {
    const matchCat = filtroCat === 'TODAS' || s.categoria === filtroCat;
    const termo = busca.trim().toLowerCase();
    const matchBusca =
      !termo ||
      s.nome.toLowerCase().includes(termo) ||
      s.codigo.toLowerCase().includes(termo) ||
      (s.descricaoPadrao || '').toLowerCase().includes(termo);
    return matchCat && matchBusca;
  });

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1300,
        padding: '16px',
      }}
    >
      <div
        className="glass-panel"
        style={{
          maxWidth: '820px',
          width: '100%',
          maxHeight: '90vh',
          background: 'var(--bg-surface)',
          padding: '26px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Wrench size={20} color="var(--primary)" /> Catálogo de Serviços da Oficina
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Cadastre serviços automotivos, soldas, afiações e trabalhos de bancada para lançar em 1 clique nas Ordens de Serviço.
            </p>
          </div>
          <button onClick={onClose} className="btn btn-secondary" style={{ padding: '6px 10px' }}>
            <X size={18} />
          </button>
        </div>

        {/* Barra de Busca + Botão Novo Serviço */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <Search
              size={16}
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              placeholder="Buscar serviço no catálogo (ex: Solda, Rastelo, Foice, Freio, Óleo)..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="input-field"
              style={{ paddingLeft: '36px' }}
            />
          </div>

          <button
            type="button"
            onClick={() => setCriandoNovo(!criandoNovo)}
            className="btn btn-primary"
          >
            <Plus size={16} /> {criandoNovo ? 'Fechar Formulário' : 'Cadastrar Novo Serviço'}
          </button>
        </div>

        {/* Filtros de Categoria */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {[
            { key: 'TODAS', label: 'Todos os Serviços' },
            { key: 'SOLDA_SERRALHERIA', label: '🔥 Solda & Serralheria' },
            { key: 'FERRAMENTAS_BANCADA', label: '🛠️ Ferramentas & Bancada' },
            { key: 'MECANICA_GERAL', label: '🚗 Mecânica Geral' },
            { key: 'FREIOS_SUSPENSAO', label: '🛞 Freios & Suspensão' },
            { key: 'ELETRICA_DIAGNOSTICO', label: '⚡ Elétrica & Scanner' },
          ].map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => setFiltroCat(cat.key)}
              className={`btn ${filtroCat === cat.key ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '5px 12px', fontSize: '0.75rem' }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Formulário de Novo Serviço */}
        {criandoNovo && (
          <form
            onSubmit={handleCriarServico}
            style={{
              background: 'var(--bg-subtle)',
              border: '1px solid var(--primary)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--primary)' }}>
              + Cadastrar Novo Serviço Padronizado na Oficina
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
              <div>
                <label className="input-label">Nome do Serviço *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Solda em Rastelo / Foice / Enxada"
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="input-label">Categoria</label>
                <select
                  value={novaCat}
                  onChange={(e) => setNovaCat(e.target.value as ServicoCatalogo['categoria'])}
                  className="input-field"
                >
                  <option value="SOLDA_SERRALHERIA">🔥 Solda & Serralheria</option>
                  <option value="FERRAMENTAS_BANCADA">🛠️ Ferramentas & Bancada</option>
                  <option value="MECANICA_GERAL">🚗 Mecânica Geral</option>
                  <option value="FREIOS_SUSPENSAO">🛞 Freios & Suspensão</option>
                  <option value="ELETRICA_DIAGNOSTICO">⚡ Elétrica & Diagnóstico</option>
                  <option value="OUTROS">📋 Outros Serviços</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '10px' }}>
              <div>
                <label className="input-label">Valor Base Sugerido (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={novoValor}
                  onChange={(e) => setNovoValor(Number(e.target.value))}
                  className="input-field"
                />
              </div>
              <div>
                <label className="input-label">Tempo Estimado (min)</label>
                <input
                  type="number"
                  min="5"
                  value={novoTempo}
                  onChange={(e) => setNovoTempo(Number(e.target.value))}
                  className="input-field"
                />
              </div>
              <div>
                <label className="input-label">procedimento / Detalhes Padrão (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: Cordão de solda reforçado e esmerilhamento"
                  value={novaDesc}
                  onChange={(e) => setNovaDesc(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" onClick={() => setCriandoNovo(false)} className="btn btn-secondary">
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary">
                <Check size={16} /> Salvar no Catálogo
              </button>
            </div>
          </form>
        )}

        {/* Lista de Serviços */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
          {servicosFiltrados.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Nenhum serviço encontrado com este filtro. Clique em "Cadastrar Novo Serviço" acima.
            </div>
          ) : (
            servicosFiltrados.map((srv) => {
              const catInfo = CATEGORIAS_SERVICO_LABEL[srv.categoria] || CATEGORIAS_SERVICO_LABEL.OUTROS;
              return (
                <div
                  key={srv.id}
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
                  <div style={{ flex: 1, minWidth: '240px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary)', fontFamily: 'monospace' }}>
                        {srv.codigo}
                      </span>
                      <span className={`badge ${catInfo.badge}`} style={{ fontSize: '0.68rem' }}>
                        {catInfo.label}
                      </span>
                      <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>{srv.nome}</span>
                    </div>
                    {srv.descricaoPadrao && (
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                        {srv.descricaoPadrao}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--accent-green)' }}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(srv.valorSugerido)}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        ~{srv.tempoEstimadoMinutos} min
                      </div>
                    </div>

                    {onSelecionarServico && (
                      <button
                        type="button"
                        onClick={() => {
                          onSelecionarServico(srv);
                          onClose();
                        }}
                        className="btn btn-primary"
                        style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                      >
                        <Check size={14} /> Usar na OS
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleExcluir(srv.id)}
                      style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', padding: '4px' }}
                      title="Excluir do catálogo"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

