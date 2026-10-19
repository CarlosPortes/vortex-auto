import React, { useState } from 'react';
import {
  CheckCircle2,
  X,
  Copy,
  Check,
  Calculator,
} from 'lucide-react';

interface ModalCalculadoraMaquininhaProps {
  valorBase: number;
  onClose: () => void;
  onAplicarValorFinal?: (valorCalculado: number, parcelas: number, taxaAplicada: number, detalhe: string) => void;
}

export const ModalCalculadoraMaquininha: React.FC<ModalCalculadoraMaquininhaProps> = ({
  valorBase,
  onClose,
  onAplicarValorFinal,
}) => {
  const [modalidade, setModalidade] = useState<'PIX' | 'DEBITO' | 'CREDITO_VISTA' | 'PARCELADO'>('PARCELADO');
  const [numParcelas, setNumParcelas] = useState<number>(3);
  const [repassarTaxa, setRepassarTaxa] = useState<boolean>(true);
  const [taxaCustomizada, setTaxaCustomizada] = useState<number | null>(null);
  const [copiado, setCopiado] = useState(false);

  // Taxas padrão de mercado (Stone, PagSeguro, Cielo, InfinitePay)
  const getTaxaPadrao = (): number => {
    switch (modalidade) {
      case 'PIX':
        return 0; // PIX custo zero
      case 'DEBITO':
        return 1.49;
      case 'CREDITO_VISTA':
        return 3.29;
      case 'PARCELADO':
        if (numParcelas === 2) return 4.99;
        if (numParcelas === 3) return 5.89;
        if (numParcelas === 4) return 6.79;
        if (numParcelas === 5) return 7.69;
        if (numParcelas === 6) return 8.59;
        if (numParcelas <= 10) return 11.29;
        return 13.49; // 12x
      default:
        return 0;
    }
  };

  const taxaAplicada = taxaCustomizada !== null ? taxaCustomizada : getTaxaPadrao();

  // Cálculo financeiro de repasse de taxa de maquininha:
  // Para que a oficina receba o valor líquido exato: ValorFinal = ValorBase / (1 - (taxa / 100))
  let valorFinal = valorBase;
  let valorTaxa = 0;

  if (repassarTaxa && taxaAplicada > 0) {
    valorFinal = valorBase / (1 - taxaAplicada / 100);
    valorTaxa = valorFinal - valorBase;
  } else if (!repassarTaxa && taxaAplicada > 0) {
    valorTaxa = valorBase * (taxaAplicada / 100);
  }

  const valorParcela = modalidade === 'PARCELADO' ? valorFinal / numParcelas : valorFinal;
  const valorLiquidoOficina = repassarTaxa ? valorBase : valorBase - valorTaxa;

  const handleCopiarOrcamento = () => {
    const texto = `*ORÇAMENTO DE PAGAMENTO - OFICINA*
🚗 *Serviços/Peças:* ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorBase)}
💳 *Forma de Pagamento:* ${
      modalidade === 'PIX'
        ? 'PIX à Vista'
        : modalidade === 'DEBITO'
        ? 'Cartão de Débito'
        : modalidade === 'CREDITO_VISTA'
        ? 'Cartão de Crédito 1x'
        : `Cartão de Crédito em ${numParcelas}x de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorParcela)}`
    }
${repassarTaxa && taxaAplicada > 0 ? `📊 *Taxa da Maquininha:* ${taxaAplicada.toFixed(2)}% embutida\n` : ''}💰 *Total a Pagar:* ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorFinal)}`;

    navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  const handleAplicar = () => {
    if (onAplicarValorFinal) {
      const detalhe = `${modalidade === 'PARCELADO' ? `${numParcelas}x Cartão` : modalidade} (Taxa ${taxaAplicada.toFixed(2)}% ${repassarTaxa ? 'embutida' : 'assumida'})`;
      onAplicarValorFinal(valorFinal, modalidade === 'PARCELADO' ? numParcelas : 1, taxaAplicada, detalhe);
    }
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1300,
        padding: '16px',
      }}
    >
      <div
        className="glass-panel"
        style={{
          maxWidth: '540px',
          width: '100%',
          padding: '24px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
        }}
      >
        {/* Cabeçalho */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(16, 185, 129, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#10b981',
              }}
            >
              <Calculator size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Simulador de Maquininha & PIX</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Embuta as taxas de operadora e receba o valor integral
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="btn btn-secondary" style={{ padding: '6px 10px' }}>
            <X size={16} />
          </button>
        </div>

        {/* Valor Base */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px 16px',
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Valor dos Serviços & Peças da OS:</span>
          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorBase)}
          </span>
        </div>

        {/* Seletor de Modalidade */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
            Modalidade de Recebimento
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              type="button"
              onClick={() => {
                setModalidade('PIX');
                setTaxaCustomizada(null);
              }}
              className={`btn ${modalidade === 'PIX' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.82rem', padding: '8px' }}
            >
              ⚡ PIX Instantâneo (0%)
            </button>
            <button
              type="button"
              onClick={() => {
                setModalidade('DEBITO');
                setTaxaCustomizada(null);
              }}
              className={`btn ${modalidade === 'DEBITO' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.82rem', padding: '8px' }}
            >
              💳 Cartão de Débito
            </button>
            <button
              type="button"
              onClick={() => {
                setModalidade('CREDITO_VISTA');
                setTaxaCustomizada(null);
              }}
              className={`btn ${modalidade === 'CREDITO_VISTA' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.82rem', padding: '8px' }}
            >
              💳 Crédito à Vista (1x)
            </button>
            <button
              type="button"
              onClick={() => {
                setModalidade('PARCELADO');
                setTaxaCustomizada(null);
              }}
              className={`btn ${modalidade === 'PARCELADO' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.82rem', padding: '8px' }}
            >
              🔢 Crédito Parcelado
            </button>
          </div>
        </div>

        {/* Seletor de Parcelas (quando parcelado) */}
        {modalidade === 'PARCELADO' && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
              Número de Parcelas
            </label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[2, 3, 4, 5, 6, 8, 10, 12].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setNumParcelas(p);
                    setTaxaCustomizada(null);
                  }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: `1px solid ${numParcelas === p ? '#10b981' : 'var(--border-subtle)'}`,
                    background: numParcelas === p ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.03)',
                    color: numParcelas === p ? '#34d399' : 'inherit',
                    fontSize: '0.82rem',
                    fontWeight: numParcelas === p ? 700 : 400,
                    cursor: 'pointer',
                  }}
                >
                  {p}x
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Toggle de Embutir Taxa */}
        <div
          style={{
            background: 'rgba(16, 185, 129, 0.06)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px 14px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#34d399' }}>
              Embutir Taxa da Maquininha (Repassar)
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Ajusta o total para a oficina receber os exatos 100% do serviço
            </div>
          </div>
          <input
            type="checkbox"
            checked={repassarTaxa}
            onChange={(e) => setRepassarTaxa(e.target.checked)}
            style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#10b981' }}
          />
        </div>

        {/* Ajuste Fino de Taxa */}
        {modalidade !== 'PIX' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Taxa aplicada:</span>
            <input
              type="number"
              step="0.01"
              min="0"
              max="30"
              value={taxaAplicada}
              onChange={(e) => setTaxaCustomizada(Number(e.target.value))}
              style={{
                width: '80px',
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
                background: 'rgba(255,255,255,0.03)',
                color: 'inherit',
                fontSize: '0.82rem',
                textAlign: 'center',
              }}
            />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>% da operadora</span>
          </div>
        )}

        {/* Resumo do Cálculo Final */}
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.35)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.82rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Valor Bruto na Maquininha:</span>
            <strong style={{ fontSize: '1.1rem', color: '#ffffff' }}>
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorFinal)}
            </strong>
          </div>

          {modalidade === 'PARCELADO' && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.82rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Valor por Parcela ({numParcelas}x):</span>
              <strong style={{ color: '#38bdf8' }}>
                {numParcelas}x de {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorParcela)}
              </strong>
            </div>
          )}

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              paddingTop: '8px',
              borderTop: '1px solid var(--border-subtle)',
              fontSize: '0.82rem',
            }}
          >
            <span style={{ color: '#34d399', fontWeight: 600 }}>Líquido que a Oficina Recebe:</span>
            <strong style={{ color: '#34d399' }}>
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorLiquidoOficina)}
            </strong>
          </div>
        </div>

        {/* Botões de Ação */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
          <button
            type="button"
            onClick={handleCopiarOrcamento}
            className="btn btn-secondary"
            style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            {copiado ? <Check size={16} color="#34d399" /> : <Copy size={16} />}
            {copiado ? 'Copiado para WhatsApp!' : 'Copiar p/ WhatsApp'}
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancelar
            </button>
            {onAplicarValorFinal && (
              <button
                type="button"
                onClick={handleAplicar}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <CheckCircle2 size={16} /> Aplicar na Cobrança
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
