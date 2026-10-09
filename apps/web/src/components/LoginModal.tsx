import React, { useState } from 'react';
import { Wrench, AlertCircle, ArrowRight } from 'lucide-react';
import { apiRequest, setStoredToken } from '../api';

interface LoginModalProps {
  onLoginSuccess: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLoginSuccess }) => {
  const [modo, setModo] = useState<'LOGIN' | 'CADASTRO'>('LOGIN');
  
  // Login State
  const [email, setEmail] = useState('admin@vortexauto.com.br');
  const [senha, setSenha] = useState('admin123');
  
  // Cadastro State
  const [razaoSocial, setRazaoSocial] = useState('');
  const [nomeFantasia, setNomeFantasia] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cidade, setCidade] = useState('');
  const [uf, setUf] = useState('SP');
  const [nomeAdmin, setNomeAdmin] = useState('');
  const [emailAdmin, setEmailAdmin] = useState('');
  const [senhaAdmin, setSenhaAdmin] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const res = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, senha }),
    });

    setLoading(false);
    if (res.sucesso && res.dados?.token) {
      setStoredToken(res.dados.token);
      onLoginSuccess();
    } else {
      setErrorMsg(res.mensagem || 'Credenciais inválidas');
    }
  };

  const handleCadastro = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const res = await apiRequest('/auth/register-company', {
      method: 'POST',
      body: JSON.stringify({
        razaoSocial,
        nomeFantasia,
        cnpj,
        telefone,
        cidade,
        uf,
        nomeUnidade: 'Matriz',
        nomeAdmin,
        emailAdmin,
        senhaAdmin,
      }),
    });

    setLoading(false);
    if (res.sucesso && res.dados?.token) {
      setStoredToken(res.dados.token);
      onLoginSuccess();
    } else {
      setErrorMsg(res.mensagem || 'Falha ao cadastrar oficina');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '460px', padding: '36px', background: '#0b1120' }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #0ea5e9, #2563eb)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 25px rgba(14, 165, 233, 0.45)',
            marginBottom: '14px',
          }}>
            <Wrench size={28} color="#ffffff" />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
            VORTEX <span style={{ color: 'var(--primary)' }}>AUTO</span>
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Plataforma SaaS para Gestão de Oficinas Mecânicas
          </p>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          background: 'rgba(255,255,255,0.04)',
          padding: '4px',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '24px',
        }}>
          <button
            type="button"
            onClick={() => { setModo('LOGIN'); setErrorMsg(''); }}
            style={{
              flex: 1,
              padding: '8px',
              border: 'none',
              borderRadius: '6px',
              background: modo === 'LOGIN' ? 'rgba(14, 165, 233, 0.2)' : 'transparent',
              color: modo === 'LOGIN' ? '#38bdf8' : 'var(--text-muted)',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.86rem',
              transition: 'all 0.2s',
            }}
          >
            Acessar Oficina
          </button>
          <button
            type="button"
            onClick={() => { setModo('CADASTRO'); setErrorMsg(''); }}
            style={{
              flex: 1,
              padding: '8px',
              border: 'none',
              borderRadius: '6px',
              background: modo === 'CADASTRO' ? 'rgba(14, 165, 233, 0.2)' : 'transparent',
              color: modo === 'CADASTRO' ? '#38bdf8' : 'var(--text-muted)',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.86rem',
              transition: 'all 0.2s',
            }}
          >
            Cadastrar Nova Oficina
          </button>
        </div>

        {errorMsg && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            color: '#f87171',
            padding: '10px 14px',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.84rem'
          }}>
            <AlertCircle size={16} /> {errorMsg}
          </div>
        )}

        {modo === 'LOGIN' ? (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label className="input-label">E-mail de Acesso</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="seu.email@oficina.com.br"
              />
            </div>

            <div>
              <label className="input-label">Senha</label>
              <input
                type="password"
                required
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="input-field"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px', marginTop: '8px' }}
            >
              {loading ? 'Autenticando...' : 'Entrar no Sistema'} <ArrowRight size={16} />
            </button>

            <div style={{
              background: 'rgba(14, 165, 233, 0.08)',
              border: '1px solid rgba(14, 165, 233, 0.2)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 14px',
              fontSize: '0.78rem',
              color: 'var(--text-muted)',
              textAlign: 'center',
              marginTop: '10px'
            }}>
              💡 <strong>Ambiente Demonstrativo Local:</strong> As credenciais do administrador da oficina modelo já vêm pré-preenchidas.
            </div>
          </form>
        ) : (
          <form onSubmit={handleCadastro} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label className="input-label">Razão Social da Oficina</label>
              <input
                type="text"
                required
                value={razaoSocial}
                onChange={(e) => setRazaoSocial(e.target.value)}
                placeholder="Ex: Auto Mecânica Premium Ltda"
                className="input-field"
              />
            </div>

            <div>
              <label className="input-label">Nome Fantasia (Opcional)</label>
              <input
                type="text"
                value={nomeFantasia}
                onChange={(e) => setNomeFantasia(e.target.value)}
                placeholder="Ex: Oficina Premium"
                className="input-field"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label className="input-label">CNPJ</label>
                <input
                  type="text"
                  required
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                  placeholder="00.000.000/0001-00"
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
                  placeholder="(11) 99999-9999"
                  className="input-field"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
              <div>
                <label className="input-label">Cidade</label>
                <input
                  type="text"
                  required
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
                  required
                  maxLength={2}
                  value={uf}
                  onChange={(e) => setUf(e.target.value.toUpperCase())}
                  placeholder="SP"
                  className="input-field"
                />
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', marginTop: '6px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary)' }}>
                Dados do Administrador Principal
              </span>
            </div>

            <div>
              <label className="input-label">Nome do Administrador</label>
              <input
                type="text"
                required
                value={nomeAdmin}
                onChange={(e) => setNomeAdmin(e.target.value)}
                placeholder="Carlos Alberto"
                className="input-field"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label className="input-label">E-mail</label>
                <input
                  type="email"
                  required
                  value={emailAdmin}
                  onChange={(e) => setEmailAdmin(e.target.value)}
                  placeholder="carlos@oficina.com"
                  className="input-field"
                />
              </div>
              <div>
                <label className="input-label">Senha</label>
                <input
                  type="password"
                  required
                  value={senhaAdmin}
                  onChange={(e) => setSenhaAdmin(e.target.value)}
                  placeholder="••••••••"
                  className="input-field"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px', marginTop: '10px' }}
            >
              {loading ? 'Criando Oficina...' : 'Concluir Cadastro'} <ArrowRight size={16} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
