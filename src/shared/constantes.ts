import type { ConfigNexia, ProvedorId } from './tipos';

export interface ModeloInfo {
  id: string;
  rotulo: string;
  recomendado?: boolean;
  /** Teto de tokens de saída aceito pela API para este modelo. */
  maxSaida: number;
}

/** Catálogo de modelos por provedor (edite conforme os lançamentos; as opções aceitam modelo personalizado). */
export const PROVEDOR_MODELOS: Record<ProvedorId, readonly ModeloInfo[]> = {
  anthropic: [
    { id: 'claude-opus-5-5', rotulo: 'Claude Opus 5.5 (mais capaz)', maxSaida: 32000 },
    { id: 'claude-sonnet-5-5', rotulo: 'Claude Sonnet 5.5 (equilibrado)', recomendado: true, maxSaida: 32000 },
    { id: 'claude-haiku-5-5', rotulo: 'Claude Haiku 5.5 (rápido e econômico)', maxSaida: 32000 }
  ],
  openai: [
    { id: 'gpt-5.1', rotulo: 'GPT-5.1 (equilibrado)', recomendado: true, maxSaida: 32000 },
    { id: 'gpt-5', rotulo: 'GPT-5', maxSaida: 32000 },
    { id: 'gpt-4.1', rotulo: 'GPT-4.1', maxSaida: 16384 }
  ],
  gemini: [
    { id: 'gemini-2.5-flash', rotulo: 'Gemini 2.5 Flash (equilibrado)', recomendado: true, maxSaida: 65536 },
    { id: 'gemini-2.5-pro', rotulo: 'Gemini 2.5 Pro (mais capaz)', maxSaida: 65536 },
    { id: 'gemini-2.0-flash', rotulo: 'Gemini 2.0 Flash (rápido)', maxSaida: 8192 }
  ]
};

export function maxSaidaDoModelo(provedor: ProvedorId, modeloId: string): number {
  const encontrado = PROVEDOR_MODELOS[provedor].find((m) => m.id === modeloId);
  return encontrado?.maxSaida ?? 8192;
}

export const LIMITES = {
  /** Total de caracteres de fontes no contexto (~150k tokens). */
  TOTAL_CHARS: 600_000,
  POR_DOCUMENTO_CHARS: 80_000,
  MAX_IMAGENS: 150,
  MAX_MOVIMENTACOES: 80,
  /** Rodadas máximas de chamadas de ferramenta por resposta. */
  MAX_RODADAS_FERRAMENTAS: 6,
  /** Tamanho máximo do resultado de uma ferramenta devolvido ao modelo. */
  MAX_RESULTADO_FERRAMENTA: 12_000
} as const;

export const CHAVES_STORAGE = {
  CONFIG: 'nexia.config',
  CHAVE_API_PREFIXO: 'nexia.chave.',
  AUTH_PREFIXO: 'nexia.auth.',
  /** chrome.storage.session: conteúdo enviado ao painel (seleção/página) aguardando importação. */
  PENDENTE_PAINEL: 'nexia.pendente'
} as const;

export const PORTA_CHAT = 'nexia-chat';
export const PORTA_PJE = 'nexia-pje';

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

/**
 * Chave pública da API do DataJud divulgada pelo CNJ (wiki do DataJud). O CNJ pode
 * trocá-la a qualquer momento — o usuário atualiza nas opções.
 */
export const DATAJUD_CHAVE_PUBLICA_PADRAO = 'cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==';

export const CONFIG_PADRAO: ConfigNexia = {
  provedorAtivo: 'gemini',
  modelos: {
    anthropic: 'claude-sonnet-5-5',
    openai: 'gpt-5.1',
    gemini: 'gemini-2.5-flash'
  },
  temperatura: 0.3,
  maxTokens: 8192,
  hostsBloqueados: [],
  ocrAutomatico: true,
  ocrMaxPaginasPorDoc: 20,
  ocrMaxPaginasTotal: 120,
  areaAtiva: 'geral',
  onboardingConcluido: false,
  anonimizarPorPadrao: true,
  detectarNomes: true,
  detectoresPorArea: {},
  sempreMascarar: [],
  nuncaMascarar: [],
  guardaSaida: 'confirmar',
  guardaTipos: ['CPF', 'CNS', 'CARTAO'],
  ferramentasAutomaticas: true,
  ferramentasDesligadas: [],
  datajudChave: DATAJUD_CHAVE_PUBLICA_PADRAO,
  transparenciaChave: '',
  receitasPersonalizadas: []
};
