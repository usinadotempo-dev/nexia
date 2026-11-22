/**
 * Catálogo de detectores de dados pessoais/sensíveis — 100% local e determinístico.
 * Cada detector devolve "spans" (trechos) do texto; o motor resolve sobreposições e
 * troca cada trecho por um pseudônimo estável ([CPF_1], [PESSOA_2]...).
 *
 * Princípios:
 * - formato pontuado (ex.: 123.456.789-09) já é sinal forte → mascara sempre;
 * - número "solto" só é mascarado se o dígito verificador fechar (menos falso positivo);
 * - identificadores sem DV (RG, CNH, prontuário...) exigem âncora textual ("RG nº").
 */
import {
  chaveNfeValida,
  cnpjValido,
  cnsValido,
  cpfValido,
  luhnValido,
  processoCnjValido,
  soDigitos
} from './validadores.ts';
import { EXPRESSOES_NAO_PESSOA, normalizarToken, PALAVRAS_NAO_NOME, PARTICULAS, PRENOMES } from './nomes-br.ts';

export type TipoEntidade =
  | 'PESSOA'
  | 'CPF'
  | 'CNPJ'
  | 'RG'
  | 'CNH'
  | 'PIS'
  | 'CNS'
  | 'TITULO_ELEITOR'
  | 'PASSAPORTE'
  | 'CEP'
  | 'ENDERECO'
  | 'TELEFONE'
  | 'EMAIL'
  | 'OAB'
  | 'REGISTRO_PROFISSIONAL'
  | 'PROCESSO'
  | 'CHAVE_NFE'
  | 'PLACA'
  | 'RENAVAM'
  | 'CARTAO'
  | 'CONTA_BANCARIA'
  | 'PIX'
  | 'DATA_NASCIMENTO'
  | 'PRONTUARIO'
  | 'IP'
  | 'PERSONALIZADO';

export interface InfoTipo {
  rotulo: string;
  prefixo: string;
  descricao: string;
}

export const TIPOS_ENTIDADE: Record<TipoEntidade, InfoTipo> = {
  PESSOA: { rotulo: 'Nomes de pessoas', prefixo: 'PESSOA', descricao: 'Prenome do dicionário + sobrenome, ou nome após "Sr.", "paciente", "cliente"…' },
  CPF: { rotulo: 'CPF', prefixo: 'CPF', descricao: 'Formatado ou com dígito verificador válido' },
  CNPJ: { rotulo: 'CNPJ', prefixo: 'CNPJ', descricao: 'Numérico ou alfanumérico (2026), com DV' },
  RG: { rotulo: 'RG', prefixo: 'RG', descricao: 'Após "RG"/"identidade" ou no formato 00.000.000-0' },
  CNH: { rotulo: 'CNH', prefixo: 'CNH', descricao: 'Após "CNH"/"habilitação"' },
  PIS: { rotulo: 'PIS/PASEP/NIT', prefixo: 'PIS', descricao: 'Formatado ou após "PIS"/"NIT"' },
  CNS: { rotulo: 'Cartão SUS (CNS)', prefixo: 'CNS', descricao: '15 dígitos com DV válido' },
  TITULO_ELEITOR: { rotulo: 'Título de eleitor', prefixo: 'TITULO', descricao: 'Após "título de eleitor"' },
  PASSAPORTE: { rotulo: 'Passaporte', prefixo: 'PASSAPORTE', descricao: 'Após "passaporte"' },
  CEP: { rotulo: 'CEP', prefixo: 'CEP', descricao: '00000-000 ou após "CEP"' },
  ENDERECO: { rotulo: 'Endereço', prefixo: 'ENDERECO', descricao: 'Logradouro seguido de número' },
  TELEFONE: { rotulo: 'Telefone', prefixo: 'TELEFONE', descricao: 'Fixo/celular, com DDD ou âncora' },
  EMAIL: { rotulo: 'E-mail', prefixo: 'EMAIL', descricao: 'Endereços de e-mail' },
  OAB: { rotulo: 'OAB', prefixo: 'OAB', descricao: 'Inscrição na OAB' },
  REGISTRO_PROFISSIONAL: { rotulo: 'Registro profissional', prefixo: 'REGISTRO', descricao: 'CRM, CRO, CRP, COREN, CREA, CAU, CRC, RQE, ART…' },
  PROCESSO: { rotulo: 'Nº de processo', prefixo: 'PROCESSO', descricao: 'Numeração única CNJ (DV módulo 97)' },
  CHAVE_NFE: { rotulo: 'Chave de NF-e', prefixo: 'CHAVE_NFE', descricao: '44 dígitos com DV' },
  PLACA: { rotulo: 'Placa de veículo', prefixo: 'PLACA', descricao: 'Padrão antigo e Mercosul' },
  RENAVAM: { rotulo: 'RENAVAM', prefixo: 'RENAVAM', descricao: 'Após "RENAVAM"' },
  CARTAO: { rotulo: 'Cartão de pagamento', prefixo: 'CARTAO', descricao: '16 dígitos com Luhn válido' },
  CONTA_BANCARIA: { rotulo: 'Dados bancários', prefixo: 'CONTA', descricao: 'Agência/conta após âncora' },
  PIX: { rotulo: 'Chave PIX aleatória', prefixo: 'PIX', descricao: 'UUID após "PIX"' },
  DATA_NASCIMENTO: { rotulo: 'Data de nascimento', prefixo: 'NASCIMENTO', descricao: 'Após "nascido em", "DN"…' },
  PRONTUARIO: { rotulo: 'Prontuário/atendimento', prefixo: 'PRONTUARIO', descricao: 'Após "prontuário", "atendimento nº"' },
  IP: { rotulo: 'Endereço IP', prefixo: 'IP', descricao: 'IPv4' },
  PERSONALIZADO: { rotulo: 'Termos personalizados', prefixo: 'SIGILOSO', descricao: 'Sua lista "sempre mascarar"' }
};

