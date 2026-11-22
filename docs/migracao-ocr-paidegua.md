# Comando: migrar o OCR do pAIdegua (Tesseract → PP-OCR / ONNX Runtime Web)

> **Como usar:** abra uma sessão do Claude Code com o working directory no repositório do
> **pAIdegua** (workspace Claude JF) e cole o bloco "PROMPT" abaixo. Ele carrega toda a
> decisão já validada no protótipo da NexIA, para a migração começar "quente".
>
> **Não misturar workspaces:** este arquivo é só o briefing. A implementação acontece no
> repositório do pAIdegua; nada da NexIA é copiado literalmente.

---

## PROMPT (colar na sessão do pAIdegua)

Migre o OCR offline do pAIdegua de **Tesseract.js** para **PP-OCR via ONNX Runtime Web**
(WebGPU→WASM), mantendo tudo **100% local** (a imagem nunca sai da máquina — regra CNJ/LGPD).
Isto já foi validado num protótipo irmão (NexIA): num documento digitalizado que o pAIdegua
hoje marca "LEITURA PENDENTE — sem texto reconhecível", o PP-OCR leu o documento inteiro;
velocidade ~0,8 s/página em WebGPU (steady-state).

Objetivo: **preservar a interface e o fluxo atuais**, trocando só o motor. No pAIdegua o
motor de OCR expõe algo como `transcrever(paginas) / destruir()` e roda dentro do content
script (Tesseract). A migração:

1. **Preservar a interface `MotorOcr`** (`transcrever(paginas: string[]) => Promise<string>`,
   `destruir()`). Quem orquestra (limites de página, status de extração, anonimização depois)
   **não muda**.
2. **Mover a inferência para um Offscreen Document.** Não rodar ORT no service worker (pode
   ser morto) nem no content script (CSP da página do PJe). Padrão:
   - content script tem as imagens de página → manda o **dataURL** de cada página para o
     background;
   - background garante o offscreen (`chrome.offscreen.createDocument`, `reasons: ['WORKERS']`
     — o enum **não** tem `BLOB_STORAGE`) e faz o relay;
   - offscreen hospeda o PP-OCR, recebe imagem → devolve `{ text, backend, ms }`.
   - PDF: renderizar página→imagem **no content script/página**, nunca no offscreen
     (BUG-21: `pdf.js page.render` trava em offscreen); Blob vira `{}` ao cruzar
     `sendMessage`, então mandar **dataURL JPEG**.

3. **Dependências:** `ppu-paddle-ocr@^5.8.3` (⚠️ **obrigatório 5.x** — a 2.x é Node-only,
   importa `onnxruntime-node`+`fs`, sem subpath `/web`) e `onnxruntime-web@^1.20.1`.
   No offscreen: `import { PaddleOcrService } from 'ppu-paddle-ocr/web'`.

4. **Modelos PP-OCR (embarcados, nunca CDN — CSP MV3):** tier tiny (~6 MB) do repo
   `PT-Perkasa-Pilar-Utama/ppu-paddle-ocr-models`. Os `.onnx` estão em **Git LFS** —
   baixar por `https://media.githubusercontent.com/media/.../main/detection/PP-OCRv6_tiny_det.onnx`
   (o `raw.githubusercontent.com` entrega só o ponteiro LFS). Passar como **ArrayBuffer**
   carregado via `fetch(chrome.runtime.getURL('assets/models/...'))`:
   `new PaddleOcrService({ model: { detection, recognition, charactersDictionary },
   processing: { engine: 'canvas-native' } })` → `await service.initialize()` →
   `await service.recognize(offscreenCanvas)` → `result.text`. Inicializar uma vez
   (serviço "quente"); a 1ª página paga o warm-up.

5. **ONNX Runtime Web no build:** copiar para `assets/` **os `.wasm` E os loaders `.mjs`**
   (`ort-wasm*.{wasm,mjs}`) — só o `.wasm` dá "no available backend found". Setar
   `ort.env.wasm.wasmPaths = chrome.runtime.getURL('assets/')` antes do `initialize()`.
   Backend: a lib escolhe WebGPU→WASM sozinha; opcional forçar `session:
   { executionProviders: ['wasm'] }` quando não houver `navigator.gpu`.

6. **Manifest / CSP:** adicionar permissão `"offscreen"`; CSP de extension_pages
   `script-src 'self' 'wasm-unsafe-eval'; worker-src 'self'; object-src 'self'`; incluir o
   offscreen.html no build e os assets (models + ort wasm/mjs) no output.

7. **`processing.engine: 'canvas-native'`** para não depender do OpenCV wasm (ppu-ocv).

8. **Limpeza:** remover Tesseract.js e os artefatos `libs/tesseract/*` do build depois que a
   migração passar no teste real.

**Determinismo:** PP-OCR (detecção DB + reconhecimento CTC) é determinístico — sem risco de
alucinação, aceitável para documento jurídico. Não usar modelo generativo (Florence-2/TrOCR)
para o texto.

**Validação (é aqui que a decisão se prova):** rodar o mesmo lote de digitalizações ruins
(carimbos, assinaturas, baixa resolução) que hoje cai em "pendente" no Tesseract e confirmar
o ganho de leitura + tempo. Reportar backend (webgpu/wasm) e ms por página.

**Referência de arquitetura (só leitura, não copiar código):** o protótipo NexIA em
`Claude Usina/NexIA` (`src/offscreen.ts`, `src/background.ts`, `src/capability.ts`,
`src/popup.ts`, `vite.config.ts`) já implementa todo esse fluxo e está funcionando.
