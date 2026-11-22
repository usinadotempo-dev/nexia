/**
 * Extrai o conteúdo dos documentos do processo:
 * - fetch binário same-origin (cookies + cabeçalhos do snapshot);
 * - fallback via ponte MAIN world quando a resposta vem vazia (~10% dos casos);
 * - PDF nativo → texto via pdf.js; PDF digitalizado → páginas como imagem
 *   (JPEG) para leitura multimodal pela IA (sem OCR local);
 * - HTML → texto, com detecção de desafio anti-bot (F5/TSPD).
 */
import { LIMITES } from '@shared/constantes';
import { log } from '@shared/log';
import type { DocumentoProcesso, SnapshotAuth } from '@shared/tipos';
import * as pdfjs from 'pdfjs-dist';
import { baixarViaMain } from '../ponte-main';
import { montarCabecalhos, urlDownloadDocumento } from './rest';

pdfjs.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('libs/pdf.worker.min.mjs');

const CONCORRENCIA = 3;
const LARGURA_MAX_IMAGEM = 1200;
const ESCALA_RENDER = 1.5;

export interface OpcoesExtracao {
  origem: string;
  auth: SnapshotAuth | null;
  aoProgresso?: (feitos: number, total: number) => void;
}

/** Extrai o conteúdo dos documentos in-place, respeitando os limites de contexto. */
export async function extrairDocumentos(documentos: DocumentoProcesso[], opcoes: OpcoesExtracao): Promise<void> {
  // Prioridade: documentos-chave primeiro, depois os demais na ordem dos autos,
  // garantindo também os últimos (atos mais recentes).
  const fila = ordenarPorPrioridade(documentos);

  let totalChars = 0;
  let totalImagens = 0;
  let feitos = 0;

  const executar = async (doc: DocumentoProcesso): Promise<void> => {
    if (totalChars >= LIMITES.TOTAL_CHARS && totalImagens >= LIMITES.MAX_IMAGENS) {
      doc.statusExtracao = 'pendente';
      doc.motivoPendencia = 'fora do limite de contexto';
      return;
    }
    try {
      await extrairUm(doc, opcoes, LIMITES.MAX_IMAGENS - totalImagens);
      if (doc.texto) {
        if (totalChars + doc.texto.length > LIMITES.TOTAL_CHARS) {
          doc.texto = doc.texto.slice(0, Math.max(0, LIMITES.TOTAL_CHARS - totalChars));
          if (doc.texto.length === 0) doc.texto = undefined;
        }
        totalChars += doc.texto?.length ?? 0;
      }
      totalImagens += doc.paginasImagem?.length ?? 0;
    } catch (erro) {
      doc.erro = erro instanceof Error ? erro.message : String(erro);
      doc.statusExtracao = 'erro';
      doc.motivoPendencia = `falha no download/leitura: ${doc.erro}`;
      log.aviso('Falha ao extrair documento', doc.id, doc.erro);
    } finally {
      feitos++;
      opcoes.aoProgresso?.(feitos, fila.length);
    }
  };

  const operarios: Promise<void>[] = [];
  let indice = 0;
  for (let i = 0; i < CONCORRENCIA; i++) {
    operarios.push(
      (async () => {
        while (indice < fila.length) {
          const doc = fila[indice++];
          if (doc) await executar(doc);
        }
      })()
    );
  }
  await Promise.all(operarios);
}

function ordenarPorPrioridade(documentos: DocumentoProcesso[]): DocumentoProcesso[] {
  const pontuacao = (doc: DocumentoProcesso, posicao: number): number => {
    const tipo = doc.tipo.toLowerCase();
    let p = 0;
    if (tipo.includes('inicial')) p += 100;
    if (tipo.includes('contesta')) p += 90;
    if (tipo.includes('senten') || tipo.includes('decis')) p += 80;
    if (tipo.includes('laudo')) p += 70;
    // Os 5 últimos documentos dos autos são sempre relevantes (atos recentes).
    if (posicao >= documentos.length - 5) p += 60;
    return p;
  };
  return documentos
    .map((doc, posicao) => ({ doc, chave: pontuacao(doc, posicao), posicao }))
    .sort((a, b) => b.chave - a.chave || a.posicao - b.posicao)
    .map((x) => x.doc);
}