export const TODOS_OS_TIPOS = Object.keys(TIPOS_ENTIDADE) as TipoEntidade[];

export interface Span {
  inicio: number;
  fim: number;
  tipo: TipoEntidade;
  valor: string;
  prioridade: number;
  /** Rótulo fixo (ex.: "PARTE AUTORA") para pessoas conhecidas. */
  rotulo?: string;
}

interface Detector {
  tipo: TipoEntidade;
  regex: RegExp;
  prioridade: number;
  validar?: (valor: string) => boolean;
}

const NUM = String.raw`(?:n[º°o.]*\s*)?:?\s*`;

/** Gera "[Pp]alavra|PALAVRA" para casar palavra com inicial maiúscula/minúscula ou toda em caixa alta. */
function ambasCaixas(palavras: string[]): string {
  return palavras
    .map((p) => `[${p[0]!.toUpperCase()}${p[0]!.toLowerCase()}]${p.slice(1)}|${p.toUpperCase()}`)
    .join('|');
}

function telefonePlausivel(v: string): boolean {
  const d = soDigitos(v);
  if (d.startsWith('55') && d.length >= 12) return true;
  if (d.length >= 10 && d.length <= 11) return true;
  if (d.length === 9) return d[0] === '9';
  if (d.length === 8) {
    const a = Number(d.slice(0, 4));
    const b = Number(d.slice(4));
    if (a >= 1900 && a <= 2100 && b >= 1900 && b <= 2100) return false; // "2020-2024"
    return v.includes('-');
  }
  return false;
}

const LOGRADOUROS = `(?:${ambasCaixas(['rua', 'avenida', 'travessa', 'alameda', 'rodovia', 'estrada', 'praça', 'praca', 'largo', 'quadra', 'loteamento', 'sítio', 'sitio', 'fazenda', 'vila'])}|R\\.|Av\\.?|AV\\.?|Tv\\.|Al\\.|Qd\\.?|Conj\\.)`;

