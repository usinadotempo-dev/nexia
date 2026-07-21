/**
 * Coleta "SSR" dos autos: baixa o HTML da página de autos digitais do PJe
 * (same-origin, cookies automáticos, sem abrir aba) e extrai partes,
 * movimentações e a lista de documentos com DOMParser.
 *
 * O parser é deliberadamente tolerante: o HTML varia entre tribunais e
 * versões do PJe. Campos não reconhecidos são contados para diagnóstico.
 */
import type { DocumentoProcesso, MovimentacaoProcesso, ParteProcesso, PoloParte } from '@shared/tipos';
import { urlAutosDigitais } from './rest';

export interface ResultadoAutos {
  numeroProcesso?: string;
  partes: ParteProcesso[];
  movimentacoes: MovimentacaoProcesso[];
  documentos: DocumentoProcesso[];
  avisos: string[];
}

const REGEX_NUMERO_CNJ = /\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/;
const REGEX_DATA = /\b(\d{2}\/\d{2}\/\d{4})(?:\s+(\d{2}:\d{2}))?\b/;

export async function coletarAutos(origem: string, idProcesso: string, ca: string | null): Promise<ResultadoAutos> {
  const resposta = await fetch(urlAutosDigitais(origem, idProcesso, ca), { credentials: 'include' });
  if (!resposta.ok) throw new Error(`Página de autos indisponível (HTTP ${resposta.status})`);
  const html = await resposta.text();
  return extrairDeHtml(html);
}

export function extrairDeHtml(html: string): ResultadoAutos {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const avisos: string[] = [];

  const numeroProcesso = doc.body.textContent?.match(REGEX_NUMERO_CNJ)?.[0];

  const partes = extrairPartes(doc, avisos);
  const documentos = extrairDocumentos(doc, avisos);
  const movimentacoes = extrairMovimentacoes(doc);

  if (partes.length === 0) avisos.push('nenhuma parte reconhecida');
  if (documentos.length === 0) avisos.push('nenhum documento reconhecido');

  return { numeroProcesso, partes, movimentacoes, documentos, avisos };
}

// ---------------------------------------------------------------------------
// Partes

const MAPA_POLOS: Array<{ chave: string; polo: PoloParte }> = [
  { chave: 'poloativo', polo: 'ativo' },
  { chave: 'polopassivo', polo: 'passivo' },
  { chave: 'outros', polo: 'outros' }
];

function extrairPartes(doc: Document, avisos: string[]): ParteProcesso[] {
  const partes: ParteProcesso[] = [];
  const vistos = new Set<string>();

  for (const { chave, polo } of MAPA_POLOS) {
    const contêineres = doc.querySelectorAll<HTMLElement>(`[id*="${chave}" i], [class*="${chave}" i]`);
    if (contêineres.length === 0) {
      if (polo !== 'outros') avisos.push(`polo ${polo} não localizado`);
      continue;
    }
    for (const contêiner of contêineres) {
      for (const linha of linhasDeTexto(contêiner)) {
        const parte = interpretarLinhaParte(linha, polo);
        if (parte && !vistos.has(parte.nome.toLowerCase())) {
          vistos.add(parte.nome.toLowerCase());
          partes.push(parte);
        }
      }
    }
  }
  return partes;
}

function linhasDeTexto(elemento: HTMLElement): string[] {
  const texto = elemento.innerText || elemento.textContent || '';
  return texto
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter((l) => l.length > 2);
}

/**
 * Interpreta linhas como:
 *  "FULANO DE TAL - CPF: 000.000.000-00 (AUTOR)"
 *  "EMPRESA X LTDA - CNPJ: 00.000.000/0001-00 (REU)"
 *  "BELTRANO - OAB CE12345 - CPF: ... (ADVOGADO)"
 */
