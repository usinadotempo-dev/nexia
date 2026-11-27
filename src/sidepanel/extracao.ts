/**
 * Extração local do conteúdo das fontes (nada sai da máquina):
 * PDF (texto nativo ou OCR local PP-OCR quando digitalizado), DOCX, imagens (OCR),
 * XML de NF-e (resumo estruturado), TXT/MD/CSV/JSON/HTML e a página da aba ativa.
 */
import { LIMITES } from '@shared/constantes';
import { enviar, type RespostaOcrPagina } from '@shared/mensagens';
import * as pdfjs from 'pdfjs-dist';
import { extrairTextoDocx } from '../options/modelos/leitor-docx';

pdfjs.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('libs/pdf.worker.min.mjs');

export interface ResultadoExtracao {
  texto: string;
  tipo: string;
  detalhe?: string;
}

export type AoProgresso = (texto: string) => void;

const TAMANHO_MAXIMO = 60 * 1024 * 1024;
const LARGURA_OCR = 1600;

export const TIPOS_ACEITOS = '.pdf,.docx,.txt,.md,.csv,.tsv,.json,.xml,.html,.htm,.png,.jpg,.jpeg,.webp,.bmp';

function extensao(nome: string): string {
  return nome.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? '';
}

function limitar(texto: string): string {
  const t = texto.replace(/[ \t]+\n/g, '\n').replace(/\n{4,}/g, '\n\n\n').trim();
  return t.length > LIMITES.EXTRACAO_CHARS ? `${t.slice(0, LIMITES.EXTRACAO_CHARS)}\n[… conteúdo truncado pelo Nexpra]` : t;
}

async function ocrImagem(dataUrl: string): Promise<string> {
  const r = await enviar<RespostaOcrPagina>('OCR_PAGINA', { imagem: dataUrl });
  if (r.falha) throw new Error(`OCR local: ${r.falha}`);
  return (r.texto ?? '').replace(/[ \t]+/g, ' ').trim();
}

async function imagemParaDataUrl(blob: Blob): Promise<string> {
  const bitmap = await createImageBitmap(blob);
  const escala = Math.min(1, LARGURA_OCR / bitmap.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * escala);
  canvas.height = Math.round(bitmap.height * escala);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponível.');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', 0.85);
}

async function extrairPdf(dados: ArrayBuffer, maxPaginasOcr: number, aoProgresso: AoProgresso): Promise<ResultadoExtracao> {
  const pdf = await pdfjs.getDocument({ data: dados, isEvalSupported: false }).promise;
  try {
    const paginas: string[] = [];
    for (let n = 1; n <= pdf.numPages; n++) {
      const pagina = await pdf.getPage(n);
      const conteudo = await pagina.getTextContent();
      let texto = '';
      let ultimoY: number | null = null;
      for (const item of conteudo.items) {
        if (!('str' in item)) continue;
        const y = item.transform[5] as number;
        if (ultimoY !== null && Math.abs(y - ultimoY) > 2) texto += '\n';
        else if (texto && !texto.endsWith(' ')) texto += ' ';
        texto += item.str;
        ultimoY = y;
      }
      paginas.push(texto.trim());
      if (n % 10 === 0) aoProgresso(`Lendo PDF: página ${n}/${pdf.numPages}…`);
    }
    const total = paginas.join('').length;
    const digitalizado = total < 60 * pdf.numPages;
    if (!digitalizado) {
      return { texto: limitar(paginas.map((p, i) => `[página ${i + 1}]\n${p}`).join('\n\n')), tipo: 'PDF', detalhe: `${pdf.numPages} página(s), texto nativo` };
    }

    // Digitalizado → OCR local página a página (imagem não sai da máquina).
    const limite = Math.min(pdf.numPages, maxPaginasOcr);
    const textos: string[] = [];
    for (let n = 1; n <= limite; n++) {
      aoProgresso(`OCR local: página ${n}/${limite}${n === 1 ? ' (a primeira demora mais)' : ''}…`);
      const pagina = await pdf.getPage(n);
      let viewport = pagina.getViewport({ scale: 2 });
      if (viewport.width > LARGURA_OCR) viewport = pagina.getViewport({ scale: (2 * LARGURA_OCR) / viewport.width });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas indisponível.');
      await pagina.render({ canvasContext: ctx, viewport }).promise;
      const texto = await ocrImagem(canvas.toDataURL('image/jpeg', 0.85));
      textos.push(`[página ${n}]\n${texto || paginas[n - 1] || '(sem texto reconhecido)'}`);
    }
    const parcial = limite < pdf.numPages ? ` — OCR em ${limite} de ${pdf.numPages} páginas (ajuste o limite nas opções)` : '';
    return { texto: limitar(textos.join('\n\n')), tipo: 'PDF digitalizado', detalhe: `${pdf.numPages} página(s), OCR local${parcial}` };
  } finally {
    await pdf.destroy();
  }
}

