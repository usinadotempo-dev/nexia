import type { ParteChamada, RequisicaoLLM } from '@shared/tipos';

export interface OpcoesGeracao {
  modelo: string;
  chaveApi: string;
  sinal?: AbortSignal;
}

/** Ferramenta no formato neutro (convertida por provedor). */
export interface FerramentaLLM {
  nome: string;
  descricao: string;
  esquema: Record<string, unknown>;
}

export interface RespostaComFerramentas {
  texto: string;
  chamadas: ParteChamada[];
}

export interface ProvedorLLM {
  /** Gera com streaming; aoTrecho recebe cada fragmento. Retorna o texto completo. */
  gerarStream(req: RequisicaoLLM, opcoes: OpcoesGeracao, aoTrecho: (texto: string) => void): Promise<string>;
  gerar(req: RequisicaoLLM, opcoes: OpcoesGeracao): Promise<string>;
  /**
   * Uma rodada em que o modelo pode pedir ferramentas. O texto chega aos poucos por
   * `aoTrecho` (streaming); as chamadas de ferramenta vêm completas no retorno.
   */
  gerarComFerramentas(
    req: RequisicaoLLM,
    opcoes: OpcoesGeracao,
    ferramentas: FerramentaLLM[],
    aoTrecho?: (texto: string) => void
  ): Promise<RespostaComFerramentas>;
}

export async function extrairErroHttp(resposta: Response, provedor: string): Promise<Error> {
  let detalhe = '';
  try {
    const corpo = (await resposta.json()) as { error?: { message?: string } | string };
    detalhe = typeof corpo.error === 'string' ? corpo.error : corpo.error?.message ?? '';
  } catch {
    /* corpo não-JSON */
  }
  const dica =
    resposta.status === 401 || resposta.status === 403
      ? ' (verifique a chave de API nas opções)'
      : resposta.status === 429
        ? ' (limite de uso do provedor atingido; aguarde e tente de novo)'
        : '';
  return new Error(`${provedor}: HTTP ${resposta.status}${detalhe ? ` — ${detalhe}` : ''}${dica}`);
}

let sequencial = 0;
export function novoIdChamada(prefixo: string): string {
  sequencial = (sequencial + 1) % 1_000_000;
  return `${prefixo}_${Date.now().toString(36)}_${sequencial}`;
}
