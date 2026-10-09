import React from 'react';
import { Wrench, Building2, User, LogOut, ShieldCheck } from 'lucide-react';
import { UserTenantContext } from '../types';

interface HeaderProps {
  context: UserTenantContext | null;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ context, onLogout }) => {
  return (
    <header className="glass-panel" style={{ margin: '16px 24px', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          width: '42px',
          height: '42px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #0ea5e9, #2563eb)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 20px rgba(14, 165, 233, 0.4)'
        }}>
          <Wrench size={22} color="#ffffff" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.35rem', fontWeight: 800, fontFamily: 'var(--font-heading)', letterSpacing: '-0.03em' }}>
              VORTEX <span style={{ color: 'var(--primary)' }}>AUTO</span>
            </span>
            <span className="badge badge-blue">MVP v0.1</span>
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
            Plataforma SaaS para Gestão de Oficinas Mecânicas
          </span>
        </div>
      </div>

      {/* Tenant Context Indicator (HU-001) */}
      {context && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'rgba(255, 255, 255, 0.03)',
            padding: '8px 16px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)'
          }}>
            <Building2 size={18} color="var(--primary)" />
            <div>
              <div style={{ fontSize: '0.86rem', fontWeight: 600 }}>{context.razaoSocialEmpresa}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Tenant ID: {context.empresaId.slice(0, 8)}...</div>
            </div>
          </div>

          {/* User Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: 'rgba(14, 165, 233, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(14, 165, 233, 0.3)'
            }}>
              <User size={18} color="var(--primary)" />
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.86rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                {context.nomeUsuario}
                <ShieldCheck size={14} color="#34d399" />
              </div>
              <div style={{ display: 'flex', gap: '4px', marginTop: '2px' }}>
                {context.perfis.map((p) => (
                  <span key={p} className="badge badge-purple" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                    {p}
                  </span>
                ))}
              </div>
            </div>

            <button
              onClick={onLogout}
              className="btn btn-secondary"
              title="Encerrar Sessão"
              style={{ padding: '8px', marginLeft: '6px' }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