function htmlParaTexto(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script, style, noscript').forEach((e) => e.remove());
  return (doc.body?.innerText || doc.body?.textContent || '').replace(/\n{3,}/g, '\n\n');
}

/** Resumo estruturado de uma NF-e (XML nfeProc/NFe). */
export function resumirNfe(xml: string): string | null {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const inf = doc.getElementsByTagName('infNFe')[0];
  if (!inf) return null;
  const t = (pai: Element | Document | undefined, tag: string) => pai?.getElementsByTagName(tag)[0]?.textContent?.trim() ?? '';
  const emit = inf.getElementsByTagName('emit')[0];
  const dest = inf.getElementsByTagName('dest')[0];
  const ide = inf.getElementsByTagName('ide')[0];
  const total = inf.getElementsByTagName('ICMSTot')[0];
  const chave = (inf.getAttribute('Id') ?? '').replace(/^NFe/, '');
  const linhas: string[] = [
    'NOTA FISCAL ELETRÔNICA (resumo extraído do XML)',
    `Chave de acesso: ${chave}`,
    `Número/série: ${t(ide, 'nNF')}/${t(ide, 'serie')} — emissão ${t(ide, 'dhEmi') || t(ide, 'dEmi')} — natureza: ${t(ide, 'natOp')}`,
    `Emitente: ${t(emit, 'xNome')} — CNPJ/CPF ${t(emit, 'CNPJ') || t(emit, 'CPF')} — IE ${t(emit, 'IE')} — CRT ${t(emit, 'CRT')} — ${t(emit, 'xMun')}/${t(emit, 'UF')}`,
    `Destinatário: ${t(dest, 'xNome')} — CNPJ/CPF ${t(dest, 'CNPJ') || t(dest, 'CPF')} — ${t(dest, 'xMun')}/${t(dest, 'UF')}`,
    '',
    '| # | Descrição | NCM | CFOP | Qtd | Un | V. unit | V. total | CST/CSOSN |',
    '|---|---|---|---|---|---|---|---|---|'
  ];
  const itens = inf.getElementsByTagName('det');
  for (let i = 0; i < itens.length; i++) {
    const det = itens[i]!;
    const prod = det.getElementsByTagName('prod')[0];
    const imposto = det.getElementsByTagName('ICMS')[0];
    const cst = t(imposto, 'CST') || t(imposto, 'CSOSN');
    linhas.push(
      `| ${det.getAttribute('nItem') ?? i + 1} | ${t(prod, 'xProd')} | ${t(prod, 'NCM')} | ${t(prod, 'CFOP')} | ${t(prod, 'qCom')} | ${t(prod, 'uCom')} | ${t(prod, 'vUnCom')} | ${t(prod, 'vProd')} | ${cst} |`
    );
  }
  linhas.push(
    '',
    `Totais: produtos ${t(total, 'vProd')} — desconto ${t(total, 'vDesc')} — frete ${t(total, 'vFrete')} — BC ICMS ${t(total, 'vBC')} — ICMS ${t(total, 'vICMS')} — ICMS-ST ${t(total, 'vST')} — IPI ${t(total, 'vIPI')} — PIS ${t(total, 'vPIS')} — COFINS ${t(total, 'vCOFINS')} — TOTAL DA NOTA ${t(total, 'vNF')}`
  );
  const infAd = t(inf, 'infCpl');
  if (infAd) linhas.push(`Informações complementares: ${infAd}`);
  return linhas.join('\n');
}

