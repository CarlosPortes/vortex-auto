import React from 'react';
import { Wrench, Building2, User, LogOut, ShieldCheck, Crown } from 'lucide-react';
import { UserTenantContext } from '../types';
import { ThemeSelector } from './ThemeSelector';

interface HeaderProps {
  context: UserTenantContext | null;
  onLogout: () => void;
  onAbrirGestaoOficinas?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ context, onLogout, onAbrirGestaoOficinas }) => {
  return (
    <header
      className="glass-panel"
      style={{
        margin: '16px 24px',
        padding: '14px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        position: 'relative',
        zIndex: 500,
      }}
    >
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          width: '42px',
          height: '42px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, var(--primary), #2563eb)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 20px var(--primary-glow)'
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

      {/* Tenant Context Indicator (HU-001) + Theme Selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <ThemeSelector />

        {context && (
          <>
            {onAbrirGestaoOficinas && (
              <button
                type="button"
                onClick={onAbrirGestaoOficinas}
                className="btn btn-secondary"
                title="Gerenciar todas as oficinas cadastradas e definir o plano de cada uma"
                style={{
                  padding: '8px 14px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  border: '1px solid rgba(245, 158, 11, 0.45)',
                  background: 'rgba(245, 158, 11, 0.1)',
                  color: 'var(--accent-amber)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '7px',
                }}
              >
                <Crown size={15} />
                Oficinas & Planos
              </button>
            )}

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: 'var(--bg-subtle)',
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
                background: 'var(--primary-glow)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--border-subtle)'
              }}>
                <User size={18} color="var(--primary)" />
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.86rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {context.nomeUsuario}
                  <ShieldCheck size={14} color="var(--accent-green)" />
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
          </>
        )}
      </div>
    </header>
  );
};