async function extrairUm(doc: DocumentoProcesso, opcoes: OpcoesExtracao, orcamentoImagens: number): Promise<void> {
  const url = urlDownloadDocumento(opcoes.origem, doc.id);
  let blob = await baixarComFallback(url, opcoes.auth, doc.id);

  if (ehPdf(blob) || (await sniffPdf(blob))) {
    await extrairPdf(doc, blob, orcamentoImagens);
    return;
  }

  const texto = await blob.text();
  if (ehDesafioAntiBot(texto)) {
    // Desafio F5/TSPD: re-tentar pelo page world, que carrega os cookies do desafio.
    blob = await baixarViaMain(url);
    if (ehPdf(blob) || (await sniffPdf(blob))) {
      await extrairPdf(doc, blob, orcamentoImagens);
      return;
    }
    doc.texto = limparHtml(await blob.text());
    doc.statusExtracao = doc.texto && doc.texto.length >= 10 ? 'texto-nativo' : 'pendente';
    return;
  }
  doc.texto = limparHtml(texto);
  if (!doc.texto || doc.texto.length < 10) {
    doc.texto = undefined;
    doc.statusExtracao = 'pendente';
    doc.motivoPendencia = 'conteúdo vazio ou não textual';
  } else {
    doc.statusExtracao = 'texto-nativo';
  }
}

function esperar(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Fetch same-origin (isolated world). Devolve o Blob só se vier com bytes. */
async function tentarFetchDireto(url: string, auth: SnapshotAuth | null): Promise<Blob | null> {
  try {
    const resposta = await fetch(url, { headers: montarCabecalhos(auth), credentials: 'include' });
    if (resposta.ok) {
      const blob = await resposta.blob();
      if (blob.size > 0) return blob;
    }
  } catch {
    /* segue para o próximo nível */
  }
  return null;
}

/** Fetch pelo world MAIN (page world). Devolve null em vez de lançar em 0 bytes/erro. */
async function tentarViaMain(url: string): Promise<Blob | null> {
  try {
    const blob = await baixarViaMain(url);
    return blob.size > 0 ? blob : null;
  } catch {
    return null;
  }
}

/**
 * Baixa um documento com três níveis de fallback (contrato do PJe Legacy):
 *   1. fetch direto same-origin (~90% dos docs);
 *   2. fetch pelo world MAIN (documentos que voltam 0 bytes no isolated world);
 *   3. ATIVAÇÃO na árvore + retry — alguns docs (2-3 por processo) só são
 *      servidos depois de "ativados": o clique no nó dispara o callback A4J que
 *      libera o binário. É o que faltava e causava "HTTP 200, 0 bytes".
 */
async function baixarComFallback(url: string, auth: SnapshotAuth | null, docId: string): Promise<Blob> {
  const direto = await tentarFetchDireto(url, auth);
  if (direto) return direto;

  const main = await tentarViaMain(url);
  if (main) return main;

  // Último recurso: ativar o documento no PJe e retentar (fetch direto → MAIN).
  const ativado = await ativarDocumentoNoPje(docId);
  if (ativado) {
    await esperar(2000); // aguarda o callback A4J concluir no servidor
    const retryDireto = await tentarFetchDireto(url, auth);
    if (retryDireto) return retryDireto;
    const retryMain = await tentarViaMain(url);
    if (retryMain) return retryMain;
  }

  throw new Error(
    `Download vazio após fetch direto, MAIN world e ativação no PJe${ativado ? '' : ' (nó não encontrado na árvore)'}`
  );
}

/**
 * Ativa um documento na árvore de autos do PJe: procura o nó cujo texto/onclick/href
 * contém o id do documento (inclusive dentro de iframes same-origin) e clica nele,
 * disparando o callback A4J que faz o servidor liberar o binário.
 */
async function ativarDocumentoNoPje(docId: string): Promise<boolean> {
  const acharEClicar = (root: Document): boolean => {
    const candidatos = root.querySelectorAll<HTMLElement>(
      'a, span[onclick], div[onclick], td[onclick], .rich-tree-node, .rf-trn'
    );
    for (const el of Array.from(candidatos)) {
      const texto = el.textContent ?? '';
      const onclick = el.getAttribute('onclick') ?? '';
      const href = el.getAttribute('href') ?? '';
      const temId =
        texto.includes(`${docId} -`) || texto.includes(`${docId} –`) ||
        onclick.includes(docId) || href.includes(docId);
      if (temId) {
        const rect = el.getBoundingClientRect();
        // Evita clicar em containers gigantes (a linha do nó tem altura modesta).
        if (rect.width > 0 && rect.height > 0 && rect.height < 200) {
          el.click();
          return true;
        }
      }
    }
    return false;
  };

  if (acharEClicar(document)) return true;
  const frames = document.querySelectorAll<HTMLIFrameElement>('iframe, frame');
  for (const frame of Array.from(frames)) {
    try {
      const childDoc = frame.contentDocument;
      if (childDoc?.body && acharEClicar(childDoc)) return true;
    } catch {
      /* iframe cross-origin: ignora */
    }
  }
  return false;
}

function ehPdf(blob: Blob): boolean {
  return blob.type.includes('pdf');
}

async function sniffPdf(blob: Blob): Promise<boolean> {
  if (blob.size < 5) return false;
  const inicio = new Uint8Array(await blob.slice(0, 5).arrayBuffer());
  return inicio[0] === 0x25 && inicio[1] === 0x50 && inicio[2] === 0x44 && inicio[3] === 0x46; // %PDF
}

async function extrairPdf(doc: DocumentoProcesso, blob: Blob, orcamentoImagens: number): Promise<void> {
  const dados = await blob.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: dados, isEvalSupported: false }).promise;
  try {
    let texto = '';
    for (let n = 1; n <= pdf.numPages; n++) {
      const pagina = await pdf.getPage(n);
      const conteudo = await pagina.getTextContent();
      texto += conteudo.items.map((item) => ('str' in item ? item.str : '')).join(' ') + '\n';
      if (texto.length > LIMITES.POR_DOCUMENTO_CHARS) break;
    }
    texto = texto.replace(/[ \t]+/g, ' ').trim();

    // Heurística de digitalizado: quase nenhum texto por página.
    const digitalizado = texto.length < 60 * pdf.numPages;
    if (!digitalizado) {
      doc.texto = texto.slice(0, LIMITES.POR_DOCUMENTO_CHARS);
      doc.statusExtracao = 'texto-nativo';
      return;
    }

    // Documento imagem-pura: renderiza páginas para OCR local (Fase A) ou
    // conclusão multimodal (Fase C). Fica PENDENTE até ser transcrito.
    const paginasParaRender = Math.min(pdf.numPages, orcamentoImagens);
    if (paginasParaRender <= 0) {
      doc.statusExtracao = 'pendente';
      doc.motivoPendencia = 'documento digitalizado sem orçamento de imagens restante';
      return;
    }
    const imagens: string[] = [];
    for (let n = 1; n <= paginasParaRender; n++) {
      imagens.push(await renderizarPagina(pdf, n));
    }
    doc.paginasImagem = imagens;
    if (texto.length > 0) doc.texto = texto;
    doc.statusExtracao = 'pendente';
    doc.motivoPendencia =
      paginasParaRender < pdf.numPages
        ? `documento digitalizado (${paginasParaRender} de ${pdf.numPages} páginas)`
        : 'documento digitalizado (imagem)';
  } finally {
    await pdf.destroy();
  }
}

