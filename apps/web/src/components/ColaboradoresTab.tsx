import React, { useState } from 'react';
import { UserPlus, Check, AlertCircle } from 'lucide-react';
import { Colaborador } from '../types';
import { apiRequest } from '../api';

interface ColaboradoresTabProps {
  colaboradores: Colaborador[];
  onRefresh: () => void;
}

export const ColaboradoresTab: React.FC<ColaboradoresTabProps> = ({ colaboradores, onRefresh }) => {
  const [showModal, setShowModal] = useState(false);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('oficina123');
  const [perfisSelecionados, setPerfisSelecionados] = useState<string[]>(['TECNICO']);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const perfisDisponiveis = [
    { codigo: 'GESTOR', nome: 'Gestor da Oficina' },
    { codigo: 'RECEPCAO', nome: 'Atendente / Recepção' },
    { codigo: 'TECNICO', nome: 'Mecânico / Técnico' },
    { codigo: 'INSPETOR', nome: 'Inspetor de Qualidade' },
    { codigo: 'FINANCEIRO', nome: 'Financeiro' },
  ];

  const handleTogglePerfil = (codigo: string) => {
    if (perfisSelecionados.includes(codigo)) {
      if (perfisSelecionados.length > 1) {
        setPerfisSelecionados(perfisSelecionados.filter((p) => p !== codigo));
      }
    } else {
      setPerfisSelecionados([...perfisSelecionados, codigo]);
    }
  };

  const handleCadastrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const res = await apiRequest('/admin/usuarios', {
      method: 'POST',
      body: JSON.stringify({
        nome,
        email,
        senha,
        perfis: perfisSelecionados,
      }),
    });

    setLoading(false);
    if (res.sucesso) {
      setShowModal(false);
      setNome('');
      setEmail('');
      setPerfisSelecionados(['TECNICO']);
      onRefresh();
    } else {
      setErrorMsg(res.mensagem || 'Falha ao cadastrar colaborador');
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
            Equipe e Perfis de Acesso (HU-004 e DOC-005)
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Controle de papéis, responsabilidades e alçadas da unidade ativa.
          </p>
        </div>

        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          <UserPlus size={16} /> Novo Colaborador
        </button>
      </div>

      {/* Tabela de Colaboradores */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
              <th style={{ padding: '12px 16px' }}>Colaborador</th>
              <th style={{ padding: '12px 16px' }}>E-mail</th>
              <th style={{ padding: '12px 16px' }}>Perfis Atribuídos</th>
              <th style={{ padding: '12px 16px' }}>Alçada de Desconto</th>
              <th style={{ padding: '12px 16px' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {colaboradores.map((colab) => (
              <tr key={colab.vinculoId} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <td style={{ padding: '14px 16px', fontWeight: 600 }}>{colab.nome}</td>
                <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>{colab.email}</td>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {colab.perfis.map((p) => (
                      <span key={p.codigo} className="badge badge-purple" style={{ fontSize: '0.72rem' }}>
                        {p.nome}
                      </span>
                    ))}
                  </div>
                </td>
                <td style={{ padding: '14px 16px', color: 'var(--accent-amber)', fontWeight: 600 }}>
                  {colab.alcadaDesconto > 0 ? `Até ${colab.alcadaDesconto}%` : 'Sem alçada'}
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <span className={`badge ${colab.ativo ? 'badge-green' : 'badge-amber'}`}>
                    {colab.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de Criação */}
      {showModal && (
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
        }}>
          <div className="glass-panel" style={{ width: '480px', padding: '28px', background: '#0f172a' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '6px' }}>
              Adicionar Novo Colaborador
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Cadastre o membro da equipe e atribua as permissões de acordo com a função dele na oficina.
            </p>

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

            <form onSubmit={handleCadastrar} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="input-label">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Carlos Mecânico"
                  className="input-field"
                />
              </div>

              <div>
                <label className="input-label">E-mail Profissional</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="carlos@oficina.com.br"
                  className="input-field"
                />
              </div>

              <div>
                <label className="input-label">Senha Inicial</label>
                <input
                  type="text"
                  required
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label className="input-label" style={{ marginBottom: '8px' }}>Perfis de Acesso (DOC-005)</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {perfisDisponiveis.map((p) => {
                    const selecionado = perfisSelecionados.includes(p.codigo);
                    return (
                      <div
                        key={p.codigo}
                        onClick={() => handleTogglePerfil(p.codigo)}
                        style={{
                          padding: '10px 14px',
                          borderRadius: 'var(--radius-sm)',
                          border: `1px solid ${selecionado ? 'var(--primary)' : 'var(--border-subtle)'}`,
                          background: selecionado ? 'rgba(14, 165, 233, 0.12)' : 'rgba(255,255,255,0.02)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '0.86rem',
                        }}
                      >
                        <span style={{ fontWeight: selecionado ? 600 : 400 }}>{p.nome}</span>
                        {selecionado && <Check size={16} color="var(--primary)" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                >
                  {loading ? 'Salvando...' : 'Salvar Colaborador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
