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
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30">
          <AlertTriangle className="w-3.5 h-3.5" />
          Vencido há {Math.abs(dias)} dias ({dataVal.toLocaleDateString('pt-BR')})
        </span>
      );
    } else if (dias <= 60) {
      statusValidadeBadge = (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
          <Clock className="w-3.5 h-3.5" />
          Atenção: Vence em {dias} dias ({dataVal.toLocaleDateString('pt-BR')})
        </span>
      );
    } else {
      statusValidadeBadge = (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
          <CheckCircle className="w-3.5 h-3.5" />
          Válido até {dataVal.toLocaleDateString('pt-BR')} ({dias} dias)
        </span>
      );
    }
  }

  // Processar veículos compatíveis em tags se houver separação por vírgula ou ponto-e-vírgula
  const aplicacoesArray = produto.aplicacoes
    ? produto.aplicacoes
        .split(/[,;\n]+/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl text-slate-100 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header com degradê e botão de fechar */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-slate-900/95 backdrop-blur-md border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                  SKU: {produto.codigo}
                </span>
                {produto.marca && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase">
                    {produto.marca}
                  </span>
                )}
                {produto.categoria && (
                  <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    {produto.categoria}
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-white mt-1 leading-snug">
                {produto.descricao}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            title="Fechar Ficha Técnica"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo Principal */}
        <div className="p-6 space-y-6">
          {/* Seção Superior: Imagem em Alta e Dados Chave */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Foto Ampliada */}
            <div className="md:col-span-5 flex flex-col items-center">
              <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center group shadow-inner">
                {produto.fotoUrl ? (
                  <img
                    src={produto.fotoUrl}
                    alt={produto.descricao}
                    className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-600 gap-2 p-6 text-center">
                    <Package className="w-16 h-16 stroke-1 text-slate-700" />
                    <span className="text-xs text-slate-500">Sem foto cadastrada</span>
                  </div>
                )}

                {/* Badge flutuante de validade se houver */}
                {statusValidadeBadge && (
                  <div className="absolute top-3 left-3 right-3 flex justify-center">
                    {statusValidadeBadge}
                  </div>
                )}
              </div>

              {/* Botão copiar SKU */}
              <div className="w-full mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => copiarTexto(produto.codigo, 'SKU')}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copiado === 'SKU' ? 'Copiado!' : `Copiar SKU: ${produto.codigo}`}
                </button>
                {produto.codigoBarras && (
                  <button
                    type="button"
                    onClick={() => copiarTexto(produto.codigoBarras!, 'EAN')}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 transition-colors"
                  >
                    <Barcode className="w-3.5 h-3.5" />
                    {copiado === 'EAN' ? 'Copiado!' : 'Copiar EAN'}
                  </button>
                )}
              </div>
            </div>

            {/* Informações Técnicas e Cadastrais */}
            <div className="md:col-span-7 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-800">
                  <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-blue-400" /> Fabricante / Marca
                  </span>
                  <p className="text-sm font-semibold text-white mt-1">
                    {produto.marca || <span className="text-slate-500 italic">Não informado</span>}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-800">
                  <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                    <Package className="w-3.5 h-3.5 text-purple-400" /> Modelo / Linha
                  </span>
                  <p className="text-sm font-semibold text-white mt-1">
                    {produto.modelo || <span className="text-slate-500 italic">Não informado</span>}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-800">
                  <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                    <Hash className="w-3.5 h-3.5 text-cyan-400" /> Código Original (OEM)
                  </span>
                  <p className="text-sm font-semibold text-white mt-1 font-mono">
                    {produto.codigoOriginal || <span className="text-slate-500 italic">Sem código OEM</span>}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-800">
                  <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                    <Barcode className="w-3.5 h-3.5 text-emerald-400" /> Código de Barras (EAN)
                  </span>
                  <p className="text-sm font-semibold text-white mt-1 font-mono">
                    {produto.codigoBarras || <span className="text-slate-500 italic">Não cadastrado</span>}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-800">
                  <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" /> Lote de Fabricação
                  </span>
                  <p className="text-sm font-semibold text-white mt-1 font-mono">
                    {produto.lote || <span className="text-slate-500 italic">Não especificado</span>}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-800">
                  <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-rose-400" /> Localização no Estoque (WMS)
                  </span>
                  <p className="text-sm font-semibold text-white mt-1">
                    {produto.localizacao || <span className="text-slate-500 italic">Geral / Não atribuído</span>}
                  </p>
                </div>
              </div>

              {/* Especificações Técnicas Adicionais */}
              {produto.especificacoes && (
                <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800">
                  <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5 mb-1">
                    <Layers className="w-4 h-4 text-cyan-400" /> Especificações e Propriedades Técnicas
                  </span>
                  <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {produto.especificacoes}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Seção: Compatibilidade e Aplicação Veicular (Melhores Práticas TecDoc/Aftermarket) */}
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-white flex items-center gap-2">
                <Car className="w-4 h-4 text-blue-400" />
                Aplicação Veicular & Compatibilidade de Motores (Cross-Reference)
              </span>
              <span className="text-xs text-slate-400">
                {aplicacoesArray.length > 0 ? `${aplicacoesArray.length} modelos listados` : 'Consulta técnica'}
              </span>
            </div>

            {aplicacoesArray.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {aplicacoesArray.map((veiculo, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-blue-500/10 text-blue-300 border border-blue-500/20"
                  >
                    <Car className="w-3 h-3 text-blue-400" />
                    {veiculo}
                  </span>
                ))}
              </div>
            ) : produto.aplicacoes ? (
              <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                {produto.aplicacoes}
              </p>
            ) : (
              <div className="py-3 text-center text-slate-500 text-xs italic">
                Nenhum veículo compatível vinculado. Cadastre os modelos compatíveis na edição da peça para acelerar a busca dos mecânicos e orçamentos.
              </div>
            )}
          </div>

          {/* Seção: Gestão de Preços, CMP e Saldo da Oficina */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              Balanço Financeiro, Custo Médio e Saldos Físicos
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-[11px] text-slate-400 font-medium">Preço de Venda</span>
                <p className="text-lg font-bold text-emerald-400 mt-0.5">
                  R$ {Number(produto.precoVenda).toFixed(2)}
                </p>
                <span className="text-[10px] text-slate-500">Unidade: {produto.unidadeMedida}</span>
              </div>

              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-[11px] text-slate-400 font-medium">Custo Médio (CMP)</span>
                <p className="text-lg font-bold text-cyan-400 mt-0.5">
                  R$ {(produto.custoMedio || produto.precoCusto).toFixed(2)}
                </p>
                <span className="text-[10px] text-slate-500">Ponderado por entradas</span>
              </div>

              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-[11px] text-slate-400 font-medium">Última Compra (NF-e)</span>
                <p className="text-lg font-bold text-slate-300 mt-0.5">
                  {produto.ultimoPrecoCompra ? `R$ ${produto.ultimoPrecoCompra.toFixed(2)}` : 'R$ 0,00'}
                </p>
                <span className="text-[10px] text-slate-500">Último valor pago</span>
              </div>

              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-[11px] text-slate-400 font-medium">Última Venda Balcão/OS</span>
                <p className="text-lg font-bold text-slate-300 mt-0.5">
                  {produto.ultimoPrecoVenda ? `R$ ${produto.ultimoPrecoVenda.toFixed(2)}` : 'R$ 0,00'}
                </p>
                <span className="text-[10px] text-slate-500">Histórico de saída</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-slate-800/80">
              <div className="text-center">
                <span className="text-xs text-slate-400">Saldo Físico</span>
                <p className="text-base font-bold text-white mt-0.5">
                  {produto.saldoFisico} {produto.unidadeMedida}
                </p>
              </div>
              <div className="text-center">
                <span className="text-xs text-slate-400">Reservado em OS</span>
                <p className="text-base font-bold text-amber-400 mt-0.5">
                  {produto.saldoReservado} {produto.unidadeMedida}
                </p>
              </div>
              <div className="text-center">
                <span className="text-xs text-slate-400">Disponível Imediato</span>
                <p
                  className={`text-base font-bold mt-0.5 ${
                    produto.saldoDisponivel <= produto.estoqueMinimo
                      ? 'text-red-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {produto.saldoDisponivel} {produto.unidadeMedida}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé com botões */}
        <div className="sticky bottom-0 flex items-center justify-end gap-3 px-6 py-4 bg-slate-900/95 backdrop-blur-md border-t border-slate-800">
          {onEditar && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onEditar(produto);
              }}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-colors"
            >
              Editar Cadastro do Item
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition-colors"
          >
            Fechar Ficha Técnica
          </button>
        </div>
      </div>
    </div>
  );
};
