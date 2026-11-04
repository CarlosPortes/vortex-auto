import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeId = 'vortex-dark' | 'oficina-light' | 'warm-daylight' | 'carbon-racing';

export interface ThemeInfo {
  id: ThemeId;
  nome: string;
  subtitulo: string;
  esquema: 'dark' | 'light';
  coresPreview: {
    fundo: string;
    card: string;
    destaque: string;
    texto: string;
  };
}

export const THEMES: Record<ThemeId, ThemeInfo> = {
  'vortex-dark': {
    id: 'vortex-dark',
    nome: 'Vortex Dark',
    subtitulo: 'Azul petróleo profundo & ciano (Padrão)',
    esquema: 'dark',
    coresPreview: {
      fundo: '#090d16',
      card: '#111827',
      destaque: '#0ea5e9',
      texto: '#f9fafb',
    },
  },
  'oficina-light': {
    id: 'oficina-light',
    nome: 'Oficina Light',
    subtitulo: 'Claro limpo de alto contraste para pátio iluminado',
    esquema: 'light',
    coresPreview: {
      fundo: '#f1f5f9',
      card: '#ffffff',
      destaque: '#0284c7',
      texto: '#0f172a',
    },
  },
  'warm-daylight': {
    id: 'warm-daylight',
    nome: 'Warm Daylight',
    subtitulo: 'Claro suave em tom areia para conforto no balcão',
    esquema: 'light',
    coresPreview: {
      fundo: '#f5f2eb',
      card: '#fffdf9',
      destaque: '#0369a1',
      texto: '#1c1917',
    },
  },
  'carbon-racing': {
    id: 'carbon-racing',
    nome: 'Carbon Racing',
    subtitulo: 'Grafite carbono com detalhes em laranja automotivo',
    esquema: 'dark',
    coresPreview: {
      fundo: '#111215',
      card: '#1b1d22',
      destaque: '#f59e0b',
      texto: '#f3f4f6',
    },
  },
};

interface ThemeContextData {
  temaAtivo: ThemeId;
  infoTema: ThemeInfo;
  setTemaAtivo: (tema: ThemeId) => void;
  alternarClaroEscuro: () => void;
}

const ThemeContext = createContext<ThemeContextData>({} as ThemeContextData);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [temaAtivo, setTemaState] = useState<ThemeId>(() => {
    const salvo = localStorage.getItem('vortex_theme') as ThemeId;
    if (salvo && THEMES[salvo]) {
      return salvo;
    }
    return 'vortex-dark';
  });

  const infoTema = THEMES[temaAtivo] || THEMES['vortex-dark'];

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', temaAtivo);
    document.documentElement.setAttribute('data-color-scheme', infoTema.esquema);
    localStorage.setItem('vortex_theme', temaAtivo);
  }, [temaAtivo, infoTema.esquema]);

  const setTemaAtivo = (novo: ThemeId) => {
    setTemaState(novo);
  };

  const alternarClaroEscuro = () => {
    if (infoTema.esquema === 'dark') {
      setTemaState('oficina-light');
    } else {
      setTemaState('vortex-dark');
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        temaAtivo,
        infoTema,
        setTemaAtivo,
        alternarClaroEscuro,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