const DETECTORES: Detector[] = [
  // --- identificadores com DV ---
  { tipo: 'PROCESSO', prioridade: 90, regex: /(?<!\d)\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}(?!\d)/g },
  { tipo: 'PROCESSO', prioridade: 90, regex: /(?<!\d)\d{20}(?!\d)/g, validar: processoCnjValido },
  { tipo: 'CHAVE_NFE', prioridade: 88, regex: /(?<!\d)(?:\d{4}[ .]?){10}\d{4}(?!\d)/g, validar: chaveNfeValida },
  { tipo: 'CNS', prioridade: 85, regex: /(?<!\d)[12789]\d{2}[ .]?\d{4}[ .]?\d{4}[ .]?\d{4}(?!\d)/g, validar: cnsValido },
  {
    tipo: 'CNPJ',
    prioridade: 80,
    regex: /(?<![\w.])[0-9A-Z]{2}\.[0-9A-Z]{3}\.[0-9A-Z]{3}\/[0-9A-Z]{4}-\d{2}(?!\d)/g,
    validar: (v) => /^[\d./-]+$/.test(v) || cnpjValido(v)
  },
  { tipo: 'CNPJ', prioridade: 80, regex: /(?<!\d)\d{14}(?!\d)/g, validar: cnpjValido },
  { tipo: 'CPF', prioridade: 80, regex: /(?<![\d.])\d{3}\.\d{3}\.\d{3}-\d{2}(?!\d)/g },
  { tipo: 'CPF', prioridade: 80, regex: /(?<!\d)\d{11}(?!\d)/g, validar: cpfValido },
  { tipo: 'CPF', prioridade: 80, regex: new RegExp(String.raw`\bC\.?P\.?F\.?\s*${NUM}(?<v>\d{3}[.\s]?\d{3}[.\s]?\d{3}[-.\s]?\d{2})(?!\d)`, 'gdi') },
  { tipo: 'PIS', prioridade: 75, regex: /(?<![\d.])\d{3}\.\d{5}\.\d{2}-\d(?!\d)/g },
  { tipo: 'PIS', prioridade: 75, regex: new RegExp(String.raw`\b(?:PIS|PASEP|NIT|NIS)(?:\/PASEP)?\s*${NUM}(?<v>\d{3}\.?\d{5}\.?\d{2}-?\d)(?!\d)`, 'gdi') },
  { tipo: 'TITULO_ELEITOR', prioridade: 75, regex: new RegExp(String.raw`\bt[íi]tulo\s+(?:de\s+)?eleitor(?:al)?\s*${NUM}(?<v>\d{4}\s?\d{4}\s?\d{4})(?!\d)`, 'gdi') },
  { tipo: 'CNH', prioridade: 75, regex: new RegExp(String.raw`\b(?:CNH|carteira\s+nacional\s+de\s+habilita[çc][ãa]o|habilita[çc][ãa]o)\s*${NUM}(?<v>\d{9,11})(?!\d)`, 'gdi') },
  { tipo: 'CARTAO', prioridade: 70, regex: /(?<!\d)\d{4}([ -]?)\d{4}\1\d{4}\1\d{4}(?!\d)/g, validar: luhnValido },
  // --- contato ---
  { tipo: 'EMAIL', prioridade: 70, regex: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g },
  {
    tipo: 'TELEFONE',
    prioridade: 42,
    regex: new RegExp(String.raw`\b(?:tel(?:efone)?|fone|cel(?:ular)?|whats(?:app)?|contato)\.?\s*:?\s*(?<v>(?:\+?55\s?)?\(?\d{2}\)?\s?9?\s?\d{4}[-\s]?\d{4})(?!\d)`, 'gdi')
  },
  {
    tipo: 'TELEFONE',
    prioridade: 40,
    regex: /(?<![\w/])(?:\+?55\s?)?(?:\(\d{2}\)\s?|\d{2}\s)?(?:9\s?)?\d{4}[-\s]\d{4}(?![\d/])/g,
    validar: telefonePlausivel
  },
  { tipo: 'CEP', prioridade: 45, regex: /(?<![\d.])\d{5}-\d{3}(?!\d)/g },
  { tipo: 'CEP', prioridade: 45, regex: /\bCEP\s*:?\s*(?<v>\d{2}\.?\d{3}-?\d{3})(?!\d)/gdi },
  {
    tipo: 'ENDERECO',
    prioridade: 60,
    regex: new RegExp(String.raw`(?<!\p{L})${LOGRADOUROS}\s+[\p{L}0-9 .'’ºª-]{2,60}?,?\s*(?:n[º°o.]*\s*)?(?:\d{1,6}[A-Za-z]?|s\/?n)(?![\d\p{L}])`, 'gu')
  },
  // --- registros profissionais e processuais ---
  { tipo: 'OAB', prioridade: 65, regex: /\bOAB\s*[/-]?\s*[A-Z]{2}\s*(?:n[º°o.]*\s*)?:?\s*\d{1,3}\.?\d{3}(?:-?[A-Z])?\b/gi },
  { tipo: 'OAB', prioridade: 65, regex: /\bOAB\s*(?:n[º°o.]*\s*)?:?\s*\d{1,3}\.?\d{3}(?:-?[A-Z])?\s*[/-]\s*[A-Z]{2}\b/gi },
  {
    tipo: 'REGISTRO_PROFISSIONAL',
    prioridade: 65,
    regex: /\b(?:CRM|CRO|CRP|COREN|CREA|CAU|CRC|CRF|CREFITO|CRN|CRMV|CRESS|CRBM|CREF|CRFa|CORECON|CRA)\s*[/-]?\s*[A-Z]{2}\s*(?:n[º°o.]*\s*)?:?\s*\d[\d.]{2,9}(?:-?[A-Z0-9])?\b/g
  },
  {
    tipo: 'REGISTRO_PROFISSIONAL',
    prioridade: 65,
    regex: /\b(?:CRM|CRO|CRP|COREN|CREA|CAU|CRC|CRF|CREFITO|CRN|CRMV|CRESS|CRBM|CREF|CRFa|CORECON|CRA)\s*(?:n[º°o.]*\s*)?:?\s*\d[\d.]{2,9}\s*[/-]\s*[A-Z]{2}\b/g
  },
  { tipo: 'REGISTRO_PROFISSIONAL', prioridade: 65, regex: /\bRQE\s*(?:n[º°o.]*\s*)?:?\s*\d{2,6}\b/g },
  { tipo: 'REGISTRO_PROFISSIONAL', prioridade: 60, regex: new RegExp(String.raw`\b(?:ART|RRT)\s*${NUM}(?<v>[A-Z]{0,2}\d{6,14})\b`, 'gd') },
  // --- documentos sem DV (âncora obrigatória) ---
  {
    tipo: 'RG',
    prioridade: 50,
    regex: new RegExp(String.raw`\b(?:RG|R\.G\.|identidade|carteira\s+de\s+identidade|c[ée]dula\s+de\s+identidade)\s*${NUM}(?<v>\d[\d.]{4,11}-?[\dXx]?)(?![\d])`, 'gdi')
  },
  { tipo: 'RG', prioridade: 48, regex: /(?<![\d./])\d{1,2}\.\d{3}\.\d{3}-[\dXx](?![\d/.])/g },
  { tipo: 'PASSAPORTE', prioridade: 55, regex: new RegExp(String.raw`\bpassaporte\s*${NUM}(?<v>[A-Z]{2}\d{6,7})\b`, 'gdi') },
  { tipo: 'RENAVAM', prioridade: 55, regex: new RegExp(String.raw`\brenavam\s*${NUM}(?<v>\d{9,11})(?!\d)`, 'gdi') },
  {
    tipo: 'PLACA',
    prioridade: 35,
    regex: /\b[A-Z]{3}-?\d[A-Z0-9]\d{2}\b/g,
    validar: (v) => !/^(ISO|NBR|IEC|DIN|ABN|NRS|CID|ANS|CFM|RDC)/.test(v)
  },
  {
    tipo: 'CONTA_BANCARIA',
    prioridade: 55,
    regex: new RegExp(String.raw`\b(?:ag[êe]ncia|ag\.|conta(?:\s+corrente|\s+poupan[çc]a)?|c\/c)\s*${NUM}(?<v>\d[\d.-]{2,14}[\dXx]?)(?!\d)`, 'gdiu')
  },
  {
    tipo: 'PIX',
    prioridade: 60,
    regex: /\b(?:chave\s+)?pix\s*:?\s*(?<v>[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\b/gdi
  },
  {
    tipo: 'DATA_NASCIMENTO',
    prioridade: 55,
    regex: /\b(?:nascid[oa]\s+(?:em|aos?)|data\s+de\s+nascimento|D\.\s?N\.|DN|nasc\.)\s*:?\s*(?<v>\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})(?!\d)/gdi
  },
  {
    tipo: 'PRONTUARIO',
    prioridade: 55,
    regex: new RegExp(String.raw`\b(?:prontu[áa]rio|registro\s+hospitalar|atendimento)\s*${NUM}(?<v>[A-Z]{0,3}\d[\d./-]{2,15})(?!\d)`, 'gdiu')
  },
  {
    tipo: 'IP',
    prioridade: 30,
    regex: /(?<![\d.])(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)(?![\d.])/g
  }
];