export async function extrairArquivo(arquivo: File, opcoes: { maxPaginasOcr: number; aoProgresso: AoProgresso }): Promise<ResultadoExtracao> {
  if (arquivo.size > TAMANHO_MAXIMO) throw new Error('Arquivo maior que 60 MB.');
  const ext = extensao(arquivo.name);
  switch (ext) {
    case 'pdf':
      return extrairPdf(await arquivo.arrayBuffer(), opcoes.maxPaginasOcr, opcoes.aoProgresso);
    case 'docx':
      return { texto: limitar(await extrairTextoDocx(await arquivo.arrayBuffer())), tipo: 'Word' };
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'webp':
    case 'bmp': {
      opcoes.aoProgresso('OCR local da imagem…');
      const texto = await ocrImagem(await imagemParaDataUrl(arquivo));
      if (!texto) throw new Error('Nenhum texto reconhecido na imagem.');
      return { texto: limitar(texto), tipo: 'Imagem', detalhe: 'OCR local' };
    }
    case 'xml': {
      const bruto = await arquivo.text();
      const nfe = resumirNfe(bruto);
      if (nfe) return { texto: limitar(nfe), tipo: 'NF-e (XML)', detalhe: 'resumo estruturado' };
      return { texto: limitar(bruto), tipo: 'XML' };
    }
    case 'html':
    case 'htm':
      return { texto: limitar(htmlParaTexto(await arquivo.text())), tipo: 'HTML' };
    case 'csv':
    case 'tsv':
      return { texto: limitar(await arquivo.text()), tipo: 'Planilha (CSV)' };
    case 'json':
      return { texto: limitar(await arquivo.text()), tipo: 'JSON' };
    case 'txt':
    case 'md':
      return { texto: limitar(await arquivo.text()), tipo: 'Texto' };
    case 'xlsx':
    case 'xls':
      throw new Error('Planilhas Excel: salve como CSV e carregue o CSV.');
    case 'doc':
      throw new Error('Formato .doc antigo: salve como .docx ou PDF.');
    default:
      throw new Error(`Formato não suportado: .${ext || '?'}`);
  }
}

export const ORIGENS_LEITURA = ['https://*/*', 'http://*/*'];

/**
 * Aba ativa da janela deste painel. Sem permissão de acesso ao site, o Chrome não
 * revela a URL — `podeLer` indica se já é possível ler a página sem pedir nada.
 */
export async function abaAtiva(): Promise<{ id: number; url?: string; podeLer: boolean }> {
  const [aba] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!aba?.id) throw new Error('Não encontrei uma aba aberta nesta janela.');
  return { id: aba.id, url: aba.url, podeLer: Boolean(aba.url) };
}

/** Pede (uma única vez) a permissão opcional de leitura de páginas. Exige gesto do usuário. */
export function pedirPermissaoLeitura(): Promise<boolean> {
  return chrome.permissions.request({ origins: ORIGENS_LEITURA });
}

/** Lê o texto visível (ou a seleção) da aba ativa. Requer acesso ao site (ver abaAtiva). */
export async function lerAbaAtiva(): Promise<{ titulo: string; texto: string; url: string; selecao: boolean }> {
  const { id } = await abaAtiva();
  const url = (await chrome.tabs.get(id)).url;
  if (!url) throw new Error('Sem permissão para ler esta página. Use o botão direito → "Nexpra: levar esta página para o painel".');
  if (!/^https?:/.test(url)) throw new Error('Esta página não pode ser lida (página interna do navegador ou da loja de extensões).');
  if (/\.pdf($|\?)/i.test(url)) throw new Error('PDF aberto no navegador: baixe o arquivo e solte-o em "Fontes".');
  const aba = { id, url };
  const [r] = await chrome.scripting.executeScript({
    target: { tabId: aba.id },
    func: () => {
      const selecao = String(window.getSelection() ?? '').trim();
      return { texto: selecao || document.body?.innerText || '', selecao: Boolean(selecao), titulo: document.title };
    }
  });
  const res = r?.result as { texto: string; selecao: boolean; titulo: string } | undefined;
  if (!res?.texto.trim()) throw new Error('A página não tem texto legível.');
  return { titulo: res.titulo || 'Página', texto: limitar(res.texto), url: aba.url, selecao: res.selecao };
}