function interpretarLinhaParte(linha: string, polo: PoloParte): ParteProcesso | null {
  const papelMatch = linha.match(/\(([^()]{2,40})\)\s*$/);
  const papel = papelMatch?.[1]?.trim().toUpperCase() ?? (polo === 'ativo' ? 'PARTE ATIVA' : polo === 'passivo' ? 'PARTE PASSIVA' : 'INTERESSADO');
  let corpo = papelMatch ? linha.slice(0, papelMatch.index).trim() : linha;

  const docMatch = corpo.match(/\b(CPF|CNPJ)\s*:?\s*([\d./-]{11,20})/i);
  const documento = docMatch?.[2];
  corpo = corpo.replace(/\s*-?\s*\b(CPF|CNPJ)\s*:?\s*[\d./-]{11,20}/gi, '').trim();
  corpo = corpo.replace(/\s*-?\s*\bOAB\s*[A-Z]{0,2}\s*[\d.]+/gi, '').trim();
  corpo = corpo.replace(/[-–—\s]+$/g, '').trim();

  // Nome plausível: pelo menos duas palavras com letras.
  if (!/^\p{L}[\p{L}'.\s-]{4,}$/u.test(corpo) || corpo.split(/\s+/).length < 2) return null;
  return { nome: corpo, papel, polo, documento };
}

// ---------------------------------------------------------------------------
// Documentos

function extrairDocumentos(doc: Document, avisos: string[]): DocumentoProcesso[] {
  const documentos = new Map<string, DocumentoProcesso>();

  for (const ancora of doc.querySelectorAll<HTMLAnchorElement>('a')) {
    const alvo = `${ancora.getAttribute('href') ?? ''} ${ancora.getAttribute('onclick') ?? ''}`;
    const idMatch =
      alvo.match(/documento\/download\/(\d{4,})/) ??
      alvo.match(/idProcessoDocumento=(\d{4,})/) ??
      alvo.match(/abreDocumento\((\d{4,})/) ??
      alvo.match(/openDocumento\((\d{4,})/);
    if (!idMatch || !idMatch[1]) continue;
    const id = idMatch[1];
    if (documentos.has(id)) continue;

    const rotulo = (ancora.textContent ?? '').replace(/\s+/g, ' ').trim();
    const contexto = (ancora.closest('tr, li, div')?.textContent ?? '').replace(/\s+/g, ' ');
    const data = contexto.match(REGEX_DATA)?.[0];

    documentos.set(id, {
      id,
      nome: rotulo || `Documento ${id}`,
      tipo: inferirTipoDocumento(rotulo || contexto),
      data
    });
  }

  if (documentos.size === 0) avisos.push('nenhum link de documento nos autos');
  return [...documentos.values()];
}

function inferirTipoDocumento(rotulo: string): string {
  const baixo = rotulo.toLowerCase();
  if (/(peti[cç][aã]o inicial|inicial)/.test(baixo)) return 'Petição inicial';
  if (/contesta/.test(baixo)) return 'Contestação';
  if (/senten/.test(baixo)) return 'Sentença';
  if (/decis/.test(baixo)) return 'Decisão';
  if (/despacho/.test(baixo)) return 'Despacho';
  if (/laudo|per[ií]cia/.test(baixo)) return 'Laudo/Perícia';
  if (/procura/.test(baixo)) return 'Procuração';
  if (/certid/.test(baixo)) return 'Certidão';
  return 'Documento';
}

// ---------------------------------------------------------------------------
// Movimentações

function extrairMovimentacoes(doc: Document): MovimentacaoProcesso[] {
  const movimentacoes: MovimentacaoProcesso[] = [];
  const vistos = new Set<string>();

  for (const linha of doc.querySelectorAll<HTMLElement>('tr, li')) {
    const texto = (linha.innerText || linha.textContent || '').replace(/\s+/g, ' ').trim();
    if (texto.length < 12 || texto.length > 500) continue;
    const dataMatch = texto.match(REGEX_DATA);
    if (!dataMatch || dataMatch.index === undefined || dataMatch.index > 40) continue;

    const descricao = texto.replace(dataMatch[0], '').replace(/^[\s\-–—:]+/, '').trim();
    if (descricao.length < 5) continue;
    const chave = `${dataMatch[0]}|${descricao.slice(0, 80)}`;
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    movimentacoes.push({ data: dataMatch[0], descricao });
    if (movimentacoes.length >= 300) break;
  }
  return movimentacoes;
}