/** Aplica um detector e devolve os spans (usando o grupo nomeado "v" quando houver). */
function aplicarDetector(texto: string, d: Detector, saida: Span[]): void {
  d.regex.lastIndex = 0;
  for (const m of texto.matchAll(d.regex)) {
    let inicio = m.index ?? 0;
    let valor = m[0];
    const grupo = (m as RegExpMatchArray & { indices?: { groups?: Record<string, [number, number] | undefined> } }).indices
      ?.groups?.['v'];
    if (grupo && m.groups?.['v']) {
      inicio = grupo[0];
      valor = m.groups['v'];
    }
    valor = valor.replace(/[\s,.;:]+$/, '');
    if (!valor) continue;
    if (d.validar && !d.validar(valor)) continue;
    saida.push({ inicio, fim: inicio + valor.length, tipo: d.tipo, valor, prioridade: d.prioridade });
  }
}

// ---------------------------------------------------------------------------
// Nomes de pessoas (sem IA)

const PALAVRA_NOME = String.raw`\p{Lu}[\p{L}'’-]*`;
const PARTICULA = String.raw`(?:d[aeo]s?|e|D[AEO]S?|E)`;
const SEQUENCIA_CAPITALIZADA = new RegExp(String.raw`${PALAVRA_NOME}(?:[ \t]+(?:${PARTICULA}[ \t]+)?${PALAVRA_NOME})*`, 'gu');

