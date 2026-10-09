import React, { useState, useEffect } from 'react';
import {
  Users,
  Car,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  AlertCircle,
  X,
} from 'lucide-react';
import { Cliente, CategoriaVeiculo } from '../types';
import { apiRequest } from '../api';

export const ClientesVeiculosTab: React.FC = () => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [categorias, setCategorias] = useState<CategoriaVeiculo[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');

  // Modais
  const [modalClienteAberto, setModalClienteAberto] = useState(false);
  const [modalVeiculoAberto, setModalVeiculoAberto] = useState(false);
  const [clienteSelecionadoParaVeiculo, setClienteSelecionadoParaVeiculo] = useState<string>('');

  // Form Novo Cliente
  const [tipoPessoa, setTipoPessoa] = useState<'FISICA' | 'JURIDICA'>('FISICA');
  const [nomeRazao, setNomeRazao] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [cidade, setCidade] = useState('');
  const [uf, setUf] = useState('SP');

  // Form Novo Veículo
  const [placa, setPlaca] = useState('');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [anoFabricacao, setAnoFabricacao] = useState(2022);
  const [cor, setCor] = useState('');
  const [categoriaCodigo, setCategoriaCodigo] = useState('PASSEIO');

  const [formLoading, setFormLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const carregarDados = async () => {
    setLoading(true);
    let url = '/clientes';
    if (busca.trim()) {
      url += `?busca=${encodeURIComponent(busca.trim())}`;
    }
    const [resCli, resCat] = await Promise.all([
      apiRequest<Cliente[]>(url),
      apiRequest<CategoriaVeiculo[]>('/veiculos/categorias'),
    ]);

    if (resCli.sucesso && resCli.dados) {
      setClientes(resCli.dados);
    }
    if (resCat.sucesso && resCat.dados) {
      setCategorias(resCat.dados);
    }
    setLoading(false);
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const handleBuscar = (e: React.FormEvent) => {
    e.preventDefault();
    carregarDados();
  };

  const handleCadastrarCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setErrorMsg('');

    const res = await apiRequest('/clientes', {
      method: 'POST',
      body: JSON.stringify({
        tipo: tipoPessoa,
        nomeRazao,
        cpfCnpj,
        telefone,
        email,
        cidade,
        uf,
      }),
    });

    setFormLoading(false);
    if (res.sucesso) {
      setModalClienteAberto(false);
      setNomeRazao('');
      setCpfCnpj('');
      setTelefone('');
      setEmail('');
      carregarDados();
    } else {
      setErrorMsg(res.mensagem || 'Falha ao cadastrar cliente');
    }
  };

  const handleCadastrarVeiculo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteSelecionadoParaVeiculo) {
      setErrorMsg('Selecione um cliente.');
      return;
    }

    setFormLoading(true);
    setErrorMsg('');

    const res = await apiRequest('/veiculos', {
      method: 'POST',
      body: JSON.stringify({
        placa,
        marca,
        modelo,
        anoFabricacao: Number(anoFabricacao),
        cor,
        categoriaCodigo,
        clienteId: clienteSelecionadoParaVeiculo,
      }),
    });

    setFormLoading(false);
    if (res.sucesso) {
      setModalVeiculoAberto(false);
      setPlaca('');
      setMarca('');
      setModelo('');
      setCor('');
      carregarDados();
    } else {
      setErrorMsg(res.mensagem || 'Falha ao cadastrar veículo');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header */}
      <div className="glass-panel" style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
            Clientes e Veículos Cadastrados (HU-006 e HU-007)
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Base de clientes da oficina e vínculo com suas frotas ou veículos particulares.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <form onSubmit={handleBuscar} style={{ display: 'flex', gap: '8px' }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar cliente por nome ou documento..."
                className="input-field"
                style={{ width: '260px', paddingLeft: '34px' }}
              />
              <Search size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '10px', top: '12px' }} />
            </div>
            <button type="submit" className="btn btn-secondary">
              Buscar
            </button>
          </form>

          <button onClick={() => setModalClienteAberto(true)} className="btn btn-primary">
            <Plus size={16} /> Novo Cliente
          </button>
        </div>
      </div>

      {/* Lista de Clientes com seus veículos */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Carregando base de clientes...
        </div>
      ) : clientes.length === 0 ? (
        <div className="glass-panel" style={{ padding: '50px', textAlign: 'center' }}>
          <Users size={38} color="var(--text-dim)" style={{ marginBottom: '10px' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Nenhum cliente cadastrado</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Cadastre o primeiro cliente da oficina para associar veículos e abrir ordens de serviço.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
          {clientes.map((c) => (
            <div key={c.id} className="glass-panel" style={{ padding: '22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{c.nomeRazao}</h3>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                      {c.tipo === 'FISICA' ? 'Pessoa Física' : 'Pessoa Jurídica'} • CPF/CNPJ: {c.cpfCnpj}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setClienteSelecionadoParaVeiculo(c.id);
                      setModalVeiculoAberto(true);
                    }}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.72rem', padding: '4px 8px' }}
                    title="Adicionar Veículo a este Cliente"
                  >
                    <Car size={13} /> + Veículo
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Phone size={14} /> {c.telefone}
                  </div>
                  {c.email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Mail size={14} /> {c.email}
                    </div>
                  )}
                  {c.cidade && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MapPin size={14} /> {c.cidade} - {c.uf}
                    </div>
                  )}
                </div>

                {/* Veículos vinculados a este cliente */}
                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                  <div style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '6px' }}>
                    VEÍCULOS VINCULADOS ({c.veiculos?.length || 0}):
                  </div>

                  {c.veiculos && c.veiculos.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {c.veiculos.map((v) => (
                        <div
                          key={v.vinculoId}
                          style={{
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid rgba(255,255,255,0.06)',
                            borderRadius: '6px',
                            padding: '6px 10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontSize: '0.82rem',
                          }}
                        >
                          <span style={{ fontWeight: 600 }}>{v.modelo}</span>
                          <span style={{
                            background: '#0ea5e920',
                            color: '#38bdf8',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            fontSize: '0.78rem'
                          }}>
                            {v.placa}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                      Nenhum veículo vinculado ainda.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Cadastro de Cliente */}
      {modalClienteAberto && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px',
        }}>
          <div className="glass-panel" style={{ width: '500px', background: '#0f172a', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Cadastrar Novo Cliente (HU-006)</h3>
              <button onClick={() => setModalClienteAberto(false)} className="btn btn-secondary" style={{ padding: '6px' }}>
                <X size={16} />
              </button>
            </div>

            {errorMsg && (
              <div style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', padding: '10px', borderRadius: '6px', marginBottom: '12px', fontSize: '0.84rem' }}>
                <AlertCircle size={15} style={{ display: 'inline', marginRight: '6px' }} /> {errorMsg}
              </div>
            )}

            <form onSubmit={handleCadastrarCliente} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label className="input-label">Tipo de Cliente</label>
                <select
                  value={tipoPessoa}
                  onChange={(e) => setTipoPessoa(e.target.value as 'FISICA' | 'JURIDICA')}
                  className="input-field"
                >
                  <option value="FISICA">Pessoa Física (CPF)</option>
                  <option value="JURIDICA">Pessoa Jurídica (CNPJ / Empresa)</option>
                </select>
              </div>

              <div>
                <label className="input-label">Nome Completo ou Razão Social</label>
                <input
                  type="text"
                  required
                  value={nomeRazao}
                  onChange={(e) => setNomeRazao(e.target.value)}
                  placeholder="Ex: João Silva"
                  className="input-field"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label className="input-label">CPF ou CNPJ</label>
                  <input
                    type="text"
                    required
                    value={cpfCnpj}
                    onChange={(e) => setCpfCnpj(e.target.value)}
                    placeholder="000.000.000-00"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="input-label">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    required
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    placeholder="(11) 98888-7777"
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label className="input-label">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="joao@email.com"
                  className="input-field"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
                <div>
                  <label className="input-label">Cidade</label>
                  <input
                    type="text"
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                    placeholder="São Paulo"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="input-label">UF</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={uf}
                    onChange={(e) => setUf(e.target.value.toUpperCase())}
                    placeholder="SP"
                    className="input-field"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setModalClienteAberto(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" disabled={formLoading} className="btn btn-primary">
                  {formLoading ? 'Salvando...' : 'Salvar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cadastro de Veículo */}
      {modalVeiculoAberto && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px',
        }}>
          <div className="glass-panel" style={{ width: '480px', background: '#0f172a', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Cadastrar Veículo (HU-007)</h3>
              <button onClick={() => setModalVeiculoAberto(false)} className="btn btn-secondary" style={{ padding: '6px' }}>
                <X size={16} />
              </button>
            </div>

            {errorMsg && (
              <div style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', padding: '10px', borderRadius: '6px', marginBottom: '12px', fontSize: '0.84rem' }}>
                <AlertCircle size={15} style={{ display: 'inline', marginRight: '6px' }} /> {errorMsg}
              </div>
            )}

            <form onSubmit={handleCadastrarVeiculo} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label className="input-label">Placa do Veículo (Mercosul ou Antiga)</label>
                <input
                  type="text"
                  required
                  value={placa}
                  onChange={(e) => setPlaca(e.target.value.toUpperCase())}
                  placeholder="Ex: ABC1D23"
                  className="input-field"
                  style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label className="input-label">Marca / Montadora</label>
                  <input
                    type="text"
                    required
                    value={marca}
                    onChange={(e) => setMarca(e.target.value)}
                    placeholder="Ex: Toyota"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="input-label">Modelo</label>
                  <input
                    type="text"
                    required
                    value={modelo}
                    onChange={(e) => setModelo(e.target.value)}
                    placeholder="Ex: Corolla XEi"
                    className="input-field"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label className="input-label">Ano Fabricação</label>
                  <input
                    type="number"
                    value={anoFabricacao}
                    onChange={(e) => setAnoFabricacao(Number(e.target.value))}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="input-label">Cor</label>
                  <input
                    type="text"
                    value={cor}
                    onChange={(e) => setCor(e.target.value)}
                    placeholder="Ex: Preto"
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label className="input-label">Categoria do Veículo</label>
                <select
                  value={categoriaCodigo}
                  onChange={(e) => setCategoriaCodigo(e.target.value)}
                  className="input-field"
                >
                  {categorias.map((cat) => (
                    <option key={cat.id} value={cat.codigo}>
                      {cat.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setModalVeiculoAberto(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" disabled={formLoading} className="btn btn-primary">
                  {formLoading ? 'Salvando...' : 'Salvar Veículo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
