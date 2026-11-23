// Motor de OCR do app Nexpra. Roda no Offscreen Document. Mantém o serviço PP-OCR
// "quente" (inicializa uma vez) e responde a cada pedido do background com o texto.
//
// API: ppu-paddle-ocr v5 (build /web). Modelos embarcados carregados como ArrayBuffer
// via chrome.runtime.getURL — nunca CDN (CSP MV3). recognize() recebe OffscreenCanvas
// e retorna { text }. engine 'canvas-native' evita depender do OpenCV wasm.

import * as ort from 'onnxruntime-web';
import { PaddleOcrService } from 'ppu-paddle-ocr/web';
import { detectCapability, type Capability } from './capability';

ort.env.wasm.wasmPaths = chrome.runtime.getURL('assets/');

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
    processing: { engine: 'canvas-native' },
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
        ms
      });
    } catch (err) {
      sendResponse({ ok: false, error: String(err), ms: Math.round(performance.now() - t0) });
    }
  })();

  return true; // resposta assíncrona
});
