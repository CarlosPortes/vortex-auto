import React, { useState } from 'react';
import {
  ClipboardList,
  Stethoscope,
  FileSpreadsheet,
  Wrench,
  ShieldCheck,
  CheckCircle2,
  Car,
  User,
  Clock,
  Gauge,
  ArrowRight,
  ExternalLink,
  ShieldAlert,
  DollarSign,
  AlertTriangle,
  Plus,
} from 'lucide-react';
import { Atendimento } from '../types';

interface AtendimentosKanbanProps {
  atendimentos: Atendimento[];
  onAvancarStatus: (id: string, novoStatus: string) => Promise<void>;
  onAbrirDetalhes: (
    atendimento: Atendimento,
    subAba?:
      | 'DIAGNOSTICO'
      | 'ORCAMENTOS'
      | 'APROVACAO'
      | 'ORDEM_SERVICO'
      | 'INSPECAO'
      | 'FINANCEIRO_ENTREGA'
      | 'COMPLEMENTOS_GARANTIA'
  ) => void;
  onNovoAtendimento: () => void;
  loading: boolean;
}

interface ColunaDef {
  id: string;
  titulo: string;
  subtitulo: string;
  icon: React.ReactNode;
  cor: string;
  corBorda: string;
  corBg: string;
  statusList: string[];
  targetStatus: string;
  subAbaRequerida?:
    | 'DIAGNOSTICO'
    | 'ORCAMENTOS'
    | 'APROVACAO'
    | 'ORDEM_SERVICO'
    | 'INSPECAO'
    | 'FINANCEIRO_ENTREGA'
    | 'COMPLEMENTOS_GARANTIA';
}

const COLUNAS: ColunaDef[] = [
  {
    id: 'RECEPCAO',
    titulo: 'Recepção / Entrada',
    subtitulo: 'Check-in e vistoria inicial',
    icon: <ClipboardList size={18} color="#0ea5e9" />,
    cor: '#0ea5e9',
    corBorda: 'rgba(14, 165, 233, 0.4)',
    corBg: 'rgba(14, 165, 233, 0.05)',
    statusList: ['CONFIRMADO', 'RASCUNHO'],
    targetStatus: 'CONFIRMADO',
  },
  {
    id: 'DIAGNOSTICO',
    titulo: 'Diagnóstico Técnico',
    subtitulo: 'Investigação e laudo do técnico',
    icon: <Stethoscope size={18} color="#8b5cf6" />,
    cor: '#8b5cf6',
    corBorda: 'rgba(139, 92, 246, 0.4)',
    corBg: 'rgba(139, 92, 246, 0.05)',
    statusList: ['EM_DIAGNOSTICO'],
    targetStatus: 'EM_DIAGNOSTICO',
    subAbaRequerida: 'DIAGNOSTICO',
  },
  {
    id: 'ORCAMENTO',
    titulo: 'Orçamento & Aprovação',
    subtitulo: 'Proposta e decisão comercial',
    icon: <FileSpreadsheet size={18} color="#f59e0b" />,
    cor: '#f59e0b',
    corBorda: 'rgba(245, 158, 11, 0.4)',
    corBg: 'rgba(245, 158, 11, 0.05)',
    statusList: ['ORCAMENTO_PENDENTE', 'AGUARDANDO_APROVACAO'],
    targetStatus: 'ORCAMENTO_PENDENTE',
    subAbaRequerida: 'ORCAMENTOS',
  },
  {
    id: 'EXECUCAO',
    titulo: 'Execução Mecânica',
    subtitulo: 'Serviços no box e peças',
    icon: <Wrench size={18} color="#3b82f6" />,
    cor: '#3b82f6',
    corBorda: 'rgba(59, 130, 246, 0.4)',
    corBg: 'rgba(59, 130, 246, 0.05)',
    statusList: ['EM_EXECUCAO'],
    targetStatus: 'EM_EXECUCAO',
    subAbaRequerida: 'ORDEM_SERVICO',
  },
  {
    id: 'INSPECAO',
    titulo: 'Inspeção de Qualidade',
    subtitulo: 'Teste e checklist de saída',
    icon: <ShieldCheck size={18} color="#ec4899" />,
    cor: '#ec4899',
    corBorda: 'rgba(236, 72, 153, 0.4)',
    corBg: 'rgba(236, 72, 153, 0.05)',
    statusList: ['AGUARDANDO_INSPECAO'],
    targetStatus: 'AGUARDANDO_INSPECAO',
    subAbaRequerida: 'INSPECAO',
  },
  {
    id: 'ENTREGA',
    titulo: 'Pronto / Entregue',
    subtitulo: 'Quitação e devolução',
    icon: <CheckCircle2 size={18} color="#10b981" />,
    cor: '#10b981',
    corBorda: 'rgba(16, 185, 129, 0.4)',
    corBg: 'rgba(16, 185, 129, 0.05)',
    statusList: ['PRONTO_PARA_ENTREGA', 'ENTREGUE'],
    targetStatus: 'PRONTO_PARA_ENTREGA',
    subAbaRequerida: 'FINANCEIRO_ENTREGA',
  },
];

