import React, { useEffect, useState } from 'react';
import {
  Users,
  ShieldAlert,
  Database,
  Building,
  CheckCircle2,
  Server,
  Layers,
  ClipboardList,
  Car,
  Wrench,
  Package,
  DollarSign,
  TrendingUp,
  ShoppingCart,
  Store,
} from 'lucide-react';
import { Header } from './components/Header';
import { DemoPlanBar } from './components/DemoPlanBar';
import { JornadaVisualizer } from './components/JornadaVisualizer';
import { ColaboradoresTab } from './components/ColaboradoresTab';
import { AuditoriaTab } from './components/AuditoriaTab';
import { AtendimentosTab } from './components/AtendimentosTab';
import { ClientesVeiculosTab } from './components/ClientesVeiculosTab';
import { OrdensServicoTab } from './components/OrdensServicoTab';
import { EstoqueTab } from './components/EstoqueTab';
import { ComprasMRPTab } from './components/ComprasMRPTab';
import { VendasBalcaoTab } from './components/VendasBalcaoTab';
import { FinanceiroTab } from './components/FinanceiroTab';
import { RelatoriosTab } from './components/RelatoriosTab';
import { LoginModal } from './components/LoginModal';
import { apiRequest, clearStoredToken } from './api';
import { UserTenantContext, Colaborador, RegistroAuditoria } from './types';
import { DemoPlanProvider, useDemoPlan } from './context/DemoPlanContext';

