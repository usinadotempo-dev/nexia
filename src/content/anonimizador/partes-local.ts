/**
 * Passo 2 da anonimização: substituição dos nomes das pessoas físicas pelo
 * papel processual, usando os dados estruturados de partes que o próprio PJe
 * fornece (com qualificação). 100% local — requisito das normas do CNJ:
 * nenhum dado pessoal é enviado ao modelo de IA para "descobrir" nomes.
 */
import type { ParteProcesso } from '../../shared/tipos';

export interface Substituicao {
  original: string;
  substituto: string;
  regex: RegExp;
}

/** Entidades públicas/jurídicas notórias que não são dados pessoais. */
const ENTIDADES_PUBLICAS =
  /\b(INSS|INCRA|IBAMA|FUNAI|UNI[ÃA]O|UNIAO FEDERAL|FAZENDA (NACIONAL|P[ÚU]BLICA)|ESTADO D[EOA]|MUNIC[ÍI]PIO|MINIST[ÉE]RIO|PROCURADORIA|DEFENSORIA|CAIXA ECON[ÔO]MICA|BANCO D[OE]|EMPRESA BRASILEIRA|AG[ÊE]NCIA NACIONAL|FUNDA[ÇC][ÃA]O NACIONAL|DEPARTAMENTO NACIONAL)\b/i;

function ehPessoaJuridica(parte: ParteProcesso): boolean {
  if (parte.documento && parte.documento.replace(/\D/g, '').length === 14) return true; // CNPJ
  if (ENTIDADES_PUBLICAS.test(parte.nome)) return true;
  return /\b(LTDA|S\.?\s?A\.?|EIRELI|MEI|ME|EPP|CIA|COMPANHIA|COOPERATIVA|ASSOCIA[ÇC][ÃA]O|SINDICATO|CONDOM[ÍI]NIO)\b/i.test(parte.nome);
}

function papelCanonico(parte: ParteProcesso): string {
  const papel = parte.papel
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase();
  if (/(AUTOR|EXEQUENTE|REQUERENTE|IMPETRANTE|RECLAMANTE|APELANTE|AGRAVANTE|EMBARGANTE|RECORRENTE)/.test(papel)) return 'PARTE AUTORA';
  if (/(REU|RE\b|EXECUTAD|REQUERID|IMPETRAD|RECLAMAD|APELAD|AGRAVAD|EMBARGAD|RECORRID)/.test(papel)) return 'PARTE RE';
  if (/(ADVOGAD|PROCURADOR)/.test(papel)) return parte.polo === 'ativo' ? 'ADVOGADO DO POLO ATIVO' : parte.polo === 'passivo' ? 'ADVOGADO DO POLO PASSIVO' : 'ADVOGADO';
  if (/PERIT/.test(papel)) return 'PERITO';
  if (/TESTEMUNH/.test(papel)) return 'TESTEMUNHA';
  if (/(MINISTERIO|FISCAL DA LEI)/.test(papel)) return 'MINISTERIO PUBLICO';
  if (/DEFENSOR/.test(papel)) return 'DEFENSOR';
  if (parte.polo === 'ativo') return 'PARTE DO POLO ATIVO';
  if (parte.polo === 'passivo') return 'PARTE DO POLO PASSIVO';
  return 'TERCEIRO INTERESSADO';
}

const ROTULOS_LEGIVEIS: Record<string, string> = {
  'PARTE RE': 'PARTE RÉ',
  'MINISTERIO PUBLICO': 'MINISTÉRIO PÚBLICO'
};

/** Regex acento- e caixa-insensível para um nome próprio completo. */
export function regexDeNome(nome: string): RegExp {
  const CLASSES: Record<string, string> = {
    a: '[aáàâãä]',
    e: '[eéèêë]',
    i: '[iíìîï]',
    o: '[oóòôõö]',
    u: '[uúùûü]',
    c: '[cç]',
    n: '[nñ]'
  };
  const base = nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
  let corpo = '';
  for (const caractere of base) {
    if (caractere === ' ') corpo += '\\s+';
    else if (CLASSES[caractere]) corpo += CLASSES[caractere];
    else if (/[a-z0-9]/.test(caractere)) corpo += caractere;
    else corpo += '\\' + caractere;
  }
  return new RegExp(`(?<!\\p{L})${corpo}(?!\\p{L})`, 'giu');
}

/**
 * Monta a lista de substituições nome → papel processual a partir das partes
 * qualificadas do PJe. Pessoas jurídicas e entes públicos são preservados.
 */
export function montarSubstituicoes(partes: ParteProcesso[]): Substituicao[] {
  const contadores = new Map<string, number>();
  const substituicoes: Substituicao[] = [];

  // Nomes mais longos primeiro, para que "JOSÉ DA SILVA FILHO" seja tratado
  // antes de um eventual "JOSÉ DA SILVA".
  const pessoas = partes.filter((p) => !ehPessoaJuridica(p)).sort((a, b) => b.nome.length - a.nome.length);

  for (const parte of pessoas) {
    const chaveBase = papelCanonico(parte);
    const usados = contadores.get(chaveBase) ?? 0;
    contadores.set(chaveBase, usados + 1);
    const rotulo = ROTULOS_LEGIVEIS[chaveBase] ?? chaveBase;
    const substituto = `[${rotulo}${usados > 0 ? ` ${usados + 1}` : ''}]`;
    substituicoes.push({ original: parte.nome, substituto, regex: regexDeNome(parte.nome) });
  }
  return substituicoes;
}

export function aplicarSubstituicoes(texto: string, substituicoes: Substituicao[]): string {
  return aplicarSubstituicoesContado(texto, substituicoes).texto;
}

/** Aplica as substituições de nome e conta quantas ocorrências foram trocadas. */
export function aplicarSubstituicoesContado(
  texto: string,
  substituicoes: Substituicao[]
): { texto: string; contagem: number } {
  let resultado = texto;
  let contagem = 0;
  for (const s of substituicoes) {
    s.regex.lastIndex = 0;
    resultado = resultado.replace(s.regex, () => {
      contagem++;
      return s.substituto;
    });
  }
  return { texto: resultado, contagem };
}