const ANCORAS_PESSOA = ambasCaixas([
  'paciente', 'cliente', 'requerente', 'requerido', 'requerida', 'autor', 'autora', 'réu', 'ré', 'testemunha',
  'genitor', 'genitora', 'mãe', 'pai', 'beneficiário', 'beneficiária', 'segurado', 'segurada', 'contribuinte',
  'empregado', 'empregada', 'reclamante', 'reclamado', 'reclamada', 'outorgante', 'outorgado', 'outorgada',
  'contratante', 'contratado', 'contratada', 'locador', 'locadora', 'locatário', 'locatária', 'sócio', 'sócia',
  'cônjuge', 'esposa', 'esposo', 'menor', 'interessado', 'interessada', 'responsável', 'prezado', 'prezada'
]);
const ANCORA_NOME = new RegExp(
  String.raw`(?:\b(?:Sr|Sra|Srta|Dr|Dra|SR|SRA|DR|DRA)\.?|(?<!\p{L})(?:${ANCORAS_PESSOA}|[Ff]ilh[oa]\s+de|FILH[OA]\s+DE|[Nn]ome(?:\s+completo)?\s*:|NOME(?:\s+COMPLETO)?\s*:))\s*:?\s+(?<v>${PALAVRA_NOME}(?:[ \t]+(?:${PARTICULA}[ \t]+)?${PALAVRA_NOME}){0,6})`,
  'gdu'
);

const SUFIXOS_EMPRESA = /\b(LTDA|S\.?\/?A\.?|EIRELI|ME|EPP|MEI|CIA|SOCIEDADE|ASSOCIA[ÇC][ÃA]O|COOPERATIVA)\b/i;

interface Token {
  texto: string;
  norm: string;
  inicio: number;
  fim: number;
}

function tokenizar(sequencia: string, base: number): Token[] {
  const tokens: Token[] = [];
  for (const m of sequencia.matchAll(/\S+/g)) {
    tokens.push({ texto: m[0], norm: normalizarToken(m[0]), inicio: base + (m.index ?? 0), fim: base + (m.index ?? 0) + m[0].length });
  }
  return tokens;
}