export const AtendimentosKanban: React.FC<AtendimentosKanbanProps> = ({
  atendimentos,
  onAvancarStatus,
  onAbrirDetalhes,
  onNovoAtendimento,
  loading,
}) => {
  const [draggedAtend, setDraggedAtend] = useState<Atendimento | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);
  const [mensagemRegra, setMensagemRegra] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, atend: Atendimento) => {
    setDraggedAtend(atend);
    e.dataTransfer.setData('text/plain', atend.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedAtend(null);
    setDragOverColumnId(null);
  };

  const handleDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumnId !== colId) {
      setDragOverColumnId(colId);
    }
  };

  const handleDragLeave = (e: React.DragEvent, colId: string) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    if (dragOverColumnId === colId) {
      setDragOverColumnId(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, col: ColunaDef) => {
    e.preventDefault();
    setDragOverColumnId(null);

    if (!draggedAtend) return;

    // Se já está na mesma coluna, ignora
    if (col.statusList.includes(draggedAtend.status)) {
      setDraggedAtend(null);
      return;
    }

    const origemStatus = draggedAtend.status;
    const destinoId = col.id;

    // Regras de Transição e Guardião da Esteira (DOC-003, DOC-004 e DOC-014)

    // 1. De Recepção (CONFIRMADO) -> Diagnóstico (EM_DIAGNOSTICO)
    if (origemStatus === 'CONFIRMADO' && destinoId === 'DIAGNOSTICO') {
      await onAvancarStatus(draggedAtend.id, 'EM_DIAGNOSTICO');
      setDraggedAtend(null);
      return;
    }

    // 2. De Diagnóstico -> Orçamento & Aprovação
    if (destinoId === 'ORCAMENTO') {
      onAbrirDetalhes(draggedAtend, 'ORCAMENTOS');
      setMensagemRegra(
        `Abrindo módulo de Orçamento para ${draggedAtend.codigoFormatado}. Conforme DOC-003 (ORC-C01), elabore ou apresente a proposta comercial para avançar.`
      );
      setDraggedAtend(null);
      return;
    }

    // 3. De Orçamento -> Execução Mecânica
    if (destinoId === 'EXECUCAO') {
      onAbrirDetalhes(draggedAtend, 'ORDEM_SERVICO');
      setMensagemRegra(
        `Abrindo Ordem de Serviço para ${draggedAtend.codigoFormatado}. Conforme DOC-004 (OS-C02), a execução depende da aprovação comercial dos itens.`
      );
      setDraggedAtend(null);
      return;
    }

    // 4. De Execução -> Inspeção de Qualidade
    if (destinoId === 'INSPECAO') {
      onAbrirDetalhes(draggedAtend, 'INSPECAO');
      setMensagemRegra(
        `Abrindo Inspeção Final para ${draggedAtend.codigoFormatado}. Conforme DOC-003, registre o checklist de qualidade e testes.`
      );
      setDraggedAtend(null);
      return;
    }

    // 5. Para Pronto / Entrega
    if (destinoId === 'ENTREGA') {
      onAbrirDetalhes(draggedAtend, 'FINANCEIRO_ENTREGA');
      setMensagemRegra(
        `Abrindo Liberação e Entrega para ${draggedAtend.codigoFormatado}. Conforme DOC-004 (ATE-C01 / HU-022), valide a quitação financeira e o recebedor.`
      );
      setDraggedAtend(null);
      return;
    }

    // 6. Voltar para Recepção ou saltos diretos não autorizados
    if (destinoId === 'RECEPCAO') {
      setMensagemRegra(
        `O atendimento ${draggedAtend.codigoFormatado} já ultrapassou a fase de recepção. Mudanças regressivas devem ser tratadas pelo painel detalhado.`
      );
      setDraggedAtend(null);
      return;
    }

    // Caso genérico de salto direto inválido
    setMensagemRegra(
      `Transição direta não permitida pelas regras da oficina (DOC-003). Abra os detalhes do atendimento para seguir a jornada autorizada.`
    );
    setDraggedAtend(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Alerta de Notificação de Regras da Esteira */}
      {mensagemRegra && (
        <div
          className="glass-panel"
          style={{
            padding: '12px 18px',
            background: 'rgba(14, 165, 233, 0.1)',
            border: '1px solid rgba(14, 165, 233, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            animation: 'fadeIn 0.3s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle size={18} color="#38bdf8" />
            <span style={{ fontSize: '0.85rem', color: '#e0f2fe' }}>{mensagemRegra}</span>
          </div>
          <button
            onClick={() => setMensagemRegra(null)}
            className="btn btn-secondary"
            style={{ padding: '4px 10px', fontSize: '0.75rem' }}
          >
            Entendido
          </button>
        </div>
      )}

      {/* Quadro Kanban Horizontal com Scroll Suave */}
      <div
        className="kanban-board-container"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, minmax(310px, 1fr))',
          gap: '16px',
          overflowX: 'auto',
          paddingBottom: '20px',
          minHeight: '650px',
          alignItems: 'start',
        }}
      >
        {COLUNAS.map((col) => {
          const cardsDaColuna = atendimentos.filter((at) => col.statusList.includes(at.status));
          const isOver = dragOverColumnId === col.id;

          return (
            <div
              key={col.id}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={(e) => handleDragLeave(e, col.id)}
              onDrop={(e) => handleDrop(e, col)}
              className="kanban-column"
              style={{
                background: isOver ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.65)',
                border: isOver ? `2px dashed ${col.cor}` : `1px solid ${col.corBorda}`,
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                minHeight: '600px',
                transition: 'all 0.2s ease',
                boxShadow: isOver ? `0 0 24px ${col.corBg}` : '0 4px 16px rgba(0,0,0,0.25)',
              }}
            >
              {/* Header da Coluna */}
              <div
                style={{
                  padding: '16px 14px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
                  background: col.corBg,
                  borderTopLeftRadius: 'var(--radius-md)',
                  borderTopRightRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      padding: '6px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {col.icon}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-main)' }}>
                      {col.titulo}
                    </h3>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '1px' }}>
                      {col.subtitulo}
                    </p>
                  </div>
                </div>

                <span
                  style={{
                    background: col.cor,
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '0.75rem',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    minWidth: '24px',
                    textAlign: 'center',
                  }}
                >
                  {cardsDaColuna.length}
                </span>
              </div>

              {/* Corpo da Coluna (Lista de Cards) */}
              <div
                style={{
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  flex: 1,
                }}
              >
                {loading ? (
                  <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                    Atualizando...
                  </div>
                ) : cardsDaColuna.length === 0 ? (
                  <div
                    style={{
                      padding: '30px 10px',
                      textAlign: 'center',
                      color: 'var(--text-dim)',
                      fontSize: '0.78rem',
                      border: '1px dashed rgba(255, 255, 255, 0.06)',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(255, 255, 255, 0.01)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <span>Nenhum veículo nesta etapa</span>
                    {col.id === 'RECEPCAO' && (
                      <button
                        onClick={onNovoAtendimento}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.72rem', padding: '4px 10px' }}
                      >
                        <Plus size={12} /> Novo Atendimento
                      </button>
                    )}
                  </div>
                ) : (
                  cardsDaColuna.map((atend) => {
                    const isDraggingThis = draggedAtend?.id === atend.id;
                    const temGarantia = atend.garantiaGerada || (atend.garantiasOrigem && atend.garantiasOrigem.length > 0);
                    const cobrancaStatus = atend.cobranca?.status;

                    return (
                      <div
                        key={atend.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, atend)}
                        onDragEnd={handleDragEnd}
                        className="kanban-card"
                        style={{
                          background: 'rgba(30, 41, 59, 0.85)',
                          border: isDraggingThis
                            ? `2px solid ${col.cor}`
                            : '1px solid rgba(255, 255, 255, 0.09)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '14px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                          cursor: 'grab',
                          opacity: isDraggingThis ? 0.45 : 1,
                          transform: isDraggingThis ? 'scale(0.97)' : 'none',
                          transition: 'all 0.18s ease',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.28)',
                        }}
                      >
                        {/* Top: Código do Atendimento e Placa Padrão Mercosul */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span
                            style={{
                              fontSize: '0.88rem',
                              fontWeight: 800,
                              color: col.cor,
                              fontFamily: 'var(--font-heading)',
                            }}
                          >
                            {atend.codigoFormatado}
                          </span>

                          {/* Placa Mercosul Estilizada */}
                          <div
                            style={{
                              display: 'inline-flex',
                              flexDirection: 'column',
                              background: '#ffffff',
                              border: '1.5px solid #1e3a8a',
                              borderRadius: '4px',
                              overflow: 'hidden',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                            }}
                          >
                            <div
                              style={{
                                background: '#1e3a8a',
                                color: '#ffffff',
                                fontSize: '0.45rem',
                                fontWeight: 900,
                                textAlign: 'center',
                                padding: '1px 4px',
                                letterSpacing: '0.5px',
                              }}
                            >
                              BRASIL
                            </div>
                            <div
                              style={{
                                color: '#111827',
                                fontFamily: 'monospace',
                                fontWeight: 900,
                                fontSize: '0.74rem',
                                padding: '0px 5px',
                                letterSpacing: '1px',
                                textAlign: 'center',
                              }}
                            >
                              {atend.veiculo.placa}
                            </div>
                          </div>
                        </div>

                        {/* Veículo & Cliente */}
                        <div>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '0.88rem',
                              fontWeight: 700,
                              color: 'var(--text-main)',
                            }}
                          >
                            <Car size={15} color="var(--primary)" />
                            {atend.veiculo.marca} {atend.veiculo.modelo}
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '0.76rem',
                              color: 'var(--text-muted)',
                              marginTop: '3px',
                            }}
                          >
                            <User size={13} />
                            {atend.cliente.nomeRazao}
                          </div>
                        </div>

                        {/* Queixa Resumida */}
                        <div
                          style={{
                            background: 'rgba(0, 0, 0, 0.22)',
                            padding: '6px 8px',
                            borderRadius: '4px',
                            fontSize: '0.74rem',
                            color: 'var(--text-muted)',
                            lineHeight: 1.3,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            borderLeft: `2px solid ${col.cor}`,
                          }}
                        >
                          "{atend.queixaPrincipal}"
                        </div>

                        {/* Badges de Medição & Financeiro */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                          {atend.medicao && (
                            <span
                              style={{
                                fontSize: '0.68rem',
                                background: 'rgba(255, 255, 255, 0.05)',
                                color: 'var(--text-dim)',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                              }}
                            >
                              <Gauge size={11} color="#38bdf8" />
                              {atend.medicao.quilometragem.toLocaleString()} km
                            </span>
                          )}

                          {cobrancaStatus === 'QUITADA' && (
                            <span className="badge badge-green" style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                              <DollarSign size={10} /> Quitado
                            </span>
                          )}

                          {cobrancaStatus === 'PENDENTE' && (
                            <span className="badge badge-amber" style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                              <DollarSign size={10} /> Aberto
                            </span>
                          )}

                          {temGarantia && (
                            <span className="badge badge-purple" style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                              <ShieldAlert size={10} /> Garantia
                            </span>
                          )}
                        </div>

                        {/* Footer do Card com Botões Rápidos */}
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                            paddingTop: '8px',
                            marginTop: '2px',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '0.68rem',
                              color: 'var(--text-dim)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Clock size={11} />
                            {new Date(atend.dataEntrada).toLocaleDateString('pt-BR')}
                          </span>

                          <div style={{ display: 'flex', gap: '6px' }}>
                            {/* Botão de Abrir Detalhes na Sub-Aba Correta */}
                            <button
                              onClick={() => onAbrirDetalhes(atend, col.subAbaRequerida || 'DIAGNOSTICO')}
                              className="btn btn-secondary"
                              title="Abrir detalhes operacionais"
                              style={{
                                padding: '4px 8px',
                                fontSize: '0.72rem',
                                background: 'rgba(255, 255, 255, 0.05)',
                              }}
                            >
                              <ExternalLink size={12} /> Detalhes
                            </button>

                            {/* Botão de Avanço Rápido Contextual */}
                            {atend.status === 'CONFIRMADO' && (
                              <button
                                onClick={() => onAvancarStatus(atend.id, 'EM_DIAGNOSTICO')}
                                className="btn btn-primary"
                                title="Iniciar Diagnóstico"
                                style={{
                                  padding: '4px 8px',
                                  fontSize: '0.72rem',
                                }}
                              >
                                Diagnosticar <ArrowRight size={11} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
