import React from 'react';
import {
  ClipboardList,
  Stethoscope,
  FileSpreadsheet,
  CheckCircle2,
  Wrench,
  Boxes,
  ShieldCheck,
  CarFront,
  BadgeDollarSign,
} from 'lucide-react';

export const JornadaVisualizer: React.FC = () => {
  const etapas = [
    {
      id: 'recepcao',
      nome: 'Recepção',
      doc: 'HU-008/009',
      desc: 'Queixa do cliente, fotos e checklist de entrada',
      icon: <ClipboardList size={20} />,
      status: 'Projetado (ENT-002)',
      cor: '#38bdf8',
    },
    {
      id: 'diagnostico',
      nome: 'Diagnóstico',
      doc: 'HU-010',
      desc: 'Constatação técnica de falhas e causas',
      icon: <Stethoscope size={20} />,
      status: 'Projetado (ENT-003)',
      cor: '#a855f7',
    },
    {
      id: 'orcamento',
      nome: 'Orçamento',
      doc: 'HU-011',
      desc: 'Versão imutável de peças e mão de obra',
      icon: <FileSpreadsheet size={20} />,
      status: 'Projetado (ENT-003)',
      cor: '#0ea5e9',
    },
    {
      id: 'autorizacao',
      nome: 'Autorização',
      doc: 'HU-012/013',
      desc: 'Aprovação por item e canal rastreável',
      icon: <CheckCircle2 size={20} />,
      status: 'Projetado (ENT-003)',
      cor: '#10b981',
    },
    {
      id: 'os_execucao',
      nome: 'OS & Execução',
      doc: 'HU-014/015',
      desc: 'Planejamento e apontamentos mecânicos',
      icon: <Wrench size={20} />,
      status: 'Projetado (ENT-004)',
      cor: '#f59e0b',
    },
    {
      id: 'estoque',
      nome: 'Estoque',
      doc: 'HU-017/018',
      desc: 'Reserva prévia e consumo efetivo de peças',
      icon: <Boxes size={20} />,
      status: 'Projetado (ENT-004)',
      cor: '#ec4899',
    },
    {
      id: 'inspecao',
      nome: 'Inspeção',
      doc: 'HU-023',
      desc: 'Validação de qualidade pós-serviço',
      icon: <ShieldCheck size={20} />,
      status: 'Projetado (ENT-005)',
      cor: '#6366f1',
    },
    {
      id: 'entrega',
      nome: 'Entrega',
      doc: 'HU-024',
      desc: 'Devolução física ao portador autorizado',
      icon: <CarFront size={20} />,
      status: 'Projetado (ENT-005)',
      cor: '#14b8a6',
    },
    {
      id: 'financeiro',
      nome: 'Financeiro',
      doc: 'HU-020 a 022',
      desc: 'Contas a receber, parcelas e liquidação',
      icon: <BadgeDollarSign size={20} />,
      status: 'Projetado (ENT-005)',
      cor: '#22c55e',
    },
  ];

  return (
    <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
            Espinha Dorsal Operacional — A Jornada do Atendimento
          </h2>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Fluxo oficial de negócios do MVP do Vortex Auto (DOC-001, DOC-003 e DOC-009).
          </p>
        </div>
        <span className="badge badge-green" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
          ENT-001 Fundação: Concluída e Ativa
        </span>
      </div>

      {/* Grid of Steps */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '12px',
        position: 'relative',
      }}>
        {etapas.map((etapa, idx) => (
          <div
            key={etapa.id}
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'all 0.2s ease',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: `${etapa.cor}20`,
                  color: etapa.cor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {etapa.icon}
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600 }}>
                  0{idx + 1}
                </span>
              </div>
              <div style={{ fontWeight: 600, fontSize: '0.98rem', marginBottom: '4px' }}>
                {etapa.nome}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4, marginBottom: '12px' }}>
                {etapa.desc}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{etapa.doc}</span>
              <span style={{ fontSize: '0.68rem', color: etapa.cor, fontWeight: 500 }}>
                {etapa.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
