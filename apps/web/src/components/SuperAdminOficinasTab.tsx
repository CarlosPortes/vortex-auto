import React, { useState, useEffect } from 'react';
import {
  Building2,
  Crown,
  Search,
  CheckCircle2,
  Camera,
  LogIn,
  Plus,
  Users,
  Car,
  Wrench,
  Package,
  ClipboardList,
  Phone,
  MapPin,
  Mail,
  Power,
  RefreshCw,
  X,
} from 'lucide-react';
import { OficinaAdminSaaS, PlanoSistema } from '../types';
import { apiRequest, setStoredToken } from '../api';
import { useDemoPlan } from '../context/DemoPlanContext';

interface SuperAdminOficinasTabProps {
  empresaAtivaId: string;
  onTenantSwitched: () => void;
}

export const SuperAdminOficinasTab: React.FC<SuperAdminOficinasTabProps> = ({
  empresaAtivaId,
  onTenantSwitched,
}) => {
  const { sincronizarComSessao } = useDemoPlan();
  const [oficinas, setOficinas] = useState<OficinaAdminSaaS[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroPlano, setFiltroPlano] = useState<'TODOS' | PlanoSistema>('TODOS');
  const [salvandoId, setSalvandoId] = useState<string | null>(null);
  const [acessandoId, setAcessandoId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  // Modal Nova Oficina Piloto / Cliente
  const [modalNovaOficina, setModalNovaOficina] = useState(false);
  const [novaRazao, setNovaRazao] = useState('');
  const [novoFantasia, setNovoFantasia] = useState('');
  const [novoCnpj, setNovoCnpj] = useState('');
  const [novoTelefone, setNovoTelefone] = useState('');
  const [novaCidade, setNovaCidade] = useState('');
  const [novaUf, setNovaUf] = useState('SP');
  const [novoPlano, setNovoPlano] = useState<PlanoSistema>('BASICO');
  const [novoComFotos, setNovoComFotos] = useState(true);
  const [novoAdminNome, setNovoAdminNome] = useState('');
  const [novoAdminEmail, setNovoAdminEmail] = useState('');
  const [novoAdminSenha, setNovoAdminSenha] = useState('');
  const [criandoOficina, setCriandoOficina] = useState(false);

  const carregarOficinas = async () => {
    setLoading(true);
    const res = await apiRequest<OficinaAdminSaaS[]>('/admin/oficinas');
    if (res.sucesso && res.dados) {
      setOficinas(res.dados);
    } else {
      setFeedback({ tipo: 'erro', texto: res.mensagem || 'Não foi possível carregar a lista de oficinas.' });
    }
    setLoading(false);
  };

  useEffect(() => {
    carregarOficinas();
  }, []);

  const handleAlterarPlanoOficina = async (
    oficina: OficinaAdminSaaS,
    novoPlanoAssinatura: PlanoSistema,
    novoComFotos: boolean,
    novoAtivo: boolean = oficina.ativo
  ) => {
    setSalvandoId(oficina.id);
    setFeedback(null);

    const res = await apiRequest(`/admin/oficinas/${oficina.id}/plano`, {
      method: 'PATCH',
      body: JSON.stringify({
        planoAssinatura: novoPlanoAssinatura,
        comFotos: novoComFotos,
        ativo: novoAtivo,
      }),
    });

    setSalvandoId(null);

    if (res.sucesso) {
      setOficinas((prev) =>
        prev.map((o) =>
          o.id === oficina.id
            ? { ...o, planoAssinatura: novoPlanoAssinatura, comFotos: novoComFotos, ativo: novoAtivo }
            : o
        )
      );

      // Se a oficina alterada for a oficina atualmente aberta na sessão, sincroniza a barra de planos imediatamente
      if (oficina.id === empresaAtivaId) {
        sincronizarComSessao(oficina.id, novoPlanoAssinatura, novoComFotos);
      }

      setFeedback({
        tipo: 'sucesso',
        texto: `Oficina "${oficina.nomeFantasia}" atualizada para o Plano ${novoPlanoAssinatura} (${novoComFotos ? 'Com Fotos' : 'Sem Fotos'})!`,
      });
    } else {
      setFeedback({
        tipo: 'erro',
        texto: res.mensagem || 'Erro ao atualizar plano da oficina.',
      });
    }
  };

  const handleAcessarOficina = async (oficina: OficinaAdminSaaS) => {
    setAcessandoId(oficina.id);
    setFeedback(null);

    const res = await apiRequest<{
      token: string;
      empresa: { id: string; razaoSocial: string; nomeFantasia: string };
      unidade: { id: string; nome: string };
    }>('/auth/select-tenant', {
      method: 'POST',
      body: JSON.stringify({
        empresaId: oficina.id,
        unidadeId: oficina.unidadePrincipalId || undefined,
      }),
    });

    setAcessandoId(null);

    if (res.sucesso && res.dados?.token) {
      setStoredToken(res.dados.token);
      sincronizarComSessao(oficina.id, oficina.planoAssinatura, oficina.comFotos);
      setFeedback({
        tipo: 'sucesso',
        texto: `Contexto alterado com sucesso! Você agora está operando dentro da oficina "${oficina.nomeFantasia}".`,
      });
      onTenantSwitched();
    } else {
      setFeedback({
        tipo: 'erro',
        texto: res.mensagem || 'Não foi possível acessar o ambiente desta oficina.',
      });
    }
  };

  const handleCriarNovaOficina = async (e: React.FormEvent) => {
    e.preventDefault();
    setCriandoOficina(true);
    setFeedback(null);

    const res = await apiRequest('/admin/oficinas', {
      method: 'POST',
      body: JSON.stringify({
        razaoSocial: novaRazao,
        nomeFantasia: novoFantasia || novaRazao,
        cnpj: novoCnpj,
        telefone: novoTelefone,
        cidade: novaCidade,
        uf: novaUf,
        planoAssinatura: novoPlano,
        comFotos: novoComFotos,
        nomeAdmin: novoAdminNome,
        emailAdmin: novoAdminEmail,
        senhaAdmin: novoAdminSenha,
      }),
    });

    setCriandoOficina(false);

    if (res.sucesso) {
      setFeedback({
        tipo: 'sucesso',
        texto: res.mensagem || 'Nova oficina cadastrada com sucesso!',
      });
      setModalNovaOficina(false);
      setNovaRazao('');
      setNovoFantasia('');
      setNovoCnpj('');
      setNovoTelefone('');
      setNovaCidade('');
      setNovoAdminNome('');
      setNovoAdminEmail('');
      setNovoAdminSenha('');
      carregarOficinas();
    } else {
      setFeedback({
        tipo: 'erro',
        texto: res.mensagem || 'Falha ao cadastrar oficina.',
      });
    }
  };

  const formatarCNPJ = (cnpj: string) => {
    const limpo = (cnpj || '').replace(/\D/g, '');
    if (limpo.length !== 14) return cnpj;
    return limpo.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  };

  const oficinasFiltradas = oficinas.filter((o) => {
    if (filtroPlano !== 'TODOS' && o.planoAssinatura !== filtroPlano) return false;
    if (!busca.trim()) return true;
    const t = busca.toLowerCase();
    return (
      o.razaoSocial.toLowerCase().includes(t) ||
      o.nomeFantasia.toLowerCase().includes(t) ||
      o.cnpj.includes(t) ||
      o.cidade.toLowerCase().includes(t) ||
      (o.responsavel?.nome || '').toLowerCase().includes(t) ||
      (o.responsavel?.email || '').toLowerCase().includes(t)
    );
  });

  const totalBasico = oficinas.filter((o) => o.planoAssinatura === 'BASICO').length;
  const totalIntermediario = oficinas.filter((o) => o.planoAssinatura === 'INTERMEDIARIO').length;
  const totalAvancado = oficinas.filter((o) => o.planoAssinatura === 'AVANCADO').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Cabeçalho SuperAdmin */}
      <div
        className="glass-panel"
        style={{
          padding: '22px 26px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          borderLeft: '4px solid var(--accent-amber)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              background: 'rgba(245, 158, 11, 0.16)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-amber)',
            }}
          >
            <Crown size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>
                Gestão SaaS: Oficinas Cadastradas & Planos
              </h2>
              <span className="badge badge-amber">Painel Administrador Geral</span>
            </div>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Visualize todas as oficinas (clientes e pilotos), defina o pacote de assinatura de cada uma e acesse qualquer ambiente com 1 clique.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={carregarOficinas}
            className="btn btn-secondary"
            style={{ fontSize: '0.84rem' }}
          >
            <RefreshCw size={15} /> Atualizar Lista
          </button>
          <button
            type="button"
            onClick={() => setModalNovaOficina(true)}
            className="btn btn-primary"
            style={{ fontSize: '0.84rem', fontWeight: 700 }}
          >
            <Plus size={16} /> Nova Oficina Piloto / Cliente
          </button>
        </div>
      </div>

      {/* Resumo de Oficinas e Planos */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '14px',
        }}
      >
        <div className="glass-panel" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Total de Oficinas na Plataforma</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, marginTop: '4px' }}>{oficinas.length}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--accent-green)', marginTop: '4px' }}>
            {oficinas.filter((o) => o.ativo).length} ativa(s) em operação
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px 20px', borderTop: '3px solid #10b981' }}>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>🟢 Plano Básico</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>
            {totalBasico}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>
            Recepção, OS Rápida & Maquininha
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px 20px', borderTop: '3px solid #f59e0b' }}>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>🟡 Plano Intermediário</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>
            {totalIntermediario}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>
            + Controle de Estoque & Peças
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px 20px', borderTop: '3px solid #0ea5e9' }}>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>🔵 Plano Avançado</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0ea5e9', marginTop: '4px' }}>
            {totalAvancado}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>
            + Compras MRP, PDV Balcão & BI
          </div>
        </div>
      </div>

      {/* Feedback */}
      {feedback && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: 'var(--radius-md)',
            background: feedback.tipo === 'sucesso' ? 'rgba(16, 185, 129, 0.14)' : 'rgba(239, 68, 68, 0.14)',
            border: `1px solid ${feedback.tipo === 'sucesso' ? '#10b981' : '#ef4444'}`,
            color: feedback.tipo === 'sucesso' ? '#10b981' : '#ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.86rem',
            fontWeight: 500,
          }}
        >
          <span>{feedback.texto}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 700 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Barra de Busca e Filtro por Plano */}
      <div
        className="glass-panel"
        style={{
          padding: '14px 18px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <div style={{ position: 'relative', flex: '1 1 320px' }}>
          <Search
            size={16}
            color="var(--text-dim)"
            style={{ position: 'absolute', left: '12px', top: '12px' }}
          />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar oficina por nome, razão social, CNPJ, cidade ou e-mail do responsável..."
            className="input-field"
            style={{ paddingLeft: '36px' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {(['TODOS', 'BASICO', 'INTERMEDIARIO', 'AVANCADO'] as const).map((pl) => (
            <button
              key={pl}
              type="button"
              onClick={() => setFiltroPlano(pl)}
              className={`btn ${filtroPlano === pl ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.8rem', padding: '7px 14px' }}
            >
              {pl === 'TODOS'
                ? 'Todos os Planos'
                : pl === 'BASICO'
                ? '🟢 Básico'
                : pl === 'INTERMEDIARIO'
                ? '🟡 Intermediário'
                : '🔵 Avançado'}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Oficinas Cadastradas */}
      {loading ? (
        <div className="glass-panel" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Carregando todas as oficinas cadastradas no banco de dados...
        </div>
      ) : oficinasFiltradas.length === 0 ? (
        <div className="glass-panel" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Nenhuma oficina encontrada para o filtro selecionado.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {oficinasFiltradas.map((oficina) => {
            const isAtivaNaSessao = oficina.id === empresaAtivaId;
            const isSalvando = salvandoId === oficina.id;
            const isAcessando = acessandoId === oficina.id;

            return (
              <div
                key={oficina.id}
                className="glass-panel"
                style={{
                  padding: '22px',
                  border: isAtivaNaSessao
                    ? '2px solid var(--primary)'
                    : '1px solid var(--border-subtle)',
                  boxShadow: isAtivaNaSessao ? '0 0 24px var(--primary-glow)' : 'var(--shadow-card)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '18px',
                }}
              >
                {/* Topo do Card da Oficina */}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '16px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                    <div
                      style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '12px',
                        background: isAtivaNaSessao ? 'var(--primary)' : 'var(--bg-subtle)',
                        color: isAtivaNaSessao ? '#ffffff' : 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid var(--border-subtle)',
                        flexShrink: 0,
                      }}
                    >
                      <Building2 size={22} />
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <h3 style={{ fontSize: '1.18rem', fontWeight: 800 }}>
                          {oficina.nomeFantasia || oficina.razaoSocial}
                        </h3>

                        {isAtivaNaSessao && (
                          <span className="badge badge-blue" style={{ fontSize: '0.72rem' }}>
                            <CheckCircle2 size={12} /> OFICINA CONECTADA AGORA
                          </span>
                        )}

                        <span
                          className={`badge ${oficina.ativo ? 'badge-green' : 'badge-red'}`}
                          style={{ fontSize: '0.7rem' }}
                        >
                          {oficina.ativo ? 'Ativa' : 'Suspensa'}
                        </span>
                      </div>

                      <div
                        style={{
                          fontSize: '0.82rem',
                          color: 'var(--text-muted)',
                          marginTop: '4px',
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '14px',
                        }}
                      >
                        <span>
                          <strong>Razão Social:</strong> {oficina.razaoSocial}
                        </span>
                        <span>
                          <strong>CNPJ:</strong> {formatarCNPJ(oficina.cnpj)}
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={13} /> {oficina.cidade}/{oficina.uf}
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Phone size={13} /> {oficina.telefone}
                        </span>
                      </div>

                      {oficina.responsavel && (
                        <div
                          style={{
                            fontSize: '0.78rem',
                            color: 'var(--text-dim)',
                            marginTop: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            flexWrap: 'wrap',
                          }}
                        >
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Users size={13} color="var(--primary)" />
                            <strong>Administrador da Oficina:</strong> {oficina.responsavel.nome}
                          </span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Mail size={13} /> {oficina.responsavel.email}
                          </span>
                          <span>
                            <strong>Cadastrada em:</strong>{' '}
                            {new Date(oficina.criadoEm).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Botões de Ação: Acessar Oficina + Ativar/Suspender */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() =>
                        handleAlterarPlanoOficina(
                          oficina,
                          oficina.planoAssinatura,
                          oficina.comFotos,
                          !oficina.ativo
                        )
                      }
                      disabled={isSalvando}
                      className="btn btn-secondary"
                      title={oficina.ativo ? 'Suspender acesso da oficina' : 'Reativar oficina'}
                      style={{ fontSize: '0.78rem', padding: '8px 12px' }}
                    >
                      <Power size={14} color={oficina.ativo ? '#ef4444' : '#10b981'} />
                      {oficina.ativo ? 'Suspender' : 'Reativar'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAcessarOficina(oficina)}
                      disabled={isAtivaNaSessao || isAcessando}
                      className={`btn ${isAtivaNaSessao ? 'btn-secondary' : 'btn-primary'}`}
                      style={{ fontSize: '0.82rem', padding: '8px 16px', fontWeight: 700 }}
                    >
                      <LogIn size={15} />
                      {isAtivaNaSessao
                        ? 'Visualizando Esta Oficina'
                        : isAcessando
                        ? 'Entrando...'
                        : 'Acessar Ambiente da Oficina'}
                    </button>
                  </div>
                </div>

                {/* Métricas de Uso da Oficina + Configuração de Plano */}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    paddingTop: '14px',
                    borderTop: '1px solid var(--border-subtle)',
                  }}
                >
                  {/* Indicadores de Uso do Banco */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                    <div
                      style={{
                        background: 'var(--bg-subtle)',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-subtle)',
                        fontSize: '0.78rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <Users size={14} color="var(--primary)" />
                      <strong>{oficina.metricas.clientes}</strong> Clientes
                    </div>

                    <div
                      style={{
                        background: 'var(--bg-subtle)',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-subtle)',
                        fontSize: '0.78rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <Car size={14} color="var(--primary)" />
                      <strong>{oficina.metricas.veiculos}</strong> Veículos/Itens
                    </div>

                    <div
                      style={{
                        background: 'var(--bg-subtle)',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-subtle)',
                        fontSize: '0.78rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <ClipboardList size={14} color="#10b981" />
                      <strong>{oficina.metricas.atendimentos}</strong> Atendimentos
                    </div>

                    <div
                      style={{
                        background: 'var(--bg-subtle)',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-subtle)',
                        fontSize: '0.78rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <Wrench size={14} color="#f59e0b" />
                      <strong>{oficina.metricas.ordensServico}</strong> OS
                    </div>

                    <div
                      style={{
                        background: 'var(--bg-subtle)',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-subtle)',
                        fontSize: '0.78rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <Package size={14} color="#8b5cf6" />
                      <strong>{oficina.metricas.produtos}</strong> Peças
                    </div>
                  </div>

                  {/* Controles Diretos de Plano e Fotos da Oficina */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                      Plano Contratado:
                    </span>

                    <div
                      style={{
                        display: 'inline-flex',
                        background: 'var(--bg-subtle)',
                        padding: '4px',
                        borderRadius: '10px',
                        border: '1px solid var(--border-subtle)',
                        gap: '4px',
                      }}
                    >
                      <button
                        type="button"
                        disabled={isSalvando}
                        onClick={() =>
                          handleAlterarPlanoOficina(oficina, 'BASICO', oficina.comFotos)
                        }
                        style={{
                          padding: '6px 12px',
                          borderRadius: '7px',
                          border: 'none',
                          fontSize: '0.76rem',
                          fontWeight: oficina.planoAssinatura === 'BASICO' ? 700 : 500,
                          cursor: 'pointer',
                          background: oficina.planoAssinatura === 'BASICO' ? '#10b981' : 'transparent',
                          color: oficina.planoAssinatura === 'BASICO' ? '#ffffff' : 'var(--text-muted)',
                        }}
                      >
                        🟢 Básico
                      </button>

                      <button
                        type="button"
                        disabled={isSalvando}
                        onClick={() =>
                          handleAlterarPlanoOficina(oficina, 'INTERMEDIARIO', oficina.comFotos)
                        }
                        style={{
                          padding: '6px 12px',
                          borderRadius: '7px',
                          border: 'none',
                          fontSize: '0.76rem',
                          fontWeight: oficina.planoAssinatura === 'INTERMEDIARIO' ? 700 : 500,
                          cursor: 'pointer',
                          background:
                            oficina.planoAssinatura === 'INTERMEDIARIO' ? '#f59e0b' : 'transparent',
                          color:
                            oficina.planoAssinatura === 'INTERMEDIARIO' ? '#000000' : 'var(--text-muted)',
                        }}
                      >
                        🟡 Intermediário
                      </button>

                      <button
                        type="button"
                        disabled={isSalvando}
                        onClick={() =>
                          handleAlterarPlanoOficina(oficina, 'AVANCADO', oficina.comFotos)
                        }
                        style={{
                          padding: '6px 12px',
                          borderRadius: '7px',
                          border: 'none',
                          fontSize: '0.76rem',
                          fontWeight: oficina.planoAssinatura === 'AVANCADO' ? 700 : 500,
                          cursor: 'pointer',
                          background: oficina.planoAssinatura === 'AVANCADO' ? '#0ea5e9' : 'transparent',
                          color: oficina.planoAssinatura === 'AVANCADO' ? '#ffffff' : 'var(--text-muted)',
                        }}
                      >
                        🔵 Avançado
                      </button>
                    </div>

                    {/* Toggle Add-on de Fotos */}
                    <button
                      type="button"
                      disabled={isSalvando}
                      onClick={() =>
                        handleAlterarPlanoOficina(oficina, oficina.planoAssinatura, !oficina.comFotos)
                      }
                      style={{
                        padding: '7px 12px',
                        borderRadius: '8px',
                        border: oficina.comFotos
                          ? '1px solid rgba(16, 185, 129, 0.5)'
                          : '1px solid var(--border-subtle)',
                        background: oficina.comFotos ? 'rgba(16, 185, 129, 0.14)' : 'var(--bg-subtle)',
                        color: oficina.comFotos ? '#10b981' : 'var(--text-muted)',
                        fontSize: '0.76rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <Camera size={14} />
                      {oficina.comFotos ? '📸 Fotos Ativas' : '🚫 Sem Fotos'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal para Cadastrar Nova Oficina Piloto / Cliente */}
      {modalNovaOficina && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.72)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '20px',
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '580px',
              padding: '28px',
              background: 'var(--bg-surface)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                Cadastrar Nova Oficina Piloto / Cliente
              </h3>
              <button
                type="button"
                onClick={() => setModalNovaOficina(false)}
                className="btn btn-secondary"
                style={{ padding: '6px' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCriarNovaOficina} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label className="input-label">Razão Social *</label>
                  <input
                    type="text"
                    required
                    value={novaRazao}
                    onChange={(e) => setNovaRazao(e.target.value)}
                    placeholder="Oficina São José Ltda"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="input-label">Nome Fantasia *</label>
                  <input
                    type="text"
                    required
                    value={novoFantasia}
                    onChange={(e) => setNovoFantasia(e.target.value)}
                    placeholder="Auto Mecânica & Soldas São José"
                    className="input-field"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label className="input-label">CNPJ *</label>
                  <input
                    type="text"
                    required
                    value={novoCnpj}
                    onChange={(e) => setNovoCnpj(e.target.value)}
                    placeholder="00.000.000/0001-00"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="input-label">Telefone / WhatsApp *</label>
                  <input
                    type="text"
                    required
                    value={novoTelefone}
                    onChange={(e) => setNovoTelefone(e.target.value)}
                    placeholder="(11) 99999-0000"
                    className="input-field"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
                <div>
                  <label className="input-label">Cidade *</label>
                  <input
                    type="text"
                    required
                    value={novaCidade}
                    onChange={(e) => setNovaCidade(e.target.value)}
                    placeholder="São Paulo"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="input-label">UF *</label>
                  <input
                    type="text"
                    required
                    maxLength={2}
                    value={novaUf}
                    onChange={(e) => setNovaUf(e.target.value.toUpperCase())}
                    placeholder="SP"
                    className="input-field"
                  />
                </div>
              </div>

              {/* Seleção do Plano Inicial da Oficina */}
              <div
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-subtle)',
                  marginTop: '4px',
                }}
              >
                <label className="input-label" style={{ marginBottom: '8px' }}>
                  Pacote Comercial da Oficina
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  {(['BASICO', 'INTERMEDIARIO', 'AVANCADO'] as const).map((pl) => (
                    <button
                      key={pl}
                      type="button"
                      onClick={() => setNovoPlano(pl)}
                      className={`btn ${novoPlano === pl ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ fontSize: '0.78rem', padding: '8px' }}
                    >
                      {pl === 'BASICO' ? '🟢 Básico' : pl === 'INTERMEDIARIO' ? '🟡 Intermediário' : '🔵 Avançado'}
                    </button>
                  ))}
                </div>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginTop: '10px',
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={novoComFotos}
                    onChange={(e) => setNovoComFotos(e.target.checked)}
                  />
                  Habilitar Módulo de Fotos (Antes / Durante / Depois) na Ordem de Serviço
                </label>
              </div>

              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', marginTop: '4px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '8px' }}>
                  Credenciais do Dono / Gestor da Oficina
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <label className="input-label">Nome do Responsável *</label>
                    <input
                      type="text"
                      required
                      value={novoAdminNome}
                      onChange={(e) => setNovoAdminNome(e.target.value)}
                      placeholder="João da Silva"
                      className="input-field"
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label className="input-label">E-mail de Acesso *</label>
                      <input
                        type="email"
                        required
                        value={novoAdminEmail}
                        onChange={(e) => setNovoAdminEmail(e.target.value)}
                        placeholder="joao@oficina.com.br"
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="input-label">Senha Inicial *</label>
                      <input
                        type="password"
                        required
                        value={novoAdminSenha}
                        onChange={(e) => setNovoAdminSenha(e.target.value)}
                        placeholder="••••••••"
                        className="input-field"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setModalNovaOficina(false)}
                  className="btn btn-secondary"
                >
                  Cancelar
                </button>
                <button type="submit" disabled={criandoOficina} className="btn btn-primary">
                  {criandoOficina ? 'Criando Oficina...' : 'Criar Oficina & Definir Plano'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

