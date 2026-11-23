import type { AchadoGuarda } from './anonimizador/guarda';
import type { ConfigNexpra, DossieProcesso, ProvedorId, RequisicaoLLM, ResultadoBuscaModelo, SnapshotAuth } from './tipos';

/** Canais de mensagem (content/painel/opções ↔ background). */
export type Canal =
  | 'AUTH_CAPTURADA'
  | 'AUTH_OBTER'
  | 'AUTH_LISTAR'
  | 'CONFIG_OBTER'
  | 'CONFIG_SALVAR'
  | 'CHAVE_SALVAR'
  | 'CHAVE_STATUS'
  | 'LLM_GERAR'
  | 'MODELOS_BUSCAR'
  | 'MODELOS_STATUS'
  | 'OCR_PAGINA'
  | 'FERRAMENTA_EXECUTAR'
  | 'PAINEL_ABRIR'
  | 'DADOS_LIMPAR';

export interface Pedido {
  canal: Canal;
  dados?: unknown;
}

export interface RespostaErro { erro: string }

export interface DadosConfigSalvar { config: Partial<ConfigNexpra> }
export interface DadosAuthCapturada { host: string; snapshot: SnapshotAuth }
export interface DadosAuthObter { host: string }
export interface DadosChaveSalvar { provedor: ProvedorId; chave: string }
export interface DadosLlmGerar { requisicao: RequisicaoLLM }
export interface DadosModelosBuscar { consulta: string; natureza?: string; limite?: number }
/** Uma página (imagem dataURL) para OCR local no offscreen. Nunca logar a imagem (LGPD). */
export interface DadosOcrPagina { imagem: string }
/** `prazoMs`: tempo máximo total da consulta (a IA usa um prazo menor que a consulta manual). */
export interface DadosFerramentaExecutar { nome: string; args: Record<string, unknown>; prazoMs?: number }

/** `falha` em vez de `erro` para o helper `enviar` não lançar e o lote seguir. */
export interface RespostaOcrPagina { texto: string; backend?: string; ms?: number; falha?: string }
export interface RespostaFerramenta { texto: string; falha?: string }
export interface RespostaLlmGerar { texto: string }
export interface RespostaChaveStatus { status: Record<ProvedorId, boolean> }
export interface RespostaAuthListar { hosts: Array<{ host: string; capturadoEm: number }> }
export interface RespostaModelosStatus { quantidade: number; atualizadoEm: number | null; nomePasta: string | null }
export interface RespostaModelosBuscar { resultados: ResultadoBuscaModelo[] }
export interface RespostaConfig { config: ConfigNexpra }

/** Envia um pedido tipado ao background. Lança Error se o background responder { erro }. */
export async function enviar<TResp>(canal: Canal, dados?: unknown): Promise<TResp> {
  const resposta = (await chrome.runtime.sendMessage({ canal, dados } satisfies Pedido)) as TResp | RespostaErro | undefined;
  if (resposta && typeof resposta === 'object' && 'erro' in (resposta as object)) {
    throw new Error((resposta as RespostaErro).erro);
  }
  return resposta as TResp;
}

/** Porta de chat (cliente → service worker). */
export type MensagemPortaEntrada =
  | { tipo: 'iniciar'; requisicao: RequisicaoLLM }
  | { tipo: 'resultado-ferramenta'; id: string; conteudo: string; erro?: boolean };

/** Porta de chat (service worker → cliente). */
export type MensagemPortaSaida =
  | { tipo: 'trecho'; texto: string }
  | { tipo: 'fim'; texto: string }
  | { tipo: 'erro'; mensagem: string }
  /** Achados da guarda de saída (modo "confirmar"): o cliente pergunta ao usuário. */
  | { tipo: 'guarda'; achados: AchadoGuarda[] }
  /** O modelo pediu uma ferramenta: o cliente resolve marcadores localmente, executa e devolve. */
  | { tipo: 'ferramenta'; id: string; nome: string; args: Record<string, unknown> }
  /** Sinal de vida durante esperas longas (mantém o service worker ativo e informa o painel). */
  | { tipo: 'pulso'; segundos: number };

/** Porta painel → content script do PJe (coleta de processo). */
export type MensagemPjeEntrada = { tipo: 'coletar' };
export type MensagemPjeSaida =
  | { tipo: 'progresso'; texto: string }
  | { tipo: 'dossie'; dossie: DossieProcesso }
  | { tipo: 'erro'; mensagem: string };

/** Conteúdo enviado ao painel por menu de contexto / atalho (chrome.storage.session). */
export interface ConteudoPendente {
  origem: 'selecao' | 'pagina';
  titulo: string;
  texto: string;
  url?: string;
  criadoEm: number;
}

/** Resposta do content script ao painel/popup sobre a aba. */
export interface StatusAba {
  pje: boolean;
  processo: boolean;
  host: string;
}
