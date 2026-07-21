import type { ConfigNexia, ProvedorId, RequisicaoLLM, ResultadoBuscaModelo, SnapshotAuth } from './tipos';

/** Canais de mensagem content/popup/options ↔ background. */
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
  | 'DADOS_LIMPAR';

export interface Pedido {
  canal: Canal;
  dados?: unknown;
}

export interface RespostaErro { erro: string }

export interface DadosConfigSalvar { config: ConfigNexia }
export interface DadosAuthCapturada { host: string; snapshot: SnapshotAuth }
export interface DadosAuthObter { host: string }
export interface DadosChaveSalvar { provedor: ProvedorId; chave: string }
export interface DadosLlmGerar { requisicao: RequisicaoLLM }
export interface DadosModelosBuscar { consulta: string; natureza?: string; limite?: number }

export interface RespostaLlmGerar { texto: string }
export interface RespostaChaveStatus { status: Record<ProvedorId, boolean> }
export interface RespostaAuthListar { hosts: Array<{ host: string; capturadoEm: number }> }
export interface RespostaModelosStatus { quantidade: number; atualizadoEm: number | null; nomePasta: string | null }
export interface RespostaModelosBuscar { resultados: ResultadoBuscaModelo[] }
export interface RespostaConfig { config: ConfigNexia }

/** Envia um pedido tipado ao background. Lança Error se o background responder { erro }. */
export async function enviar<TResp>(canal: Canal, dados?: unknown): Promise<TResp> {
  const resposta = (await chrome.runtime.sendMessage({ canal, dados } satisfies Pedido)) as TResp | RespostaErro | undefined;
  if (resposta && typeof resposta === 'object' && 'erro' in (resposta as object)) {
    throw new Error((resposta as RespostaErro).erro);
  }
  return resposta as TResp;
}

/** Mensagens trocadas na porta de streaming de chat. */
export type MensagemPortaEntrada = { tipo: 'iniciar'; requisicao: RequisicaoLLM };
export type MensagemPortaSaida =
  | { tipo: 'trecho'; texto: string }
  | { tipo: 'fim'; texto: string }
  | { tipo: 'erro'; mensagem: string };
