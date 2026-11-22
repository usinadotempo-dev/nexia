import type { TipoEntidade } from '../anonimizador/detectores.ts';

export type AreaId = 'juridico' | 'contabil' | 'saude' | 'engenharia' | 'rh' | 'geral';

export interface CampoReceita {
  id: string;
  rotulo: string;
  tipo: 'texto' | 'texto-longo' | 'opcoes';
  opcoes?: string[];
  placeholder?: string;
  obrigatorio?: boolean;
}

export interface Receita {
  id: string;
  nome: string;
  descricao: string;
  /** Prompt com marcadores {{id_do_campo}}. */
  prompt: string;
  campos?: CampoReceita[];
  /** Exige ao menos uma fonte carregada. */
  exigeFontes?: boolean;
  /** Busca um modelo pertinente na biblioteca local (BM25) e o usa como referência. */
  usaBiblioteca?: boolean;
  /** 'documento' = prosa pronta para colar num editor (sem markdown). */
  formato?: 'markdown' | 'documento';
  temperatura?: number;
  personalizada?: boolean;
}

export interface Area {
  id: AreaId;
  nome: string;
  publico: string;
  /** Sigla curta exibida no seletor (identidade própria, sem emoji). */
  sigla: string;
  persona: string;
  aviso?: string;
  detectoresPadrao: TipoEntidade[];
  ferramentas: string[];
  receitas: Receita[];
}

/** Receita criada pelo usuário (opções → "Minhas receitas"). */
export interface ReceitaPersonalizada {
  id: string;
  area: AreaId | 'todas';
  nome: string;
  descricao: string;
  prompt: string;
  formato: 'markdown' | 'documento';
}
