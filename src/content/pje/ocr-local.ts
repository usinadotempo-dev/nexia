/**
 * OCR local — PP-OCR (detecção DB + reconhecimento CTC) via ONNX Runtime Web,
 * WebGPU→WASM, executado no Offscreen Document da extensão.
 *
 * Substitui o Tesseract.js: num lote real de digitalizações ruins, o PP-OCR leu
 * documentos que o Tesseract marcava como "sem texto reconhecível" (ver HANDOFF do
 * protótipo). É determinístico (sem alucinação) e compatível com a regra CNJ/LGPD:
 * a imagem nunca sai da máquina — o texto é reconhecido localmente e só depois
 * anonimizado. Nada da imagem é logado.
 *
 * A inferência NÃO roda aqui (content script, sujeito à CSP da página do PJe) nem
 * no service worker (pode ser morto): este motor apenas manda cada página (dataURL)
 * ao background, que garante o offscreen e faz o relay. Ver `background/index.ts`
 * (canal OCR_PAGINA) e `offscreen/offscreen.ts` (motor PP-OCR).
 */
import { enviar } from '@shared/mensagens';
import type { RespostaOcrPagina } from '@shared/mensagens';

export interface MotorOcr {
  transcrever(paginas: string[], aoPagina?: (feita: number, total: number) => void): Promise<string>;
  destruir(): Promise<void>;
}

export async function criarMotorOcr(): Promise<MotorOcr> {
  // Não há worker para inicializar aqui: o serviço PP-OCR vive no offscreen e é
  // criado sob demanda pelo background (ficando "quente" entre páginas). A 1ª
  // página paga o custo de carregar os modelos; as seguintes são rápidas.
  return {
    async transcrever(paginas, aoPagina) {
      const partes: string[] = [];
      for (let i = 0; i < paginas.length; i++) {
        const resp = await enviar<RespostaOcrPagina>('OCR_PAGINA', { imagem: paginas[i]! });
        const texto = (resp?.texto ?? '').replace(/[ \t]+/g, ' ').trim();
        if (texto) partes.push(texto);
        aoPagina?.(i + 1, paginas.length);
      }
      return partes.join('\n\n');
    },
    async destruir() {
      // O offscreen é reaproveitado entre extrações; não o fechamos aqui para não
      // pagar o warm-up de novo a cada documento. O Chrome o recolhe com o SW.
    }
  };
}
