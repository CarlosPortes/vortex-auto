import React, { useEffect, useState } from 'react';
import {
  Users,
  ShieldAlert,
  Database,
  Building,
  CheckCircle2,
  Server,
  Layers,
} from 'lucide-react';
import { Header } from './components/Header';
import { JornadaVisualizer } from './components/JornadaVisualizer';
import { ColaboradoresTab } from './components/ColaboradoresTab';
import { AuditoriaTab } from './components/AuditoriaTab';
import { LoginModal } from './components/LoginModal';
import { apiRequest, clearStoredToken } from './api';
import { UserTenantContext, Colaborador, RegistroAuditoria } from './types';

export const App: React.FC = () => {
  const [context, setContext] = useState<UserTenantContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState<'JORNADA' | 'COLABORADORES' | 'AUDITORIA' | 'SISTEMA'>('JORNADA');

  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [auditorias, setAuditorias] = useState<RegistroAuditoria[]>([]);

  const carregarSessao = async () => {
    setLoading(true);
    const res = await apiRequest<UserTenantContext>('/auth/me');
    if (res.sucesso && res.dados) {
      setContext(res.dados);
      carregarDadosAdmin();
    } else {
      setContext(null);
    }
    setLoading(false);
  };

  const carregarDadosAdmin = async () => {
    const [resColab, resAudit] = await Promise.all([
      apiRequest<Colaborador[]>('/admin/usuarios'),
      apiRequest<RegistroAuditoria[]>('/admin/auditorias'),
    ]);

    if (resColab.sucesso && resColab.dados) {
      setColaboradores(resColab.dados);
    }
    if (resAudit.sucesso && resAudit.dados) {
      setAuditorias(resAudit.dados);
    }
  };

  useEffect(() => {
    carregarSessao();
  }, []);

  const handleLogout = () => {
    clearStoredToken();
    setContext(null);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--primary)' }}>
            Vortex Auto
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '6px' }}>
            Carregando contexto empresarial...
          </div>
        </div>
      </div>
    );
  }

  if (!context) {
    return <LoginModal onLoginSuccess={carregarSessao} />;
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header context={context} onLogout={handleLogout} />

      <main style={{ flex: 1, padding: '0 24px 32px 24px', maxWidth: '1440px', width: '100%', margin: '0 auto' }}>
        {/* KPI Cards — Resumo da Fundação */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}>
          {/* Card 1 */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'rgba(14, 165, 233, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)',
            }}>
              <Building size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Tenant Ativo (Isolamento)</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, marginTop: '2px' }}>
                {context.razaoSocialEmpresa}
              </div>
              <span className="badge badge-green" style={{ marginTop: '6px' }}>
                <CheckCircle2 size={12} /> Isolado & Seguro
              </span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'rgba(16, 185, 129, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#34d399',
            }}>
              <Users size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Equipe da Unidade (HU-004)</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, marginTop: '2px' }}>
                {colaboradores.length} Colaborador{colaboradores.length !== 1 ? 'es' : ''}
              </div>
              <span className="badge badge-blue" style={{ marginTop: '6px' }}>
                RBAC Granular Ativo
              </span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'rgba(245, 158, 11, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-amber)',
            }}>
              <ShieldAlert size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Trilha de Auditoria (HU-029)</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, marginTop: '2px' }}>
                {auditorias.length} Eventos Gravados
              </div>
              <span className="badge badge-amber" style={{ marginTop: '6px' }}>
                Rastreabilidade 100%
              </span>
            </div>
          </div>

          {/* Card 4 */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'rgba(139, 92, 246, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-purple)',
            }}>
              <Database size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Banco de Dados (DOC-015)</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, marginTop: '2px' }}>
                PostgreSQL 18
              </div>
              <span className="badge badge-purple" style={{ marginTop: '6px' }}>
                Transacional ACID
              </span>
            </div>
          </div>
        </div>

        {/* Tab Selector */}
        <div style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '12px',
          marginBottom: '20px',
        }}>
          <button
            onClick={() => setAbaAtiva('JORNADA')}
            className={`btn ${abaAtiva === 'JORNADA' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <Layers size={16} /> Jornada Operacional da Oficina
          </button>

          <button
            onClick={() => setAbaAtiva('COLABORADORES')}
            className={`btn ${abaAtiva === 'COLABORADORES' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <Users size={16} /> Equipe & Perfis (HU-004)
          </button>

          <button
            onClick={() => setAbaAtiva('AUDITORIA')}
            className={`btn ${abaAtiva === 'AUDITORIA' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <ShieldAlert size={16} /> Auditoria Rastreável (HU-029)
          </button>

          <button
            onClick={() => setAbaAtiva('SISTEMA')}
            className={`btn ${abaAtiva === 'SISTEMA' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <Server size={16} /> Arquitetura & Parâmetros
          </button>
        </div>

        {/* Tab Content */}
        {abaAtiva === 'JORNADA' && <JornadaVisualizer />}

        {abaAtiva === 'COLABORADORES' && (
          <ColaboradoresTab colaboradores={colaboradores} onRefresh={carregarDadosAdmin} />
        )}

        {abaAtiva === 'AUDITORIA' && (
          <AuditoriaTab auditorias={auditorias} onRefresh={carregarDadosAdmin} />
        )}

        {abaAtiva === 'SISTEMA' && (
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>
              Fundação Técnica Implementada (ENT-001)
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Parâmetros e diretrizes ativas no backend e banco de dados do Vortex Auto.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '16px',
              }}>
                <div style={{ fontWeight: 600, color: 'var(--primary)', marginBottom: '8px' }}>
                  Isolamento de Dados Multi-Tenant
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  Implementado com defesa em profundidade: validação estrita de token JWT, injeção obrigatória de <code>empresa_id</code> em todas as requisições e isolamento referencial no PostgreSQL.
                </p>
              </div>

              <div style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '16px',
              }}>
                <div style={{ fontWeight: 600, color: 'var(--primary)', marginBottom: '8px' }}>
                  Proteção por Idempotência (HU-002)
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  Suporte nativo ao cabeçalho <code>Idempotency-Key</code>. Previne confirmações duplicadas de orçamentos, aprovações comerciais e baixas de estoque causadas por cliques duplos ou reenvios de rede.
                </p>
              </div>

              <div style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '16px',
              }}>
                <div style={{ fontWeight: 600, color: 'var(--primary)', marginBottom: '8px' }}>
                  Precisão Monetária e Numérica (DEC-006 / DEC-007)
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  Configurado para operações com tipos <code>NUMERIC/DECIMAL</code> exatos sem arredondamento impreciso de ponto flutuante.
                </p>
              </div>

              <div style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '16px',
              }}>
                <div style={{ fontWeight: 600, color: 'var(--primary)', marginBottom: '8px' }}>
                  Próxima Entrega: ENT-002 (Cadastros & Recepção)
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  Histórias HU-006 a HU-009: Cadastro de Clientes, Veículos por placa/chassi e Abertura formal do Atendimento inicial com medições.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
