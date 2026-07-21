/** Cliente do content script para geração LLM via service worker. */
import { PORTA_CHAT } from '@shared/constantes';
import type { MensagemPortaEntrada, MensagemPortaSaida } from '@shared/mensagens';
import type { RequisicaoLLM } from '@shared/tipos';

export interface CallbacksStream {
  aoTrecho(texto: string): void;
  aoFim(textoCompleto: string): void;
  aoErro(mensagem: string): void;
}

/** Inicia geração com streaming. Retorna função para abortar. */
export function gerarStream(requisicao: RequisicaoLLM, callbacks: CallbacksStream): () => void {
  const porta = chrome.runtime.connect({ name: PORTA_CHAT });
  let encerrado = false;

  porta.onMessage.addListener((mensagem: MensagemPortaSaida) => {
    if (mensagem.tipo === 'trecho') {
      callbacks.aoTrecho(mensagem.texto);
    } else if (mensagem.tipo === 'fim') {
      encerrado = true;
      porta.disconnect();
      callbacks.aoFim(mensagem.texto);
    } else {
      encerrado = true;
      porta.disconnect();
      callbacks.aoErro(mensagem.mensagem);
    }
  });

  porta.onDisconnect.addListener(() => {
    if (!encerrado) {
      encerrado = true;
      callbacks.aoErro('A conexão com o serviço da extensão foi interrompida. Envie novamente.');
    }
  });

  porta.postMessage({ tipo: 'iniciar', requisicao } satisfies MensagemPortaEntrada);
  return () => {
    if (!encerrado) {
      encerrado = true;
      porta.disconnect();
    }
  };
}
