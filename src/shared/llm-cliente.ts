/** Cliente da porta de chat (painel/content → service worker), com suporte a ferramentas e guarda. */
import type { AchadoGuarda } from './anonimizador/guarda';
import { PORTA_CHAT } from './constantes';
import type { MensagemPortaEntrada, MensagemPortaSaida } from './mensagens';
import type { RequisicaoLLM } from './tipos';

export interface CallbacksStream {
  aoTrecho(texto: string): void;
  aoFim(textoCompleto: string): void;
  aoErro(mensagem: string): void;
  /** Guarda de saída pediu confirmação: a geração foi interrompida antes de enviar. */
  aoGuarda?(achados: AchadoGuarda[]): void;
  /** O modelo pediu uma ferramenta: devolver o texto do resultado (já reanonimizado). */
  aoFerramenta?(nome: string, args: Record<string, unknown>): Promise<{ conteudo: string; erro?: boolean }>;
  /** Sinal de vida durante esperas longas (segundos desde o início). */
  aoPulso?(segundos: number): void;
}

/** Inicia uma geração. Retorna função para abortar. */
export function gerarStream(requisicao: RequisicaoLLM, callbacks: CallbacksStream): () => void {
  const porta = chrome.runtime.connect({ name: PORTA_CHAT });
  let encerrado = false;

  const encerrar = () => {
    encerrado = true;
    try {
      porta.disconnect();
    } catch {
      /* já desconectada */
    }
  };

  porta.onMessage.addListener((mensagem: MensagemPortaSaida) => {
    switch (mensagem.tipo) {
      case 'trecho':
        callbacks.aoTrecho(mensagem.texto);
        break;
      case 'pulso':
        callbacks.aoPulso?.(mensagem.segundos);
        break;
      case 'fim':
        encerrar();
        callbacks.aoFim(mensagem.texto);
        break;
      case 'erro':
        encerrar();
        callbacks.aoErro(mensagem.mensagem);
        break;
      case 'guarda':
        encerrar();
        if (callbacks.aoGuarda) callbacks.aoGuarda(mensagem.achados);
        else callbacks.aoErro('Conteúdo com dados pessoais detectado; envio interrompido.');
        break;
      case 'ferramenta': {
        const executar =
          callbacks.aoFerramenta ??
          (async (_nome: string, _args: Record<string, unknown>) => ({ conteudo: 'Ferramenta indisponível neste contexto.', erro: true }));
        void executar(mensagem.nome, mensagem.args)
          .catch((erro: unknown) => ({ conteudo: erro instanceof Error ? erro.message : String(erro), erro: true }))
          .then((r) => {
            if (encerrado) return;
            try {
              porta.postMessage({ tipo: 'resultado-ferramenta', id: mensagem.id, conteudo: r.conteudo, erro: r.erro } satisfies MensagemPortaEntrada);
            } catch {
              /* porta fechada */
            }
          });
        break;
      }
    }
  });

  porta.onDisconnect.addListener(() => {
    if (!encerrado) {
      encerrado = true;
      callbacks.aoErro(
        'A resposta foi interrompida porque o processo em segundo plano da extensão foi encerrado (pelo Chrome ou porque a extensão foi recarregada). Tente de novo.'
      );
    }
  });

  porta.postMessage({ tipo: 'iniciar', requisicao } satisfies MensagemPortaEntrada);
  return () => {
    if (!encerrado) encerrar();
  };
}