async function renderizarPagina(pdf: pdfjs.PDFDocumentProxy, numero: number): Promise<string> {
  const pagina = await pdf.getPage(numero);
  let viewport = pagina.getViewport({ scale: ESCALA_RENDER });
  if (viewport.width > LARGURA_MAX_IMAGEM) {
    viewport = pagina.getViewport({ scale: (ESCALA_RENDER * LARGURA_MAX_IMAGEM) / viewport.width });
  }
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const contexto = canvas.getContext('2d');
  if (!contexto) throw new Error('canvas 2d indisponível');
  await pagina.render({ canvasContext: contexto, viewport }).promise;
  return canvas.toDataURL('image/jpeg', 0.8);
}

function ehDesafioAntiBot(texto: string): boolean {
  return /TSPD|Request unsuccessful|support ID/i.test(texto.slice(0, 4000));
}

function limparHtml(texto: string): string {
  if (!/[<][a-z!/]/i.test(texto)) return texto.trim().slice(0, LIMITES.POR_DOCUMENTO_CHARS);
  const doc = new DOMParser().parseFromString(texto, 'text/html');
  doc.querySelectorAll('script, style, noscript').forEach((e) => e.remove());
  return (doc.body.innerText || doc.body.textContent || '').replace(/\n{3,}/g, '\n\n').trim().slice(0, LIMITES.POR_DOCUMENTO_CHARS);
}
