import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import { ResumoRelatorio, ServicoTerceiro, GarantiaAtendimento } from '../types';
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
} from 'lucide-react';

export const RelatoriosTab: React.FC = () => {
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
    // Disparar download direto
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

  if (carregando) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <RefreshCw className="w-10 h-10 animate-spin text-cyan-500 mb-4" />
        <p className="text-lg">Carregando indicadores consolidados da oficina...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Header & Export Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-md shadow-xl">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <TrendingUp className="w-7 h-7 text-cyan-400" />
            Painel Executivo & Indicadores (BI)
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Métricas de faturamento, produtividade operacional, giro de estoque, retíficas e garantias.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={carregarDados}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-sm font-medium transition"
          >
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </button>
          <button
            onClick={handleExportarCSV}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-sm font-semibold shadow-lg shadow-cyan-950/40 transition transform active:scale-95"
          >
            <Download className="w-4 h-4" />
            Exportar Fechamento (CSV)
          </button>
        </div>
      </div>

      {erro && (
        <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-200 text-sm flex items-center justify-between">
          <span>{erro}</span>
          <button onClick={() => setErro(null)} className="text-rose-400 hover:text-white font-bold ml-4">✕</button>
        </div>
      )}

      {mensagemSucesso && (
        <div className="p-4 rounded-xl bg-emerald-950/50 border border-emerald-800 text-emerald-200 text-sm flex items-center justify-between">
          <span>{mensagemSucesso}</span>
          <button onClick={() => setMensagemSucesso(null)} className="text-emerald-400 hover:text-white font-bold ml-4">✕</button>
        </div>
      )}

      {/* Grid de KPIs Principais */}
      {resumo && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Faturamento Realizado */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 p-5 rounded-2xl border border-emerald-900/40 shadow-lg relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold tracking-wider uppercase text-emerald-400">Faturamento Realizado</span>
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-black text-white">
                R$ {resumo.financeiro.faturamentoTotalRealizado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {resumo.financeiro.totalRecebimentos} recebimento(s) compensado(s)
              </p>
            </div>
          </div>

          {/* Saldo a Receber */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/40 p-5 rounded-2xl border border-amber-900/40 shadow-lg relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold tracking-wider uppercase text-amber-400">Em Aberto / Devedor</span>
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-black text-white">
                R$ {resumo.financeiro.totalSaldoPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Parcelas pendentes de quitação
              </p>
            </div>
          </div>

          {/* Ticket Médio */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/40 p-5 rounded-2xl border border-cyan-900/40 shadow-lg relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold tracking-wider uppercase text-cyan-400">Ticket Médio / Veículo</span>
              <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400">
                <Percent className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-black text-white">
                R$ {resumo.financeiro.ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Base: {resumo.atendimentos.entregues} veículo(s) entregue(s)
              </p>
            </div>
          </div>

          {/* Eficiência de OS */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-purple-950/40 p-5 rounded-2xl border border-purple-900/40 shadow-lg relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold tracking-wider uppercase text-purple-400">Taxa Conclusão OS</span>
              <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
                <Wrench className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
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
                {resumo.ordensServico.concluidas} de {resumo.ordensServico.total} OS finalizadas
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Indicadores Secundários: Estoque, Terceiros e Garantias */}
      {resumo && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card de Estoque */}
          <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 shadow-md flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-400" />
                <h3 className="font-semibold text-slate-200 text-sm">Valor de Estoque</h3>
              </div>
              {resumo.estoque.itensEstoqueCritico > 0 ? (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {resumo.estoque.itensEstoqueCritico} crítico(s)
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Estoque Saudável
                </span>
              )}
            </div>
            <div className="space-y-3 mt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Total de Peças Cadastradas:</span>
                <span className="text-white font-medium">{resumo.estoque.totalItensCadastrados} itens</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Patrimônio (Custo):</span>
                <span className="text-white font-medium">
                  R$ {resumo.estoque.valorTotalEstoqueCusto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Potencial de Venda:</span>
                <span className="text-emerald-400 font-semibold">
                  R$ {resumo.estoque.valorTotalEstoqueVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Card de Terceiros e Retíficas */}
          <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 shadow-md flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-amber-400" />
                <h3 className="font-semibold text-slate-200 text-sm">Serviços de Terceiros (HU-025)</h3>
              </div>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                {resumo.servicosTerceiros.total} ordem(ns)
              </span>
            </div>
            <div className="space-y-3 mt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Custo Total dos Parceiros:</span>
                <span className="text-white font-medium">
                  R$ {resumo.servicosTerceiros.totalCusto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Repassado aos Clientes:</span>
                <span className="text-white font-medium">
                  R$ {resumo.servicosTerceiros.totalCobrado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Margem Bruta Oficina:</span>
                <span className="text-cyan-400 font-semibold">
                  R$ {resumo.servicosTerceiros.margemBruta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Card de Garantias */}
          <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 shadow-md flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="font-semibold text-slate-200 text-sm">Garantias & Retornos (HU-023)</h3>
              </div>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                {resumo.garantias.total} acionamento(s)
              </span>
            </div>
            <div className="space-y-3 mt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Garantias Aprovadas/Cobertas:</span>
                <span className="text-emerald-400 font-semibold">{resumo.garantias.cobertas}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Garantias Recusadas:</span>
                <span className="text-rose-400 font-semibold">{resumo.garantias.recusadas}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Taxa de Cobertura:</span>
                <span className="text-white font-medium">
                  {resumo.garantias.total > 0
                    ? Math.round((resumo.garantias.cobertas / resumo.garantias.total) * 100)
                    : 0}
                  %
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Seção 1: Gestão de Serviços de Terceiros e Retíficas (HU-025) */}
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Truck className="w-5 h-5 text-amber-400" />
              Serviços Externos e Retíficas Parceiras
            </h3>
            <p className="text-slate-400 text-xs mt-1">
              Acompanhamento de envio, custos e conferência de recebimento de peças terceirizadas.
            </p>
          </div>
        </div>

        {servicosTerceiros.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">
            Nenhum serviço terceirizado registrado até o momento.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-800/80 text-xs uppercase text-slate-400 font-semibold border-b border-slate-700">
                <tr>
                  <th className="py-3 px-4">Atendimento</th>
                  <th className="py-3 px-4">Fornecedor</th>
                  <th className="py-3 px-4">Serviço Solicitado</th>
                  <th className="py-3 px-4">Custo</th>
                  <th className="py-3 px-4">Cobrado</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {servicosTerceiros.map((servico) => (
                  <tr key={servico.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-mono font-medium text-cyan-400">
                      {servico.atendimento?.codigoFormatado || 'N/A'}
                    </td>
                    <td className="py-3 px-4 font-medium text-white">{servico.fornecedorNome}</td>
                    <td className="py-3 px-4 text-slate-300">{servico.descricaoServico}</td>
                    <td className="py-3 px-4 text-slate-400 font-mono">
                      R$ {Number(servico.valorCusto).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-emerald-400 font-mono font-medium">
                      R$ {Number(servico.valorCobradoCliente).toFixed(2)}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
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
                    <td className="py-3 px-4 text-right">
                      {servico.status !== 'RECEBIDO' && servico.status !== 'CANCELADO' && (
                        <button
                          onClick={() => setServicoParaReceber(servico)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow transition"
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

      {/* Seção 2: Histórico de Garantias e Retornos (HU-023) */}
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              Controle de Garantias e Retornos de Veículos
            </h3>
            <p className="text-slate-400 text-xs mt-1">
              Registro formal de análises técnicas de garantia, decisões e atendimentos gerados.
            </p>
          </div>
        </div>

        {garantias.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">
            Nenhuma garantia acionada até o momento.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-800/80 text-xs uppercase text-slate-400 font-semibold border-b border-slate-700">
                <tr>
                  <th className="py-3 px-4">Código Garantia</th>
                  <th className="py-3 px-4">Atendimento Origem</th>
                  <th className="py-3 px-4">Veículo / Cliente</th>
                  <th className="py-3 px-4">Decisão</th>
                  <th className="py-3 px-4">Novo Atendimento</th>
                  <th className="py-3 px-4">Data Decisão</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {garantias.map((gar) => (
                  <tr key={gar.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-mono font-bold text-amber-400">{gar.codigoFormatado}</td>
                    <td className="py-3 px-4 font-mono text-cyan-400">
                      {gar.atendimentoOrigem?.codigoFormatado || 'N/A'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-white font-medium">
                        {gar.atendimentoOrigem?.veiculo.modelo} ({gar.atendimentoOrigem?.veiculo.placa})
                      </div>
                      <div className="text-xs text-slate-400">{gar.atendimentoOrigem?.cliente.nomeRazao}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
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
                    <td className="py-3 px-4 font-mono font-medium text-cyan-300">
                      {gar.atendimentoGarantia?.codigoFormatado ? (
                        <span className="flex items-center gap-1.5 text-cyan-400">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                          {gar.atendimentoGarantia.codigoFormatado}
                        </span>
                      ) : (
                        <span className="text-slate-500 text-xs">Sem novo atendimento (Recusada)</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-xs">
                      {new Date(gar.dataDecisao).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Receber Serviço de Terceiro */}
      {servicoParaReceber && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
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

            <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/60 space-y-2 text-sm">
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
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setServicoParaReceber(null)}
                disabled={recebendo}
                className="px-4 py-2 rounded-xl text-slate-300 hover:text-white text-sm font-medium transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarRecebimentoTerceiro}
                disabled={recebendo}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-lg shadow-emerald-950/40 transition flex items-center gap-2"
              >
                {recebendo ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Confirmar Recebimento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
