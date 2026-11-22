# NexIA — Protótipo de OCR 100% local (PaddleOCR / ONNX Runtime Web + WebGPU)

> **Este arquivo é o briefing para a próxima sessão.** Ele foi escrito numa sessão
> enraizada em outro workspace (Claude JF / pAIdegua) e carrega toda a decisão de
> arquitetura já pesquisada, para que a sessão da NexIA comece "quente".
> **Abra a nova sessão do Claude Code com o working directory nesta pasta (`NexIA`).**

## Estado atual (23/07/2026) — PROTÓTIPO VALIDADO ✅

O protótipo foi construído, corrigido e **rodou na máquina-alvo real**. Veredito:
**vale migrar do Tesseract para PP-OCR via ONNX Runtime Web.**

- **Risco #1 (WebGPU):** ✅ `navigator.gpu` existe — inferência rodou em `backend: webgpu`.
- **Risco #2 (cross-origin isolation):** `crossOriginIsolated: false`. **Irrelevante** no caso:
  como o WebGPU pegou, o WASM multithread nem entra em jogo.
- **Risco #3 (acurácia vs Tesseract):** ✅ decidido por caso real. Um documento digitalizado
  (procuração + contrato + declarações, 4 páginas) que o **pAIdegua marcou "LEITURA
  PENDENTE — sem texto reconhecível"** foi lido **integralmente e com boa qualidade** pelo
  protótipo (texto impresso correto; só assinatura/manuscrito falha, como esperado).
  O ganho não é marginal: é *nenhum texto* → *documento inteiro*.
- **Velocidade:** ~0,8 s por página em WebGPU (steady-state). A 1ª página paga ~3–4 s de
  warm-up (carregar det+rec+dict e esquentar a GPU); o serviço fica quente depois.
- **PDF:** suportado — renderiza cada página no **popup** (não no offscreen: BUG-21) e roda
  o OCR em lote, texto concatenado por página.

### Correções aplicadas vs. o plano original abaixo (o plano tinha imprecisões)

- **`ppu-paddle-ocr` tem que ser `^5.8.3`** (linha com build `/web`). A `^2.x` é **Node-only**
  (importa `onnxruntime-node` + `fs`), sem subpath `/web` — não compila para navegador.
- Import correto: `import { PaddleOcrService } from 'ppu-paddle-ocr/web'`.
- Opções: `model: { detection, recognition, charactersDictionary }` (ArrayBuffers locais via
  `chrome.runtime.getURL`), `processing: { engine: 'canvas-native' }`, `recognize(canvas)` → `.text`.
- Modelos PP-OCRv6 tiny vêm do repo `ppu-paddle-ocr-models` via **Git LFS** — baixar por
  `media.githubusercontent.com/media/...` (o `raw.githubusercontent.com` entrega só o ponteiro).
- Copiar para `assets/` **os `.wasm` E os loaders `.mjs`** do onnxruntime-web
  (`ort-wasm*.{wasm,mjs}`); só o `.wasm` → "no available backend found".
- Offscreen: motivo válido é `'WORKERS'` (o enum **não** tem `BLOB_STORAGE`).

## Objetivo do protótipo

Medir, num ambiente MV3 real, se **PaddleOCR (família PP-OCR, determinística) rodando
via ONNX Runtime Web** entrega ganho de **qualidade** e **velocidade** sobre o
**Tesseract.js** que o pAIdegua usa hoje — **sem enviar nenhum dado a LLM/servidor**.

Não é um produto. É um banco de provas: recebe uma imagem (ou página de PDF
renderizada), roda OCR local, e devolve **texto + backend usado (webgpu/wasm) + tempo**.

## Decisão de arquitetura (já pesquisada — não re-litigar)

- **Motor:** PP-OCRv5/v6 (detecção + reconhecimento CTC). **Determinístico.**
  - ❌ **Não usar** Florence-2 / TrOCR nem qualquer modelo **generativo** para o texto:
    risco de *alucinação* — inaceitável para documento jurídico.
- **Runtime:** `onnxruntime-web`, encapsulado pelo SDK **`ppu-paddle-ocr`** (MIT, TS,
  bundler-friendly, PT suportado, modelo tiny ~6 MB / small ~30 MB).
  - Alternativa de referência de arquitetura: extensão **OCR-buddy** (PP-OCRv5,
    offscreen doc *cross-origin isolated*).