/** Nomes por dicionário: prenome conhecido + ao menos um sobrenome capitalizado. */
function detectarNomesDicionario(texto: string, saida: Span[]): void {
  for (const m of texto.matchAll(SEQUENCIA_CAPITALIZADA)) {
    const tokens = tokenizar(m[0], m.index ?? 0);
    if (tokens.length < 2) continue;
    let i = 0;
    while (i < tokens.length) {
      const t = tokens[i]!;
      if (!PRENOMES.has(t.norm) || tokens.slice(0, i).some((a) => PALAVRAS_NAO_NOME.has(a.norm))) {
        i++;
        continue;
      }
      // Estende com sobrenomes (pulando partículas) até uma palavra-barreira.
      let fim = i;
      let j = i + 1;
      while (j < tokens.length) {
        const tj = tokens[j]!;
        if (PARTICULAS.has(tj.norm)) {
          j++;
          continue;
        }
        if (PALAVRAS_NAO_NOME.has(tj.norm)) break;
        fim = j;
        j++;
      }
      if (fim > i) {
        const inicio = t.inicio;
        const termino = tokens[fim]!.fim;
        const valor = texto.slice(inicio, termino);
        const norm = normalizarToken(valor).replace(/\s+/g, ' ');
        if (!EXPRESSOES_NAO_PESSOA.has(norm) && !SUFIXOS_EMPRESA.test(valor)) {
          saida.push({ inicio, fim: termino, tipo: 'PESSOA', valor, prioridade: 50 });
        }
        i = fim + 1;
      } else {
        i++;
      }
    }
  }
}

/** Nomes após âncoras ("Sr.", "paciente", "filho de", "Nome:"), mesmo fora do dicionário. */
function detectarNomesAncorados(texto: string, saida: Span[]): void {
  ANCORA_NOME.lastIndex = 0;
  for (const m of texto.matchAll(ANCORA_NOME)) {
    const g = (m as RegExpMatchArray & { indices?: { groups?: Record<string, [number, number] | undefined> } }).indices?.groups?.['v'];
    const valorBruto = m.groups?.['v'];
    if (!g || !valorBruto) continue;
    // Remove palavras-barreira no fim (ex.: "Sr. João Rua") e partículas soltas.
    const tokens = tokenizar(valorBruto, g[0]);
    let fim = tokens.length - 1;
    const corte = tokens.findIndex((t) => PALAVRAS_NAO_NOME.has(t.norm));
    if (corte === 0) continue;
    if (corte > 0) fim = corte - 1;
    while (fim >= 0 && PARTICULAS.has(tokens[fim]!.norm)) fim--;
    if (fim < 0) continue;
    // Um único token só vale se for prenome conhecido ("Sr. João").
    if (fim === 0 && !PRENOMES.has(tokens[0]!.norm)) continue;
    const inicio = tokens[0]!.inicio;
    const termino = tokens[fim]!.fim;
    const valor = texto.slice(inicio, termino);
    if (SUFIXOS_EMPRESA.test(valor)) continue;
    if (EXPRESSOES_NAO_PESSOA.has(normalizarToken(valor).replace(/\s+/g, ' '))) continue;
    saida.push({ inicio, fim: termino, tipo: 'PESSOA', valor, prioridade: 52 });
  }
}

// ---------------------------------------------------------------------------
// Termos e pessoas fornecidos pelo usuário / pelo sistema de origem (ex.: PJe)

const CLASSES_ACENTO: Record<string, string> = {
  a: '[aáàâãä]',
  e: '[eéèêë]',
  i: '[iíìîï]',
  o: '[oóòôõö]',
  u: '[uúùûü]',
  c: '[cç]',
  n: '[nñ]'
};

/** Regex acento- e caixa-insensível para um termo/nome completo, com fronteiras de letra. */
export function regexDeTermo(termo: string): RegExp | null {
  const base = normalizarToken(termo).replace(/\s+/g, ' ').trim();
  if (base.length < 2) return null;
  let corpo = '';
  for (const c of base) {
    if (c === ' ') corpo += '\\s+';
    else if (CLASSES_ACENTO[c]) corpo += CLASSES_ACENTO[c];
    else if (/[a-z0-9]/.test(c)) corpo += c;
    else corpo += '\\' + c;
  }
  return new RegExp(`(?<![\\p{L}\\d])${corpo}(?![\\p{L}\\d])`, 'giu');
}

