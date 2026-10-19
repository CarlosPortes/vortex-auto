import React, { useState } from 'react';
import {
  Sparkles,
  Camera,
  CheckCircle2,
  XCircle,
  Zap,
  Info,
  Sliders,
} from 'lucide-react';
import { useDemoPlan } from '../context/DemoPlanContext';

export const DemoPlanBar: React.FC = () => {
  const { planoAtivo, comFotos, setPlanoAtivo, setComFotos, infoPlano } = useDemoPlan();
  const [modalComparativo, setModalComparativo] = useState(false);

  return (
    <>
      {/* Barra de Demonstração Comercial */}
      <div
        className="glass-panel"
        style={{
          marginBottom: '20px',
          padding: '12px 20px',
          background: 'linear-gradient(90deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.85))',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.35)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px',
        }}
      >
        {/* Esquerda: Identificação do Modo Apresentação */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: `rgba(${planoAtivo === 'BASICO' ? '16, 185, 129' : planoAtivo === 'INTERMEDIARIO' ? '245, 158, 11' : '14, 165, 233'}, 0.2)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: infoPlano.corHex,
              border: `1px solid ${infoPlano.corHex}55`,
            }}
          >
            <Sliders size={18} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                Demonstração Comercial • Selecione o Pacote:
              </span>
              <span className={`badge ${infoPlano.badgeCor}`} style={{ fontSize: '0.72rem', padding: '2px 8px' }}>
                {infoPlano.nome}
              </span>
            </div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginTop: '2px' }}>
              {infoPlano.tagline}
            </div>
          </div>
        </div>

        {/* Centro: Switcher dos 3 Pacotes */}
        <div
          style={{
            display: 'inline-flex',
            background: 'rgba(0, 0, 0, 0.4)',
            padding: '4px',
            borderRadius: '12px',
            border: '1px solid var(--border-subtle)',
            gap: '4px',
          }}
        >
          <button
            type="button"
            onClick={() => setPlanoAtivo('BASICO')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '0.8rem',
              fontWeight: planoAtivo === 'BASICO' ? 700 : 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s',
              background: planoAtivo === 'BASICO' ? '#10b981' : 'transparent',
              color: planoAtivo === 'BASICO' ? '#ffffff' : 'var(--text-muted)',
              boxShadow: planoAtivo === 'BASICO' ? '0 2px 8px rgba(16, 185, 129, 0.4)' : 'none',
            }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: planoAtivo === 'BASICO' ? '#ffffff' : '#10b981' }} />
            🟢 Básico
          </button>

          <button
            type="button"
            onClick={() => setPlanoAtivo('INTERMEDIARIO')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '0.8rem',
              fontWeight: planoAtivo === 'INTERMEDIARIO' ? 700 : 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s',
              background: planoAtivo === 'INTERMEDIARIO' ? '#f59e0b' : 'transparent',
              color: planoAtivo === 'INTERMEDIARIO' ? '#000000' : 'var(--text-muted)',
              boxShadow: planoAtivo === 'INTERMEDIARIO' ? '0 2px 8px rgba(245, 158, 11, 0.4)' : 'none',
            }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: planoAtivo === 'INTERMEDIARIO' ? '#000000' : '#f59e0b' }} />
            🟡 Intermediário
          </button>

          <button
            type="button"
            onClick={() => setPlanoAtivo('AVANCADO')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '0.8rem',
              fontWeight: planoAtivo === 'AVANCADO' ? 700 : 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s',
              background: planoAtivo === 'AVANCADO' ? 'linear-gradient(135deg, #0ea5e9, #2563eb)' : 'transparent',
              color: '#ffffff',
              boxShadow: planoAtivo === 'AVANCADO' ? '0 2px 8px rgba(14, 165, 233, 0.4)' : 'none',
            }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ffffff' }} />
            🔵 Avançado
          </button>
        </div>

        {/* Direita: Switcher de Fotos (Add-on) + Botão de Comparativo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Toggle de Fotos */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(255, 255, 255, 0.04)',
              padding: '4px 12px',
              borderRadius: '10px',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <Camera size={15} color={comFotos ? '#38bdf8' : 'var(--text-muted)'} />
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Fotos:</span>
            <button
              type="button"
              onClick={() => setComFotos(!comFotos)}
              style={{
                background: comFotos ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                border: `1px solid ${comFotos ? '#38bdf8' : 'var(--border-subtle)'}`,
                color: comFotos ? '#38bdf8' : 'var(--text-muted)',
                borderRadius: '6px',
                padding: '3px 8px',
                fontSize: '0.72rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              {comFotos ? '📸 Com Fotos (Add-on)' : '🚫 Sem Fotos'}
            </button>
          </div>

          {/* Botão de Comparativo de Planos */}
          <button
            type="button"
            onClick={() => setModalComparativo(true)}
            className="btn btn-secondary"
            style={{
              padding: '6px 12px',
              fontSize: '0.78rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              borderColor: 'rgba(56, 189, 248, 0.3)',
            }}
          >
            <Info size={14} color="#38bdf8" /> Comparar Pacotes
          </button>
        </div>
      </div>

      {/* Modal Tabela Comparativa dos 3 Pacotes */}
      {modalComparativo && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1200,
            padding: '20px',
          }}
        >
          <div
            className="glass-panel"
            style={{
              maxWidth: '960px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '28px',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={20} color="#38bdf8" /> Estratégia Comercial • Os 3 Pacotes do Vortex Auto
                </h3>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Apresente a solução ideal para cada perfil de oficina e promova o crescimento gradual (*Land & Expand*).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalComparativo(false)}
                className="btn btn-secondary"
                style={{ padding: '6px 10px' }}
              >
                ✕
              </button>
            </div>

            {/* Tabela de Comparação */}
            <div style={{ overflowX: 'auto', marginTop: '16px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '2px solid var(--border-subtle)' }}>
                    <th style={{ textAlign: 'left', padding: '12px 14px', width: '34%' }}>FUNCIONALIDADES & RECURSOS</th>
                    <th style={{ textAlign: 'center', padding: '12px 14px', width: '22%', color: '#10b981', borderLeft: '1px solid var(--border-subtle)' }}>
                      🟢 BÁSICO<br />
                      <span style={{ fontSize: '0.7rem', fontWeight: 400, color: 'var(--text-muted)' }}>"Substitui a Planilha"</span>
                    </th>
                    <th style={{ textAlign: 'center', padding: '12px 14px', width: '22%', color: '#f59e0b', borderLeft: '1px solid var(--border-subtle)' }}>
                      🟡 INTERMEDIÁRIO<br />
                      <span style={{ fontSize: '0.7rem', fontWeight: 400, color: 'var(--text-muted)' }}>"Gestão com Estoque"</span>
                    </th>
                    <th style={{ textAlign: 'center', padding: '12px 14px', width: '22%', color: '#0ea5e9', borderLeft: '1px solid var(--border-subtle)' }}>
                      🔵 AVANÇADO<br />
                      <span style={{ fontSize: '0.7rem', fontWeight: 400, color: 'var(--text-muted)' }}>"ERP Automotivo Completo"</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* Linha 1 */}
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>Recepção do Veículo & Queixa do Cliente</td>
                    <td style={{ textAlign: 'center', padding: '10px 14px', borderLeft: '1px solid var(--border-subtle)' }}>
                      <CheckCircle2 size={16} color="#10b981" style={{ margin: '0 auto' }} />
                    </td>
                    <td style={{ textAlign: 'center', padding: '10px 14px', borderLeft: '1px solid var(--border-subtle)' }}>
                      <CheckCircle2 size={16} color="#10b981" style={{ margin: '0 auto' }} />
                    </td>
                    <td style={{ textAlign: 'center', padding: '10px 14px', borderLeft: '1px solid var(--border-subtle)' }}>
                      <CheckCircle2 size={16} color="#10b981" style={{ margin: '0 auto' }} />
                    </td>
                  </tr>

                  {/* Linha 2 */}
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.01)' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>
                      Ordem de Serviço (OS) com Itens Livres
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Sem necessidade de cadastrar peças antes</div>
                    </td>
                    <td style={{ textAlign: 'center', padding: '10px 14px', borderLeft: '1px solid var(--border-subtle)', color: '#34d399', fontWeight: 600 }}>
                      ✅ Modo Rápido (Texto e Valor)
                    </td>
                    <td style={{ textAlign: 'center', padding: '10px 14px', borderLeft: '1px solid var(--border-subtle)' }}>
                      ✅ Modo Rápido ou c/ Estoque
                    </td>
                    <td style={{ textAlign: 'center', padding: '10px 14px', borderLeft: '1px solid var(--border-subtle)' }}>
                      ✅ Modo Rápido ou c/ Estoque
                    </td>
                  </tr>

                  {/* Linha 3 */}
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>
                      Controle Integrado de Estoque & Peças
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Saldos, entradas/saídas, alerta de mínimo</div>
                    </td>
                    <td style={{ textAlign: 'center', padding: '10px 14px', borderLeft: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                      <XCircle size={16} color="#ef4444" style={{ margin: '0 auto' }} /> Desativado
                    </td>
                    <td style={{ textAlign: 'center', padding: '10px 14px', borderLeft: '1px solid var(--border-subtle)', color: '#f59e0b', fontWeight: 600 }}>
                      <CheckCircle2 size={16} color="#f59e0b" style={{ margin: '0 auto' }} /> Estoque Completo
                    </td>
                    <td style={{ textAlign: 'center', padding: '10px 14px', borderLeft: '1px solid var(--border-subtle)', color: '#0ea5e9', fontWeight: 600 }}>
                      <CheckCircle2 size={16} color="#0ea5e9" style={{ margin: '0 auto' }} /> Estoque + WMS
                    </td>
                  </tr>

                  {/* Linha 4 */}
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.01)' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>
                      Fechamento Financeiro & Embutir Taxas Maquininha
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Calculadora de repasse de taxas de cartão / PIX</div>
                    </td>
                    <td style={{ textAlign: 'center', padding: '10px 14px', borderLeft: '1px solid var(--border-subtle)' }}>
                      <CheckCircle2 size={16} color="#10b981" style={{ margin: '0 auto' }} />
                    </td>
                    <td style={{ textAlign: 'center', padding: '10px 14px', borderLeft: '1px solid var(--border-subtle)' }}>
                      <CheckCircle2 size={16} color="#10b981" style={{ margin: '0 auto' }} />
                    </td>
                    <td style={{ textAlign: 'center', padding: '10px 14px', borderLeft: '1px solid var(--border-subtle)' }}>
                      <CheckCircle2 size={16} color="#10b981" style={{ margin: '0 auto' }} />
                    </td>
                  </tr>

                  {/* Linha 5 */}
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>
                      Compras & Reposição MRP (Importador XML NF-e)
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Importa nota do distribuidor automaticamente</div>
                    </td>
                    <td style={{ textAlign: 'center', padding: '10px 14px', borderLeft: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                      <XCircle size={16} color="#ef4444" style={{ margin: '0 auto' }} />
                    </td>
                    <td style={{ textAlign: 'center', padding: '10px 14px', borderLeft: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                      <XCircle size={16} color="#ef4444" style={{ margin: '0 auto' }} />
                    </td>
                    <td style={{ textAlign: 'center', padding: '10px 14px', borderLeft: '1px solid var(--border-subtle)' }}>
                      <CheckCircle2 size={16} color="#0ea5e9" style={{ margin: '0 auto' }} />
                    </td>
                  </tr>

                  {/* Linha 6 */}
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.01)' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>
                      Vendas Balcão (PDV sem Veículo)
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Venda rápida de peças no balcão</div>
                    </td>
                    <td style={{ textAlign: 'center', padding: '10px 14px', borderLeft: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                      <XCircle size={16} color="#ef4444" style={{ margin: '0 auto' }} />
                    </td>
                    <td style={{ textAlign: 'center', padding: '10px 14px', borderLeft: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                      <XCircle size={16} color="#ef4444" style={{ margin: '0 auto' }} />
                    </td>
                    <td style={{ textAlign: 'center', padding: '10px 14px', borderLeft: '1px solid var(--border-subtle)' }}>
                      <CheckCircle2 size={16} color="#0ea5e9" style={{ margin: '0 auto' }} />
                    </td>
                  </tr>

                  {/* Linha 7 */}
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>
                      Relatórios Gerenciais, BI e Auditoria ISO
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Margens reais, DRE e produtividade mecânica</div>
                    </td>
                    <td style={{ textAlign: 'center', padding: '10px 14px', borderLeft: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                      Resumo Simples
                    </td>
                    <td style={{ textAlign: 'center', padding: '10px 14px', borderLeft: '1px solid var(--border-subtle)' }}>
                      Relatório de Peças
                    </td>
                    <td style={{ textAlign: 'center', padding: '10px 14px', borderLeft: '1px solid var(--border-subtle)' }}>
                      <CheckCircle2 size={16} color="#0ea5e9" style={{ margin: '0 auto' }} /> BI Completo
                    </td>
                  </tr>

                  {/* Linha 8: Fotos */}
                  <tr style={{ background: 'rgba(56, 189, 248, 0.05)' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: '#38bdf8' }}>
                      📸 Vistoria Fotográfica do Veículo & Peças
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Resguardo jurídico contra danos prévios</div>
                    </td>
                    <td style={{ textAlign: 'center', padding: '12px 14px', borderLeft: '1px solid var(--border-subtle)' }}>
                      <span className="badge badge-secondary" style={{ fontSize: '0.7rem' }}>Opcional / Add-on</span>
                    </td>
                    <td style={{ textAlign: 'center', padding: '12px 14px', borderLeft: '1px solid var(--border-subtle)' }}>
                      <span className="badge badge-amber" style={{ fontSize: '0.7rem' }}>Incluso (Até 5GB)</span>
                    </td>
                    <td style={{ textAlign: 'center', padding: '12px 14px', borderLeft: '1px solid var(--border-subtle)' }}>
                      <span className="badge badge-blue" style={{ fontSize: '0.7rem' }}>Incluso em Alta Resolução</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Dica Estratégica para o Sócio */}
            <div
              style={{
                marginTop: '20px',
                padding: '14px 18px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start',
              }}
            >
              <Zap size={20} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '0.82rem', lineHeight: 1.5 }}>
                <strong style={{ color: '#10b981' }}>Dica de Ouro para a Apresentação Comercial:</strong> Comece demonstrando o <strong>Plano Básico</strong> para o dono da oficina sentir que não haverá trabalho cadastrando peças. Quando ele se encantar com a facilidade da OS e das maquininhas, mostre o <strong>Intermediário</strong> como o próximo passo de maturação da oficina dele!
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                type="button"
                onClick={() => setModalComparativo(false)}
                className="btn btn-primary"
              >
                Entendido, Continuar Demonstração
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
