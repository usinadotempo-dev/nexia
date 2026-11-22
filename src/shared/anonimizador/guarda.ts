/**
 * Guarda de saída: última barreira antes de qualquer texto sair para um provedor
 * de IA. Procura apenas identificadores de ALTA confiança (com dígito verificador
 * válido) — se encontrar, o envio é bloqueado ou exige confirmação do usuário.
 * Roda no service worker, independentemente de a UI ter anonimizado ou não.
 */
import { cnsValido, cpfValido, luhnValido } from './validadores.ts';

export type TipoGuarda = 'CPF' | 'CNS' | 'CARTAO' | 'EMAIL';

export const TIPOS_GUARDA: Record<TipoGuarda, string> = {
  CPF: 'CPF válido',
  CNS: 'Cartão SUS válido',
  CARTAO: 'cartão de pagamento',
  EMAIL: 'e-mail'
};

export interface AchadoGuarda {
  tipo: TipoGuarda;
  quantidade: number;
}

const PADROES: Array<{ tipo: TipoGuarda; regex: RegExp; validar?: (v: string) => boolean }> = [
  { tipo: 'CPF', regex: /(?<!\d)\d{3}\.?\d{3}\.?\d{3}-?\d{2}(?!\d)/g, validar: cpfValido },
  { tipo: 'CNS', regex: /(?<!\d)[12789]\d{2}[ .]?\d{4}[ .]?\d{4}[ .]?\d{4}(?!\d)/g, validar: cnsValido },
  { tipo: 'CARTAO', regex: /(?<!\d)\d{4}([ -]?)\d{4}\1\d{4}\1\d{4}(?!\d)/g, validar: luhnValido },
  { tipo: 'EMAIL', regex: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g }
];

export function verificarGuarda(texto: string, tipos: readonly TipoGuarda[]): AchadoGuarda[] {
  const achados: AchadoGuarda[] = [];
  for (const p of PADROES) {
    if (!tipos.includes(p.tipo)) continue;
    let n = 0;
    for (const m of texto.matchAll(p.regex)) {
      if (!p.validar || p.validar(m[0])) n++;
    }
    if (n > 0) achados.push({ tipo: p.tipo, quantidade: n });
  }
  return achados;
}

export function descreverAchados(achados: AchadoGuarda[]): string {
  return achados.map((a) => `${a.quantidade} ${TIPOS_GUARDA[a.tipo]}${a.quantidade > 1 ? '(s)' : ''}`).join(', ');
}
