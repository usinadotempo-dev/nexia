/**
 * Conector PJe (content script, isolated world).
 * - Em todos os frames: repassa ao service worker o snapshot de auth capturado no page world.
 * - No frame principal de uma página do PJe: responde ao painel (STATUS_ABA), coleta o
 *   processo sob demanda (porta nexia-pje) e mostra um botão discreto "Abrir no Nexpra".
 * A interface de trabalho vive no painel lateral (multiárea); aqui não há UI pesada.
 */
import { PORTA_PJE } from '@shared/constantes';
import { log } from '@shared/log';
import { enviar, type MensagemPjeEntrada, type MensagemPjeSaida, type RespostaConfig, type StatusAba } from '@shared/mensagens';
import { coletarProcesso, idProcessoDaTela } from './pje/contexto';
import { instalarRelayAuth } from './ponte-main';
import { hostBloqueado, pareceSerPje } from './sonda-pje';
import { criarRaizNexpra } from './ui/raiz-shadow';

const LOGO_FAB = `<svg viewBox="0 0 128 128" aria-hidden="true"><rect x="4" y="4" width="120" height="120" rx="26" fill="#fff"/><path d="M42 90 V40 L82 88 V60" stroke="#0a0a0a" stroke-width="13" stroke-linecap="round" stroke-linejoin="round" fill="none"/><circle cx="82" cy="38" r="8" fill="#0a0a0a"/></svg>`;

let raiz: ShadowRoot | null = null;
let fab: HTMLButtonElement | null = null;
let coletando = false;

function toast(mensagem: string): void {
  if (!raiz) return;
  raiz.querySelector('.nx-toast')?.remove();
  const t = document.createElement('div');
  t.className = 'nx-toast';
  t.setAttribute('role', 'status');
  t.textContent = mensagem;
  raiz.append(t);
  setTimeout(() => t.remove(), 6000);
}

function montarFab(): void {
  if (fab) return;
  raiz = criarRaizNexpra();
  fab = document.createElement('button');
  fab.className = 'nx-fab';
  fab.type = 'button';
  fab.title = 'Abrir este processo no painel do Nexpra';
  fab.innerHTML = `${LOGO_FAB}<span>Nexpra</span>`;
  fab.addEventListener('click', () => {
    enviar('PAINEL_ABRIR')
      .then(() => toast('No painel, use "Fontes → Processo do PJe" para importar este processo.'))
      .catch(() => toast('Clique no ícone do Nexpra na barra do navegador para abrir o painel e importe o processo em "Fontes".'));
  });
  raiz.append(fab);
}

function desmontarFab(): void {
  if (coletando) return;
  (raiz?.host as Element | undefined)?.remove();
  raiz = null;
  fab = null;
}

function sincronizarPresenca(): void {
  const temProcesso = idProcessoDaTela() !== null;
  if (temProcesso) montarFab();
  else desmontarFab();
}

/** Coleta solicitada pelo painel: autos + extração de texto + OCR local dos digitalizados. */
function atenderColeta(porta: chrome.runtime.Port): void {
  const enviarPorta = (m: MensagemPjeSaida) => {
    try {
      porta.postMessage(m);
    } catch {
      /* painel fechado */
    }
  };
  porta.onMessage.addListener((m: MensagemPjeEntrada) => {
    if (m.tipo !== 'coletar' || coletando) return;
    coletando = true;
    void (async () => {
      try {
        const { config } = await enviar<RespostaConfig>('CONFIG_OBTER');
        const dossie = await coletarProcesso(
          { automatico: config.ocrAutomatico, maxPaginasPorDoc: config.ocrMaxPaginasPorDoc, maxPaginasTotal: config.ocrMaxPaginasTotal },
          (p) => enviarPorta({ tipo: 'progresso', texto: `${p.etapa}${p.total !== undefined ? ` ${p.feitos ?? 0}/${p.total}` : ''}` })
        );
        // Páginas-imagem não cruzam a mensagem (tamanho): só o texto vai ao painel.
        for (const d of dossie.documentos) d.paginasImagem = undefined;
        enviarPorta({ tipo: 'dossie', dossie });
      } catch (erro) {
        enviarPorta({ tipo: 'erro', mensagem: erro instanceof Error ? erro.message : String(erro) });
      } finally {
        coletando = false;
      }
    })();
  });
}

async function principal(): Promise<void> {
  if (!pareceSerPje()) return;
  instalarRelayAuth();
  if (window !== window.top) return;

  chrome.runtime.onMessage.addListener((mensagem: { canal?: string }, _remetente, responder) => {
    if (mensagem?.canal === 'STATUS_ABA') {
      responder({ pje: true, processo: idProcessoDaTela() !== null, host: location.host } satisfies StatusAba);
      return true;
    }
    return false;
  });
  chrome.runtime.onConnect.addListener((porta) => {
    if (porta.name === PORTA_PJE) atenderColeta(porta);
  });

  try {
    const { config } = await enviar<RespostaConfig>('CONFIG_OBTER');
    if (hostBloqueado(config.hostsBloqueados)) return;
  } catch (erro) {
    log.aviso('Config indisponível, prosseguindo com padrão', String(erro));
  }

  sincronizarPresenca();
  // O PJe navega dentro da mesma aba sem recarregar; re-checa periodicamente.
  window.addEventListener('popstate', sincronizarPresenca);
  window.addEventListener('hashchange', sincronizarPresenca);
  setInterval(sincronizarPresenca, 3000);
}

void principal();
