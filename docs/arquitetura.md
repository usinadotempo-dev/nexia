# Arquitetura do NexIA

Extensão Chrome MV3 em TypeScript estrito, empacotada com Vite + @crxjs. Sem servidor
próprio: tudo roda no navegador; a IA é chamada com a chave do usuário. Visão de produto e
decisões em [`visao-multiarea.md`](./visao-multiarea.md).

## Contextos de execução

| Contexto | Arquivos | Papel |
|---|---|---|
| Painel lateral (página da extensão) | `sidepanel.html`, `src/sidepanel/**` | Interface principal: fontes, assistente, proteção, consultas. Detém o estado da sessão (fontes, mapa de pseudônimos, conversa) **só em memória**. Extrai PDF/DOCX/imagens localmente. |
| Service worker | `src/background/**` | Detém as chaves; chama os LLMs (streaming e laço de ferramentas); executa as consultas a APIs públicas; guarda de saída; menus de contexto; relay de OCR; BM25 da biblioteca. |
| Offscreen | `src/offscreen/**` | Inferência de OCR PP-OCR (ONNX Runtime Web, WebGPU→WASM). |
| Content script PJe | `src/content/**` | Só em `*.jus.br`: relay de auth, coleta do processo sob demanda (porta `nexia-pje`), botão "NexIA". |
| Scripts MAIN world | `src/main/**` | Captura passiva de cabeçalhos de auth do PJe; fetch de fallback. |
| Opções | `options.html`, `src/options/**` | Provedor/chaves, área, privacidade e guarda, integrações, receitas próprias, biblioteca, conector PJe. |

Módulos puros (sem DOM/chrome, testáveis com `node --test`): `src/shared/anonimizador/`,
`src/shared/calculos/`, `src/shared/areas/`, `src/shared/ferramentas/definicoes.ts`,
`src/shared/docx.ts`, `src/shared/markdown.ts`. Eles importam uns aos outros com extensão
`.ts` (permitido por `allowImportingTsExtensions`) para rodar direto no Node 24.

## Fluxos

1. **Fonte → texto**: arquivo/página/PJe → texto local (pdf.js; OCR no offscreen para digitalizados; leitor DOCX próprio; resumo de NF-e).
2. **Proteção**: `SessaoAnonimizacao` detecta (regex + DV + dicionário + pessoas conhecidas do PJe), resolve sobreposições e troca por pseudônimos estáveis. O texto original fica no painel; a IA recebe só o protegido.
3. **Geração**: o painel monta `system` (persona da área + regras) + fontes protegidas + histórico e abre a porta `nexia-chat`. O SW aplica a **guarda de saída**; sem ferramentas, faz streaming; com ferramentas, roda o laço:
   - modelo pede `ferramenta(args)` → SW repassa ao painel → painel **desanonimiza os argumentos localmente** → pede ao SW `FERRAMENTA_EXECUTAR` → SW chama a API pública → painel **reanonimiza o retorno** → SW devolve ao modelo (até 6 rodadas).
4. **Exibição**: a resposta é desanonimizada só para a tela; "ver como a IA viu" mostra os pseudônimos.

## Generalização

- Nenhum tribunal, órgão ou instituição hardcoded; o conector PJe usa `location.origin`.
- Áreas, receitas, detectores e ferramentas são dados (`src/shared/areas/catalogo.ts`, `src/shared/ferramentas/definicoes.ts`): incluir uma área nova é acrescentar um objeto.

## Build e testes

- `npm run build` → `dist/` (carregar sem compactação em `chrome://extensions`).
- `npm run typecheck` → `tsc --noEmit`.
- `npm test` → `node --test tests/` (Node 24, sem dependências).
- `npm run icones` → regenera `public/icons/*.png` a partir do desenho em `scripts/gerar-icones.js`.
