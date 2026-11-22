// O MOTOR. Roda no Offscreen Document. Mantém o serviço PP-OCR "quente" (inicializa
// uma vez) e responde a cada pedido de OCR com { texto, backend, ms }.
//
// API confirmada contra ppu-paddle-ocr v2 (README /web), 22/07/2026:
//   - import do build de navegador: 'ppu-paddle-ocr/web' (NÃO 'ppu-paddle-ocr');
//   - opções de modelo aninhadas em `model: { detection, recognition,
//     charactersDictionary }`, cada uma aceitando string(URL) | ArrayBuffer;
//   - em MV3 não se pode baixar modelo de CDN (CSP) nem gravar em ~/.cache: por isso
//     carregamos os arquivos LOCAIS embarcados como ArrayBuffer via fetch(getURL);
//   - `recognize()` aceita OffscreenCanvas/HTMLCanvasElement (NÃO ImageBitmap) e
//     retorna um objeto com `.text`.
//   - backend: a lib escolhe WebGPU→WASM sozinha; forçamos 'wasm' via `session`
//     quando não há WebGPU, só para evitar tentativa desnecessária.

import * as ort from 'onnxruntime-web';
import { PaddleOcrService } from 'ppu-paddle-ocr/web';
import { detectCapability, type Capability } from './capability';

// Aponta o ORT para os .wasm embarcados na extensão — nunca CDN (proibido MV3).
// A lib compartilha esta mesma instância de onnxruntime-web (import deduplicado
// pelo bundler), então este ajuste vale para a inferência dela.
ort.env.wasm.wasmPaths = chrome.runtime.getURL('assets/');

// Nomes locais dos arquivos de modelo em dist/assets/models/ (ver README, passo 2).
// Baixe do repositório oficial de modelos e salve com EXATAMENTE estes nomes.
const MODELO = {
  deteccao: 'assets/models/det.onnx',
  reconhecimento: 'assets/models/rec.onnx',
  dicionario: 'assets/models/dict.txt'
} as const;

let service: PaddleOcrService | null = null;
let cap: Capability | null = null;

async function carregarBuffer(caminho: string): Promise<ArrayBuffer> {
  const res = await fetch(chrome.runtime.getURL(caminho));
  if (!res.ok) throw new Error(`Falha ao carregar ${caminho}: HTTP ${res.status}`);
  return res.arrayBuffer();
}

async function getService(): Promise<{ svc: PaddleOcrService; cap: Capability }> {
  if (service && cap) return { svc: service, cap };

  cap = await detectCapability();

  const [detection, recognition, charactersDictionary] = await Promise.all([
    carregarBuffer(MODELO.deteccao),
    carregarBuffer(MODELO.reconhecimento),
    carregarBuffer(MODELO.dicionario)
  ]);

  service = new PaddleOcrService({
    model: { detection, recognition, charactersDictionary },
    // engine 'canvas-native': faz o pré/pós-processamento com Canvas puro, sem
    // depender do OpenCV wasm (ppu-ocv). É a config que o OCR-buddy usa em MV3 —
    // evita ter que embarcar mais um .wasm em assets/.
    processing: { engine: 'canvas-native' },
    // Sem WebGPU → fixa WASM (evita probe de GPU). Com WebGPU, deixa a lib decidir.
    ...(cap.webgpu ? {} : { session: { executionProviders: ['wasm'] } })
  });

  await service.initialize();
  return { svc: service, cap };
}

async function dataUrlToCanvas(dataUrl: string): Promise<OffscreenCanvas> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const bitmap = await createImageBitmap(blob);
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Não foi possível obter contexto 2d do OffscreenCanvas.');
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  return canvas;
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== 'ocr:run:offscreen') return false;

  (async () => {
    const t0 = performance.now();
    try {
      const { svc, cap: c } = await getService();
      const canvas = await dataUrlToCanvas(msg.dataUrl);
      const result = await svc.recognize(canvas);
      const ms = Math.round(performance.now() - t0);
      sendResponse({
        ok: true,
        text: (result as { text?: string })?.text ?? String(result ?? ''),
        backend: c.preferred,
        webgpu: c.webgpu,
        crossOriginIsolated: c.crossOriginIsolated,
        adapter: c.adapter,
        ms
      });
    } catch (err) {
      sendResponse({ ok: false, error: String(err), ms: Math.round(performance.now() - t0) });
    }
  })();

  return true; // resposta assíncrona
});