const AppContent: React.FC = () => {
  const [context, setContext] = useState<UserTenantContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState<
    | 'ATENDIMENTOS'
    | 'ORDENS_SERVICO'
    | 'ESTOQUE'
    | 'COMPRAS_MRP'
    | 'VENDAS_BALCAO'
    | 'FINANCEIRO'
    | 'RELATORIOS'
    | 'CLIENTES_VEICULOS'
    | 'JORNADA'
    | 'COLABORADORES'
    | 'AUDITORIA'
    | 'SISTEMA'
  >('ATENDIMENTOS');

  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [auditorias, setAuditorias] = useState<RegistroAuditoria[]>([]);

  const { planoAtivo, isAbaPermitida, infoPlano } = useDemoPlan();

  // Quando o plano mudar, se a aba ativa não for suportada no plano atual, volta para ATENDIMENTOS
  useEffect(() => {
    if (!isAbaPermitida(abaAtiva)) {
      setAbaAtiva('ATENDIMENTOS');
    }
  }, [planoAtivo]);

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
        {/* Barra de Seleção dos 3 Perfis de Pacote (Demonstração Comercial) */}
        <DemoPlanBar />

        {/* KPI Cards — Resumo Adaptativo da Oficina de acordo com o Plano Selecionado */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          {/* Card 1: Tenant & Isolamento */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: 'rgba(14, 165, 233, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary)',
              }}
            >
              <Building size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Tenant Ativo (Isolamento)</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, marginTop: '2px' }}>
                {context.razaoSocialEmpresa}
              </div>
              <span className={`badge ${infoPlano.badgeCor}`} style={{ marginTop: '6px' }}>
                <CheckCircle2 size={12} /> {infoPlano.nome}
              </span>
            </div>
          </div>

          {/* Card 2: Equipe ou Foco do Plano */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: 'rgba(16, 185, 129, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#34d399',
              }}
            >
              <Users size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {planoAtivo === 'BASICO' ? 'Objetivo do Pacote' : 'Equipe da Unidade (HU-004)'}
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, marginTop: '2px' }}>
                {planoAtivo === 'BASICO' ? 'Adeus Planilhas' : `${colaboradores.length} Colaborador${colaboradores.length !== 1 ? 'es' : ''}`}
              </div>
              <span className="badge badge-blue" style={{ marginTop: '6px' }}>
                {planoAtivo === 'BASICO' ? 'Foco em Agilidade' : 'RBAC Granular Ativo'}
              </span>
            </div>
          </div>

          {/* Card 3: Segurança / Simplicidade */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: 'rgba(245, 158, 11, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-amber)',
              }}
            >
              <ShieldAlert size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {planoAtivo === 'BASICO' ? 'Ordem de Serviço' : 'Trilha de Auditoria (HU-029)'}
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, marginTop: '2px' }}>
                {planoAtivo === 'BASICO' ? 'Sem Exigir Estoque' : `${auditorias.length} Eventos Gravados`}
              </div>
              <span className="badge badge-amber" style={{ marginTop: '6px' }}>
                {planoAtivo === 'BASICO' ? 'Lançamento Imediato' : 'Rastreabilidade 100%'}
              </span>
            </div>
          </div>

          {/* Card 4: Fechamento / Banco */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: 'rgba(139, 92, 246, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-purple)',
              }}
            >
              {planoAtivo === 'BASICO' ? <DollarSign size={24} /> : <Database size={24} />}
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {planoAtivo === 'BASICO' ? 'Fechamento & PIX' : 'Banco de Dados (DOC-015)'}
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, marginTop: '2px' }}>
                {planoAtivo === 'BASICO' ? 'Repasse Maquininha' : 'PostgreSQL 18'}
              </div>
              <span className="badge badge-purple" style={{ marginTop: '6px' }}>
                {planoAtivo === 'BASICO' ? 'Margem 100% Preservada' : 'Transacional ACID'}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation com Filtro Inteligente de Planos */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: '12px',
            marginBottom: '20px',
            overflowX: 'auto',
          }}
        >
          {isAbaPermitida('ATENDIMENTOS') && (
            <button
              onClick={() => setAbaAtiva('ATENDIMENTOS')}
              className={`btn ${abaAtiva === 'ATENDIMENTOS' ? 'btn-primary' : 'btn-secondary'}`}
            >
              <ClipboardList size={16} /> Atendimentos & Recepção
            </button>
          )}

          {isAbaPermitida('CLIENTES_VEICULOS') && (
            <button
              onClick={() => setAbaAtiva('CLIENTES_VEICULOS')}
              className={`btn ${abaAtiva === 'CLIENTES_VEICULOS' ? 'btn-primary' : 'btn-secondary'}`}
            >
              <Car size={16} /> Clientes & Veículos
            </button>
          )}

          {isAbaPermitida('ORDENS_SERVICO') && (
            <button
              onClick={() => setAbaAtiva('ORDENS_SERVICO')}
              className={`btn ${abaAtiva === 'ORDENS_SERVICO' ? 'btn-primary' : 'btn-secondary'}`}
            >
              <Wrench size={16} /> Ordens de Serviço
            </button>
          )}

          {isAbaPermitida('ESTOQUE') && (
            <button
              onClick={() => setAbaAtiva('ESTOQUE')}
              className={`btn ${abaAtiva === 'ESTOQUE' ? 'btn-primary' : 'btn-secondary'}`}
            >
              <Package size={16} /> Estoque & Peças
            </button>
          )}

          {isAbaPermitida('COMPRAS_MRP') && (
            <button
              onClick={() => setAbaAtiva('COMPRAS_MRP')}
              className={`btn ${abaAtiva === 'COMPRAS_MRP' ? 'btn-primary' : 'btn-secondary'}`}
            >
              <ShoppingCart size={16} /> Compras & MRP (NF-e)
            </button>
          )}

          {isAbaPermitida('VENDAS_BALCAO') && (
            <button
              onClick={() => setAbaAtiva('VENDAS_BALCAO')}
              className={`btn ${abaAtiva === 'VENDAS_BALCAO' ? 'btn-primary' : 'btn-secondary'}`}
            >
              <Store size={16} /> Vendas Balcão (PDV)
            </button>
          )}

          {isAbaPermitida('FINANCEIRO') && (
            <button
              onClick={() => setAbaAtiva('FINANCEIRO')}
              className={`btn ${abaAtiva === 'FINANCEIRO' ? 'btn-primary' : 'btn-secondary'}`}
            >
              <DollarSign size={16} /> Financeiro & Cobranças
            </button>
          )}

          {isAbaPermitida('RELATORIOS') && (
            <button
              onClick={() => setAbaAtiva('RELATORIOS')}
              className={`btn ${abaAtiva === 'RELATORIOS' ? 'btn-primary' : 'btn-secondary'}`}
            >
              <TrendingUp size={16} /> Relatórios & BI
            </button>
          )}

          {isAbaPermitida('JORNADA') && (
            <button
              onClick={() => setAbaAtiva('JORNADA')}
              className={`btn ${abaAtiva === 'JORNADA' ? 'btn-primary' : 'btn-secondary'}`}
            >
              <Layers size={16} /> Visão da Jornada Geral
            </button>
          )}

          {isAbaPermitida('COLABORADORES') && (
            <button
              onClick={() => setAbaAtiva('COLABORADORES')}
              className={`btn ${abaAtiva === 'COLABORADORES' ? 'btn-primary' : 'btn-secondary'}`}
            >
              <Users size={16} /> Equipe & Perfis
            </button>
          )}

          {isAbaPermitida('AUDITORIA') && (
            <button
              onClick={() => setAbaAtiva('AUDITORIA')}
              className={`btn ${abaAtiva === 'AUDITORIA' ? 'btn-primary' : 'btn-secondary'}`}
            >
              <ShieldAlert size={16} /> Auditoria Rastreável
            </button>
          )}

          {isAbaPermitida('SISTEMA') && (
            <button
              onClick={() => setAbaAtiva('SISTEMA')}
              className={`btn ${abaAtiva === 'SISTEMA' ? 'btn-primary' : 'btn-secondary'}`}
            >
              <Server size={16} /> Arquitetura & Parâmetros
            </button>
          )}
        </div>

        {/* Tab Content */}
        {abaAtiva === 'ATENDIMENTOS' && (
          <AtendimentosTab onIrParaClientes={() => setAbaAtiva('CLIENTES_VEICULOS')} />
        )}

        {abaAtiva === 'ORDENS_SERVICO' && <OrdensServicoTab />}

        {abaAtiva === 'ESTOQUE' && isAbaPermitida('ESTOQUE') && <EstoqueTab />}

        {abaAtiva === 'COMPRAS_MRP' && isAbaPermitida('COMPRAS_MRP') && <ComprasMRPTab />}

        {abaAtiva === 'VENDAS_BALCAO' && isAbaPermitida('VENDAS_BALCAO') && <VendasBalcaoTab />}

        {abaAtiva === 'FINANCEIRO' && <FinanceiroTab />}

        {abaAtiva === 'RELATORIOS' && isAbaPermitida('RELATORIOS') && <RelatoriosTab />}

        {abaAtiva === 'CLIENTES_VEICULOS' && isAbaPermitida('CLIENTES_VEICULOS') && <ClientesVeiculosTab />}

        {abaAtiva === 'JORNADA' && isAbaPermitida('JORNADA') && <JornadaVisualizer />}

        {abaAtiva === 'COLABORADORES' && isAbaPermitida('COLABORADORES') && (
          <ColaboradoresTab colaboradores={colaboradores} onRefresh={carregarDadosAdmin} />
        )}

        {abaAtiva === 'AUDITORIA' && isAbaPermitida('AUDITORIA') && (
          <AuditoriaTab auditorias={auditorias} onRefresh={carregarDadosAdmin} />
        )}

        {abaAtiva === 'SISTEMA' && isAbaPermitida('SISTEMA') && (
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>
              Fundação Técnica e Módulos Operacionais (ENT-001 & ENT-002)
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Parâmetros e diretrizes ativas no backend e banco de dados do Vortex Auto.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              <div
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '16px',
                }}
              >
                <div style={{ fontWeight: 600, color: 'var(--primary)', marginBottom: '8px' }}>
                  Isolamento de Dados Multi-Tenant
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  Defesa em profundidade: validação estrita de token JWT, injeção obrigatória de <code>empresa_id</code> em todas as queries e restrições referenciais no PostgreSQL.
                </p>
              </div>

              <div
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '16px',
                }}
              >
                <div style={{ fontWeight: 600, color: 'var(--primary)', marginBottom: '8px' }}>
                  Eixo Central: Atendimento & Medições
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  Geração atômica de código de atendimento legível (ex: <code>AT-2026-0001</code>), medição de odômetro, nível de combustível e checklist de recepção (HU-008/009).
                </p>
              </div>

              <div
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '16px',
                }}
              >
                <div style={{ fontWeight: 600, color: 'var(--primary)', marginBottom: '8px' }}>
                  Estratégia de Monetização SaaS
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  Modularidade em 3 Pacotes (Básico, Intermediário e Avançado) com opcional de fotos para otimização de custos de infraestrutura e retenção de margem comercial.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <DemoPlanProvider>
      <AppContent />
    </DemoPlanProvider>
  );
};
