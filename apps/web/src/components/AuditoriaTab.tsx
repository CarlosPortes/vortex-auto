import React from 'react';
import { History, ShieldAlert, Clock, Globe } from 'lucide-react';
import { RegistroAuditoria } from '../types';

interface AuditoriaTabProps {
  auditorias: RegistroAuditoria[];
  onRefresh: () => void;
}

export const AuditoriaTab: React.FC<AuditoriaTabProps> = ({ auditorias, onRefresh }) => {
  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
            Trilha de Auditoria e Conformidade (HU-029 e DOC-006)
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Registro imutável de todas as operações sensíveis, acessos e autorizações na oficina.
          </p>
        </div>

        <button onClick={onRefresh} className="btn btn-secondary">
          <History size={15} /> Atualizar Log
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {auditorias.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-dim)' }}>
            Nenhum evento registrado ainda para esta unidade.
          </div>
        ) : (
          auditorias.map((item) => {
            const dataFormatada = new Date(item.criadoEm).toLocaleString('pt-BR');
            return (
              <div
                key={item.id}
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  fontSize: '0.86rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'rgba(14, 165, 233, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--primary)',
                  }}>
                    <ShieldAlert size={16} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="badge badge-blue" style={{ fontSize: '0.7rem' }}>{item.operacao}</span>
                      <span>{item.entidade}</span>
                      {item.entidadeId && (
                        <span style={{ color: 'var(--text-dim)', fontSize: '0.74rem' }}>
                          (ID: {item.entidadeId.slice(0, 8)}...)
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Autor: {item.usuario?.nome || 'Sistema / Inicial'} ({item.usuario?.email || 'N/A'})
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: 'var(--text-dim)', fontSize: '0.76rem' }}>
                  {item.ipOrigem && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Globe size={13} /> {item.ipOrigem}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={13} /> {dataFormatada}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
