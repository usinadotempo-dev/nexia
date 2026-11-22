import type { ConfigNexia } from '@shared/tipos';

export type IdAba = 'fontes' | 'assistente' | 'protecao' | 'consultas';

/** Serviços da casca do painel, oferecidos às visões. */
export interface Contexto {
  status(texto: string, opcoes?: { carregando?: boolean; erro?: boolean }): void;
  irPara(aba: IdAba): void;
  salvarConfig(parcial: Partial<ConfigNexia>): Promise<void>;
}

export interface Visao {
  elemento: HTMLElement;
  atualizar(): void;
  aoMostrar?(): void;
}
