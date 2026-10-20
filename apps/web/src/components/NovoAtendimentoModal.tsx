import React, { useState, useEffect } from 'react';
import {
  X,
  Car,
  User,
  ClipboardList,
  Gauge,
  Fuel,
  CheckSquare,
  AlertCircle,
  Check,
  Camera,
  UploadCloud,
  Plus,
} from 'lucide-react';
import { apiRequest } from '../api';
import { Cliente, Veiculo } from '../types';
import { useDemoPlan } from '../context/DemoPlanContext';

interface NovoAtendimentoModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const NovoAtendimentoModal: React.FC<NovoAtendimentoModalProps> = ({ onClose, onSuccess }) => {
  const { comFotos } = useDemoPlan();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [loadingListas, setLoadingListas] = useState(true);

  // Form Fields
  const [clienteId, setClienteId] = useState('');
  const [veiculoId, setVeiculoId] = useState('');
  const [queixaPrincipal, setQueixaPrincipal] = useState('');
  const [previsaoEntrega, setPrevisaoEntrega] = useState('');
  const [quilometragem, setQuilometragem] = useState<number>(0);
  const [nivelCombustivel, setNivelCombustivel] = useState('MEIO');
  const [pertencesDeixados, setPertencesDeixados] = useState('');
  const [avariasPrevias, setAvariasPrevias] = useState('');

  // Modais de Cadastro Rápido (Recepção Ágil)
  const [showModalNovoCliente, setShowModalNovoCliente] = useState(false);
  const [novoCliNome, setNovoCliNome] = useState('');
  const [novoCliTelefone, setNovoCliTelefone] = useState('');
  const [novoCliCpfCnpj, setNovoCliCpfCnpj] = useState('');
  const [novoCliEmail, setNovoCliEmail] = useState('');
  const [salvandoNovoCli, setSalvandoNovoCli] = useState(false);

  const [showModalNovoVeiculo, setShowModalNovoVeiculo] = useState(false);
  const [novoVeiPlaca, setNovoVeiPlaca] = useState('');
  const [novoVeiMarca, setNovoVeiMarca] = useState('');
  const [novoVeiModelo, setNovoVeiModelo] = useState('');
  const [novoVeiAno, setNovoVeiAno] = useState(2022);
  const [novoVeiCor, setNovoVeiCor] = useState('Prata');
  const [salvandoNovoVei, setSalvandoNovoVei] = useState(false);

  // Fotos da Vistoria (Disponível quando o Módulo/Add-on de Fotos estiver ativo)
  const [fotosVistoria, setFotosVistoria] = useState<{ id: string; label: string; url: string }[]>([
    { id: '1', label: 'Dianteira / Placa', url: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=300&q=80' },
    { id: '2', label: 'Odômetro / Painel', url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=300&q=80' },
  ]);

  // Checklist
  const [temEstepe, setTemEstepe] = useState(true);
  const [temMacaco, setTemMacaco] = useState(true);
  const [temChaveRoda, setTemChaveRoda] = useState(true);
  const [temManualChaveReserva, setTemManualChaveReserva] = useState(false);

  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setLoadingListas(true);
    const [resCli, resVei] = await Promise.all([
      apiRequest<Cliente[]>('/clientes'),
      apiRequest<Veiculo[]>('/veiculos'),
    ]);

    if (resCli.sucesso && resCli.dados) {
      setClientes(resCli.dados);
      if (resCli.dados.length > 0) {
        setClienteId(resCli.dados[0].id);
      }
    }

    if (resVei.sucesso && resVei.dados) {
      setVeiculos(resVei.dados);
      if (resVei.dados.length > 0) {
        setVeiculoId(resVei.dados[0].id);
      }
    }
    setLoadingListas(false);
  };

  const handleCriarClienteRapido = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoCliNome.trim() || !novoCliTelefone.trim()) return;
    setSalvandoNovoCli(true);
    setErrorMsg('');

    const res = await apiRequest<Cliente>('/clientes', {
      method: 'POST',
      body: JSON.stringify({
        tipo: 'FISICA',
        nomeRazao: novoCliNome.trim(),
        telefone: novoCliTelefone.trim(),
        cpfCnpj: novoCliCpfCnpj.trim() || '00000000000',
        email: novoCliEmail.trim() || undefined,
        cidade: 'São Paulo',
        uf: 'SP',
      }),
    });