export interface PessoaConhecida {
  nome: string;
  /** Rótulo fixo, ex.: "PARTE AUTORA". Sem rótulo → [PESSOA_n]. */
  rotulo?: string;
}

function detectarTermos(texto: string, termos: string[], tipo: TipoEntidade, prioridade: number, saida: Span[], rotulos?: Array<string | undefined>): void {
  termos.forEach((termo, indice) => {
    const regex = regexDeTermo(termo);
    if (!regex) return;
    for (const m of texto.matchAll(regex)) {
      const inicio = m.index ?? 0;
      const span: Span = { inicio, fim: inicio + m[0].length, tipo, valor: termo, prioridade };
      const rotulo = rotulos?.[indice];
      if (rotulo) span.rotulo = rotulo;
      saida.push(span);
    }
  });
}

// ---------------------------------------------------------------------------

export interface OpcoesDeteccao {
  tipos: ReadonlySet<TipoEntidade>;
  detectarNomes: boolean;
  pessoasConhecidas?: PessoaConhecida[];
  sempreMascarar?: string[];
}

/** Variante "Prenome Último-sobrenome" de nomes com 3+ palavras (ex.: "José Silva"). */
function variantesDeNome(nome: string): string[] {
  const partes = nome.trim().split(/\s+/).filter((p) => !PARTICULAS.has(normalizarToken(p)));
  const variantes = [nome];
  if (partes.length >= 3) variantes.push(`${partes[0]} ${partes[partes.length - 1]}`);
  return variantes;
}

/** Detecta todos os spans candidatos (com sobreposições — o motor resolve). */
export function detectar(texto: string, opcoes: OpcoesDeteccao): Span[] {
  const spans: Span[] = [];
  for (const d of DETECTORES) {
    if (opcoes.tipos.has(d.tipo)) aplicarDetector(texto, d, spans);
  }
  if (opcoes.sempreMascarar?.length) {
    detectarTermos(texto, opcoes.sempreMascarar, 'PERSONALIZADO', 100, spans);
  }
  if (opcoes.pessoasConhecidas?.length) {
    const nomes: string[] = [];
    const rotulos: Array<string | undefined> = [];
    for (const p of opcoes.pessoasConhecidas) {
      for (const v of variantesDeNome(p.nome)) {
        nomes.push(v);
        rotulos.push(p.rotulo);
      }
    }
    // Spans de variantes carregam o nome completo como valor (mesmo pseudônimo).
    const brutos: Span[] = [];
    detectarTermos(texto, nomes, 'PESSOA', 95, brutos, rotulos);
    for (const s of brutos) {
      const dono = opcoes.pessoasConhecidas.find((p) => variantesDeNome(p.nome).includes(s.valor));
      spans.push({ ...s, valor: dono?.nome ?? s.valor });
    }
  }
  if (opcoes.detectarNomes && opcoes.tipos.has('PESSOA')) {
    detectarNomesDicionario(texto, spans);
    detectarNomesAncorados(texto, spans);
  }
  return spans;
}

/** Remove sobreposições: vence maior prioridade; empate → trecho mais longo. */
export function resolverSobreposicoes(spans: Span[]): Span[] {
  const ordenados = [...spans].sort(
    (a, b) => a.inicio - b.inicio || b.fim - b.inicio - (a.fim - a.inicio) || b.prioridade - a.prioridade
  );
  const pontuacao = (s: Span): number => s.prioridade * 10_000 + (s.fim - s.inicio);
  const mantidos: Span[] = [];
  for (const s of ordenados) {
    const ultimo = mantidos[mantidos.length - 1];
    if (!ultimo || s.inicio >= ultimo.fim) {
      mantidos.push(s);
    } else if (pontuacao(s) > pontuacao(ultimo)) {
      mantidos[mantidos.length - 1] = s;
    }
  }
  return mantidos;
}
