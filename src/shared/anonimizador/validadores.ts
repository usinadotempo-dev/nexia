/**
 * Validadores de dígito verificador de identificadores brasileiros.
 * Puros e sem dependências (testáveis com `node --test`). Usados para reduzir
 * falsos positivos: um número "solto" de 11 dígitos só é tratado como CPF se o DV
 * fechar; o formato com pontuação já é sinal forte e é mascarado mesmo com DV errado.
 */

export function soDigitos(valor: string): string {
  return valor.replace(/\D/g, '');
}

function todosIguais(d: string): boolean {
  return /^(\d)\1+$/.test(d);
}

export function cpfValido(valor: string): boolean {
  const d = soDigitos(valor);
  if (d.length !== 11 || todosIguais(d)) return false;
  const calc = (ate: number): number => {
    let soma = 0;
    for (let i = 0; i < ate; i++) soma += Number(d[i]) * (ate + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === Number(d[9]) && calc(10) === Number(d[10]);
}

/** Valor de um caractere do CNPJ alfanumérico (IN RFB 2.229/2024): código ASCII − 48. */
function valorCaractereCnpj(c: string): number {
  return c.toUpperCase().charCodeAt(0) - 48;
}

/** CNPJ numérico ou alfanumérico (12 posições alfanuméricas + 2 DVs numéricos). */
export function cnpjValido(valor: string): boolean {
  const limpo = valor.replace(/[.\-/\s]/g, '').toUpperCase();
  if (!/^[0-9A-Z]{12}\d{2}$/.test(limpo)) return false;
  if (/^\d+$/.test(limpo) && todosIguais(limpo)) return false;
  const calc = (base: string): number => {
    const pesos = base.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let soma = 0;
    for (let i = 0; i < base.length; i++) soma += valorCaractereCnpj(base[i]!) * pesos[i]!;
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const dv1 = calc(limpo.slice(0, 12));
  const dv2 = calc(limpo.slice(0, 12) + String(dv1));
  return dv1 === Number(limpo[12]) && dv2 === Number(limpo[13]);
}

/** PIS/PASEP/NIT/NIS. */
export function pisValido(valor: string): boolean {
  const d = soDigitos(valor);
  if (d.length !== 11 || todosIguais(d)) return false;
  const pesos = [3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let soma = 0;
  for (let i = 0; i < 10; i++) soma += Number(d[i]) * pesos[i]!;
  const r = 11 - (soma % 11);
  const dv = r >= 10 ? 0 : r;
  return dv === Number(d[10]);
}

/** Cartão Nacional de Saúde (definitivo 1/2, provisório 7/8/9): soma ponderada ≡ 0 (mod 11). */
export function cnsValido(valor: string): boolean {
  const d = soDigitos(valor);
  if (d.length !== 15 || !/^[12789]/.test(d)) return false;
  let soma = 0;
  for (let i = 0; i < 15; i++) soma += Number(d[i]) * (15 - i);
  return soma % 11 === 0;
}

/** Título de eleitor (12 dígitos: 8 sequenciais + 2 da UF + 2 DVs). */
export function tituloEleitorValido(valor: string): boolean {
  const d = soDigitos(valor);
  if (d.length !== 12) return false;
  const uf = Number(d.slice(8, 10));
  if (uf < 1 || uf > 28) return false;
  const pesos1 = [2, 3, 4, 5, 6, 7, 8, 9];
  let soma = 0;
  for (let i = 0; i < 8; i++) soma += Number(d[i]) * pesos1[i]!;
  let dv1 = soma % 11;
  if (dv1 === 10) dv1 = 0;
  if (dv1 === 0 && (uf === 1 || uf === 2)) dv1 = 1; // SP e MG: resto 0 vira 1
  const soma2 = Number(d[8]) * 7 + Number(d[9]) * 8 + dv1 * 9;
  let dv2 = soma2 % 11;
  if (dv2 === 10) dv2 = 0;
  if (dv2 === 0 && (uf === 1 || uf === 2)) dv2 = 1;
  return dv1 === Number(d[10]) && dv2 === Number(d[11]);
}

/** Algoritmo de Luhn (cartões de pagamento). */
export function luhnValido(valor: string): boolean {
  const d = soDigitos(valor);
  if (d.length < 13 || d.length > 19 || todosIguais(d)) return false;
  let soma = 0;
  let dobrar = false;
  for (let i = d.length - 1; i >= 0; i--) {
    let n = Number(d[i]);
    if (dobrar) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    soma += n;
    dobrar = !dobrar;
  }
  return soma % 10 === 0;
}

/** Resto da divisão por 97 de uma string numérica longa (sem BigInt). */
export function mod97(numero: string): number {
  let resto = 0;
  for (const c of numero) resto = (resto * 10 + Number(c)) % 97;
  return resto;
}

/** Número único de processo do CNJ (Res. 65/2008): NNNNNNN-DD.AAAA.J.TR.OOOO, DV módulo 97. */
export function processoCnjValido(valor: string): boolean {
  const d = soDigitos(valor);
  if (d.length !== 20) return false;
  const n = d.slice(0, 7);
  const dv = Number(d.slice(7, 9));
  const resto = d.slice(9); // AAAA J TR OOOO
  return 98 - mod97(n + resto + '00') === dv;
}

/** Chave de acesso de NF-e/NFC-e/CT-e (44 dígitos, DV módulo 11 com pesos 2..9). */
export function chaveNfeValida(valor: string): boolean {
  const d = soDigitos(valor);
  if (d.length !== 44) return false;
  let soma = 0;
  let peso = 2;
  for (let i = 42; i >= 0; i--) {
    soma += Number(d[i]) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  const r = soma % 11;
  const dv = r < 2 ? 0 : 11 - r;
  return dv === Number(d[43]);
}

/** RENAVAM (11 dígitos). */
export function renavamValido(valor: string): boolean {
  let d = soDigitos(valor);
  if (d.length === 9) d = d.padStart(11, '0');
  if (d.length !== 11) return false;
  const pesos = [3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let soma = 0;
  for (let i = 0; i < 10; i++) soma += Number(d[i]) * pesos[i]!;
  const r = (soma * 10) % 11;
  return (r === 10 ? 0 : r) === Number(d[10]);
}
