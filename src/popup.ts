// UI mínima do banco de provas. Aceita imagem OU PDF. Para PDF, renderiza cada
// página AQUI no popup (que tem DOM/canvas de verdade) e manda só a imagem pronta
// para o OCR — o offscreen nunca renderiza PDF (BUG-21 do pAIdegua: pdf.js trava
// em offscreen). Mostra texto + backend + tempo.

import * as pdfjsLib from 'pdfjs-dist';

// Worker do pdf.js embarcado — nunca CDN (proibido MV3).
pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('assets/pdf.worker.min.mjs');

// Escala de renderização do PDF. Digitalização ruim precisa de resolução para o OCR
// acertar; 2× é um bom ponto de partida. Limitamos o lado maior para não estourar
// memória/GPU em páginas grandes.
const PDF_ESCALA = 2;
const PDF_LADO_MAX = 3000;

const fileInput = document.getElementById('file') as HTMLInputElement;
const runBtn = document.getElementById('run') as HTMLButtonElement;
const meta = document.getElementById('meta') as HTMLDivElement;
const out = document.getElementById('out') as HTMLTextAreaElement;

interface OcrResp {
  ok: boolean;
  text?: string;
  backend?: string;
  webgpu?: boolean;
  crossOriginIsolated?: boolean;
  adapter?: string;
  ms?: number;
  error?: string;
}

let selected: File | null = null;

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

function ehPdf(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

async function ocrDataUrl(dataUrl: string): Promise<OcrResp> {
  return chrome.runtime.sendMessage({ type: 'ocr:run', dataUrl });
}

function metaOk(res: OcrResp, sufixo = ''): string {
  return (
    `<span class="ok">OK</span> — backend: <b>${res.backend}</b>` +
    ` · webgpu: ${res.webgpu} · crossOriginIsolated: ${res.crossOriginIsolated}` +
    (res.adapter ? ` · gpu: ${res.adapter}` : '') +
    sufixo
  );
}

// Renderiza UMA página do PDF num canvas e devolve o dataURL JPEG.
async function paginaParaDataUrl(page: import('pdfjs-dist').PDFPageProxy): Promise<string> {
  const base = page.getViewport({ scale: 1 });
  const escala = Math.max(1, Math.min(PDF_ESCALA, PDF_LADO_MAX / Math.max(base.width, base.height)));
  const viewport = page.getViewport({ scale: escala });

  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Sem contexto 2d para renderizar o PDF.');

  await page.render({ canvasContext: ctx, viewport }).promise;
  return canvas.toDataURL('image/jpeg', 0.92);
}

async function rodarImagem(file: File): Promise<void> {
  meta.textContent = 'Processando (a 1ª execução carrega o modelo — pode levar alguns segundos)...';
  out.value = '';
  const dataUrl = await readAsDataUrl(file);
  const res = await ocrDataUrl(dataUrl);
  if (res?.ok) {
    meta.innerHTML = metaOk(res, ` · ${res.ms} ms`);
    out.value = res.text ?? '';
  } else {
    meta.innerHTML = `<span class="err">Falhou</span> — ${res?.error ?? 'erro desconhecido'} (${res?.ms ?? '?'} ms)`;
  }
}

async function rodarPdf(file: File): Promise<void> {
  out.value = '';
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const n = pdf.numPages;

  let textoTotal = '';
  let totalMs = 0;
  let ultimoOk: OcrResp | null = null;
  let falhas = 0;

  for (let i = 1; i <= n; i++) {
    meta.textContent = `Renderizando/OCR — página ${i}/${n}${i === 1 ? ' (1ª carrega o modelo)' : ''}...`;
    const page = await pdf.getPage(i);
    const dataUrl = await paginaParaDataUrl(page);
    page.cleanup();

    const res = await ocrDataUrl(dataUrl);
    if (res?.ok) {
      totalMs += res.ms ?? 0;
      ultimoOk = res;
      textoTotal += `\n===== Página ${i}/${n} (${res.ms} ms) =====\n${res.text ?? ''}\n`;
    } else {
      falhas++;
      textoTotal += `\n===== Página ${i}/${n} — FALHOU: ${res?.error ?? 'erro desconhecido'} =====\n`;
    }
    out.value = textoTotal.trim(); // progressivo: vai preenchendo página a página
  }

  await pdf.destroy();

  if (ultimoOk) {
    const resumo = ` · ${n} página(s)` + (falhas ? `, ${falhas} com falha` : '') + ` · total ${totalMs} ms`;
    meta.innerHTML = metaOk(ultimoOk, resumo);
  } else {
    meta.innerHTML = `<span class="err">Falhou</span> — nenhuma página processada (${n} tentada(s)).`;
  }
}

fileInput.addEventListener('change', () => {
  const file = fileInput.files?.[0] ?? null;
  selected = file;
  if (!file) {
    runBtn.disabled = true;
    return;
  }
  runBtn.disabled = false;
  const tipo = ehPdf(file) ? 'PDF' : 'imagem';
  meta.textContent = `Pronto: ${file.name} (${Math.round(file.size / 1024)} KB · ${tipo})`;
  out.value = '';
});

runBtn.addEventListener('click', async () => {
  if (!selected) return;
  runBtn.disabled = true;
  try {
    if (ehPdf(selected)) {
      await rodarPdf(selected);
    } else {
      await rodarImagem(selected);
    }
  } catch (err) {
    meta.innerHTML = `<span class="err">Erro</span> — ${String(err)}`;
  } finally {
    runBtn.disabled = false;
  }
});
