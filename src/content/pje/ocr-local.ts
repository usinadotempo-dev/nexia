/**
 * OCR local com Tesseract (WASM), executado dentro do navegador.
 *
 * É o único caminho de leitura de documentos digitalizados compatível com a
 * regra do CNJ: a imagem nunca sai da máquina — o texto é reconhecido aqui e
 * só depois é anonimizado. Todos os artefatos (worker, core WASM, idioma
 * português) são carregados de dentro da extensão (offline).
 *
 * Requer que `assets/tesseract/lang/por.traineddata` exista no build (ver README)
 * e `wasm-unsafe-eval` na CSP de extension_pages.
 */
import { createWorker } from 'tesseract.js';

export interface MotorOcr {
  transcrever(paginas: string[], aoPagina?: (feita: number, total: number) => void): Promise<string>;
  destruir(): Promise<void>;
}

export async function criarMotorOcr(): Promise<MotorOcr> {
  const worker = await createWorker('por', 1, {
    workerPath: chrome.runtime.getURL('libs/tesseract/worker.min.js'),
    corePath: chrome.runtime.getURL('libs/tesseract'),
    langPath: chrome.runtime.getURL('libs/tesseract/lang'),
    gzip: false,
    workerBlobURL: false
  });

  return {
    async transcrever(paginas, aoPagina) {
      const partes: string[] = [];
      for (let i = 0; i < paginas.length; i++) {
        const { data } = await worker.recognize(paginas[i]!);
        const texto = data.text.replace(/[ \t]+/g, ' ').trim();
        if (texto) partes.push(texto);
        aoPagina?.(i + 1, paginas.length);
      }
      return partes.join('\n\n');
    },
    async destruir() {
      await worker.terminate();
    }
  };
}
