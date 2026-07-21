/**
 * Passo de máscara de dados pessoais por regex.
 * 100% local e determinístico — nenhum dado sai da máquina.
 * Módulo sem dependências para permitir testes diretos com `node --test`.
 */

const REGEX_PROCESSO_CNJ = /\b\d{7}-?\d{2}\.?\d{4}\.?\d\.?\d{2}\.?\d{4}\b/g;
const REGEX_CPF = /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g;
const REGEX_CPF_ANCORADO = /\b(CPF|C\.P\.F\.?)\s*(?:n[º°o.]*)?\s*:?\s*\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/gi;
const REGEX_CNPJ = /\b\d{2}\.?\d{3}\.?\d{3}\/\d{4}-?\d{2}\b/g;
const REGEX_CEP = /\b\d{5}-\d{3}\b/g;
const REGEX_EMAIL = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g;
const REGEX_TELEFONE = /(?:\(\d{2}\)\s?|\b\d{2}\s)?\b\d{4,5}-\d{4}\b/g;
const REGEX_OAB = /\bOAB\s*[-/]?\s*[A-Z]{2}\s*\.?\s*\d{3,6}\b/gi;
const REGEX_RG = /\b\d{1,2}\.\d{3}\.\d{3}-?[\dXx]?\b/g;
const REGEX_BANCARIO = /\b(ag[êe]ncia|conta(?:\s+corrente)?|conta\s+poupan[çc]a)\s*(?:n[º°o.]*)?\s*:?\s*[\d.-]{3,15}\b/gi;

export type TipoPII = 'processo' | 'CPF' | 'CNPJ' | 'RG' | 'CEP' | 'telefone' | 'email' | 'OAB' | 'bancario';

export type ContagemPII = Record<TipoPII, number>;

export function contagemZerada(): ContagemPII {
  return { processo: 0, CPF: 0, CNPJ: 0, RG: 0, CEP: 0, telefone: 0, email: 0, OAB: 0, bancario: 0 };
}

/** Substitui `regex` por `marcador` e soma no contador o número de ocorrências. */
function mascarar(texto: string, regex: RegExp, marcador: string, contagem: ContagemPII, tipo: TipoPII): string {
  return texto.replace(regex, () => {
    contagem[tipo]++;
    return marcador;
  });
}

/** Aplica todas as máscaras de PII, acumulando as contagens por tipo. */
export function aplicarRegexLocalContado(texto: string, contagem: ContagemPII = contagemZerada()): {
  texto: string;
  contagem: ContagemPII;
} {
  let r = texto;

  // Ordem importa: padrões mais específicos primeiro.
  r = mascarar(r, REGEX_PROCESSO_CNJ, '[NUMERO DE PROCESSO OMITIDO]', contagem, 'processo');
  r = mascarar(r, REGEX_CNPJ, '[CNPJ OMITIDO]', contagem, 'CNPJ');
  r = mascarar(r, REGEX_CPF_ANCORADO, '[CPF OMITIDO]', contagem, 'CPF');
  r = mascarar(r, REGEX_CPF, '[CPF OMITIDO]', contagem, 'CPF');
  r = mascarar(r, REGEX_OAB, '[OAB OMITIDA]', contagem, 'OAB');
  r = mascarar(r, REGEX_EMAIL, '[EMAIL OMITIDO]', contagem, 'email');
  r = mascarar(r, REGEX_CEP, '[CEP OMITIDO]', contagem, 'CEP');
  r = r.replace(REGEX_TELEFONE, (m) => {
    if (m.replace(/\D/g, '').length < 8) return m;
    contagem.telefone++;
    return '[TELEFONE OMITIDO]';
  });
  r = r.replace(REGEX_BANCARIO, (_m, rotulo: string) => {
    contagem.bancario++;
    return `${rotulo} [OMITIDO]`;
  });

  // RG por último e com cautela: descarta matches colados a "/" ou "."
  // (números de processo antigos, protocolos, referências de leis) e datas.
  r = r.replace(REGEX_RG, (m, indice: number, todo: string) => {
    const antes = todo[indice - 1] ?? '';
    const depois = todo[indice + m.length] ?? '';
    if (antes === '/' || depois === '/' || antes === '.' || depois === '.') return m;
    contagem.RG++;
    return '[RG OMITIDO]';
  });

  return { texto: r, contagem };
}

/** Aplica todas as máscaras de PII em um texto (sem contagem). */
export function aplicarRegexLocal(texto: string): string {
  return aplicarRegexLocalContado(texto).texto;
}

/** Verificação de auditoria: retorna padrões de PII ainda presentes no texto. */
export function verificarResiduos(texto: string): string[] {
  const residuos: string[] = [];
  if (REGEX_CPF.test(texto)) residuos.push('CPF');
  if (REGEX_CNPJ.test(texto)) residuos.push('CNPJ');
  if (REGEX_EMAIL.test(texto)) residuos.push('e-mail');
  if (REGEX_PROCESSO_CNJ.test(texto)) residuos.push('número de processo');
  for (const rgx of [REGEX_CPF, REGEX_CNPJ, REGEX_EMAIL, REGEX_PROCESSO_CNJ]) rgx.lastIndex = 0;
  return residuos;
}
