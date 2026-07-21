# Arquitetura do NexIA

Extensão Chrome MV3, em TypeScript estrito, empacotada com webpack. Roda dentro do PJe (`*.jus.br`) e usa a IA como apoio ao usuário: chat, resumo e minuta. Nada de tribunal é hardcoded.

## Contextos de execução

| Contexto | Arquivos | Papel |
|---|---|---|
| Service worker (background) | `src/background/**` | Detém as chaves de API; faz as chamadas aos LLMs (streaming SSE); busca de modelos (BM25); guarda snapshots de auth por host. |
| Content script (ISOLATED) | `src/content/**` | Monta a UI (Shadow DOM), coleta os autos e documentos (same-origin com o PJe), anonimiza localmente, orquestra chat/resumo/minuta. |
| Scripts MAIN world | `src/main/**` | `captura-auth.ts` observa os cabeçalhos de autenticação da SPA do PJe (passivo); `ponte-fetch.ts` baixa documentos que o isolated world não consegue. |
| Popup / Options | `src/popup/**`, `src/options/**` | Status e configuração (provedor, chaves, modelos de minuta, hosts bloqueados). |

## Fluxos principais

1. **Captura de auth** — a SPA do PJe faz requisições a `/pje-legacy`; `captura-auth.ts` (MAIN, `document_start`) lê os cabeçalhos (`authorization`, `x-pje-*`) e emite um `CustomEvent`; o content (`ponte-main.ts`) repassa ao background, que grava em `chrome.storage.session` indexado por host.

2. **Coleta** (`content/pje/`) — `contexto.ts` detecta o `idProcesso`, obtém a chave `ca` (`rest.ts`), baixa a página de autos e a parseia com `DOMParser` (`autos-ssr.ts` → partes, movimentações, lista de documentos) e extrai o conteúdo dos documentos (`extrator-docs.ts`: PDF nativo via pdf.js; digitalizado → imagens; HTML → texto; fallback via ponte MAIN para respostas de 0 bytes). Limites em `shared/constantes.ts`.

3. **Anonimização** (`content/anonimizador/`) — 100% local (ver `docs/seguranca.md`).

4. **Geração** — o content monta a requisição (`shared/prompts.ts`) e abre a porta `nexia-chat`; o background transmite o texto do LLM em streaming de volta.

## Generalização multi-tribunal

- `content_scripts.matches`: `https://*.jus.br/*`, todos os frames — nunca um host específico.
- `sonda-pje.ts` só ativa a UI se a página tiver artefatos do PJe e o host não estiver na lista de bloqueio do usuário.
- Todas as URLs REST são relativas a `location.origin`.
- Parsers tolerantes a variações de layout; avisos de campos não reconhecidos são registrados (redigidos) para diagnóstico.

## Build

`webpack.config.js` — seis entradas (`background`, `content`, `main-auth`, `main-bridge`, `popup`, `options`); `copy-webpack-plugin` leva `public/` e o worker do pdf.js para `dist/`. Sem framework de UI.
