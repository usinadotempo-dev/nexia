import type { ConfigNexia } from './tipos';

export const LIMITES = {
  /** Total de caracteres de documentos no contexto (~150k tokens). */
  TOTAL_CHARS: 600_000,
  /** Teto por documento individual. */
  POR_DOCUMENTO_CHARS: 80_000,
  /** Máximo de páginas-imagem de documentos digitalizados. */
  MAX_IMAGENS: 150,
  /** Máximo de movimentações incluídas no contexto. */
  MAX_MOVIMENTACOES: 80
} as const;

export const CHAVES_STORAGE = {
  CONFIG: 'nexia.config',
  CHAVE_API_PREFIXO: 'nexia.chave.',
  AUTH_PREFIXO: 'nexia.auth.'
} as const;

export const PORTA_CHAT = 'nexia-chat';

export const EVENTOS_PAGINA = {
  AUTH: 'nexia:auth',
  FETCH_PEDIDO: 'nexia:fetch-pedido',
  FETCH_RESPOSTA: 'nexia:fetch-resposta'
} as const;

export const ENDPOINTS_PROVEDOR = {
  anthropic: 'https://api.anthropic.com/v1/messages',
  openai: 'https://api.openai.com/v1/chat/completions',
  gemini: 'https://generativelanguage.googleapis.com/v1beta'
} as const;

export const CONFIG_PADRAO: ConfigNexia = {
  provedorAtivo: 'gemini',
  modelos: {
    anthropic: 'claude-sonnet-5',
    openai: 'gpt-5.1',
    gemini: 'gemini-2.5-flash'
  },
  temperatura: 0.3,
  maxTokens: 8192,
  hostsBloqueados: []
};