    setSalvandoNovoCli(false);
    if (res.sucesso && res.dados) {
      const novo = res.dados;
      setClientes((prev) => [novo, ...prev]);
      setClienteId(novo.id);
      setShowModalNovoCliente(false);
      setNovoCliNome('');
      setNovoCliTelefone('');
      setNovoCliCpfCnpj('');
      setNovoCliEmail('');
    } else {
      setErrorMsg(res.mensagem || 'Falha ao cadastrar cliente rápido');
    }
  };

  const handleCriarVeiculoRapido = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoVeiPlaca.trim() || !novoVeiModelo.trim()) return;
    if (!clienteId) {
      setErrorMsg('Selecione ou cadastre o cliente antes de cadastrar o veículo.');
      return;
    }
    setSalvandoNovoVei(true);
    setErrorMsg('');

    const res = await apiRequest<Veiculo>('/veiculos', {
      method: 'POST',
      body: JSON.stringify({
        clienteId,
        placa: novoVeiPlaca.trim().toUpperCase(),
        marca: novoVeiMarca.trim() || 'Multimarcas',
        modelo: novoVeiModelo.trim(),
        anoFabricacao: Number(novoVeiAno) || 2022,
        anoModelo: Number(novoVeiAno) || 2022,
        cor: novoVeiCor.trim() || 'Prata',
        combustivel: 'FLEX',
        categoriaCodigo: 'PASSEIO',
      }),
    });

    setSalvandoNovoVei(false);
    if (res.sucesso && res.dados) {
      const novo = res.dados;
      setVeiculos((prev) => [novo, ...prev]);
      setVeiculoId(novo.id);
      setShowModalNovoVeiculo(false);
      setNovoVeiPlaca('');
      setNovoVeiMarca('');
      setNovoVeiModelo('');
      setNovoVeiAno(2022);
      setNovoVeiCor('Prata');
    } else {
      setErrorMsg(res.mensagem || 'Falha ao cadastrar veículo rápido');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteId || !veiculoId) {
      setErrorMsg('Selecione o cliente e o veículo.');
      return;
    }

    setLoadingSubmit(true);
    setErrorMsg('');

    const res = await apiRequest('/atendimentos', {
      method: 'POST',
      body: JSON.stringify({
        clienteId,
        veiculoId,
        queixaPrincipal,
        previsaoEntrega: previsaoEntrega ? new Date(previsaoEntrega).toISOString() : undefined,
        quilometragem: Number(quilometragem),
        nivelCombustivel,
        pertencesDeixados,
        avariasPrevias,
        temEstepe,
        temMacaco,
        temChaveRoda,
        temManualChaveReserva,
      }),
    });

    setLoadingSubmit(false);
    if (res.sucesso) {
      onSuccess();
    } else {
      setErrorMsg(res.mensagem || 'Falha ao abrir atendimento');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px',
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '740px',
        maxHeight: '90vh',
        overflowY: 'auto',
        background: '#0d1322',
        padding: '30px',
        borderRadius: 'var(--radius-lg)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ClipboardList size={22} color="var(--primary)" /> Abertura de Atendimento (Recepção)
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Inicie a jornada de serviço com dados do cliente, veículo, medições de entrada e checklist (HU-008/009).
            </p>
          </div>
          <button onClick={onClose} className="btn btn-secondary" style={{ padding: '6px', borderRadius: '50%' }}>
            <X size={18} />
          </button>
        </div>

        {errorMsg && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            color: '#f87171',
            padding: '10px 14px',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.84rem'
          }}>
            <AlertCircle size={16} /> {errorMsg}
          </div>
        )}

        {loadingListas ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Carregando cadastros...
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Seleção de Cliente e Veículo com Ações Rápidas */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: 0 }}>
                    <User size={14} color="var(--primary)" /> Cliente Contratante
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowModalNovoCliente(true)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#38bdf8',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: 0,
                    }}
                  >
                    <Plus size={12} /> + Novo Cliente
                  </button>
                </div>
                <select
                  value={clienteId}
                  onChange={(e) => setClienteId(e.target.value)}
                  className="input-field"
                  required
                >
                  <option value="">Selecione o Cliente...</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nomeRazao} ({c.telefone})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: 0 }}>
                    <Car size={14} color="var(--primary)" /> Veículo Atendido
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (!clienteId) {
                        setErrorMsg('Selecione ou cadastre o cliente antes de adicionar um veículo.');
                        return;
                      }
                      setShowModalNovoVeiculo(true);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#38bdf8',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: 0,
                    }}
                  >
                    <Plus size={12} /> + Novo Veículo
                  </button>
                </div>
                <select
                  value={veiculoId}
                  onChange={(e) => setVeiculoId(e.target.value)}
                  className="input-field"
                  required
                >
                  <option value="">Selecione o Veículo...</option>
                  {veiculos.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.placa} — {v.marca} {v.modelo} ({v.categoria})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Queixa Principal do Cliente */}
            <div>
              <label className="input-label">Relato / Queixa Principal do Cliente (Sintomas informados)</label>
              <textarea
                required
                rows={3}
                value={queixaPrincipal}
                onChange={(e) => setQueixaPrincipal(e.target.value)}
                placeholder="Ex: Barulho na suspensão dianteira ao passar em lombadas, luz da injeção acesa no painel..."
                className="input-field"
                style={{ resize: 'vertical' }}
              />
            </div>

            {/* Medições e Entrada */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#38bdf8', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Gauge size={16} /> Medições de Entrada no Pátio (HU-009)
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="input-label">Quilometragem (KM)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={quilometragem}
                    onChange={(e) => setQuilometragem(Number(e.target.value))}
                    className="input-field"
                    placeholder="Ex: 68500"
                  />
                </div>

                <div>
                  <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Fuel size={14} /> Nível de Combustível
                  </label>
                  <select
                    value={nivelCombustivel}
                    onChange={(e) => setNivelCombustivel(e.target.value)}
                    className="input-field"
                  >
                    <option value="RESERVA">Reserva</option>
                    <option value="UM_QUARTO">1/4 Tanque</option>
                    <option value="MEIO">1/2 Tanque (Meio)</option>
                    <option value="TRES_QUARTOS">3/4 Tanque</option>
                    <option value="CHEIO">Tanque Cheio</option>
                  </select>
                </div>

                <div>
                  <label className="input-label">Previsão Prometida</label>
                  <input
                    type="date"
                    value={previsaoEntrega}
                    onChange={(e) => setPrevisaoEntrega(e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>
            </div>

            {/* Checklist Rápido de Recepção */}
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '14px',
            }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckSquare size={14} color="var(--primary)" /> Checklist Obrigatório de Entrada
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={temEstepe} onChange={(e) => setTemEstepe(e.target.checked)} />
                  Possui Estepe
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={temMacaco} onChange={(e) => setTemMacaco(e.target.checked)} />
                  Possui Macaco
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={temChaveRoda} onChange={(e) => setTemChaveRoda(e.target.checked)} />
                  Chave de Roda
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={temManualChaveReserva} onChange={(e) => setTemManualChaveReserva(e.target.checked)} />
                  Manual / Chave Reserva
                </label>
              </div>
            </div>

            {/* Avarias e Pertences */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label className="input-label">Avarias Prévias na Lataria / Vidros</label>
                <input
                  type="text"
                  value={avariasPrevias}
                  onChange={(e) => setAvariasPrevias(e.target.value)}
                  placeholder="Ex: Risco na porta do motorista, para-brisa trincado"
                  className="input-field"
                />
              </div>

              <div>
                <label className="input-label">Pertences Deixados no Interior</label>
                <input
                  type="text"
                  value={pertencesDeixados}
                  onChange={(e) => setPertencesDeixados(e.target.value)}
                  placeholder="Ex: Cadeira de bebê, cabo de celular no console"
                  className="input-field"
                />
              </div>
            </div>

            {/* Seção Condicional de Fotos da Vistoria */}
            {comFotos ? (
              <div
                style={{
                  background: 'rgba(56, 189, 248, 0.05)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '14px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Camera size={16} /> Vistoria Fotográfica Digital (Add-on de Fotos Ativo)
                  </div>
                  <span className="badge badge-blue" style={{ fontSize: '0.68rem' }}>
                    Resguardo Jurídico
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                  {fotosVistoria.map((f) => (
                    <div
                      key={f.id}
                      style={{
                        position: 'relative',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        border: '1px solid var(--border-subtle)',
                        background: '#000',
                        height: '90px',
                      }}
                    >
                      <img src={f.url} alt={f.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <div
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          background: 'rgba(0,0,0,0.7)',
                          color: '#fff',
                          fontSize: '0.65rem',
                          padding: '2px 4px',
                          textAlign: 'center',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {f.label}
                      </div>
                    </div>
                  ))}

                  <div
                    style={{
                      height: '90px',
                      border: '1px dashed rgba(56, 189, 248, 0.4)',
                      borderRadius: '8px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      background: 'rgba(255,255,255,0.01)',
                      color: 'var(--text-muted)',
                      fontSize: '0.7rem',
                      cursor: 'pointer',
                    }}
                    onClick={() => {
                      const novaFoto = {
                        id: String(Date.now()),
                        label: 'Lataria Lateral',
                        url: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=300&q=80',
                      };
                      setFotosVistoria([...fotosVistoria, novaFoto]);
                    }}
                  >
                    <UploadCloud size={18} color="#38bdf8" />
                    <span>+ Anexar Foto</span>
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px dashed var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.78rem',
                  color: 'var(--text-muted)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Camera size={15} color="var(--text-muted)" />
                  <span>
                    Módulo de Fotos <strong>desativado</strong> para este pacote (otimiza custos de nuvem).
                  </span>
                </div>
                <span className="badge badge-gray" style={{ fontSize: '0.68rem' }}>
                  Opcional / Add-on
                </span>
              </div>
            )}


            {/* Botões */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '14px' }}>
              <button type="button" onClick={onClose} className="btn btn-secondary">
                Cancelar
              </button>
              <button type="submit" disabled={loadingSubmit} className="btn btn-primary" style={{ minWidth: '180px' }}>
                <Check size={16} /> {loadingSubmit ? 'Confirmando...' : 'Confirmar Atendimento'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Submodal: Cadastro Rápido de Cliente */}
      {showModalNovoCliente && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '20px',
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '460px',
              background: '#0f172a',
              border: '1px solid rgba(56, 189, 248, 0.2)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={18} color="var(--primary)" /> Cadastro Rápido de Cliente
              </h3>
              <button
                type="button"
                onClick={() => setShowModalNovoCliente(false)}
                className="btn btn-secondary"
                style={{ padding: '4px', borderRadius: '50%' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCriarClienteRapido} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label className="input-label">Nome Completo / Razão Social *</label>
                <input
                  type="text"
                  required
                  value={novoCliNome}
                  onChange={(e) => setNovoCliNome(e.target.value)}
                  placeholder="Ex: João da Silva"
                  className="input-field"
                  autoFocus
                />
              </div>

              <div>
                <label className="input-label">Telefone / WhatsApp *</label>
                <input
                  type="text"
                  required
                  value={novoCliTelefone}
                  onChange={(e) => setNovoCliTelefone(e.target.value)}
                  placeholder="Ex: (11) 98765-4321"
                  className="input-field"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label className="input-label">CPF / CNPJ (Opcional)</label>
                  <input
                    type="text"
                    value={novoCliCpfCnpj}
                    onChange={(e) => setNovoCliCpfCnpj(e.target.value)}
                    placeholder="000.000.000-00"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="input-label">E-mail (Opcional)</label>
                  <input
                    type="email"
                    value={novoCliEmail}
                    onChange={(e) => setNovoCliEmail(e.target.value)}
                    placeholder="cliente@email.com"
                    className="input-field"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowModalNovoCliente(false)}
                  className="btn btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoNovoCli}
                  className="btn btn-primary"
                >
                  <Check size={16} /> {salvandoNovoCli ? 'Salvando...' : 'Salvar e Selecionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Submodal: Cadastro Rápido de Veículo */}
      {showModalNovoVeiculo && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '20px',
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '460px',
              background: '#0f172a',
              border: '1px solid rgba(56, 189, 248, 0.2)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Car size={18} color="var(--primary)" /> Cadastro Rápido de Veículo
              </h3>
              <button
                type="button"
                onClick={() => setShowModalNovoVeiculo(false)}
                className="btn btn-secondary"
                style={{ padding: '4px', borderRadius: '50%' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCriarVeiculoRapido} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label className="input-label">Placa *</label>
                  <input
                    type="text"
                    required
                    maxLength={8}
                    value={novoVeiPlaca}
                    onChange={(e) => setNovoVeiPlaca(e.target.value.toUpperCase())}
                    placeholder="BRA2E19"
                    className="input-field"
                    style={{ textTransform: 'uppercase', fontWeight: 700 }}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="input-label">Marca (Ex: Toyota)</label>
                  <input
                    type="text"
                    value={novoVeiMarca}
                    onChange={(e) => setNovoVeiMarca(e.target.value)}
                    placeholder="Toyota, Ford, VW..."
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label className="input-label">Modelo *</label>
                <input
                  type="text"
                  required
                  value={novoVeiModelo}
                  onChange={(e) => setNovoVeiModelo(e.target.value)}
                  placeholder="Ex: Corolla XEi 2.0"
                  className="input-field"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label className="input-label">Ano</label>
                  <input
                    type="number"
                    value={novoVeiAno}
                    onChange={(e) => setNovoVeiAno(Number(e.target.value))}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="input-label">Cor</label>
                  <input
                    type="text"
                    value={novoVeiCor}
                    onChange={(e) => setNovoVeiCor(e.target.value)}
                    placeholder="Ex: Prata, Preto"
                    className="input-field"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowModalNovoVeiculo(false)}
                  className="btn btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoNovoVei}
                  className="btn btn-primary"
                >
                  <Check size={16} /> {salvandoNovoVei ? 'Salvando...' : 'Salvar e Selecionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
