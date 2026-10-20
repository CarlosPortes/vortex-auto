import React, { createContext, useContext, useState } from 'react';
import { PlanoSistema } from '../types';

interface DemoPlanContextData {
  planoAtivo: PlanoSistema;
  comFotos: boolean;
  setPlanoAtivo: (plano: PlanoSistema) => void;
  setComFotos: (comFotos: boolean) => void;
  isAbaPermitida: (aba: string) => boolean;
  infoPlano: {
    nome: string;
    tagline: string;
    badgeCor: string;
    corHex: string;
    descricao: string;
    destaques: string[];
    naoInclui: string[];
  };
}

const PLANOS_INFO: Record<PlanoSistema, DemoPlanContextData['infoPlano']> = {
  BASICO: {
    nome: 'Plano Básico',
    tagline: 'Adeus Planilhas & Cadernos',
    badgeCor: 'badge-green',
    corHex: '#10b981',
    descricao: 'Ideal para a oficina que quer agilidade imediata. Substitui a planilha em 10 minutos com foco em Recepção, OS sem burocracia de estoque e Fechamento com taxas de maquininha embutidas.',
    destaques: [
      'Recepção ágil: Placa, cliente, odômetro e queixa',
      'Ordem de Serviço prática com peças e serviços manuais',
      'Fechamento com PIX e Parcelamento c/ taxa de maquininha',
      'Zero curva de aprendizado: sem precisar cadastrar estoque prévio',
    ],
    naoInclui: [
      'Controle de saldo e almoxarifado de peças',
      'Importação de XML de NF-e e reposição MRP',
      'Vendas de balcão (PDV)',
      'Relatórios analíticos de BI e DRE',
    ],
  },
  INTERMEDIARIO: {
    nome: 'Plano Intermediário',
    tagline: 'Gestão Eficiente & Controle de Estoque',
    badgeCor: 'badge-amber',
    corHex: '#f59e0b',
    descricao: 'Para a oficina que busca estancar perdas de peças e ter controle real do almoxarifado. Inclui todo o Básico mais catálogo completo de peças, baixas automáticas na OS e saldo mínimo.',
    destaques: [
      'Tudo do Plano Básico',
      'Controle integrado de estoque e catálogo de peças',
      'Baixa automática de peças aplicadas nas Ordens de Serviço',
      'Alerta de estoque mínimo e reposição preventiva',
      'Base cadastral completa de Clientes & Veículos',
    ],
    naoInclui: [
      'Importação automática de XML de compras e MRP',
      'Vendas diretas de balcão (PDV sem veículo)',
      'Relatórios avançados de produtividade mecânica e BI',
    ],
  },
  AVANCADO: {
    nome: 'Plano Avançado',
    tagline: 'ERP Automotivo Completo & Indústria 4.0',
    badgeCor: 'badge-blue',
    corHex: '#0ea5e9',
    descricao: 'Gestão 360° total da oficina mecânica. Inclui importação de NF-e com conferência inteligente, compras MRP, vendas balcão (PDV), WMS, BI completo de produtividade e auditoria.',
    destaques: [
      'Tudo do Plano Intermediário',
      'Compras & Reposição Inteligente MRP (Importador de XML NF-e)',
      'Vendas Balcão (PDV) diretas para clientes avulsos',
      'WMS com endereçamento de prateleiras e código de barras',
      'Relatórios & BI Executivo (Margem, Produtividade, DRE)',
      'Auditoria Rastreável completa (ISO/Compliance)',
    ],
    naoInclui: [],
  },
};

const DemoPlanContext = createContext<DemoPlanContextData>({} as DemoPlanContextData);

export const DemoPlanProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [planoAtivo, setPlanoAtivoState] = useState<PlanoSistema>(() => {
    const salvo = localStorage.getItem('vortex_demo_plano');
    if (salvo === 'BASICO' || salvo === 'INTERMEDIARIO' || salvo === 'AVANCADO') {
      return salvo;
    }
    return 'BASICO'; // Inicializa amigável no plano Básico para surpreender na demo
  });

  const [comFotos, setComFotosState] = useState<boolean>(() => {
    const salvo = localStorage.getItem('vortex_demo_fotos');
    return salvo !== null ? salvo === 'true' : false;
  });

  const setPlanoAtivo = (plano: PlanoSistema) => {
    setPlanoAtivoState(plano);
    localStorage.setItem('vortex_demo_plano', plano);
  };

  const setComFotos = (ativo: boolean) => {
    setComFotosState(ativo);
    localStorage.setItem('vortex_demo_fotos', String(ativo));
  };

  // Regra de Abas Permitidas por Plano
  const isAbaPermitida = (aba: string): boolean => {
    if (planoAtivo === 'AVANCADO') {
      return true; // Avançado vê tudo
    }

    if (planoAtivo === 'INTERMEDIARIO') {
      // Intermediário vê: Atendimentos, OS, Estoque, Financeiro, Clientes/Veículos
      const permitidas = [
        'ATENDIMENTOS',
        'ORDENS_SERVICO',
        'ESTOQUE',
        'FINANCEIRO',
        'CLIENTES_VEICULOS',
      ];
      return permitidas.includes(aba);
    }

    if (planoAtivo === 'BASICO') {
      // Básico vê: Recepção, OS sem estoque, Fechamento/Cobrança e Base de Clientes & Veículos
      const permitidas = [
        'ATENDIMENTOS',
        'ORDENS_SERVICO',
        'FINANCEIRO',
        'CLIENTES_VEICULOS',
      ];
      return permitidas.includes(aba);
    }

    return true;
  };

  return (
    <DemoPlanContext.Provider
      value={{
        planoAtivo,
        comFotos,
        setPlanoAtivo,
        setComFotos,
        isAbaPermitida,
        infoPlano: PLANOS_INFO[planoAtivo],
      }}
    >
      {children}
    </DemoPlanContext.Provider>
  );
};

export const useDemoPlan = () => useContext(DemoPlanContext);
