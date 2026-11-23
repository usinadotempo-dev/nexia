# Ecossistema MCP e viabilidade de integração em extensão Chrome MV3 (Nexpra) — estado em novembro/2026

> Notas de pesquisa (coleta em 22/11/2026). Convenção: "Cited Findings" = fato com fonte aberta nesta sessão; "Inferences" = raciocínio meu, não confirmado em fonte; "Gaps" = não verificado. Quando a fonte é resumo de busca (não a página primária lida na íntegra), está marcado como **[secundária]**.

## A. Qual é a especificação MCP vigente, transportes e modelo de autorização? O que mudou em 2026?

### Takeaway
A revisão vigente é a **2026-07-28**, a maior mudança desde o lançamento: o protocolo ficou **stateless** (sem `initialize`, sem `Mcp-Session-Id`, sem GET/SSE de retomada), o que simplifica muito um cliente em service worker. Porém a base instalada de servidores ainda fala majoritariamente **2025-11-25 / 2025-06-18 / 2025-03-26**, então um cliente novo precisa suportar as duas gerações. Na autorização, **Client ID Metadata Documents (CIMD)** virou o mecanismo preferido e o **Dynamic Client Registration (DCR) foi depreciado**.

### Cited Findings

**Linha do tempo das revisões**
- Revisão 2025-11-25 (anterior): adicionou CIMD como mecanismo recomendado de registro de cliente (SEP-991), descoberta via OpenID Connect Discovery, consentimento incremental de escopo via `WWW-Authenticate` (SEP-835), elicitation em modo URL (SEP-1036), tool calling em sampling (SEP-1577), `tasks` experimental (SEP-1686), ícones em tools/resources, JSON Schema 2020-12 como dialeto padrão; e esclareceu que o servidor **deve responder HTTP 403** a `Origin` inválido no Streamable HTTP — [Changelog 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25/changelog)
- Revisão **2026-07-28** (atual): lista de mudanças em relação à 2025-11-25 publicada no changelog oficial — [Changelog 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28/changelog.md)
- A release candidate teria sido publicada em 21/05/2026 e a versão final em 28/07/2026; descrita como "a maior revisão do protocolo desde o lançamento" **[secundária — resumo de busca sobre o blog oficial]** — [Blog MCP 2026-07-28](https://blog.modelcontextprotocol.io/posts/2026-07-28/); [Blog MCP – release candidate](https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/)
- Servidores na revisão 2026-07-28 podem não funcionar com clientes antigos e vice-versa **[secundária]** — [The Register](https://www.theregister.com/a/5280027)

**Mudanças principais da 2026-07-28 (todas do changelog oficial)** — [Changelog 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28/changelog.md)
- Removidas as sessões de protocolo e o header `Mcp-Session-Id` do Streamable HTTP; `tools/list`, `resources/list`, `prompts/list` não variam mais por conexão; estado entre chamadas passa a ser "handles" explícitos emitidos pelo servidor e passados como argumentos comuns de tool (SEP-2567).
- Removido o handshake `initialize`/`notifications/initialized`: cada requisição carrega versão de protocolo e capacidades do cliente em `_meta` (`io.modelcontextprotocol/protocolVersion`, `.../clientCapabilities`, `.../clientInfo`). Incompatibilidade de versão retorna `UnsupportedProtocolVersionError` (SEP-2575).
- Novo RPC obrigatório no servidor: `server/discover` (versões suportadas, capacidades, identidade); o cliente PODE chamá-lo antes de tudo.
- O endpoint HTTP GET e `resources/subscribe` foram substituídos por `subscriptions/listen` (um único stream longo, resposta de POST, opt-in por tipo de notificação). Notificações ligadas a uma requisição (`progress`, `message`) continuam no stream de resposta daquela requisição.
- Removidos `ping`, `logging/setLevel`, `notifications/roots/list_changed`.
- `tasks` saiu do núcleo e virou extensão oficial (`io.modelcontextprotocol/tasks`), com polling via `tasks/get` (SEP-2663).
- Padrão **Multi Round-Trip Requests (MRTR)**: em vez de o servidor iniciar requisições (`sampling/createMessage`, `elicitation/create`, `roots/list`), ele devolve `InputRequiredResult` (`resultType: "input_required"`) e o cliente reenvia a requisição original com `inputResponses` (SEP-2322). Todo resultado passa a ter `resultType` obrigatório; clientes DEVEM tratar ausência (servidores antigos) como `"complete"`.
- Removida a retomada de stream SSE (`Last-Event-ID` e IDs de evento): stream quebrado perde a requisição em curso; o cliente DEVE reemitir como nova requisição com novo ID.
- Headers obrigatórios `Mcp-Method` e `Mcp-Name` nos POST do Streamable HTTP; headers customizados a partir de parâmetros via `x-mcp-header` (SEP-2243).
- `tools/list` etc. passam a retornar `ttlMs` e `cacheScope` (`public`/`private`) para cache no cliente (SEP-2549); servidores DEVERIAM devolver tools em ordem determinística.
- **Depreciados** (janela mínima de 12 meses pela nova política de ciclo de vida): Roots, Sampling, Logging (SEP-2577); transporte **HTTP+SSE** (já depreciado desde 2025-03-26, agora formalmente "Deprecated"); e **DCR (RFC 7591)** em favor de CIMD (PR #2858) — permanece para compatibilidade.
- Autorização: servidores de autorização DEVERIAM incluir `iss` (RFC 9207) e clientes DEVEM validar `iss` antes de trocar o código (SEP-2468); clientes DEVEM informar `application_type` no DCR (SEP-837); credenciais de cliente são vinculadas ao authorization server emissor (chave = `issuer`) e não podem ser reutilizadas em outro (SEP-2352).
- Duas extensões oficiais acompanham a release: **MCP Apps** (UI renderizada pelo servidor) e **Tasks** **[secundária]** — [Blog MCP 2026-07-28](https://blog.modelcontextprotocol.io/posts/2026-07-28/)

**Transportes (texto da 2025-11-25, ainda a referência para a base instalada)** — [Transports 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports)
- Dois transportes padrão: **stdio** (cliente lança o servidor como subprocesso) e **Streamable HTTP**. "Clients SHOULD support stdio whenever possible." Transportes customizados são permitidos.
- Streamable HTTP: um único endpoint (ex.: `https://example.com/mcp`) com POST e GET. Todo JSON-RPC do cliente é um novo POST com `Accept: application/json, text/event-stream`. A resposta a uma *request* é `application/json` (um objeto) **ou** `text/event-stream` (SSE); "The client MUST support both these cases".
- Segurança: "Servers MUST validate the `Origin` header on all incoming connections to prevent DNS rebinding attacks"; se o `Origin` estiver presente e for inválido, 403. Servidores locais DEVERIAM ligar só em 127.0.0.1.
- Sessão (até 2025-11-25): servidor PODE emitir `MCP-Session-Id` no `InitializeResult`; se emitir, o cliente DEVE reenviá-lo em todas as requisições; 404 = sessão expirada, reiniciar. Header `MCP-Protocol-Version` obrigatório nas requisições subsequentes.
- Compatibilidade com o HTTP+SSE antigo (2024-11-05): cliente tenta POST `InitializeRequest`; se falhar com 400/404/405, faz GET esperando evento `endpoint`.

**Registro de cliente OAuth (2026-07-28)** — [Client Registration 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization/client-registration.md)
- Ordem de prioridade para o cliente: (1) credenciais pré-registradas; (2) CIMD, se o authorization server anunciar `client_id_metadata_document_supported`; (3) DCR, se houver `registration_endpoint`; (4) pedir ao usuário os dados do cliente.
- CIMD: o `client_id` é uma **URL HTTPS com path** (ex.: `https://app.example.com/oauth/client-metadata.json`) que aponta para um JSON com, no mínimo, `client_id` (idêntico à URL), `client_name`, `redirect_uris`. O authorization server busca o documento, valida e compara o `redirect_uri`. Clientes públicos usam `token_endpoint_auth_method: "none"`.
- IDs baseados em CIMD são portáveis entre authorization servers (sem novo registro).
- Clientes DEVERIAM suportar credenciais estáticas (client ID embutido ou UI para o usuário informar).
- Descoberta do authorization server segue RFC 9728 (Protected Resource Metadata), com `WWW-Authenticate` opcional e fallback para `.well-known` (desde 2025-11-25) — [Changelog 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25/changelog)

**SDK oficial TypeScript**
- O SDK v2 foi dividido em pacotes separados `@modelcontextprotocol/client` e `@modelcontextprotocol/server` (release 2.0.0); a linha v1.x (`@modelcontextprotocol/sdk`) está em manutenção e implementa a especificação até 2025-11-25 **[secundária]** — [Guia de upgrade v1→v2](https://ts.sdk.modelcontextprotocol.io/v2/migration/upgrade-to-v2.html); [Release client@2.0.0](https://newreleases.io/project/github/modelcontextprotocol/typescript-sdk/release/@modelcontextprotocol/client@2.0.0)

### Inferences
- Para o Nexpra, a 2026-07-28 é favorável: sem sessão, sem GET de longa duração e sem retomada de SSE, cada tool call vira essencialmente "um POST → uma resposta (JSON ou SSE curto)", o que casa com o ciclo de vida do service worker MV3.
- Na prática o cliente precisa ser "bilíngue": tentar `server/discover` (2026-07-28) e cair para `initialize` + `MCP-Session-Id` (≤ 2025-11-25). O HTTP+SSE legado (2024-11-05) pode ser ignorado numa primeira versão, por estar formalmente depreciado.
- O Nexpra só precisa de **tools** (`tools/list`, `tools/call`); Roots/Sampling/Logging estão depreciados e não devem ser implementados. Elicitation/MRTR pode ser deixado para depois (responder que a capacidade não existe).

### Gaps
- Não li a página de transporte Streamable HTTP da 2026-07-28 na íntegra (só o changelog); o texto exato da regra de `Origin` nessa revisão não foi conferido — presumivelmente mantido, mas não verificado.
- Datas exatas (RC em 21/05/2026; final em 28/07/2026) vêm de resumo de busca; conferir no blog oficial antes de citar.
- Não verifiquei que fração dos servidores remotos populares já migrou para 2026-07-28.
- Resource Indicators (RFC 8707) e PKCE: são exigidos pela especificação de autorização desde 2025-06-18, mas não abri a página de autorização nesta sessão para citar o texto — tratar como não verificado aqui.

---

## B. Uma extensão Chrome MV3 pode ser cliente MCP via Streamable HTTP?

### Takeaway
Sim, tecnicamente viável **para servidores remotos HTTP**: fetch a partir do service worker, permissões de host opcionais por servidor, OAuth com `chrome.identity.launchWebAuthFlow` + PKCE. Os atritos reais são (1) servidores que validam `Origin`/CORS e não esperam `chrome-extension://`, (2) o registro do cliente OAuth (CIMD exige um JSON hospedado em HTTPS; DCR está depreciado), (3) limites de tempo do service worker em respostas lentas, e (4) **stdio é impossível sem um processo local** (proxy/native messaging). A política da Chrome Web Store não proíbe trocar dados com servidores remotos, mas proíbe "interpretadores de comandos remotos".

### Cited Findings

**Ciclo de vida do service worker** — [Chrome: Extension service worker lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle)
- O service worker é encerrado: após **30 s de inatividade**; quando uma única requisição (evento ou chamada de API) leva **mais de 5 minutos**; ou quando **uma resposta de `fetch()` leva mais de 30 s para chegar**.
- Reiniciam o timer de inatividade: receber evento ou chamar API de extensão (desde Chrome 110); mensagens de offscreen document (109); enviar mensagem em porta long-lived (114 — abrir a porta por si só não reinicia); enviar/receber mensagens em **WebSocket** ativo (116); conexão aberta com host de **native messaging** via `connectNative()` (105).
- Desde Chrome 116, `identity.launchWebAuthFlow()` e `permissions.request()` podem ultrapassar o limite de 5 minutos por exibirem prompts ao usuário.

**OAuth a partir da extensão** — [Chrome: chrome.identity](https://developer.chrome.com/docs/extensions/reference/api/identity)
- `launchWebAuthFlow` serve para provedores de identidade não-Google; o fluxo termina quando o provedor redireciona para URL no padrão `https://<app-id>.chromiumapp.org/*`; a janela fecha e a promise resolve com a URL de redirect. `getRedirectURL(path?)` gera a URL. Permissão necessária: `identity`.
- Recomendação: iniciar fluxos interativos a partir de UI que explique a autorização, não na inicialização.

**Registro do cliente OAuth** — [Client Registration 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization/client-registration.md)
- CIMD exige que o cliente **hospede um documento JSON em URL HTTPS** com `redirect_uris`; DCR depreciado, mantido como fallback; no DCR, clientes DEVEM informar `application_type` (nativo vs web) e estar preparados para rejeição do redirect URI por servidores OIDC.

**SDK TypeScript em contexto de navegador**
- No SDK v2, passa-se um *OAuth provider* ao transporte; o SDK cuida de descoberta e registro, chama o hook de redirect do provider e `connect()` lança `UnauthorizedError`; tokens e PKCE verifier ficam no provider (que é a superfície de armazenamento/redirect) **[secundária]** — [SDK TS v2: OAuth no cliente](https://ts.sdk.modelcontextprotocol.io/v2/clients/oauth.html)
- A nota de migração menciona comportamento específico de navegador ("CORS-swallow remains browser-only") **[secundária, sem detalhe]** — [Guia de upgrade v1→v2](https://ts.sdk.modelcontextprotocol.io/v2/migration/upgrade-to-v2.html)
- Versões posteriores do cliente v2 adicionaram `preloadSchemas()` e builds específicos para Cloudflare Workers **[secundária]** — [Release client@2.0.0](https://newreleases.io/project/github/modelcontextprotocol/typescript-sdk/release/@modelcontextprotocol/client@2.0.0)

**CORS e headers em clientes de navegador**
- Issue #764 do typescript-sdk: cliente no navegador perdia a sessão porque não conseguia ler `mcp-session-id` da resposta (funcionava em Node) — restrição de CORS **[secundária]** — [typescript-sdk issue #764](https://github.com/modelcontextprotocol/typescript-sdk/issues/764)
- A correção é do lado do servidor: PR #713 do typescript-sdk adicionou middleware `cors` aos exemplos expondo `Mcp-Session-Id` via `Access-Control-Expose-Headers`; o Python SDK fez o mesmo (PR #1059) **[secundária]** — [python-sdk PR #1059](https://github.com/modelcontextprotocol/python-sdk/pull/1059)
- O SDK não adiciona CORS automaticamente; o servidor precisa permitir `Mcp-Protocol-Version` e `Mcp-Session-Id` como headers de requisição, senão o preflight falha **[secundária, blog de terceiros]** — [eseospace: fix MCP CORS errors](https://eseospace.com/blog/fix-mcp-cors-errors-remote-server/)

**Validação de `Origin`**
- A especificação obriga servidores a validar `Origin` e responder 403 se inválido — [Transports 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports)
- Em bridges locais existentes, o tratamento de `chrome-extension://` é explícito: um projeto aceita qualquer origem de extensão instalada por padrão e permite "pinar" um ID de extensão por variável de ambiente; um fork endurecido aceita apenas clientes locais sem `Origin` e origens de extensões oficiais, rejeitando IDs arbitrários **[secundária]** — [agent-chrome-mcp](https://github.com/spgsroot/agent-chrome-mcp)

**Extensões existentes e como resolvem stdio**
- **MCP SuperAssistant** (srbhptl39): extensão que injeta uso de tools MCP em chats web (ChatGPT, Perplexity, Gemini); a extensão detecta tool calls na página e as envia a um **proxy local** (`npx @srbhptl39/mcp-superassistant-proxy`, configurado por JSON), que repassa ao servidor MCP real. URL padrão `localhost:3006/sse`; também Streamable HTTP em `/mcp` (WebSocket citado em apenas uma fonte) **[secundária, espelhos de terceiros]** — [mcpservers.org: MCP SuperAssistant](https://mcpservers.org/servers/srbhptl39/MCP-SuperAssistant)
- Família "Chrome MCP Server" (várias forks): extensão + **host de native messaging** local; o bridge fala Native Messaging com a extensão e serve MCP em Streamable HTTP/SSE/stdio para clientes externos; endpoint típico `http://127.0.0.1:12306/mcp` **[secundária]** — [agent-chrome-mcp](https://github.com/spgsroot/agent-chrome-mcp); [chrome-mcp (rudy2steiner)](https://github.com/rudy2steiner/chrome-mcp)
- Proxies genéricos stdio↔HTTP existem e são maduros (ex.: `sparfenyuk/mcp-proxy`, `punkpeye/mcp-proxy`) **[secundária]** — [sparfenyuk/mcp-proxy](https://github.com/sparfenyuk/mcp-proxy)

**Política da Chrome Web Store (código remoto)** — [CWS: requisitos adicionais MV3](https://developer.chrome.com/docs/webstore/program-policies/mv3-requirements)
- Proibido: `<script>` apontando para fora do pacote; `eval()` de string buscada remotamente; e **"construir um interpretador para executar comandos complexos buscados de fonte remota, mesmo que cheguem como dados"**. Regra geral: a lógica deve estar contida no pacote; recursos externos podem fornecer dados, não lógica.
- Permitido: buscar configuração remota (desde que a lógica esteja no pacote), sincronizar dados de conta com servidor remoto, executar operações do lado do servidor. Se a revisão não conseguir determinar a funcionalidade completa, a submissão pode ser rejeitada.

### Inferences
- **CORS**: requisições `fetch` feitas pelo service worker ou por páginas da extensão para origens cobertas por `host_permissions` não ficam sujeitas ao bloqueio de CORS do navegador (comportamento documentado do Chrome para extensões — **não reabri a página "Cross-origin network requests" nesta sessão; confirmar**). Isso resolve o problema de leitura de `Mcp-Session-Id`/`WWW-Authenticate` que afeta páginas web comuns, desde que a permissão de host tenha sido concedida.
- **Origin**: mesmo sem CORS, o Chrome envia `Origin: chrome-extension://<id>` em POSTs da extensão. Servidores que implementam a regra da spec com allowlist restrita podem responder **403**. O Nexpra não controla isso; deve tratar 403 com mensagem clara ("este servidor não aceita clientes de navegador") e manter uma lista curada de servidores testados. Como alternativa técnica, regras `declarativeNetRequest` podem remover/reescrever o header `Origin` — mas isso contorna um controle de segurança do servidor e pode ser mal visto na revisão; não recomendado como padrão.
- **host_permissions**: para servidores arbitrários configurados pelo usuário, o caminho é `optional_host_permissions: ["https://*/*"]` + `chrome.permissions.request({origins:[origem do servidor]})` no clique do usuário; para o catálogo curado, pedir a origem específica no momento de ativar cada conector. Evita o aviso de "ler e alterar todos os seus dados em todos os sites" na instalação.
- **Limites de tempo**: o risco concreto é o limite de **30 s para a resposta de `fetch()` chegar** (primeiro byte) em tools lentas que respondem `application/json` só ao final. Com SSE, os headers chegam cedo; durante o stream, o worker precisa de atividade para não ficar "idle" (ex.: porta long-lived com o side panel trocando mensagens, ou executar o cliente MCP numa página da extensão/offscreen document em vez do service worker). Na 2026-07-28, sem GET persistente nem sessão, o estado mínimo (tokens, cache de `tools/list` com `ttlMs`) cabe em `chrome.storage`, tornando o worker reiniciável sem perda.
- **OAuth**: o redirect `https://<id>.chromiumapp.org/…` é uma URL HTTPS normal, compatível com DCR (`application_type` provavelmente "web" ou "native" conforme o servidor — ponto de atrito previsto pela própria spec) e com CIMD. **CIMD exige hospedar um JSON estático em HTTPS** (GitHub Pages/domínio do produto bastam) — não é um backend, mas é um ativo web sob controle do Nexpra; o ID da extensão precisa ser estável (chave fixa no manifest) para que o `redirect_uri` do documento valha para todos os usuários. Tokens ficam em `chrome.storage.local` (ou `session`), nunca sincronizados.
- **SDK oficial vs. cliente próprio**: como o Nexpra só precisa de `server/discover`/`initialize`, `tools/list`, `tools/call` e parsing de SSE, um cliente mínimo escrito à mão (algumas centenas de linhas) é realista e evita dependência de schemas (zod) e de APIs de Node; o SDK v2 (`@modelcontextprotocol/client`) é o caminho se quiser o fluxo OAuth pronto, implementando um provider sobre `chrome.identity` + `chrome.storage`.
- **Política CWS**: tools MCP são descritas por dados (nome, descrição, JSON Schema) e executadas **no servidor remoto**; a extensão só repassa chamadas escolhidas pelo modelo. Isso se enquadra em "operações do lado do servidor/dados", não em código remoto executado na extensão. O risco de enquadramento como "interpretador de comandos remotos" cresce se a extensão passar a executar ações locais privilegiadas (APIs chrome.*, DOM) ditadas por um servidor MCP — manter as ações locais fixas no pacote e os MCPs remotos como fonte de dados/ações remotas. **MCP Apps** (UI enviada pelo servidor) teria de rodar em iframe sandbox para ficar na exceção de "contextos isolados".
- **stdio**: impossível a partir de uma extensão sem processo local. Opções: (a) não suportar (só remotos) — coerente com "sem backend, sem instalação"; (b) host de native messaging opcional; (c) instruir usuário avançado a rodar um proxy stdio→HTTP em localhost e cadastrar `http://127.0.0.1:porta/mcp`.

### Gaps
- Não encontrei declaração oficial do SDK TypeScript sobre suporte a service worker de extensão, nem medidas de tamanho de bundle do `@modelcontextprotocol/client` v2.
- Não encontrei fonte primária confirmando como servidores remotos populares (Notion, Atlassian, Google) tratam `Origin: chrome-extension://…` — exige teste empírico servidor a servidor.
- Não verifiquei quais authorization servers de conectores populares já anunciam `client_id_metadata_document_supported` nem quais ainda aceitam DCR aberto (vários fornecedores restringem clientes a uma allowlist — relatos existem, mas não foram verificados nesta sessão).
- Não localizei caso documentado de rejeição/aceitação na Chrome Web Store especificamente por "cliente MCP"; a leitura da política acima é interpretação.
- README oficial do MCP SuperAssistant não foi lido diretamente (apenas espelhos).

---

## C. Quais servidores MCP existentes são úteis a profissionais brasileiros?

### Takeaway
Há oferta abundante mas **quase toda comunitária e local (stdio/Python/Node)** para dados brasileiros — pouquíssimos endpoints remotos hospedados e nenhum oficial de órgão público encontrado. Para "oferecer MCP como serviço" numa extensão sem backend, os candidatos imediatos são os **MCPs remotos oficiais de produtividade** (Google Workspace, Notion, Atlassian, Linear, Asana, HubSpot, Slack) e alguns poucos hospedados (BrasilNFe, PubMed comunitário). Para o conteúdo brasileiro, o caminho mais realista é o Nexpra **chamar as APIs públicas diretamente como tools nativas** (ou hospedar um MCP próprio), usando os repositórios comunitários como mapa de APIs.

### Cited Findings

**Jurídico (Brasil)**
| Servidor | Fonte/escopo | Remoto? | Auth | Mantenedor / maturidade |
|---|---|---|---|---|
| [matematicsolutions/br-eli-mcp](https://github.com/matematicsolutions/br-eli-mcp) | 15 tools sobre 8 APIs abertas sem chave: Câmara, Senado/Congresso, normas.leg.br, DataJud CNJ, STJ (dados abertos, inteiro teor/ementa), CARF, TST, TCU | Não (processo local `python -m br_eli_mcp`, stdio) | Nenhuma | Comunitário; Apache-2.0; **4 estrelas**, 31 commits |
| [JoaoLuizRTelo/datajud-mcp](https://github.com/JoaoLuizRTelo/datajud-mcp) | DataJud (CNJ): metadados de processos | Não verificado (local) | Chave pública do DataJud | Comunitário; maturidade não verificada |
| [DeHor-Labs/mcp-juridico-brasil](https://github.com/DeHor-Labs/mcp-juridico-brasil) | Acompanhamento processual via DataJud; derivado `juris-br-mcp` acrescenta DJEN | Não verificado | — | Comunitário **[secundária]** |
| [mcp-dir/datajud-mcp (Glama)](https://glama.ai/mcp/servers/mcp-dir/datajud-mcp) | DataJud (CNJ) | Não verificado | — | Comunitário |

- Limites do DataJud relatados pelos próprios repositórios: só **metadados** de processos (sem texto de decisões), sem busca em texto livre (filtros por classe/códigos/datas), e **STF não está na API pública** **[secundária]** — [JoaoLuizRTelo/datajud-mcp](https://github.com/JoaoLuizRTelo/datajud-mcp)
- O README do br-eli-mcp registra: redistribuição de dados do DataJud é restrita pela **Resolução CNJ 446/2022**; TRF4 e TRF5 foram descartados porque recusam conexões de fora do Brasil; Planalto não é raspado (`legislacao.presidencia.gov.br` deu timeout); o sistema de normas da RFB não tem backend JSON — [br-eli-mcp](https://github.com/matematicsolutions/br-eli-mcp)
- O repositório sugerido no briefing (`llp42/datajud-mcp`) **não apareceu** nas buscas; não foi verificado.

**Dados abertos do governo (Brasil)**
| Servidor | Escopo | Remoto? | Auth | Mantenedor / maturidade |
|---|---|---|---|---|
| [Mcp-Brasil/mcp-brasil](https://github.com/Mcp-Brasil/mcp-brasil) | ~70 APIs públicas; 533 tools, 131 resources, 102 prompts, 15 áreas (Economia/Finanças — Bacen/BCB Olinda; IBGE; Legislativo/Executivo; Transparência/TCEs/SICONFI; Judiciário; Eleitoral; Saúde; Compras Públicas; Educação; BrasilAPI; dados.gov.br etc.) | **Sem endpoint público**; roda local em stdio ou HTTP (`fastmcp run … --transport http`, `/mcp` em localhost); doc de deploy em Azure Container Apps | 66 APIs sem chave; opcionais: `TRANSPARENCIA_API_KEY`, `DATAJUD_API_KEY`, `META_ACCESS_TOKEN` | Organização Mcp-Brasil; MIT; **1,9 mil estrelas**, 293 forks, 246 commits; Python |
| [cristianoaredes/mcp-dadosbr](https://github.com/cristianoaredes/mcp-dadosbr) | CNPJ, CEP (OpenCNPJ/OpenCEP), IBGE, Portal da Transparência, DataJud, Banco Central, BrasilAPI, CNES/DataSUS | Não verificado | — | Comunitário **[secundária]** |

- Uma listagem indicava ~242 dias desde a última atualização do repo Mcp-Brasil à época da busca **[secundária, não confirmada na página do repo]** — [Glama: mcp-brasil](https://glama.ai/mcp/servers/Mcp-Brasil/mcp-brasil)
- Com 533 tools, o mcp-brasil exige busca/seleção de tools (não cabe despejar tudo no contexto) — número do próprio repo: [Mcp-Brasil/mcp-brasil](https://github.com/Mcp-Brasil/mcp-brasil)

**Fiscal / financeiro / ERPs (Brasil)**
- **BrasilNFe** publica endpoint MCP **remoto** `https://api.brasilnfe.com.br/services/Mcp` (Streamable HTTP), cobrindo NF-e, NFC-e, NFS-e e outros documentos — único endpoint hospedado por fornecedor encontrado no segmento **[secundária]** — [BrasilNFe: Servidor MCP](https://www.brasilnfe.com.br/mcp)
- **CodeSpar "MCP Dev LATAM / mcp-dev-brasil"**: catálogo open-source (MIT, npm) com servidores para Asaas, Omie, Bling, Conta Azul, Pluggy, Nuvem Fiscal, Focus NFe, Pix etc.; modo padrão stdio, podendo rodar como servidor Streamable HTTP; **não são produtos oficiais dos fornecedores** **[secundária]** — [CodeSpar: 57 MCP servers](https://codespar.dev/blog/57-mcp-servers); [mcp-dev-brasil](https://mcpservers.org/servers/codespar/mcp-dev-brasil)
- Lista comunitária "awesome" de MCPs brasileiros (CNPJ, CEP, NF-e, Pix, DataJud/PJe, Câmara, IBGE, SaaS BR) — [awesome-mcp-brasil](https://github.com/brunopompeo1/awesome-mcp-brasil-daniel)
- Não encontrei servidor MCP remoto **oficial** de Asaas, Omie, Bling, Conta Azul, Pluggy, Nuvem Fiscal ou Focus NFe **[resultado negativo de uma busca; não é prova de inexistência]**.

**Saúde**
- Não há servidor MCP remoto oficial do NIH/FDA nos resultados; as opções hospedadas são comunitárias **[secundária]**:
  - `cyanheads/pubmed-mcp-server` — PubMed, PMC, Europe PMC; endpoint público `https://pubmed.caseyjhand.com/mcp` — [README](https://raw.githubusercontent.com/cyanheads/pubmed-mcp-server/HEAD/README.md)
  - `medical-mcps` — PubMed/PubTator3, ClinicalTrials.gov, openFDA e outros; Streamable HTTP; produção em `https://mcp.cloud.curiloo.com/tools/unified/mcp` — [PyPI: medical-mcps](https://pypi.org/project/medical-mcps/)
  - PubCrawl (`@pharmatools/pubcrawl`) — PubMed, Europe PMC, openFDA, DailyMed, ClinicalTrials.gov; Streamable HTTP stateless; sem chave — [mcpservers.org: pubcrawl](https://mcpservers.org/servers/nickjlamb/pubcrawl)

**Produtividade — MCPs remotos com hospedagem oficial**
- **Google Workspace** (oficial, *public developer preview*, anunciado no Cloud Next '26): endpoints por produto — Gmail `gmailmcp.googleapis.com/mcp/v1`, Drive `drivemcp.googleapis.com/mcp/v1`, Calendar `calendarmcp.googleapis.com/mcp/v1`; OAuth 2.0 com escopos **[secundária sobre doc oficial]** — [Google: Configure the Workspace MCP servers](https://developers.google.com/workspace/guides/configure-mcp-servers); [Workspace Updates, maio/2026](https://workspaceupdates.googleblog.com/2026/05/agent-tools-and-security-updates-for-workspace-developers.html)
- URLs relatadas por fontes secundárias (blogs; **conferir na documentação de cada fornecedor**): Notion `https://mcp.notion.com/mcp` (OAuth por usuário); Linear `https://mcp.linear.app/mcp` (OAuth 2.1 ou API key); Asana `https://mcp.asana.com/v2/mcp` (o `/sse` beta foi depreciado); Atlassian `https://mcp.atlassian.com/v2/mcp` (outra fonte cita `/v1/mcp` — **conflito**); Slack `https://mcp.slack.com/mcp` (uma fonte não conseguiu confirmar servidor hospedado pela Slack — **conflito**); HubSpot `https://mcp.hubspot.com` (GA em 13/04/2026) — [hidekazu-konishi: MCP Server Ecosystem Reference 2026](https://hidekazu-konishi.com/entry/mcp_server_ecosystem_reference_2026.html); [contextbolt: Business apps with MCP servers](https://contextbolt.com/blog/business-apps-with-mcp-servers/)

**Registries e consulta programática**
- **MCP Registry oficial**: `https://registry.modelcontextprotocol.io`; `GET /v0/servers` com `search`, `limit` e paginação por `cursor`; cada entrada traz `packages` (instalação local) e `remotes` (URLs remotas); não há filtro "só remotos" — filtrar o campo `remotes` no cliente. Docs mais novas usam `/v0.1/servers` com `updated_since` (**conflito de versão de path — conferir**) **[secundária]** — [Nordic APIs: MCP Registry API](https://nordicapis.com/getting-started-with-the-official-mcp-registry-api/); [MCP Registry – sobre](https://modelcontextprotocol.io/registry/about.md)
- O registry oficial foi lançado em preview em 08/09/2025 e prevê "sub-registries"/agregadores — [Blog MCP: registry preview](https://blog.modelcontextprotocol.io/posts/2025-09-08-mcp-registry-preview/); [Registry aggregators](https://modelcontextprotocol.io/registry/registry-aggregators.md)
- A Anthropic expõe documentação de um sub-registry em `https://api.anthropic.com/mcp-registry/docs` **[apareceu em busca; não lido]** — [Anthropic MCP subregistry docs](https://api.anthropic.com/mcp-registry/docs)
- Diretórios comunitários usados nesta pesquisa: Glama (`glama.ai/mcp/servers/...`), mcpservers.org, mcp.so — ex.: [Glama: mcp-brasil](https://glama.ai/mcp/servers/Mcp-Brasil/mcp-brasil)

### Inferences
- Para um produto sem backend, um MCP "stdio-only" é inutilizável diretamente. O valor dos repositórios brasileiros para o Nexpra é sobretudo **o inventário de APIs públicas sem chave** (DataJud, STJ dados abertos, TST, TCU, CARF, Câmara, Senado, normas.leg.br, IBGE, BCB Olinda/SGS, BrasilAPI, PNCP, Portal da Transparência). Como essas APIs são HTTP/JSON públicas, o Nexpra pode implementá-las como **tools nativas** da extensão — mais simples, sem terceiro no meio, e a despseudonimização local continua funcionando.
- Alternativa: o próprio Nexpra hospedar (ver F) um MCP remoto curado para Brasil — mas isso cria um operador intermediário e custo.
- Endpoints comunitários hospedados por indivíduos (ex.: PubMed em domínio pessoal, curiloo.com) não têm SLA nem operador identificável; para um produto "privacy-first" só devem entrar no catálogo com aviso, ou ser substituídos por chamada direta às APIs oficiais (NCBI E-utilities, ClinicalTrials.gov, openFDA), que são públicas.
- APIs judiciais com bloqueio geográfico (TRF4/TRF5 recusam conexões de fora do Brasil, segundo o br-eli-mcp) favorecem a arquitetura do Nexpra: a chamada parte do navegador do usuário, no Brasil — vantagem sobre MCPs hospedados no exterior e sobre conectores server-side dos provedores de IA.

### Gaps
- Não verifiquei: PJe/MNI via MCP público, jurisprudência do STF via MCP, Querido Diário, PNCP dedicado, BVS, Microsoft 365 (servidor MCP oficial remoto), Zapier, n8n, Cloudflare (servidores MCP próprios) — fora do orçamento de buscas. Zapier/n8n/Cloudflare têm ofertas MCP conhecidas, mas não confirmei URLs/estado em 2026 nesta sessão.
- Datas de último commit dos repositórios brasileiros não aparecem nas páginas capturadas; estrelas confirmadas só para mcp-brasil (1,9 mil) e br-eli-mcp (4).
- `llp42/datajud-mcp` não foi localizado.
- Diretório de conectores da Anthropic: API programática não verificada (apenas a existência da URL do sub-registry).
- Smithery e PulseMCP: não pesquisados nesta sessão.

---

## D. Conectores MCP nativos dos provedores (Anthropic, OpenAI, Gemini) como alternativa

### Takeaway
Anthropic (Messages API, beta) e OpenAI (Responses API) oferecem MCP remoto **executado pelos servidores do provedor**: a extensão só declara URL + token e recebe o resultado já consumido pelo modelo. Isso elimina o trabalho de cliente MCP, mas **quebra o diferencial do Nexpra**: os argumentos saem do modelo direto para o servidor MCP (com placeholders, não com dados reais) e os resultados voltam direto ao modelo (sem re-pseudonimização). No Gemini não confirmei suporte server-side; o que há é suporte no SDK (cliente).

### Cited Findings

**Anthropic — MCP connector** — [Claude Docs: MCP connector](https://platform.claude.com/docs/en/agents-and-tools/mcp-connector)
- Status **beta**; headers `mcp-client-2026-09-15` (atual) e `mcp-client-2025-11-20`; a versão `mcp-client-2025-04-04` está depreciada.
- Uso na Messages API: `mcp_servers` (com `url`, `name`, `authorization_token` opcional) + um `mcp_toolset` correspondente em `tools`, em cada requisição. Permite allowlist/denylist e configuração por tool (`enabled`, `defer_loading` com o Tool Search).
- Limitações: da especificação MCP, **apenas tool calls** são suportadas; o servidor precisa estar **publicamente exposto por HTTP** (Streamable HTTP e SSE); servidores stdio locais não conectam diretamente.
- OAuth: "API consumers are expected to handle the OAuth flow and obtain the access token prior to making the API call, and to refresh the token as needed" — o token vai no campo `authorization_token` de cada requisição.
- **Não elegível a ZDR** ("Data retained according to standard policy").
- Plataformas: Claude API, Claude Platform on AWS, Google Cloud (gerenciado pela Anthropic) e Microsoft Foundry — todas em beta.
- Com `mcp-client-2026-09-15`: a API registra a lista de tools devolvida por cada servidor e permite **fixar ("pin")** essa lista (blocos `mcp_tool_listing`), de modo que mudanças no servidor não alterem o que o modelo recebe no meio da conversa.
- Alternativa client-side documentada: "Client-side MCP helpers" nos SDKs (ex.: `@anthropic-ai/sdk/helpers/beta/mcp`) convertem tipos MCP ↔ API quando **o próprio aplicativo** gerencia a conexão MCP — recomendado "quando você precisa de servidores locais, prompts, resources ou mais controle sobre a conexão".

**OpenAI — ferramenta MCP remota** — [OpenAI: Connectors and MCP servers](https://developers.openai.com/api/docs/guides/tools-connectors-mcp)
- Disponível na **Responses API** ("available in the Responses API in most recent models"). Campos: `server_label`, `server_description`, `server_url`, `authorization` (token OAuth), `require_approval` (`always`/`never`/objeto por tool), `allowed_tools`, `defer_loading`, `tunnel_id` (Secure MCP Tunnel para servidor local), `connector_id` (legado; depreciado para modelos lançados após 01/09/2026).
- Transportes: Streamable HTTP e HTTP/SSE.
- "The Responses API does not store the value you provide in the `authorization` field" — o token deve ser enviado em toda requisição.
- Compatível com Zero Data Retention e Data Residency; com `store=true`, dados ficam 30 dias; **servidores MCP são terceiros** com políticas próprias de retenção/residência.
- Sem taxa por tool call; paga-se pelos tokens (definições de tools e chamadas).
- Padrão: aprovação exigida a cada tool call; orientações de risco: prompt injection por servidores maliciosos, exposição de dados ao host do servidor, cuidado com URLs em saídas, preferir servidores oficiais do próprio provedor do serviço, servidores podem mudar comportamento.
- Conectores embutidos (legado): Dropbox, Gmail, Google Calendar, Google Drive, Microsoft Teams, Outlook Calendar, Outlook Email, SharePoint — o app obtém o token OAuth.
- Chat Completions: um gist da comunidade afirma que a tool MCP remota só existe na Responses API — [gist](https://gist.github.com/stevenheidel/a6c8ed8ce1632dff1284e44a17554993); já a tabela de disponibilidade do guia oficial listaria Chat Completions e Assistants, sem descrever o uso — **conflito; conferir na doc oficial**.

**Gemini**
- Fonte de terceiros (FastMCP): os SDKs Python e JavaScript do Gemini têm suporte **embutido e experimental** a MCP — o SDK lista tools (`list_tools`) e as chama automaticamente; somente tools (sem resources/prompts); conecta a servidores locais e remotos — ou seja, **execução do lado do cliente (SDK)** — [FastMCP: Gemini](https://gofastmcp.com/integrations/gemini)
- A página oficial de function calling do Gemini (primeiros 100 mil caracteres lidos) não trouxe descrição de suporte MCP; menciona apenas um "Gemini Docs MCP server" para agentes — [Gemini: function calling](https://aistudio.google.com/docs/function-calling)
- O Google publica servidores MCP remotos gerenciados (Google Cloud, Workspace), que são servidores, não um conector MCP dentro da API Gemini — [Google Cloud: configure MCP](https://docs.cloud.google.com/mcp/configure-mcp-ai-application)

### Inferences
- **Fluxo de dados no conector nativo**: extensão → provedor de IA (prompt pseudonimizado + URL + token OAuth do usuário) → servidor MCP (argumentos gerados pelo modelo) → provedor → modelo. Consequências para o Nexpra:
  1. O modelo só conhece `[PESSOA_1]`, `[CPF_2]`; uma tool `consultar_cnpj("[CNPJ_3]")` chegaria ao servidor MCP com o placeholder literal → **falha funcional**. Não há ponto de interceptação para resolver o placeholder.
  2. O resultado da tool (com dados pessoais reais de terceiros) entra no contexto do modelo **sem re-pseudonimização** → quebra a promessa de privacidade.
  3. O token OAuth do usuário para o serviço (Drive, Notion…) passa a transitar pelo provedor de IA a cada requisição (a OpenAI declara não armazenar; a Anthropic não é ZDR-elegível para este recurso).
- Portanto, conector nativo só serve para MCPs que **não recebem nem devolvem dado pessoal** (ex.: busca de legislação/jurisprudência por tema, documentação, índices econômicos) — e mesmo aí o resultado não passa pelo filtro local. Para todo o resto, o desenho coerente com o Nexpra é **cliente MCP na extensão** (loop de tools local, que já existe), com despseudonimização dos argumentos e re-pseudonimização do resultado.
- Efeito colateral positivo do cliente local: funciona igual para os três provedores (Anthropic Messages, OpenAI Chat Completions, Gemini generateContent), pois as tools MCP viram function tools comuns; o conector nativo exigiria migrar OpenAI para a Responses API e não cobriria o Gemini.
- O recurso de "pin" da lista de tools (Anthropic, 2026-09-15) é uma mitigação de rug pull que o Nexpra pode reproduzir localmente (hash das definições aprovadas).

### Gaps
- Gemini: não confirmei em fonte oficial se há tool MCP **server-side** (ex.: na Interactions API) em nov/2026; a página oficial não foi lida até o fim (restaram ~36 mil caracteres).
- OpenAI: suporte efetivo de MCP em Chat Completions não confirmado (fontes em conflito).
- Não verifiquei políticas de retenção detalhadas do MCP connector da Anthropic além da marcação "not ZDR-eligible".

---

## E. Segurança e LGPD

### Takeaway
Os riscos próprios de MCP estão catalogados (OWASP MCP Top 10, ainda em beta): envenenamento de tools, injeção via conteúdo contextual, má gestão de tokens, servidores "sombra" e excesso de compartilhamento de contexto. Para o Nexpra, cada MCP de terceiro é um **novo destinatário de dados** — possivelmente no exterior — e isso precisa de curadoria, aprovação por tool, fixação de definições e transparência ao usuário; a transferência internacional é regulada pela Resolução CD/ANPD nº 19/2024.

### Cited Findings

**OWASP MCP Top 10 (itens rotulados 2025; projeto em fase beta/piloto)** — [OWASP MCP Top 10](https://owasp.org/www-project-mcp-top-10/)
- MCP01 Token Mismanagement & Secret Exposure — credenciais embutidas ou de longa duração vazam por memória do modelo, logs ou prompt injection.
- MCP02 Privilege Escalation via Scope Creep — permissões frouxas se ampliam com o tempo.
- MCP03 Tool Poisoning — tools/plugins comprometidos, ou suas saídas, manipulam o comportamento do modelo.
- MCP04 Software Supply Chain Attacks & Dependency Tampering.
- MCP05 Command Injection & Execution.
- MCP06 Prompt Injection via Contextual Payloads — instruções maliciosas escondidas em texto, **inclusive conteúdo processado por OCR**.
- MCP07 Insufficient Authentication & Authorization.
- MCP08 Lack of Audit and Telemetry.
- MCP09 Shadow MCP Servers — implantações não aprovadas, fora da governança.
- MCP10 Context Injection & Over-Sharing — contexto compartilhado/persistente expõe dados sensíveis entre tarefas, usuários ou agentes.
- "Rug pull" (tool aprovada que muda depois), "schema poisoning" e "tool shadowing" são descritos como subtécnicas de tool poisoning **[secundária]**; há fontes de terceiros que numeram tool poisoning como "MCP-01" — **conflito de numeração; valer-se da página OWASP** — [CSA research note, jul/2026](https://labs.cloudsecurityalliance.org/wp-content/uploads/2026/07/CSA%5Fresearch%5Fnote%5Fmcp%5Ftool%5Fpoisoning%5Fai%5Fagent%5Fexfiltration%5F20260702-csa-styled.pdf)

**Orientações de fornecedores e da especificação**
- OpenAI: servidores maliciosos podem incluir instruções ocultas; dados enviados ao servidor ficam com o host daquele servidor (revisar e logar); manter aprovação para ações sensíveis; cuidado com URLs em saídas de tools (exfiltração); preferir servidores oficiais do provedor do serviço e desconfiar de agregadores; servidores podem mudar o comportamento das tools — [OpenAI: Connectors and MCP servers](https://developers.openai.com/api/docs/guides/tools-connectors-mcp)
- Anthropic: fixação da lista de tools por servidor (`mcp-client-2026-09-15`) para que mudanças no servidor não alterem o que o modelo recebe no meio da conversa — [Claude Docs: MCP connector](https://platform.claude.com/docs/en/agents-and-tools/mcp-connector)
- Especificação: credenciais de cliente vinculadas ao `issuer`; validação obrigatória de `iss` pelo cliente (mitiga mix-up); o cliente DEVE tratar o ID de sessão de forma segura (session hijacking); a spec mantém um documento de Security Best Practices — [Changelog 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28/changelog.md); [Transports 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports)
- Vulnerabilidade real em infraestrutura OAuth de MCP: bypass crítico de PKCE no `@cloudflare/workers-oauth-provider` (GHSA-qgp8-v765-qxx9), corrigido na 0.0.5 **[secundária]** — [tessl: cloudflare-mcp-server skill](https://tessl.io/registry/skills/github/jezweb/claude-skills/cloudflare-mcp-server)
- O br-eli-mcp documenta um padrão de transparência útil como referência: consultas vão só às APIs oficiais, cache local, log local de cada tool call com entrada em hash, e busca opcional de config remota desligável — [br-eli-mcp](https://github.com/matematicsolutions/br-eli-mcp)

**LGPD — transferência internacional**
- A **Resolução CD/ANPD nº 19, de 23/08/2024**, aprova o Regulamento de Transferência Internacional de Dados e o conteúdo das cláusulas-padrão contratuais (Anexo II); mecanismos: cláusulas-padrão da ANPD (adotadas integralmente, sem alterações), cláusulas contratuais específicas (aprovação da ANPD) e cláusulas-padrão equivalentes reconhecidas **[secundária]** — [Lefosse](https://lefosse.com/noticias/alerta/anpd-publica-regulamento-de-transferencia-internacional-de-dados-e-clausulas-padrao-contratuais-de-protecao-de-dados/); [Migalhas](https://www.migalhas.com.br/depeso/415220/anpd-aprova-o-regulamento-de-transferencia-internacional-de-dados)
- Prazo de 12 meses para incorporar as cláusulas-padrão aos contratos — encerrado em agosto/2025; a não incorporação pode ensejar fiscalização **[secundária]** — [Mayer Brown, ago/2025](https://www.mayerbrown.com/pt/insights/publications/2025/08/end-of-grace-period-implementation-of-brazils-standard-contractual-clauses-in-international-transfers-of-personal-data)
- O envio de dados ao exterior está no radar fiscalizatório da ANPD **[secundária, título]** — [Migalhas Quentes](https://www.migalhas.com.br/quentes/449475/envio-de-dados-ao-exterior-esta-no-radar-fiscalizatorio-da-anpd)
- Uma fonte indica prazo de 15 dias para o controlador fornecer ao titular a íntegra das cláusulas usadas, quando solicitado **[secundária; conferir no texto oficial]** — [Texto da Resolução (arquivo Migalhas)](https://arq.migalhas.com.br/arquivos/2026/2/DC8DD5485D6EBE_RESOLUCAOCD_ANPDNº19,DE23DEAGO.pdf)

### Inferences
- **Papéis LGPD** (análise minha, não parecer jurídico): o profissional usuário (advogado, contador, médico) tende a ser o **controlador** dos dados de seus clientes/pacientes; o operador de um servidor MCP que recebe esses dados age como **operador** (ou controlador independente, se usar os dados para fins próprios). Sem backend, o Nexpra não trata os dados em servidor próprio, mas **escolhe e apresenta** os destinatários — o catálogo curado cria um dever prático de diligência e transparência. Se o Nexpra passar a hospedar um MCP (seção F), torna-se operador de fato.
- A pseudonimização local reduz o que chega ao **modelo**, mas a despseudonimização dos argumentos faz o **dado real chegar ao servidor MCP**. Cada conector precisa de classificação explícita: (a) só recebe termos não pessoais (legislação, índices); (b) recebe identificadores públicos (CNPJ, número CNJ — atenção: número de processo e nome de parte são dado pessoal); (c) recebe conteúdo do usuário (Drive, Notion). O consentimento/aviso deve refletir a classe.
- Servidor MCP hospedado fora do Brasil = transferência internacional pelo controlador (usuário). Dados de saúde são sensíveis; sigilo profissional (advocacia, medicina, contabilidade) soma-se à LGPD. Conectores comunitários sem operador identificável não permitem cláusulas-padrão nem avaliação — não deveriam receber dado pessoal.
- **Controles recomendáveis no produto** (síntese das fontes acima):
  1. Catálogo allowlist de servidores testados, com operador, país de hospedagem e classe de dados; "servidor personalizado" só em modo avançado com aviso.
  2. Aprovação por tool: leitura pode ser "permitir sempre"; escrita/efeito colateral sempre confirma, mostrando os argumentos **já despseudonimizados** (é o que de fato sai da máquina).
  3. Fixar definições de tools (hash de nome+descrição+schema); mudança → reaprovação (anti rug pull).
  4. Tratar descrições e resultados de tools como dado não confiável: delimitar no prompt, limitar tamanho, não renderizar links/imagens automáticos de resultados (canal de exfiltração), não permitir que resultado de um servidor dispare tool de outro sem confirmação.
  5. **Nunca despseudonimizar para um servidor o que ele não precisa**: resolução de placeholder por tool/por parâmetro (allowlist de tipos — ex.: tool de CNPJ só resolve `[CNPJ_n]`), bloqueando a exfiltração em que uma descrição envenenada instrui o modelo a passar `[CPF_1]` a uma tool qualquer. Este é o risco específico do desenho do Nexpra: o resolvedor local é um "oráculo de reidentificação" se aceitar qualquer destino.
  6. Tokens OAuth com escopo mínimo, em `chrome.storage.local`, por servidor/issuer, nunca enviados ao modelo; validar `iss`; PKCE S256.
  7. Log local de auditoria (tool, servidor, hash dos argumentos, horário), sem dados pessoais em claro — coerente com MCP08 e com a regra do projeto de não logar CPF/processo.
- **O que divulgar** (privacy-first): para cada conector — quem opera, onde hospeda, que dados saem (reais vs. pseudonimizados), base legal a cargo do usuário-controlador, que o Nexpra não vê nem armazena os dados, e que resultados de terceiros são re-pseudonimizados antes de irem ao modelo.

### Gaps
- Não li o texto oficial da Resolução 19/2024 nem guias da ANPD sobre agentes de tratamento; a análise de papéis é inferência e deve ser validada juridicamente.
- OWASP LLM Top 10 2025 (LLM01 Prompt Injection, LLM06 Excessive Agency etc.) não foi consultado nesta sessão — não citar a partir destas notas.
- Não levantei incidentes reais datados de 2026 (há um relatório "State of MCP Security 2026" em dev.to e uma nota da CSA de jul/2026 que não foram lidos).
- O documento "Security Best Practices" da especificação MCP não foi lido na íntegra (confused deputy, token passthrough).

---

## F. Expor as capacidades locais do Nexpra (anonimizador, calculadoras) como servidor MCP

### Takeaway
Uma extensão não consegue, sozinha, ser servidor MCP alcançável por Claude Desktop/ChatGPT: é preciso um **processo local** (host de native messaging/companion) ou um **servidor remoto**. Um Cloudflare Worker stateless com `createMcpHandler` cabe no plano gratuito para as calculadoras (sem dado pessoal), mas para o anonimizador o texto bruto transitaria pelo Worker — contradiz a promessa "100% local".

### Cited Findings

**Padrão "extensão + bridge local"**
- Projetos existentes expõem funcionalidades de extensão como servidor MCP por meio de um **host de native messaging** registrado no Chrome, que serve MCP em Streamable HTTP/SSE/stdio em `127.0.0.1` (ex.: porta 12306) para clientes como Claude Desktop **[secundária]** — [agent-chrome-mcp](https://github.com/spgsroot/agent-chrome-mcp); [chrome-mcp](https://github.com/rudy2steiner/chrome-mcp)
- Uma conexão aberta com host de native messaging (`connectNative`) mantém o service worker vivo (Chrome 105+) — [Chrome: service worker lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle)
- Conectores nativos dos provedores exigem servidor **publicamente exposto por HTTP** (Anthropic); a OpenAI oferece "Secure MCP Tunnel" (`tunnel_id`) para servidor local — [Claude Docs: MCP connector](https://platform.claude.com/docs/en/agents-and-tools/mcp-connector); [OpenAI: Connectors and MCP servers](https://developers.openai.com/api/docs/guides/tools-connectors-mcp)

**Cloudflare como host de MCP remoto**
- API recomendada: **`createMcpHandler`** (Agents SDK) — servidor MCP **stateless** num Worker comum, uma instância nova de `McpServer` por requisição, sem Durable Object; o **`McpAgent` é legado/depreciado** (há guia de migração). Transporte: Streamable HTTP. Templates: `remote-mcp-authless`; deploy com `wrangler deploy` — [Cloudflare: Build a remote MCP server](https://developers.cloudflare.com/agents/model-context-protocol/guides/remote-mcp-server/index.md)
- Autenticação opcional: authorization server (`OAuthAuthorizationServer`, construído sobre o Workers OAuth Provider, com login próprio ou via GitHub/Google/Cloudflare Access) + resource server (`OAuthResourceServer` envolvendo o handler); tools leem o usuário via `getMcpAuthContext()`; o fluxo OAuth usa um namespace KV — [Cloudflare: Build a remote MCP server](https://developers.cloudflare.com/agents/model-context-protocol/guides/remote-mcp-server/index.md)
- Preços/limites — [Cloudflare Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/):
  - Workers **Free**: 100.000 requisições/dia; **10 ms de CPU por invocação**.
  - Workers **Paid**: mínimo US$ 5/mês por conta; 10 milhões de requisições/mês incluídas (+US$ 0,30/milhão); 30 milhões de CPU-ms incluídos (+US$ 0,02/milhão); até 5 min de CPU por invocação (padrão 30 s).
  - Durable Objects no Free: só SQLite-backed; 100.000 req/dia; 13.000 GB-s/dia; 5 GB.
  - KV Free: 100.000 leituras/dia; 1.000 escritas/dia; 1 GB.
  - Ao exceder limite diário gratuito, as operações daquele tipo falham com erro (reset 00:00 UTC).
- Durable Objects entraram no plano gratuito em abril/2025 — [Blog Cloudflare](https://blog.cloudflare.com/building-ai-agents-with-mcp-authn-authz-and-durable-objects/)
- Há relato de terceiros medindo um servidor MCP no plano gratuito contra o limite de 10 ms de CPU **[secundária, não lido]** — [dev.to: MCP on Cloudflare's free plan vs 10 ms CPU](https://dev.to/301st/an-mcp-server-on-cloudflares-free-plan-measured-against-the-10-ms-cpu-limit-468b)

### Inferences
- **Matriz de opções**:
  | Opção | Instalação pelo usuário | Privacidade | Alcance | Custo |
  |---|---|---|---|---|
  | Nada (tools só dentro do Nexpra) | Nenhuma | Máxima | Só o chat do Nexpra | Zero |
  | Host de native messaging / companion local (MCP em 127.0.0.1 ou stdio) | Instalar executável + registrar host (atrito alto; antivírus/TI corporativa; multiplataforma) | Dados não saem da máquina | Clientes **desktop** (Claude Desktop, IDEs); não alcança ChatGPT/claude.ai web, que exigem URL pública | Dev/manutenção |
  | Worker Cloudflare stateless (calculadoras) | Nenhuma (URL) | Só números/datas transitam — baixo risco | Qualquer cliente MCP remoto, inclusive conectores nativos | Free provável; US$ 5/mês se exceder |
  | Worker Cloudflare (anonimizador) | Nenhuma | **Texto bruto com dados pessoais transita por terceiro (Cloudflare) e pelo operador Nexpra** — Nexpra vira operador LGPD; contradiz "100% local" | Idem | Free insuficiente para NER/regex pesado em 10 ms de CPU; provável plano pago |
- As **calculadoras** (prazos, correção monetária) são o candidato natural a MCP remoto: determinísticas, sem dado pessoal, respostas pequenas — e teriam valor de marketing (aparecer em registries/diretórios de conectores). Atenção: correção monetária depende de séries (IPCA, SELIC etc.) — o Worker precisaria buscar no BCB/IBGE e cachear (KV), e calendários forenses por tribunal precisam de manutenção.
- O **anonimizador como MCP remoto é contraproducente**: quem chama (Claude/ChatGPT) já teria o texto bruto no contexto do modelo antes de chamar a tool — anonimizar depois não protege nada. O anonimizador só faz sentido **antes** do modelo, isto é, dentro do Nexpra (ou como ferramenta local/CLI). Se for exposto, que seja apenas pelo bridge local.
- Um Worker é, na prática, um backend: muda a declaração "sem backend" do produto, exige termos de uso/privacidade próprios, monitoramento e resposta a abuso (rate limit; OAuth se houver cota por usuário).
- Com a spec 2026-07-28 stateless, o desenho `createMcpHandler` sem Durable Object é o caminho alinhado; evitar `McpAgent`.

### Gaps
- Não verifiquei qual revisão da spec (2025-11-25 vs 2026-07-28) o `createMcpHandler` implementa hoje, nem opções de CORS do handler.
- `workers-mcp` (citado no briefing) não foi pesquisado; os docs atuais da Cloudflare apontam `createMcpHandler`.
- Não verifiquei requisitos atuais de submissão ao diretório de conectores da Anthropic nem ao catálogo de apps/conectores do ChatGPT.
- Custo de CPU real das calculadoras/anonimizador num Worker não foi medido; a afirmação sobre insuficiência do limite de 10 ms para anonimização é estimativa.
- Viabilidade de distribuir host de native messaging em máquinas corporativas/tribunais (políticas de TI) não pesquisada.
