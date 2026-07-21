/**
 * Ponte do content script (isolated) com os scripts do world MAIN:
 * - relay do snapshot de auth capturado na página para o service worker;
 * - fetch de fallback executado no page world (documentos que retornam 0 bytes).
 */
import { EVENTOS_PAGINA } from '@shared/constantes';
import { log } from '@shared/log';
import { enviar } from '@shared/mensagens';
import type { SnapshotAuth } from '@shared/tipos';

interface DetalheAuth {
  url: string;
  cabecalhos: Record<string, string>;
  capturadoEm: number;
}

export function instalarRelayAuth(): void {
  let ultimoEnvio = 0;
  document.addEventListener(EVENTOS_PAGINA.AUTH, (evento) => {
    let detalhe: DetalheAuth;
    try {
      detalhe = JSON.parse((evento as CustomEvent<string>).detail);
    } catch {
      return;
    }
    // Aliviar tráfego: no máx. 1 snapshot a cada 5s.
    const agora = Date.now();
    if (agora - ultimoEnvio < 5000) return;
    ultimoEnvio = agora;

    const c = detalhe.cabecalhos;
    const snapshot: SnapshotAuth = {
      authorization: c['authorization'],
      xPjeCookies: c['x-pje-cookies'],
      xPjeLegacyApp: c['x-pje-legacy-app'],
      xPjeUsuarioLocalizacao: c['x-pje-usuario-localizacao'],
      xNoSso: c['x-no-sso'],
      xPjeAuthorization: c['x-pje-authorization'],
      url: detalhe.url,
      capturadoEm: detalhe.capturadoEm
    };
    enviar('AUTH_CAPTURADA', { host: location.host, snapshot }).catch((erro) =>
      log.aviso('Falha ao gravar snapshot de auth', String(erro))
    );
  });
}

interface RespostaPonte {
  id: string;
  ok: boolean;
  status?: number;
  tipo?: string;
  tamanho?: number;
  blobUrl?: string;
  erro?: string;
}

/** Baixa uma URL executando o fetch no world MAIN (page world). */
export function baixarViaMain(url: string, timeoutMs = 30_000): Promise<Blob> {
  return new Promise((resolver, rejeitar) => {
    const id = crypto.randomUUID();
    const cronometro = setTimeout(() => {
      document.removeEventListener(EVENTOS_PAGINA.FETCH_RESPOSTA, aoResponder);
      rejeitar(new Error('Tempo esgotado na ponte de download'));
    }, timeoutMs);

    function aoResponder(evento: Event): void {
      let resposta: RespostaPonte;
      try {
        resposta = JSON.parse((evento as CustomEvent<string>).detail);
      } catch {
        return;
      }
      if (resposta.id !== id) return;
      clearTimeout(cronometro);
      document.removeEventListener(EVENTOS_PAGINA.FETCH_RESPOSTA, aoResponder);
      if (!resposta.ok || !resposta.blobUrl) {
        rejeitar(new Error(resposta.erro ?? `Download falhou (HTTP ${resposta.status ?? '?'}, ${resposta.tamanho ?? 0} bytes)`));
        return;
      }
      fetch(resposta.blobUrl)
        .then((r) => r.blob())
        .then(resolver, rejeitar)
        .finally(() => URL.revokeObjectURL(resposta.blobUrl as string));
    }

    document.addEventListener(EVENTOS_PAGINA.FETCH_RESPOSTA, aoResponder);
    document.dispatchEvent(new CustomEvent(EVENTOS_PAGINA.FETCH_PEDIDO, { detail: JSON.stringify({ id, url }) }));
  });
}
