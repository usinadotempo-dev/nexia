/**
 * Roda no world MAIN (contexto da página do PJe), em document_start.
 *
 * O token de autenticação do PJe vive na memória da SPA Angular (HttpInterceptor);
 * do isolated world não é possível observá-lo. Este script faz monkey-patch passivo
 * de fetch/XMLHttpRequest e, para cada requisição ao backend pje-legacy, publica os
 * cabeçalhos de autenticação num CustomEvent, que o content script (isolated) repassa
 * ao service worker. Não bloqueia nem altera nenhuma requisição.
 */
(() => {
  const w = window as unknown as Record<string, unknown>;
  if (w['__nexiaAuthInstalado']) return;
  w['__nexiaAuthInstalado'] = true;

  const ALVO = '/pje-legacy';
  const EVENTO = 'nexia:auth';
  const CABECALHOS_INTERESSE = [
    'authorization',
    'x-pje-cookies',
    'x-pje-legacy-app',
    'x-pje-usuario-localizacao',
    'x-no-sso',
    'x-pje-authorization'
  ];

  function publicar(url: string, cabecalhos: Record<string, string>): void {
    if (!cabecalhos['authorization'] && !cabecalhos['x-pje-authorization']) return;
    try {
      document.dispatchEvent(
        new CustomEvent(EVENTO, {
          detail: JSON.stringify({ url, cabecalhos, capturadoEm: Date.now() })
        })
      );
    } catch {
      /* passivo: nunca interferir na página */
    }
  }

  function coletarDeHeaders(headers: Headers, destino: Record<string, string>): void {
    headers.forEach((valor, nome) => {
      const chave = nome.toLowerCase();
      if (CABECALHOS_INTERESSE.includes(chave)) destino[chave] = valor;
    });
  }

  // --- fetch ---
  const fetchOriginal = window.fetch;
  window.fetch = function (entrada: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    try {
      const url =
        typeof entrada === 'string' ? entrada : entrada instanceof URL ? entrada.href : entrada.url;
      if (url && url.includes(ALVO)) {
        const cabecalhos: Record<string, string> = {};
        if (entrada instanceof Request) coletarDeHeaders(entrada.headers, cabecalhos);
        if (init && init.headers) coletarDeHeaders(new Headers(init.headers), cabecalhos);
        publicar(url, cabecalhos);
      }
    } catch {
      /* passivo */
    }
    return fetchOriginal.call(window, entrada as RequestInfo, init);
  };

  // --- XMLHttpRequest ---
  interface XhrComNexia extends XMLHttpRequest {
    __nexiaUrl?: string;
    __nexiaCabecalhos?: Record<string, string>;
  }

  const abrirOriginal = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (this: XhrComNexia, ...args: unknown[]): void {
    try {
      const url = String(args[1] ?? '');
      if (url.includes(ALVO)) {
        this.__nexiaUrl = url;
        this.__nexiaCabecalhos = {};
      }
    } catch {
      /* passivo */
    }
    return (abrirOriginal as unknown as (...a: unknown[]) => void).apply(this, args);
  };

  const setHeaderOriginal = XMLHttpRequest.prototype.setRequestHeader;
  XMLHttpRequest.prototype.setRequestHeader = function (this: XhrComNexia, nome: string, valor: string): void {
    try {
      if (this.__nexiaCabecalhos) {
        const chave = nome.toLowerCase();
        if (CABECALHOS_INTERESSE.includes(chave)) this.__nexiaCabecalhos[chave] = valor;
      }
    } catch {
      /* passivo */
    }
    return setHeaderOriginal.call(this, nome, valor);
  };

  const enviarOriginal = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function (this: XhrComNexia, corpo?: XMLHttpRequestBodyInit | null): void {
    try {
      if (this.__nexiaUrl && this.__nexiaCabecalhos) {
        publicar(this.__nexiaUrl, this.__nexiaCabecalhos);
      }
    } catch {
      /* passivo */
    }
    return enviarOriginal.call(this, corpo ?? null);
  };
})();
