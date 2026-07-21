import type { RequisicaoLLM } from '@shared/tipos';

export interface OpcoesGeracao {
  modelo: string;
  chaveApi: string;
  sinal?: AbortSignal;
}

export interface ProvedorLLM {
  /** Gera com streaming; aoTrecho recebe cada fragmento de texto. Retorna o texto completo. */
  gerarStream(req: RequisicaoLLM, opcoes: OpcoesGeracao, aoTrecho: (texto: string) => void): Promise<string>;
  /** Geração sem streaming. */
  gerar(req: RequisicaoLLM, opcoes: OpcoesGeracao): Promise<string>;
}

export async function extrairErroHttp(resposta: Response, provedor: string): Promise<Error> {
  let detalhe = '';
  try {
    const corpo = (await resposta.json()) as { error?: { message?: string } };
    detalhe = corpo.error?.message ?? '';
  } catch {
    /* corpo não-JSON */
  }
  return new Error(`${provedor}: HTTP ${resposta.status}${detalhe ? ` — ${detalhe}` : ''}`);
}
