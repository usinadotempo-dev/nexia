/**
 * Numeração única de processos do CNJ (Res. CNJ 65/2008): NNNNNNN-DD.AAAA.J.TR.OOOO.
 * Identifica o segmento/tribunal e o alias do endpoint da API Pública do DataJud.
 */
import { processoCnjValido } from '../anonimizador/validadores.ts';

export interface NumeroCnj {
  digitos: string;
  formatado: string;
  ano: string;
  segmento: string;
  tribunal: string;
  origem: string;
  dvValido: boolean;
  /** Alias usado na URL do DataJud (api_publica_<alias>), quando conhecido. */
  aliasDatajud: string | null;
  nomeTribunal: string;
}

// Ordem oficial dos códigos TR para a Justiça Estadual/Eleitoral (01 = AC ... 27 = TO).
const UFS = ['ac', 'al', 'ap', 'am', 'ba', 'ce', 'df', 'es', 'go', 'ma', 'mt', 'ms', 'mg', 'pa', 'pb', 'pr', 'pe', 'pi', 'rj', 'rn', 'rs', 'ro', 'rr', 'sc', 'se', 'sp', 'to'];

function aliasDe(segmento: string, tribunal: string): { alias: string | null; nome: string } {
  const tr = Number(tribunal);
  const uf = UFS[tr - 1];
  switch (segmento) {
    case '3':
      return { alias: 'stj', nome: 'Superior Tribunal de Justiça' };
    case '4':
      return tr >= 1 && tr <= 6 ? { alias: `trf${tr}`, nome: `Tribunal Regional Federal da ${tr}ª Região` } : { alias: null, nome: 'Justiça Federal' };
    case '5':
      if (tr === 0) return { alias: 'tst', nome: 'Tribunal Superior do Trabalho' };
      return tr >= 1 && tr <= 24 ? { alias: `trt${tr}`, nome: `Tribunal Regional do Trabalho da ${tr}ª Região` } : { alias: null, nome: 'Justiça do Trabalho' };
    case '6':
      if (tr === 0) return { alias: 'tse', nome: 'Tribunal Superior Eleitoral' };
      return uf ? { alias: `tre-${uf}`, nome: `Tribunal Regional Eleitoral (${uf.toUpperCase()})` } : { alias: null, nome: 'Justiça Eleitoral' };
    case '7':
      return tr === 0 ? { alias: 'stm', nome: 'Superior Tribunal Militar' } : { alias: null, nome: 'Justiça Militar da União' };
    case '8':
      if (!uf) return { alias: null, nome: 'Justiça Estadual' };
      return { alias: uf === 'df' ? 'tjdft' : `tj${uf}`, nome: `Tribunal de Justiça (${uf === 'df' ? 'DFT' : uf.toUpperCase()})` };
    case '9': {
      const militares: Record<number, string> = { 13: 'tjmmg', 21: 'tjmrs', 26: 'tjmsp' };
      return { alias: militares[tr] ?? null, nome: 'Justiça Militar Estadual' };
    }
    default:
      return { alias: null, nome: 'Tribunal não coberto pela API Pública do DataJud' };
  }
}

export function interpretarNumeroCnj(entrada: string): NumeroCnj | null {
  const d = entrada.replace(/\D/g, '');
  if (d.length !== 20) return null;
  const ano = d.slice(9, 13);
  const segmento = d.slice(13, 14);
  const tribunal = d.slice(14, 16);
  const origem = d.slice(16, 20);
  const { alias, nome } = aliasDe(segmento, tribunal);
  return {
    digitos: d,
    formatado: `${d.slice(0, 7)}-${d.slice(7, 9)}.${ano}.${segmento}.${tribunal}.${origem}`,
    ano,
    segmento,
    tribunal,
    origem,
    dvValido: processoCnjValido(d),
    aliasDatajud: alias,
    nomeTribunal: nome
  };
}
