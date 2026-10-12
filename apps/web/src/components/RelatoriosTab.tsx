import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import { ResumoRelatorio, ServicoTerceiro, GarantiaAtendimento, Produto } from '../types';
import {
  TrendingUp,
  DollarSign,
  CheckCircle,
  Clock,
  AlertTriangle,
  Download,
  Truck,
  ShieldCheck,
  RefreshCw,
  Layers,
  Wrench,
  Percent,
  Calendar,
  Package,
  Car,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert,
  Eye,
} from 'lucide-react';
import { ModalFichaTecnicaProduto } from './ModalFichaTecnicaProduto';

type AbaRelatorio = 'cockpit' | 'dre' | 'estoque' | 'produtividade' | 'terceiros';

export const RelatoriosTab: React.FC = () => {
  const [abaAtiva, setAbaAtiva] = useState<AbaRelatorio>('cockpit');
  const [resumo, setResumo] = useState<ResumoRelatorio | null>(null);
  const [servicosTerceiros, setServicosTerceiros] = useState<ServicoTerceiro[]>([]);
  const [garantias, setGarantias] = useState<GarantiaAtendimento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);

  // Modal para receber serviço de terceiro
  const [servicoParaReceber, setServicoParaReceber] = useState<ServicoTerceiro | null>(null);
  const [observacoesRetorno, setObservacoesRetorno] = useState('');
  const [recebendo, setRecebendo] = useState(false);

  // Modal para exibir ficha técnica do item da validade
  const [produtoFichaTecnica, setProdutoFichaTecnica] = useState<Produto | null>(null);

  const carregarDados = async () => {
    try {
      setCarregando(true);
      setErro(null);

      const [resumoResp, terceirosResp, garantiasResp] = await Promise.all([
        apiRequest<ResumoRelatorio>('/relatorios/resumo'),
        apiRequest<ServicoTerceiro[]>('/servicos-terceiros'),
        apiRequest<GarantiaAtendimento[]>('/garantias'),
      ]);

      if (resumoResp.sucesso && resumoResp.dados) {
        setResumo(resumoResp.dados);
      }
      if (terceirosResp.sucesso && terceirosResp.dados) {
        setServicosTerceiros(terceirosResp.dados);
      }
      if (garantiasResp.sucesso && garantiasResp.dados) {
        setGarantias(garantiasResp.dados);
      }
    } catch (err: any) {
      setErro(err.message || 'Erro ao carregar dados dos relatórios e indicadores.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const handleExportarCSV = () => {
    const token = localStorage.getItem('vortex_token');
    const url = `/api/relatorios/exportar-csv`;
    fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.blob())
      .then((blob) => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `relatorio-vortex-fechamento-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch(() => {
        setErro('Falha ao exportar relatório em formato CSV.');
      });
  };

  const handleConfirmarRecebimentoTerceiro = async () => {
    if (!servicoParaReceber) return;
    try {
      setRecebendo(true);
      const resp = await apiRequest(`/servicos-terceiros/${servicoParaReceber.id}/receber`, {
        method: 'PATCH',
        body: JSON.stringify({ observacoesRetorno }),
      });
      if (resp.sucesso) {
        setMensagemSucesso(resp.mensagem || 'Serviço de terceiro recebido com sucesso!');
        setServicoParaReceber(null);
        setObservacoesRetorno('');
        carregarDados();
        setTimeout(() => setMensagemSucesso(null), 4000);
      } else {
        setErro(resp.mensagem || 'Erro ao registrar recebimento do serviço de terceiros.');
      }
    } catch (err: any) {
      setErro(err.message || 'Erro ao registrar recebimento do serviço de terceiros.');
    } finally {
      setRecebendo(false);
    }
  };

  const abrirFichaTecnica = async (produtoId: string) => {
    try {
      const resp = await apiRequest<Produto>(`/produtos/${produtoId}`);
      if (resp.sucesso && resp.dados) {
        setProdutoFichaTecnica(resp.dados);
      }
    } catch (e) {
      // Ignora erro silenciosamente
    }
  };

  if (carregando) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400">
        <RefreshCw className="w-10 h-10 animate-spin text-cyan-400 mb-4" />
        <p className="text-base font-medium">Consolidando indicadores executivos e BI da oficina...</p>
      </div>
    );
  }

  const radarValidades = resumo?.estoque?.radarValidades || [];
  const dre = resumo?.dre;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Cabeçalho Executivo */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900/80 p-6 rounded-2xl border border-slate-800 backdrop-blur-md shadow-xl">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Business Intelligence & Indicadores Executivos
              </h2>
              <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
                Visão estratégica da oficina: Faturamento, DRE, Produtividade, Radar de Validades e Retíficas.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={carregarDados}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-750 text-slate-200 text-xs font-semibold transition"
            title="Recalcular métricas"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Atualizar BI
          </button>
          <button
            onClick={handleExportarCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-lg shadow-cyan-600/30 transition transform active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar CSV
          </button>
        </div>
      </div>

      {erro && (
        <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-200 text-xs flex items-center justify-between">
          <span>{erro}</span>
          <button onClick={() => setErro(null)} className="text-rose-400 hover:text-white font-bold ml-4">✕</button>
        </div>
      )}

      {mensagemSucesso && (
        <div className="p-4 rounded-xl bg-emerald-950/50 border border-emerald-800 text-emerald-200 text-xs flex items-center justify-between">
          <span>{mensagemSucesso}</span>
          <button onClick={() => setMensagemSucesso(null)} className="text-emerald-400 hover:text-white font-bold ml-4">✕</button>
        </div>
      )}

      {/* Submenu de Navegação Executiva em Abas */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-900/60 rounded-xl border border-slate-800 overflow-x-auto">
        <button
          onClick={() => setAbaAtiva('cockpit')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap ${
            abaAtiva === 'cockpit'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Cockpit Executivo
        </button>

        <button
          onClick={() => setAbaAtiva('dre')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap ${
            abaAtiva === 'dre'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          DRE & Lucratividade
        </button>

        <button
          onClick={() => setAbaAtiva('estoque')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap ${
            abaAtiva === 'estoque'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Package className="w-4 h-4" />
          Estoque & Radar de Validades
          {((resumo?.estoque.itensValidadeVencida || 0) > 0 || (resumo?.estoque.itensValidadeAlerta || 0) > 0) && (
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
          )}
        </button>

        <button
          onClick={() => setAbaAtiva('produtividade')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap ${
            abaAtiva === 'produtividade'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Wrench className="w-4 h-4" />
          Boxes & Produtividade
        </button>

        <button
          onClick={() => setAbaAtiva('terceiros')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap ${
            abaAtiva === 'terceiros'
              ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Truck className="w-4 h-4" />
          Retíficas & Garantias
        </button>
      </div>

      {/* ============================================================== */}
      {/* ABA 1: COCKPIT EXECUTIVO & VISÃO GERAL */}
      {/* ============================================================== */}
      {abaAtiva === 'cockpit' && resumo && (
        <div className="space-y-6">
          {/* Grid de KPIs Principais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Faturamento Realizado */}
            <div className="bg-slate-900/70 p-5 rounded-2xl border border-emerald-900/40 shadow-lg relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                  Faturamento Realizado
                </span>
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-white">
                  R$ {resumo.financeiro.faturamentoTotalRealizado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                  {resumo.financeiro.totalRecebimentos} recebimento(s) compensado(s)
                </p>
              </div>
            </div>

            {/* Saldo em Aberto */}
            <div className="bg-slate-900/70 p-5 rounded-2xl border border-amber-900/40 shadow-lg relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                  A Receber / Em Aberto
                </span>
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-white">
                  R$ {resumo.financeiro.totalSaldoPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Parcelas pendentes de quitação
                </p>
              </div>
            </div>

            {/* Ticket Médio */}
            <div className="bg-slate-900/70 p-5 rounded-2xl border border-cyan-900/40 shadow-lg relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">
                  Ticket Médio por Veículo
                </span>
                <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                  <Percent className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-white">
                  R$ {resumo.financeiro.ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Base: {resumo.atendimentos.entregues} veículo(s) entregue(s)
                </p>
              </div>
            </div>

            {/* Taxa de Eficiência */}
            <div className="bg-slate-900/70 p-5 rounded-2xl border border-purple-900/40 shadow-lg relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400">
                  Taxa Conclusão de OS
                </span>
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                  <Wrench className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-white">
                  {resumo.ordensServico.taxaConclusaoPercent}%
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-purple-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${resumo.ordensServico.taxaConclusaoPercent}%` }}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {resumo.ordensServico.concluidas} de {resumo.ordensServico.total} ordens concluídas
                </p>
              </div>
            </div>
          </div>

          {/* Painel Central: Status de Atendimentos no Pátio e Alertas Ativos */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Status do Pátio */}
            <div className="lg:col-span-7 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 shadow-md">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <Car className="w-4 h-4 text-blue-400" />
                Fluxo de Veículos e Atendimentos no Pátio ({resumo.atendimentos.total} total)
              </h3>

              <div className="space-y-3">
                {resumo.atendimentos.porStatus.map((item, idx) => {
                  const percent = resumo.atendimentos.total > 0 ? Math.round((item.total / resumo.atendimentos.total) * 100) : 0;
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300 font-medium">{item.status}</span>
                        <span className="text-slate-400">{item.total} veículo(s) ({percent}%)</span>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full rounded-full transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Radar de Alertas Executivos */}
            <div className="lg:col-span-5 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 shadow-md flex flex-col justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                Radar de Alertas Operacionais
              </h3>

              <div className="space-y-3 my-2">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-red-500/10 text-red-400">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-white">Peças Abaixo do Mínimo</span>
                      <p className="text-[11px] text-slate-400">Risco de ruptura operacional no box</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-red-400">
                    {resumo.estoque.itensEstoqueCritico}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-white">Validade Vencida ou em Alerta</span>
                      <p className="text-[11px] text-slate-400">Óleos lubrificantes, fluidos e químicos</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-amber-400">
                    {(resumo.estoque.itensValidadeVencida || 0) + (resumo.estoque.itensValidadeAlerta || 0)}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-white">Garantias Acionadas</span>
                      <p className="text-[11px] text-slate-400">Retornos de clientes para reanálise</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-purple-400">
                    {resumo.garantias.total}
                  </span>
                </div>
              </div>

              <div className="pt-2 text-right">
                <button
                  onClick={() => setAbaAtiva('estoque')}
                  className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition"
                >
                  Ver Detalhes do Radar &rarr;
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* ABA 2: DRE FINANCEIRO & LUCRATIVIDADE DA OFICINA */}
      {/* ============================================================== */}
      {abaAtiva === 'dre' && resumo && (
        <div className="space-y-6">
          <div className="bg-slate-900/70 p-6 rounded-2xl border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-400" />
                  Demonstrativo de Resultado do Exercício (DRE da Oficina)
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Apuração de receitas brutas, Custo das Mercadorias Vendidas (CMV), custos externos e margem líquida.
                </p>
              </div>
              {dre && (
                <div className="text-right">
                  <span className="text-xs text-slate-400 font-medium">Margem Bruta Geral</span>
                  <div className="text-2xl font-black text-emerald-400">
                    {dre.margemBrutaPercentual}%
                  </div>
                </div>
              )}
            </div>

            {dre ? (
              <div className="mt-6 space-y-4">
                {/* Linha 1: Receita Bruta */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/40 border border-slate-700/60">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                      <ArrowUpRight className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-white">Receita Bruta Realizada (Oficina + Balcão)</span>
                      <p className="text-xs text-slate-400">Total de recebimentos faturados</p>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-emerald-400 font-mono">
                    R$ {dre.faturamentoBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Linha 2: (-) CMV Custo das Mercadorias */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/40 border border-slate-700/60">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-red-500/10 text-red-400">
                      <ArrowDownRight className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-white">(-) Custo das Mercadorias Vendidas (CMV)</span>
                      <p className="text-xs text-slate-400">Peças e materiais consumidos em OS e Balcão pelo Custo Médio</p>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-red-400 font-mono">
                    - R$ {dre.cmvTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Linha 3: (-) Custos com Serviços Terceirizados */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/40 border border-slate-700/60">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-white">(-) Custos de Serviços Terceirizados & Retíficas</span>
                      <p className="text-xs text-slate-400">Valores pagos a parceiros e usinagens externas</p>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-amber-400 font-mono">
                    - R$ {dre.custosTerceiros.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Linha 4: Lucro Bruto Operacional */}
                <div className="flex items-center justify-between p-5 rounded-2xl bg-gradient-to-r from-emerald-950/40 to-slate-900 border border-emerald-500/40 shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400">
                      <Percent className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-base font-black text-white">(=) LUCRO BRUTO OPERACIONAL</span>
                      <p className="text-xs text-slate-300">Receita líquida antes de despesas fixas administrativas</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-emerald-400 font-mono">
                      R$ {dre.lucroBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                    <span className="text-xs font-bold text-slate-400">
                      Margem Real: {dre.margemBrutaPercentual}%
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 text-slate-400 text-sm">
                Nenhum dado consolidado de DRE encontrado.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* ABA 3: ESTOQUE & RADAR DE VALIDADES PREVENTIVAS */}
      {/* ============================================================== */}
      {abaAtiva === 'estoque' && resumo && (
        <div className="space-y-6">
          {/* Cards de Patrimônio e Riscos de Validade */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 shadow-md">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-400" /> Patrimônio em Estoque (Custo)
              </span>
              <p className="text-2xl font-bold text-white mt-2">
                R$ {resumo.estoque.valorTotalEstoqueCusto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <span className="text-xs text-slate-500 mt-1 block">
                {resumo.estoque.totalItensCadastrados} itens cadastrados
              </span>
            </div>

            <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 shadow-md">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-400" /> Potencial de Venda
              </span>
              <p className="text-2xl font-bold text-emerald-400 mt-2">
                R$ {resumo.estoque.valorTotalEstoqueVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <span className="text-xs text-slate-500 mt-1 block">
                Preço de tabela balcão/OS
              </span>
            </div>

            <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 shadow-md">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-amber-400" /> Radar de Validade
              </span>
              <div className="flex items-center gap-3 mt-2">
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                  {resumo.estoque.itensValidadeVencida || 0} Vencido(s)
                </span>
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {resumo.estoque.itensValidadeAlerta || 0} Próximos
                </span>
              </div>
              <span className="text-xs text-slate-500 mt-2 block">
                Alerta preventivo de fluidos e lubrificantes
              </span>
            </div>
          </div>

          {/* Tabela do Radar de Validades Preventivas */}
          <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-400" />
                  Radar Preventivo de Validades (Lubrificantes, Fluidos e Químicos)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Evite prejuízos e riscos a motores de clientes utilizando itens fora da especificação ou vencidos.
                </p>
              </div>
            </div>

            {radarValidades.length === 0 ? (
              <div className="py-10 text-center text-slate-500 text-xs">
                Nenhum produto cadastrado com validade vencida ou vencendo nos próximos 60 dias. Estoque químico em conformidade!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-800/80 text-[11px] uppercase text-slate-400 font-semibold border-b border-slate-700">
                    <tr>
                      <th className="py-3 px-3">Código</th>
                      <th className="py-3 px-3">Descrição da Peça</th>
                      <th className="py-3 px-3">Marca</th>
                      <th className="py-3 px-3">Lote</th>
                      <th className="py-3 px-3">Data Validade</th>
                      <th className="py-3 px-3">Saldo em Mãos</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {radarValidades.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-2.5 px-3 font-mono font-bold text-cyan-400">{item.codigo}</td>
                        <td className="py-2.5 px-3 font-medium text-white">{item.descricao}</td>
                        <td className="py-2.5 px-3">{item.marca}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-400">{item.lote}</td>
                        <td className="py-2.5 px-3">
                          {new Date(item.dataValidade).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-white">{item.saldoFisico}</td>
                        <td className="py-2.5 px-3">
                          {item.status === 'VENCIDO' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                              <AlertTriangle className="w-3 h-3" />
                              Vencido ({Math.abs(item.diasParaVencer)}d)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              <Clock className="w-3 h-3" />
                              Vence em {item.diasParaVencer}d
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => abrirFichaTecnica(item.id)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-semibold border border-slate-700 flex items-center gap-1 ml-auto"
                          >
                            <Eye className="w-3.5 h-3.5" /> Ficha
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* ABA 4: BOXES & PRODUTIVIDADE */}
      {/* ============================================================== */}
      {abaAtiva === 'produtividade' && resumo && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 shadow-md">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Wrench className="w-4 h-4 text-purple-400" /> Ordens de Serviço Totais
              </span>
              <p className="text-2xl font-bold text-white mt-2">
                {resumo.ordensServico.total}
              </p>
              <span className="text-xs text-slate-500 mt-1 block">
                Abertas na oficina
              </span>
            </div>

            <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 shadow-md">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-400" /> OS Concluídas
              </span>
              <p className="text-2xl font-bold text-emerald-400 mt-2">
                {resumo.ordensServico.concluidas}
              </p>
              <span className="text-xs text-slate-500 mt-1 block">
                Veículos prontos para entrega
              </span>
            </div>

            <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 shadow-md">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-400" /> Em Execução nos Boxes
              </span>
              <p className="text-2xl font-bold text-amber-400 mt-2">
                {resumo.ordensServico.emAndamento}
              </p>
              <span className="text-xs text-slate-500 mt-1 block">
                Atividade técnica em andamento
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* ABA 5: RETÍFICAS (TERCEIROS) & GARANTIAS */}
      {/* ============================================================== */}
      {abaAtiva === 'terceiros' && (
        <div className="space-y-6">
          {/* Serviços de Terceiros */}
          <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6 shadow-xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2 mb-3">
              <Truck className="w-5 h-5 text-amber-400" />
              Serviços Externos e Retíficas Parceiras (HU-025)
            </h3>
            <p className="text-slate-400 text-xs mb-4">
              Acompanhamento de envio, custos e conferência de recebimento de peças terceirizadas.
            </p>

            {servicosTerceiros.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                Nenhum serviço terceirizado registrado até o momento.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-800/80 text-[11px] uppercase text-slate-400 font-semibold border-b border-slate-700">
                    <tr>
                      <th className="py-2.5 px-3">Atendimento</th>
                      <th className="py-2.5 px-3">Fornecedor</th>
                      <th className="py-2.5 px-3">Serviço Solicitado</th>
                      <th className="py-2.5 px-3">Custo</th>
                      <th className="py-2.5 px-3">Cobrado</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {servicosTerceiros.map((servico) => (
                      <tr key={servico.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-2.5 px-3 font-mono font-medium text-cyan-400">
                          {servico.atendimento?.codigoFormatado || 'N/A'}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-white">{servico.fornecedorNome}</td>
                        <td className="py-2.5 px-3 text-slate-300">{servico.descricaoServico}</td>
                        <td className="py-2.5 px-3 text-slate-400 font-mono">
                          R$ {Number(servico.valorCusto).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-emerald-400 font-mono font-medium">
                          R$ {Number(servico.valorCobradoCliente).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                              servico.status === 'RECEBIDO'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : servico.status === 'ENVIADO'
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            }`}
                          >
                            {servico.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {servico.status !== 'RECEBIDO' && servico.status !== 'CANCELADO' && (
                            <button
                              onClick={() => setServicoParaReceber(servico)}
                              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow transition"
                            >
                              Registrar Recebimento
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Garantias */}
          <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6 shadow-xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2 mb-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              Controle de Garantias e Retornos de Veículos (HU-023)
            </h3>
            <p className="text-slate-400 text-xs mb-4">
              Registro formal de análises técnicas de garantia, pareceres e atendimentos de retorno.
            </p>

            {garantias.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                Nenhuma garantia acionada até o momento.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-800/80 text-[11px] uppercase text-slate-400 font-semibold border-b border-slate-700">
                    <tr>
                      <th className="py-2.5 px-3">Código Garantia</th>
                      <th className="py-2.5 px-3">Atendimento Origem</th>
                      <th className="py-2.5 px-3">Veículo / Cliente</th>
                      <th className="py-2.5 px-3">Decisão</th>
                      <th className="py-2.5 px-3">Novo Atendimento</th>
                      <th className="py-2.5 px-3">Data Decisão</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {garantias.map((gar) => (
                      <tr key={gar.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-2.5 px-3 font-mono font-bold text-amber-400">{gar.codigoFormatado}</td>
                        <td className="py-2.5 px-3 font-mono text-cyan-400">
                          {gar.atendimentoOrigem?.codigoFormatado || 'N/A'}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="text-white font-medium">
                            {gar.atendimentoOrigem?.veiculo.modelo} ({gar.atendimentoOrigem?.veiculo.placa})
                          </div>
                          <div className="text-[11px] text-slate-400">{gar.atendimentoOrigem?.cliente.nomeRazao}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                              gar.decisao === 'COBERTA_TOTAL'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : gar.decisao === 'COBERTA_PARCIAL'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {gar.decisao}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-medium text-cyan-300">
                          {gar.atendimentoGarantia?.codigoFormatado ? (
                            <span className="flex items-center gap-1.5 text-cyan-400">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                              {gar.atendimentoGarantia.codigoFormatado}
                            </span>
                          ) : (
                            <span className="text-slate-500 text-xs">Sem novo atendimento (Recusada)</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400">
                          {new Date(gar.dataDecisao).toLocaleDateString('pt-BR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Receber Serviço de Terceiro */}
      {servicoParaReceber && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-amber-400" />
                Conferência de Retorno de Terceiro
              </h3>
              <button
                onClick={() => setServicoParaReceber(null)}
                className="text-slate-400 hover:text-white transition font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/60 space-y-2 text-xs">
              <p className="text-slate-300">
                <span className="text-slate-400 font-medium">Fornecedor:</span> {servicoParaReceber.fornecedorNome}
              </p>
              <p className="text-slate-300">
                <span className="text-slate-400 font-medium">Serviço:</span> {servicoParaReceber.descricaoServico}
              </p>
              <p className="text-slate-300">
                <span className="text-slate-400 font-medium">Custo:</span> R${' '}
                {Number(servicoParaReceber.valorCusto).toFixed(2)}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Observações de Conferência / Qualidade da Peça
              </label>
              <textarea
                value={observacoesRetorno}
                onChange={(e) => setObservacoesRetorno(e.target.value)}
                placeholder="Ex: Peça conferida, retífica realizada conforme tolerância exigida, sem trincas."
                rows={3}
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setServicoParaReceber(null)}
                disabled={recebendo}
                className="px-4 py-2 rounded-xl text-slate-300 hover:text-white text-xs font-medium transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarRecebimentoTerceiro}
                disabled={recebendo}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-950/40 transition flex items-center gap-2"
              >
                {recebendo ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                Confirmar Recebimento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ficha Técnica acionado a partir do radar de validades */}
      {produtoFichaTecnica && (
        <ModalFichaTecnicaProduto
          produto={produtoFichaTecnica}
          onClose={() => setProdutoFichaTecnica(null)}
        />
      )}
    </div>
  );
};
