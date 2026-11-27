import type { ConfigNexpra, ProvedorId } from './tipos';

export interface ModeloInfo {
  id: string;
  rotulo: string;
  recomendado?: boolean;
  /** Teto de tokens de saída aceito pela API para este modelo. */
  maxSaida: number;
}

/**
 * Catálogo de modelos por provedor — conferido na documentação oficial em 22/11/2026
 * (edite conforme os lançamentos; as opções aceitam modelo personalizado).
 */
export const PROVEDOR_MODELOS: Record<ProvedorId, readonly ModeloInfo[]> = {
  anthropic: [
    { id: 'claude-opus-5-5', rotulo: 'Claude Opus 5.5 (mais capaz)', maxSaida: 128000 },
    { id: 'claude-sonnet-5-5', rotulo: 'Claude Sonnet 5.5 (equilibrado)', recomendado: true, maxSaida: 128000 },
    { id: 'claude-haiku-5-5', rotulo: 'Claude Haiku 5.5 (rápido e econômico)', maxSaida: 128000 }
  ],
  openai: [
    { id: 'gpt-6.2-astra', rotulo: 'GPT-6.2 Astra (mais capaz)', maxSaida: 128000 },
    { id: 'gpt-6.2-sol', rotulo: 'GPT-6.2 Sol (equilibrado)', recomendado: true, maxSaida: 128000 },
    { id: 'gpt-6.1-terra', rotulo: 'GPT-6.1 Terra (rápido)', maxSaida: 128000 },
    { id: 'gpt-6-luna', rotulo: 'GPT-6 Luna (econômico)', maxSaida: 128000 }
  ],
  gemini: [
    { id: 'gemini-4-carbon', rotulo: 'Gemini 4 Carbon (raciocínio mais forte)', maxSaida: 65536 },
    { id: 'gemini-4-hydrogen', rotulo: 'Gemini 4 Hydrogen (indicado pelo Google para projetos novos)', maxSaida: 65536 },
    { id: 'gemini-3.8-flash', rotulo: 'Gemini 3.8 Flash (estável, equilibrado)', recomendado: true, maxSaida: 65536 },
    { id: 'gemini-3.5-flash-lite', rotulo: 'Gemini 3.5 Flash-Lite (rápido e econômico)', maxSaida: 65536 }
  ]
};

/**
 * Modelos desligados ou descontinuados → substituto. Configurações salvas com eles são
 * migradas automaticamente ao carregar (evita erro quando o provedor desliga o modelo).
 */
export const MODELOS_SUBSTITUIDOS: Record<string, string> = {
  'gemini-2.0-flash': 'gemini-3.8-flash',
  'gemini-2.0-flash-lite': 'gemini-3.5-flash-lite',
  'gemini-2.5-flash': 'gemini-3.8-flash',
  'gemini-2.5-pro': 'gemini-4-carbon',
  'gpt-5': 'gpt-6.2-sol',
  'gpt-5.1': 'gpt-6.2-sol',
  'gpt-4.1': 'gpt-6-luna'
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
  MAX_RESULTADO_FERRAMENTA: 12_000,
  /** Texto guardado de cada arquivo ao extrair; também é o teto do limite por fonte nas opções. */
  EXTRACAO_CHARS: 1_000_000,
  /** Teto do limite total de fontes nas opções (~1 milhão de tokens). */
  TOTAL_FONTES_CHARS_TETO: 4_000_000,
  /** Piso dos dois limites de fontes nas opções. */
  FONTES_CHARS_PISO: 10_000
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

export const CONFIG_PADRAO: ConfigNexpra = {
  provedorAtivo: 'gemini',
  modelos: {
    anthropic: 'claude-sonnet-5-5',
    openai: 'gpt-6.2-sol',
    gemini: 'gemini-3.8-flash'
  },
  temperatura: 0.3,
  // O raciocínio dos modelos novos também consome este limite: 16 mil evita cortar peças longas.
  maxTokens: 16000,
  // ~40 mil tokens por fonte e ~150 mil no total: cabe nos modelos com janela de 200 mil tokens.
  fontesMaxCharsPorFonte: 160_000,
  fontesMaxCharsTotal: 600_000,
  esforcoRaciocinio: 'medium',
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
