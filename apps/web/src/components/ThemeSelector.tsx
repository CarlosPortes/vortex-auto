import React, { useState, useRef, useEffect } from 'react';
import { Palette, Sun, Moon, Check, Sparkles } from 'lucide-react';
import { useTheme, THEMES, ThemeId } from '../context/ThemeContext';

interface ThemeSelectorProps {
  compact?: boolean;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({ compact = false }) => {
  const { temaAtivo, infoTema, setTemaAtivo } = useTheme();
  const [aberto, setAberto] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickFora = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false);
      }
    };
    document.addEventListener('mousedown', handleClickFora);
    return () => document.removeEventListener('mousedown', handleClickFora);
  }, []);

  const listaTemas = Object.values(THEMES);

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setAberto(!aberto)}
        className="btn btn-secondary"
        title="Selecionar Tema Visual da Oficina"
        style={{
          padding: compact ? '7px 12px' : '8px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.8rem',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          background: 'var(--bg-subtle)',
          color: 'var(--text-main)',
        }}
      >
        {infoTema.esquema === 'light' ? (
          <Sun size={16} color="var(--primary)" />
        ) : (
          <Moon size={16} color="var(--primary)" />
        )}
        <span style={{ fontWeight: 600 }}>{infoTema.nome}</span>
        <span
          style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: infoTema.coresPreview.destaque,
            border: '1px solid var(--border-subtle)',
          }}
        />
      </button>

      {aberto && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 8px)',
            width: '310px',
            padding: '14px',
            zIndex: 9999,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-hover)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
            animation: 'fadeIn 0.15s ease',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: '10px',
              marginBottom: '10px',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <span
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                color: 'var(--text-main)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Palette size={15} color="var(--primary)" /> Aparência & Tema Visual
            </span>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>4 opções</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {listaTemas.map((t) => {
              const selecionado = t.id === temaAtivo;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setTemaAtivo(t.id as ThemeId);
                    setAberto(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    width: '100%',
                    textAlign: 'left',
                    padding: '10px',
                    borderRadius: 'var(--radius-sm)',
                    border: selecionado
                      ? '1.5px solid var(--primary)'
                      : '1px solid var(--border-subtle)',
                    background: selecionado ? 'var(--primary-glow)' : 'var(--bg-subtle)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    color: 'var(--text-main)',
                  }}
                >
                  {/* Miniatura de Cores do Tema */}
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      background: t.coresPreview.fundo,
                      border: '1px solid rgba(128, 128, 128, 0.35)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      flexShrink: 0,
                      boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)',
                    }}
                  >
                    <div
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '6px',
                        background: t.coresPreview.card,
                        border: '1px solid rgba(128, 128, 128, 0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <div
                        style={{
                          width: '9px',
                          height: '9px',
                          borderRadius: '50%',
                          background: t.coresPreview.destaque,
                        }}
                      />
                    </div>
                  </div>

                  {/* Textos */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-main)' }}>
                        {t.nome}
                      </span>
                      <span
                        style={{
                          fontSize: '0.62rem',
                          padding: '1px 6px',
                          borderRadius: '999px',
                          fontWeight: 600,
                          background:
                            t.esquema === 'light'
                              ? 'rgba(245, 158, 11, 0.18)'
                              : 'rgba(14, 165, 233, 0.18)',
                          color: t.esquema === 'light' ? 'var(--accent-amber)' : 'var(--primary)',
                        }}
                      >
                        {t.esquema === 'light' ? '☀️ Claro' : '🌙 Escuro'}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: '0.71rem',
                        color: 'var(--text-muted)',
                        marginTop: '2px',
                        lineHeight: 1.25,
                      }}
                    >
                      {t.subtitulo}
                    </div>
                  </div>

                  {selecionado && (
                    <div
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        background: 'var(--primary)',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Check size={13} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div
            style={{
              marginTop: '10px',
              paddingTop: '8px',
              borderTop: '1px solid var(--border-subtle)',
              fontSize: '0.68rem',
              color: 'var(--text-dim)',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <Sparkles size={12} color="var(--primary)" /> Preferência salva automaticamente neste dispositivo.
          </div>
        </div>
      )}
    </div>
  );
};

