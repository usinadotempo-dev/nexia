/**
 * Converte as partes qualificadas fornecidas por um sistema de origem (ex.: PJe)
 * em "pessoas conhecidas" com rótulo de papel processual. Pessoas jurídicas e
 * entes públicos são preservados (não são dado pessoal).
 */
import type { PessoaConhecida } from './detectores.ts';

export interface ParteQualificada {
  nome: string;
  papel: string;
  polo: 'ativo' | 'passivo' | 'outros';
  documento?: string;
}

const ENTIDADES_PUBLICAS =
  /\b(INSS|INCRA|IBAMA|FUNAI|UNI[ÃA]O|FAZENDA (NACIONAL|P[ÚU]BLICA)|ESTADO D[EOA]|MUNIC[ÍI]PIO|MINIST[ÉE]RIO|PROCURADORIA|DEFENSORIA|CAIXA ECON[ÔO]MICA|BANCO D[OE]|EMPRESA BRASILEIRA|AG[ÊE]NCIA NACIONAL|FUNDA[ÇC][ÃA]O NACIONAL|DEPARTAMENTO NACIONAL|CONSELHO REGIONAL|CONSELHO FEDERAL)\b/i;

export function ehPessoaJuridica(parte: Pick<ParteQualificada, 'nome' | 'documento'>): boolean {
  if (parte.documento && parte.documento.replace(/[^0-9A-Za-z]/g, '').length === 14) return true;
  if (ENTIDADES_PUBLICAS.test(parte.nome)) return true;
  return /\b(LTDA|S\.?\s?A\.?|EIRELI|MEI|ME|EPP|CIA|COMPANHIA|COOPERATIVA|ASSOCIA[ÇC][ÃA]O|SINDICATO|CONDOM[ÍI]NIO)\b/i.test(parte.nome);
}

export function rotuloDoPapel(parte: Pick<ParteQualificada, 'papel' | 'polo'>): string {
  const papel = parte.papel.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
  if (/(AUTOR|EXEQUENTE|REQUERENTE|IMPETRANTE|RECLAMANTE|APELANTE|AGRAVANTE|EMBARGANTE|RECORRENTE)/.test(papel)) return 'PARTE AUTORA';
  if (/(REU|RE\b|EXECUTAD|REQUERID|IMPETRAD|RECLAMAD|APELAD|AGRAVAD|EMBARGAD|RECORRID)/.test(papel)) return 'PARTE RÉ';
  if (/(ADVOGAD|PROCURADOR)/.test(papel)) {
    return parte.polo === 'ativo' ? 'ADVOGADO DO POLO ATIVO' : parte.polo === 'passivo' ? 'ADVOGADO DO POLO PASSIVO' : 'ADVOGADO';
  }
  if (/PERIT/.test(papel)) return 'PERITO';
  if (/TESTEMUNH/.test(papel)) return 'TESTEMUNHA';
  if (/(MINISTERIO|FISCAL DA LEI)/.test(papel)) return 'MINISTÉRIO PÚBLICO';
  if (/DEFENSOR/.test(papel)) return 'DEFENSOR';
  if (parte.polo === 'ativo') return 'PARTE DO POLO ATIVO';
  if (parte.polo === 'passivo') return 'PARTE DO POLO PASSIVO';
  return 'TERCEIRO INTERESSADO';
}

/** Pessoas físicas das partes → pessoas conhecidas com rótulo (nomes mais longos primeiro). */
export function pessoasDasPartes(partes: ParteQualificada[]): PessoaConhecida[] {
  return partes
    .filter((p) => p.nome.trim().length > 3 && !ehPessoaJuridica(p))
    .sort((a, b) => b.nome.length - a.nome.length)
    .map((p) => ({ nome: p.nome.trim(), rotulo: rotuloDoPapel(p) }));
}
