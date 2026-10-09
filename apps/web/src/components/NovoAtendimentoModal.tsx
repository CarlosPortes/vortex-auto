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
} from 'lucide-react';
import { apiRequest } from '../api';
import { Cliente, Veiculo } from '../types';

interface NovoAtendimentoModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const NovoAtendimentoModal: React.FC<NovoAtendimentoModalProps> = ({ onClose, onSuccess }) => {
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
            {/* Seleção de Cliente e Veículo */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <User size={14} color="var(--primary)" /> Cliente Contratante
                </label>
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
                <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Car size={14} color="var(--primary)" /> Veículo Atendido
                </label>
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
    </div>
  );
};
