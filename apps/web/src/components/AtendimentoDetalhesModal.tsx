import React, { useState, useEffect } from 'react';
import {
  X,
  Stethoscope,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Plus,
  Send,
  UserCheck,
  Trash2,
  AlertCircle,
  Car,
  User,
  Check,
} from 'lucide-react';
import { Atendimento, Diagnostico, VersaoOrcamento } from '../types';
import { apiRequest } from '../api';

interface AtendimentoDetalhesModalProps {
  atendimento: Atendimento;
  onClose: () => void;
  onUpdated: () => void;
}

export const AtendimentoDetalhesModal: React.FC<AtendimentoDetalhesModalProps> = ({
  atendimento,
  onClose,
  onUpdated,
}) => {
  const [subAba, setSubAba] = useState<'DIAGNOSTICO' | 'ORCAMENTOS' | 'APROVACAO'>('DIAGNOSTICO');

  // Estado Diagnóstico
  const [diagnosticos, setDiagnosticos] = useState<Diagnostico[]>([]);
  const [relatoTecnico, setRelatoTecnico] = useState('');
  const [constatacoes, setConstatacoes] = useState('');
  const [conclusao, setConclusao] = useState('PROCEDE_REPARO');
  const [procedimentoRecomendado, setProcedimentoRecomendado] = useState('');
  const [salvandoDiag, setSalvandoDiag] = useState(false);

  // Estado Orçamentos
  const [versoes, setVersoes] = useState<VersaoOrcamento[]>([]);
  const [versaoSelecionada, setVersaoSelecionada] = useState<VersaoOrcamento | null>(null);

  // Form Novo Orçamento
  const [criandoVersao, setCriandoVersao] = useState(false);
  const [itensNovoOrcamento, setItensNovoOrcamento] = useState<
    Array<{ tipo: 'PECA' | 'SERVICO'; descricao: string; quantidade: number; unidadeMedida: string; valorUnitario: number; valorDesconto: number }>
  >([
    { tipo: 'SERVICO', descricao: 'Diagnóstico e Mão de Obra de Troca de Pastilhas', quantidade: 1, unidadeMedida: 'HR', valorUnitario: 180, valorDesconto: 0 },
    { tipo: 'PECA', descricao: 'Jogo de Pastilhas de Freio Dianteiro Cerâmica', quantidade: 1, unidadeMedida: 'JG', valorUnitario: 320, valorDesconto: 0 },
  ]);
  const [validadeDias, setValidadeDias] = useState(10);
  const [obsComerciais, setObsComerciais] = useState('');
  const [salvandoOrc, setSalvandoOrc] = useState(false);

  // Decisão Comercial
  const [decisoesItens, setDecisoesItens] = useState<Record<string, 'APROVADO' | 'RECUSADO'>>({});
  const [canalAprovacao, setCanalAprovacao] = useState<'WHATSAPP' | 'PRESENCIAL' | 'TELEFONE' | 'EMAIL'>('WHATSAPP');
  const [autorizadorNome, setAutorizadorNome] = useState(atendimento.cliente.nomeRazao);
  const [evidenciaTexto, setEvidenciaTexto] = useState('Cliente confirmou orçamento completo via WhatsApp.');
  const [salvandoDecisao, setSalvandoDecisao] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [sucessoMsg, setSucessoMsg] = useState('');

  const carregarDadosComerciais = async () => {
    setErrorMsg('');
    const [resDiag, resOrc] = await Promise.all([
      apiRequest<Diagnostico[]>(`/atendimentos/${atendimento.id}/diagnostico`),
      apiRequest<VersaoOrcamento[]>(`/atendimentos/${atendimento.id}/orcamentos`),
    ]);

    if (resDiag.sucesso && resDiag.dados) {
      setDiagnosticos(resDiag.dados);
    }
    if (resOrc.sucesso && resOrc.dados) {
      setVersoes(resOrc.dados);
      if (resOrc.dados.length > 0) {
        setVersaoSelecionada(resOrc.dados[0]);
        // Inicializar decisões padrão como APROVADO
        const inicial: Record<string, 'APROVADO' | 'RECUSADO'> = {};
        resOrc.dados[0].itens.forEach((it) => {
          inicial[it.id] = 'APROVADO';
        });
        setDecisoesItens(inicial);
      }
    }
  };

  useEffect(() => {
    carregarDadosComerciais();
  }, [atendimento.id]);

  // Salvar Diagnóstico
  const handleSalvarDiagnostico = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvandoDiag(true);
    setErrorMsg('');
    setSucessoMsg('');

    const res = await apiRequest(`/atendimentos/${atendimento.id}/diagnostico`, {
      method: 'POST',
      body: JSON.stringify({
        relatoTecnico,
        constatacoes,
        conclusao,
        procedimentoRecomendado,
      }),
    });

    setSalvandoDiag(false);
    if (res.sucesso) {
      setSucessoMsg('Diagnóstico técnico registrado com sucesso!');
      setRelatoTecnico('');
      setConstatacoes('');
      setProcedimentoRecomendado('');
      carregarDadosComerciais();
      onUpdated();
    } else {
      setErrorMsg(res.mensagem || 'Falha ao salvar diagnóstico');
    }
  };

  // Manipular Itens Novo Orçamento
  const handleAddItem = () => {
    setItensNovoOrcamento([
      ...itensNovoOrcamento,
      { tipo: 'PECA', descricao: '', quantidade: 1, unidadeMedida: 'UN', valorUnitario: 0, valorDesconto: 0 },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItensNovoOrcamento(itensNovoOrcamento.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, campo: string, valor: any) => {
    const novos = [...itensNovoOrcamento];
    (novos[index] as any)[campo] = valor;
    setItensNovoOrcamento(novos);
  };

  // Salvar Nova Versão de Orçamento
  const handleSalvarVersaoOrcamento = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvandoOrc(true);
    setErrorMsg('');
    setSucessoMsg('');

    const res = await apiRequest(`/atendimentos/${atendimento.id}/orcamentos`, {
      method: 'POST',
      body: JSON.stringify({
        validadeDias: Number(validadeDias),
        observacoesComerciais: obsComerciais,
        itens: itensNovoOrcamento.map((it) => ({
          ...it,
          quantidade: Number(it.quantidade),
          valorUnitario: Number(it.valorUnitario),
          valorDesconto: Number(it.valorDesconto),
        })),
      }),
    });

    setSalvandoOrc(false);
    if (res.sucesso) {
      setCriandoVersao(false);
      setSucessoMsg('Nova versão de orçamento criada com sucesso!');
      carregarDadosComerciais();
      onUpdated();
    } else {
      setErrorMsg(res.mensagem || 'Falha ao criar orçamento');
    }
  };

  // Apresentar Proposta ao Cliente
  const handleApresentarProposta = async (versaoId: string) => {
    setErrorMsg('');
    const res = await apiRequest(`/orcamentos/versoes/${versaoId}/apresentar`, {
      method: 'POST',
    });

    if (res.sucesso) {
      setSucessoMsg('Orçamento apresentado! Status avançado para Aguardando Aprovação.');
      carregarDadosComerciais();
      onUpdated();
    } else {
      setErrorMsg(res.mensagem || 'Falha ao apresentar proposta');
    }
  };

  // Registrar Decisão Comercial por Item
  const handleConfirmarDecisao = async (versaoId: string) => {
    setSalvandoDecisao(true);
    setErrorMsg('');

    const decisoesFormatadas = Object.entries(decisoesItens).map(([itemId, decisao]) => ({
      itemId,
      decisao,
    }));

    const res = await apiRequest(`/orcamentos/versoes/${versaoId}/decisao`, {
      method: 'POST',
      body: JSON.stringify({
        canal: canalAprovacao,
        autorizadorNome,
        evidenciaTexto,
        decisoesItens: decisoesFormatadas,
      }),
    });

    setSalvandoDecisao(false);
    if (res.sucesso) {
      setSucessoMsg('Decisão comercial registrada com sucesso! Veículo liberado para execução mecânica.');
      carregarDadosComerciais();
      onUpdated();
    } else {
      setErrorMsg(res.mensagem || 'Falha ao registrar decisão comercial');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.8)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px',
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '920px',
        maxHeight: '92vh',
        overflowY: 'auto',
        background: '#0d1322',
        padding: '30px',
        borderRadius: 'var(--radius-lg)',
      }}>
        {/* Header com dados do Atendimento */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '18px', marginBottom: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)', fontFamily: 'var(--font-heading)' }}>
                {atendimento.codigoFormatado}
              </span>
              <span className="badge badge-blue">{atendimento.status}</span>
            </div>
            <div style={{ display: 'flex', gap: '16px', fontSize: '0.84rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Car size={15} color="var(--primary)" /> {atendimento.veiculo.marca} {atendimento.veiculo.modelo} ({atendimento.veiculo.placa})
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <User size={15} /> {atendimento.cliente.nomeRazao}
              </span>
            </div>
          </div>

          <button onClick={onClose} className="btn btn-secondary" style={{ padding: '6px', borderRadius: '50%' }}>
            <X size={18} />
          </button>
        </div>

        {/* Alertas */}
        {errorMsg && (
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', padding: '10px 14px', borderRadius: '6px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem' }}>
            <AlertCircle size={16} /> {errorMsg}
          </div>
        )}
        {sucessoMsg && (
          <div style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', padding: '10px 14px', borderRadius: '6px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem' }}>
            <CheckCircle2 size={16} /> {sucessoMsg}
          </div>
        )}

        {/* Sub-Abas do Fluxo Técnico e Comercial */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', marginBottom: '20px' }}>
          <button
            onClick={() => setSubAba('DIAGNOSTICO')}
            className={`btn ${subAba === 'DIAGNOSTICO' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.84rem', padding: '8px 16px' }}
          >
            <Stethoscope size={16} /> 1. Diagnóstico Técnico ({diagnosticos.length})
          </button>

          <button
            onClick={() => setSubAba('ORCAMENTOS')}
            className={`btn ${subAba === 'ORCAMENTOS' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.84rem', padding: '8px 16px' }}
          >
            <FileSpreadsheet size={16} /> 2. Orçamento Versionado ({versoes.length})
          </button>

          <button
            onClick={() => setSubAba('APROVACAO')}
            className={`btn ${subAba === 'APROVACAO' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.84rem', padding: '8px 16px' }}
          >
            <UserCheck size={16} /> 3. Decisão Comercial por Item
          </button>
        </div>

        {/* SUB-ABA 1: DIAGNÓSTICO TÉCNICO (HU-010) */}
        {subAba === 'DIAGNOSTICO' && (
          <div>
            {/* Lista de Diagnósticos Anteriores */}
            {diagnosticos.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '10px', color: '#38bdf8' }}>
                  Pareceres Técnicos Emitidos:
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {diagnosticos.map((diag) => (
                    <div key={diag.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.92rem' }}>
                          Mecânico: {diag.responsavelTecnico?.nome || 'Técnico Responsável'}
                        </span>
                        <span className="badge badge-blue">{diag.conclusao.replace(/_/g, ' ')}</span>
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginBottom: '6px' }}>
                        <strong>Constatações:</strong> {diag.constatacoes}
                      </p>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        <strong>Procedimento Recomendado:</strong> {diag.procedimentoRecomendado || diag.relatoTecnico}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Formulário Novo Diagnóstico */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '20px' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Stethoscope size={18} color="var(--primary)" /> Registrar Novo Diagnóstico Técnico (HU-010)
              </h4>

              <form onSubmit={handleSalvarDiagnostico} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label className="input-label">Constatações da Desmontagem / Falhas Identificadas</label>
                  <textarea
                    required
                    rows={2}
                    value={constatacoes}
                    onChange={(e) => setConstatacoes(e.target.value)}
                    placeholder="Ex: Pastilhas de freio dianteiras gastas abaixo do limite mínimo (menos de 2mm), discos com sulcos acentuados..."
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="input-label">Relato Detalhado dos Procedimentos e Testes Realizados</label>
                  <textarea
                    required
                    rows={2}
                    value={relatoTecnico}
                    onChange={(e) => setRelatoTecnico(e.target.value)}
                    placeholder="Ex: Teste de rodagem comprovou trepidação no pedal. Verificação em elevador constatou folga zero nos pivôs, porém desgaste crítico no sistema de frenagem..."
                    className="input-field"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="input-label">Conclusão Técnica</label>
                    <select
                      value={conclusao}
                      onChange={(e) => setConclusao(e.target.value)}
                      className="input-field"
                    >
                      <option value="PROCEDE_REPARO">Procede Reparo Imediato</option>
                      <option value="AGUARDANDO_DESMONTAGEM">Aguardando Desmontagem Adicional</option>
                      <option value="INCONCLUSIVO">Inconclusivo / Teste em Andamento</option>
                      <option value="SEM_DEFEITO_CONSTATADO">Sem Defeito Constatado</option>
                    </select>
                  </div>

                  <div>
                    <label className="input-label">Procedimento Recomendado</label>
                    <input
                      type="text"
                      value={procedimentoRecomendado}
                      onChange={(e) => setProcedimentoRecomendado(e.target.value)}
                      placeholder="Ex: Substituição das pastilhas e retífica/troca dos discos dianteiros"
                      className="input-field"
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                  <button type="submit" disabled={salvandoDiag} className="btn btn-primary">
                    {salvandoDiag ? 'Registrando...' : 'Gravar Parecer Técnico'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* SUB-ABA 2: ORÇAMENTO VERSIONADO (HU-011) */}
        {subAba === 'ORCAMENTOS' && (
          <div>
            {!criandoVersao ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>Versões Comerciais da Proposta</h4>
                  <button onClick={() => setCriandoVersao(true)} className="btn btn-primary">
                    <Plus size={16} /> Nova Revisão de Orçamento
                  </button>
                </div>

                {versoes.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Nenhum orçamento emitido ainda. Clique em "Nova Revisão de Orçamento" para adicionar peças e serviços.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {versoes.map((v) => (
                      <div key={v.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                          <div>
                            <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)' }}>
                              Orçamento — Versão {v.numeroVersao}
                            </span>
                            <span className="badge badge-purple" style={{ marginLeft: '10px' }}>
                              {v.status}
                            </span>
                          </div>

                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#34d399' }}>
                              R$ {Number(v.valorTotalFinal).toFixed(2)}
                            </span>
                            {v.status === 'RASCUNHO' && (
                              <button
                                onClick={() => handleApresentarProposta(v.id)}
                                className="btn btn-secondary"
                                style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                              >
                                <Send size={14} /> Apresentar ao Cliente
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Itens da Versão */}
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem', marginTop: '10px' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                              <th style={{ padding: '8px' }}>Tipo</th>
                              <th style={{ padding: '8px' }}>Descrição</th>
                              <th style={{ padding: '8px' }}>Qtd</th>
                              <th style={{ padding: '8px' }}>Unitário</th>
                              <th style={{ padding: '8px' }}>Total</th>
                              <th style={{ padding: '8px' }}>Decisão</th>
                            </tr>
                          </thead>
                          <tbody>
                            {v.itens.map((it) => (
                              <tr key={it.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                <td style={{ padding: '8px' }}>
                                  <span className={`badge ${it.tipo === 'PECA' ? 'badge-amber' : 'badge-blue'}`}>
                                    {it.tipo}
                                  </span>
                                </td>
                                <td style={{ padding: '8px', fontWeight: 500 }}>{it.descricao}</td>
                                <td style={{ padding: '8px' }}>{Number(it.quantidade)} {it.unidadeMedida}</td>
                                <td style={{ padding: '8px' }}>R$ {Number(it.valorUnitario).toFixed(2)}</td>
                                <td style={{ padding: '8px', fontWeight: 600 }}>R$ {Number(it.valorTotal).toFixed(2)}</td>
                                <td style={{ padding: '8px' }}>
                                  <span className={`badge ${it.decisao === 'APROVADO' ? 'badge-green' : it.decisao === 'RECUSADO' ? 'badge-amber' : 'badge-blue'}`}>
                                    {it.decisao}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Formulário Criar Versão */
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>Nova Revisão de Orçamento</h4>
                  <button onClick={() => setCriandoVersao(false)} className="btn btn-secondary" style={{ fontSize: '0.8rem' }}>
                    Voltar
                  </button>
                </div>

                <form onSubmit={handleSalvarVersaoOrcamento} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Tabela de Itens */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="input-label">Itens de Peças e Mão de Obra</span>
                      <button type="button" onClick={handleAddItem} className="btn btn-secondary" style={{ fontSize: '0.74rem', padding: '4px 8px' }}>
                        <Plus size={13} /> Adicionar Item
                      </button>
                    </div>

                    {itensNovoOrcamento.map((it, idx) => (
                      <div key={idx} style={{ display: 'grid', gridTemplateColumns: '100px 2fr 70px 60px 100px 36px', gap: '8px', alignItems: 'center' }}>
                        <select
                          value={it.tipo}
                          onChange={(e) => handleItemChange(idx, 'tipo', e.target.value)}
                          className="input-field"
                        >
                          <option value="SERVICO">Serviço</option>
                          <option value="PECA">Peça</option>
                        </select>

                        <input
                          type="text"
                          required
                          value={it.descricao}
                          onChange={(e) => handleItemChange(idx, 'descricao', e.target.value)}
                          placeholder="Descrição do item"
                          className="input-field"
                        />

                        <input
                          type="number"
                          required
                          min={0.1}
                          step="any"
                          value={it.quantidade}
                          onChange={(e) => handleItemChange(idx, 'quantidade', e.target.value)}
                          className="input-field"
                          placeholder="Qtd"
                        />

                        <input
                          type="text"
                          value={it.unidadeMedida}
                          onChange={(e) => handleItemChange(idx, 'unidadeMedida', e.target.value)}
                          className="input-field"
                          placeholder="UN"
                        />

                        <input
                          type="number"
                          required
                          min={0}
                          step="0.01"
                          value={it.valorUnitario}
                          onChange={(e) => handleItemChange(idx, 'valorUnitario', e.target.value)}
                          className="input-field"
                          placeholder="R$ Unit"
                        />

                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="btn btn-secondary"
                          style={{ padding: '8px', color: '#f87171' }}
                          title="Remover Item"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                    <div>
                      <label className="input-label">Validade da Proposta (Dias)</label>
                      <input
                        type="number"
                        value={validadeDias}
                        onChange={(e) => setValidadeDias(Number(e.target.value))}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="input-label">Observações Comerciais / Condições</label>
                      <input
                        type="text"
                        value={obsComerciais}
                        onChange={(e) => setObsComerciais(e.target.value)}
                        placeholder="Ex: Peças originais com garantia de 1 ano, pagamento em até 6x sem juros"
                        className="input-field"
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                    <button type="button" onClick={() => setCriandoVersao(false)} className="btn btn-secondary">
                      Cancelar
                    </button>
                    <button type="submit" disabled={salvandoOrc} className="btn btn-primary">
                      {salvandoOrc ? 'Criando Versão...' : 'Criar Versão do Orçamento'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* SUB-ABA 3: DECISÃO COMERCIAL POR ITEM (HU-012/013) */}
        {subAba === 'APROVACAO' && (
          <div>
            {versoes.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Crie um orçamento antes de registrar a decisão comercial.
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                      Registro de Aprovação Rastreável por Item (DOC-003, DOC-004)
                    </h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      O cliente pode aprovar integralmente ou selecionar apenas os itens prioritários.
                    </p>
                  </div>

                  {/* Seletor de versão */}
                  <select
                    value={versaoSelecionada?.id}
                    onChange={(e) => {
                      const v = versoes.find((item) => item.id === e.target.value);
                      if (v) setVersaoSelecionada(v);
                    }}
                    className="input-field"
                    style={{ width: '180px' }}
                  >
                    {versoes.map((v) => (
                      <option key={v.id} value={v.id}>
                        Versão {v.numeroVersao} ({v.status})
                      </option>
                    ))}
                  </select>
                </div>

                {versaoSelecionada && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Lista de itens para decisão */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {versaoSelecionada.itens.map((it) => {
                        const decisaoAtual = decisoesItens[it.id] || 'APROVADO';
                        return (
                          <div
                            key={it.id}
                            style={{
                              background: 'rgba(255,255,255,0.02)',
                              border: `1px solid ${decisaoAtual === 'APROVADO' ? '#10b98140' : '#ef444440'}`,
                              borderRadius: 'var(--radius-sm)',
                              padding: '12px 16px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{it.descricao}</div>
                              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                {it.tipo} • {Number(it.quantidade)} {it.unidadeMedida} • R$ {Number(it.valorTotal).toFixed(2)}
                              </div>
                            </div>

                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                type="button"
                                onClick={() => setDecisoesItens({ ...decisoesItens, [it.id]: 'APROVADO' })}
                                className={`btn ${decisaoAtual === 'APROVADO' ? 'btn-primary' : 'btn-secondary'}`}
                                style={{ fontSize: '0.78rem', padding: '6px 12px' }}
                              >
                                <CheckCircle2 size={14} /> Aprovar
                              </button>
                              <button
                                type="button"
                                onClick={() => setDecisoesItens({ ...decisoesItens, [it.id]: 'RECUSADO' })}
                                className="btn btn-secondary"
                                style={{
                                  fontSize: '0.78rem',
                                  padding: '6px 12px',
                                  borderColor: decisaoAtual === 'RECUSADO' ? '#ef4444' : undefined,
                                  color: decisaoAtual === 'RECUSADO' ? '#f87171' : undefined,
                                }}
                              >
                                <XCircle size={14} /> Recusar
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Dados da Autorização Rastreável */}
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '16px' }}>
                      <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#38bdf8', marginBottom: '12px' }}>
                        Evidência da Autorização Comercial (DOC-004 e DOC-013)
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '10px' }}>
                        <div>
                          <label className="input-label">Canal de Autorização</label>
                          <select
                            value={canalAprovacao}
                            onChange={(e) => setCanalAprovacao(e.target.value as any)}
                            className="input-field"
                          >
                            <option value="WHATSAPP">WhatsApp (Mensagem de Áudio/Texto)</option>
                            <option value="PRESENCIAL">Presencial (Assinatura no Balcão)</option>
                            <option value="TELEFONE">Ligação Telefônica Gravada</option>
                            <option value="EMAIL">E-mail Formal</option>
                          </select>
                        </div>

                        <div>
                          <label className="input-label">Nome do Autorizador / Cliente</label>
                          <input
                            type="text"
                            required
                            value={autorizadorNome}
                            onChange={(e) => setAutorizadorNome(e.target.value)}
                            className="input-field"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="input-label">Evidência / Observações da Aprovação</label>
                        <input
                          type="text"
                          value={evidenciaTexto}
                          onChange={(e) => setEvidenciaTexto(e.target.value)}
                          className="input-field"
                          placeholder="Ex: Áudio do cliente às 14:32 autorizando a troca das pastilhas"
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                      <button
                        type="button"
                        disabled={salvandoDecisao}
                        onClick={() => handleConfirmarDecisao(versaoSelecionada.id)}
                        className="btn btn-primary"
                        style={{ minWidth: '220px' }}
                      >
                        <Check size={16} /> {salvandoDecisao ? 'Gravando...' : 'Confirmar Decisão e Liberar OS'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
