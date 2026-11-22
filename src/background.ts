// Service worker: só coordena. NUNCA roda a inferência aqui (o SW pode ser morto
// pelo Chrome no meio do processamento). Ele garante que o Offscreen Document
// exista e faz o relay das mensagens do popup para o offscreen.

const OFFSCREEN_PATH = 'src/offscreen.html';

let creating: Promise<void> | null = null;

async function ensureOffscreen(): Promise<void> {
  // Já existe?
  const contexts = await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT]
  });
  if (contexts.length > 0) return;

  // Evita corrida de duas criações simultâneas.
  if (creating) {
    await creating;
    return;
  }
  creating = chrome.offscreen.createDocument({
    url: OFFSCREEN_PATH,
    // WORKERS: a inferência ORT-web usa Web Workers (WASM multithread). O enum
    // NÃO tem 'BLOB_STORAGE' (é 'BLOBS'); usar a string literal evita pegar um
    // membro inexistente do enum (que vinha como undefined e quebrava a chamada).
    reasons: ['WORKERS' as chrome.offscreen.Reason],
    justification: 'Inferência de OCR local (ONNX Runtime Web) fora do service worker.'
  });
  await creating;
  creating = null;
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'ocr:run') {
    (async () => {
      try {
        await ensureOffscreen();
        // Repassa para o offscreen e devolve a resposta ao popup.
        const result = await chrome.runtime.sendMessage({
          type: 'ocr:run:offscreen',
          dataUrl: msg.dataUrl
        });
        sendResponse(result);
      } catch (err) {
        sendResponse({ ok: false, error: String(err) });
      }
    })();
    return true; // resposta assíncrona
  }
  return false;
});
