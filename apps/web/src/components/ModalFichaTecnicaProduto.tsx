import React from 'react';
import { Produto } from '../types';
import {
  X,
  Package,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Car,
  Hash,
  Barcode,
  Layers,
  MapPin,
  DollarSign,
  Clock,
  Tag,
  Copy,
} from 'lucide-react';

interface ModalFichaTecnicaProdutoProps {
  produto: Produto | null;
  onClose: () => void;
  onEditar?: (produto: Produto) => void;
}

export const ModalFichaTecnicaProduto: React.FC<ModalFichaTecnicaProdutoProps> = ({
  produto,
  onClose,
  onEditar,
}) => {
  if (!produto) return null;

  const [copiado, setCopiado] = React.useState<string | null>(null);

  const copiarTexto = (texto: string, label: string) => {
    navigator.clipboard.writeText(texto);
    setCopiado(label);
    setTimeout(() => setCopiado(null), 2000);
  };

  const hoje = new Date();
  let statusValidadeBadge = null;

  if (produto.dataValidade) {
    const dataVal = new Date(produto.dataValidade);
    const diffMs = dataVal.getTime() - hoje.getTime();
    const dias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffMs < 0) {
      statusValidadeBadge = (
        <span className="badge badge-danger" style={{ fontSize: '0.75rem', padding: '4px 10px' }}>
          <AlertTriangle size={13} />
          Vencido há {Math.abs(dias)} dias ({dataVal.toLocaleDateString('pt-BR')})
        </span>
      );
    } else if (dias <= 60) {
      statusValidadeBadge = (
        <span className="badge badge-amber" style={{ fontSize: '0.75rem', padding: '4px 10px' }}>
          <Clock size={13} />
          Atenção: Vence em {dias} dias ({dataVal.toLocaleDateString('pt-BR')})
        </span>
      );
    } else {
      statusValidadeBadge = (
        <span className="badge badge-green" style={{ fontSize: '0.75rem', padding: '4px 10px' }}>
          <CheckCircle size={13} />
          Válido até {dataVal.toLocaleDateString('pt-BR')} ({dias} dias)
        </span>
      );
    }
  }

  // Processar veículos compatíveis em tags
  const aplicacoesArray = produto.aplicacoes
    ? produto.aplicacoes
        .split(/[,;\n]+/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.82)',
        backdropFilter: 'blur(8px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        style={{
          maxWidth: '820px',
          width: '100%',
          maxHeight: '92vh',
          overflowY: 'auto',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header com SKU e botão de fechar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                background: 'rgba(14, 165, 233, 0.15)',
                border: '1px solid rgba(14, 165, 233, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary)',
              }}
            >
              <Package size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span className="badge badge-blue">SKU: {produto.codigo}</span>
                {produto.marca && (
                  <span className="badge badge-purple" style={{ textTransform: 'uppercase' }}>
                    {produto.marca}
                  </span>
                )}
                {produto.categoria && (
                  <span className="badge badge-amber">
                    {produto.categoria}
                  </span>
                )}
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
                {produto.descricao}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
            title="Fechar Ficha Técnica"
          >
            <X size={20} />
          </button>
        </div>

        {/* Linha Superior: Foto Ampliada e Ficha Cadastral */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', alignItems: 'start' }}>
          {/* Foto da Peça */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div
              style={{
                width: '100%',
                aspectRatio: '1/1',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid var(--border-subtle)',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)',
              }}
            >
              {produto.fotoUrl ? (
                <img
                  src={produto.fotoUrl}
                  alt={produto.descricao}
                  style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '12px' }}
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: 'var(--text-dim)' }}>
                  <Package size={48} strokeWidth={1} />
                  <span style={{ fontSize: '0.75rem' }}>Sem foto cadastrada</span>
                </div>
              )}

              {statusValidadeBadge && (
                <div style={{ position: 'absolute', top: '12px', left: '12px', right: '12px', display: 'flex', justifyContent: 'center' }}>
                  {statusValidadeBadge}
                </div>
              )}
            </div>

            {/* Ações de cópia de SKU/EAN */}
            <div style={{ display: 'flex', gap: '8px', width: '100%', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => copiarTexto(produto.codigo, 'SKU')}
                className="btn btn-secondary"
                style={{ flex: 1, padding: '7px 10px', fontSize: '0.75rem' }}
              >
                <Copy size={13} />
                {copiado === 'SKU' ? 'Copiado!' : `Copiar SKU`}
              </button>
              {produto.codigoBarras && (
                <button
                  type="button"
                  onClick={() => copiarTexto(produto.codigoBarras!, 'EAN')}
                  className="btn btn-secondary"
                  style={{ flex: 1, padding: '7px 10px', fontSize: '0.75rem' }}
                >
                  <Barcode size={13} />
                  {copiado === 'EAN' ? 'Copiado!' : `Copiar EAN`}
                </button>
              )}
            </div>
          </div>

          {/* Dados Técnicos e Cadastrais */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div style={{ padding: '12px', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Tag size={13} color="var(--primary)" /> Marca / Fabricante
              </div>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px' }}>
                {produto.marca || <span style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>Não informado</span>}
              </div>
            </div>

            <div style={{ padding: '12px', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Package size={13} color="var(--accent-purple)" /> Modelo / Linha
              </div>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px' }}>
                {produto.modelo || <span style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>Não informado</span>}
              </div>
            </div>

            <div style={{ padding: '12px', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Hash size={13} color="#38bdf8" /> Código Original (OEM)
              </div>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)', fontFamily: 'monospace', marginTop: '4px' }}>
                {produto.codigoOriginal || <span style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>Sem OEM</span>}
              </div>
            </div>

            <div style={{ padding: '12px', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Barcode size={13} color="var(--accent-green)" /> Código de Barras (EAN)
              </div>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)', fontFamily: 'monospace', marginTop: '4px' }}>
                {produto.codigoBarras || <span style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>Não cadastrado</span>}
              </div>
            </div>

            <div style={{ padding: '12px', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Calendar size={13} color="var(--accent-amber)" /> Lote de Fabricação
              </div>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)', fontFamily: 'monospace', marginTop: '4px' }}>
                {produto.lote || <span style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>Não especificado</span>}
              </div>
            </div>

            <div style={{ padding: '12px', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={13} color="#f87171" /> Local Almoxarifado (WMS)
              </div>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px' }}>
                {produto.localizacao || <span style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>Geral</span>}
              </div>
            </div>

            {/* Especificações Técnicas */}
            {produto.especificacoes && (
              <div style={{ gridColumn: 'span 2', padding: '12px', borderRadius: 'var(--radius-sm)', background: 'rgba(14, 165, 233, 0.05)', border: '1px solid rgba(14, 165, 233, 0.2)' }}>
                <div style={{ fontSize: '0.72rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                  <Layers size={13} /> Especificações e Propriedades Técnicas
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-main)', marginTop: '4px', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
                  {produto.especificacoes}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Aplicação Veicular & Motores Compatíveis */}
        <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Car size={16} color="var(--primary)" />
              Aplicação Veicular & Compatibilidade de Motores (Cross-Reference)
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {aplicacoesArray.length > 0 ? `${aplicacoesArray.length} modelos listados` : 'Consulta técnica'}
            </span>
          </div>

          {aplicacoesArray.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {aplicacoesArray.map((veiculo, idx) => (
                <span key={idx} className="badge badge-blue" style={{ fontSize: '0.76rem', padding: '5px 10px' }}>
                  <Car size={12} /> {veiculo}
                </span>
              ))}
            </div>
          ) : produto.aplicacoes ? (
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', whiteSpace: 'pre-wrap' }}>
              {produto.aplicacoes}
            </p>
          ) : (
            <div style={{ textAlign: 'center', padding: '10px', color: 'var(--text-dim)', fontSize: '0.78rem', fontStyle: 'italic' }}>
              Nenhum veículo compatível vinculado. Cadastre os modelos compatíveis na edição da peça para acelerar a busca dos mecânicos.
            </div>
          )}
        </div>

        {/* Balanço Financeiro, CMP e Saldos */}
        <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
            <DollarSign size={14} color="var(--accent-green)" />
            Balanço Financeiro, Custo Médio e Saldos Físicos
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
            <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Preço de Venda</span>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--accent-green)', marginTop: '2px' }}>
                R$ {Number(produto.precoVenda).toFixed(2)}
              </div>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>Unidade: {produto.unidadeMedida}</span>
            </div>

            <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Custo Médio (CMP)</span>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#38bdf8', marginTop: '2px' }}>
                R$ {(produto.custoMedio || produto.precoCusto).toFixed(2)}
              </div>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>Ponderado por entradas</span>
            </div>

            <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Última Compra (NF-e)</span>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
                {produto.ultimoPrecoCompra ? `R$ ${produto.ultimoPrecoCompra.toFixed(2)}` : 'R$ 0,00'}
              </div>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>Último valor pago</span>
            </div>

            <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Última Venda Balcão</span>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
                {produto.ultimoPrecoVenda ? `R$ ${produto.ultimoPrecoVenda.toFixed(2)}` : 'R$ 0,00'}
              </div>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>Histórico de saída</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)', textAlign: 'center' }}>
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Saldo Físico</span>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
                {produto.saldoFisico} {produto.unidadeMedida}
              </div>
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Reservado em OS</span>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--accent-amber)', marginTop: '2px' }}>
                {produto.saldoReservado} {produto.unidadeMedida}
              </div>
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Disponível Imediato</span>
              <div
                style={{
                  fontSize: '1rem',
                  fontWeight: 800,
                  color: produto.saldoDisponivel <= produto.estoqueMinimo ? '#f87171' : 'var(--accent-green)',
                  marginTop: '2px',
                }}
              >
                {produto.saldoDisponivel} {produto.unidadeMedida}
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé do Modal */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
          {onEditar && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onEditar(produto);
              }}
              className="btn btn-secondary"
            >
              Editar Cadastro do Item
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="btn btn-primary"
          >
            Fechar Ficha Técnica
          </button>
        </div>
      </div>
    </div>
  );
};