- **Backend:** **WebGPU primário → WASM fallback** (o SDK faz o fallback sozinho).
- **Onde roda a inferência:** **Offscreen Document** (não no service worker).
  - No pAIdegua descobriu-se (BUG-21) que `pdf.js page.render` **trava** em offscreen.
    Então o padrão é: **render PDF→imagem no content script**, e mandar só a **imagem**
    (data URL JPEG — Blob vira `{}` ao cruzar `chrome.runtime.sendMessage`) para o
    offscreen fazer a inferência ONNX. Neste protótipo o input já é imagem, então
    o offscreen basta.
- **Tudo embarcado localmente:** `.wasm` do ORT e `.onnx/.ort` do modelo vão para
  `dist/`, servidos por `chrome.runtime.getURL(...)`. **Nada de CDN** (proibido em MV3).
  - `ort.env.wasm.wasmPaths = chrome.runtime.getURL('assets/')` e o caminho do modelo
    apontando para `assets/`. **NÃO** é `chrome.storage` — é caminho de arquivo.

## Os 3 riscos a validar (é aqui que mora a decisão real)

1. **`navigator.gpu` existe nas máquinas-alvo?** Define se você ganha 2–5× (WebGPU) ou
   fica só no WASM. O protótipo **reporta o backend** ativo — teste no hardware real.
2. **Dá para deixar o Offscreen Document *cross-origin isolated* (COOP/COEP)?** Só o
   **WASM multithread** precisa disso (via `SharedArrayBuffer`). WebGPU e WASM
   single-thread **não** precisam. Sem isolation → WASM single-thread (mais lento, mas
   funciona). Medir os dois cenários.
3. **Acurácia PP-OCR vs Tesseract** num lote real de digitalizações **ruins**
   (carimbos, assinaturas, baixa resolução). O ganho de qualidade é o que justifica
   trocar. Guarde as imagens de teste em `samples/`.

## Estado do scaffold (o que já está aqui)

```
NexIA/
├─ HANDOFF.md            ← este arquivo
├─ README.md             ← como rodar
├─ package.json          ← deps: vite, ppu-paddle-ocr, typescript, @types/chrome
├─ tsconfig.json
├─ vite.config.ts        ← build MV3 multi-entry + copia wasm/modelos p/ dist/assets
├─ manifest.json         ← MV3: offscreen, CSP wasm, web_accessible_resources
├─ src/
│  ├─ capability.ts      ← detecção WebGPU + cross-origin isolation
│  ├─ background.ts      ← service worker: cria offscreen e faz o relay
│  ├─ offscreen.html
│  ├─ offscreen.ts       ← hospeda ppu-paddle-ocr; recebe imagem → texto + backend + ms
│  ├─ popup.html
│  └─ popup.ts           ← UI: escolhe imagem, roda OCR, mostra texto/backend/tempo
└─ samples/              ← (criar) coloque aqui digitalizações reais para teste
```

## Primeiros passos na nova sessão (checklist)

1. `& "C:\Portatil\node-v24.16.0-win-x64\npm.cmd" install`
   (confirme a pasta real do Node via Glob antes — o CLAUDE.md do JF aponta versão
   desatualizada; a memória diz `node-v24.16.0-win-x64`.)
2. **Baixar os arquivos de modelo** do PP-OCR (det + rec + dict) e os `.wasm` do
   `onnxruntime-web` para `public/assets/` (ou deixar o `vite-plugin-static-copy`
   copiá-los de `node_modules`). Ver README.
3. `npm run build` → carregar `dist/` como extensão sem compactação no Chrome
   (`chrome://extensions` → modo desenvolvedor → "Carregar sem compactação").
4. Abrir o popup, escolher uma imagem de `samples/`, rodar. Anotar backend + ms.
5. **Verificar contra a versão instalada** do `ppu-paddle-ocr`: nomes exatos de
   import (`ppu-paddle-ocr` vs `ppu-paddle-ocr/web`), API (`PaddleOcrService`,
   `initialize`, `recognize`, `destroy`) e como passar os **caminhos dos modelos**.
   O `offscreen.ts` está escrito no padrão documentado, mas **confirme a API real**.

## Fontes (pesquisa de 2026)

- OCR-buddy (extensão MV3, PP-OCRv5/ONNX): https://github.com/Fanfulla/OCR-buddy
- ppu-paddle-ocr (SDK, MIT): https://github.com/PT-Perkasa-Pilar-Utama/ppu-paddle-ocr
- ORT Web em MV3 (init WASM): https://github.com/microsoft/onnxruntime/discussions/23063
- WebGPU EP (ORT): https://onnxruntime.ai/docs/tutorials/web/ep-webgpu.html
- chrome.offscreen: https://developer.chrome.com/docs/extensions/reference/api/offscreen
- PaddleOCR vs Tesseract: https://ironsoftware.com/csharp/ocr/blog/compare-to-other-components/paddle-ocr-vs-tesseract/
