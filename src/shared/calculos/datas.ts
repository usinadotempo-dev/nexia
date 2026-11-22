/** Utilitários de data em UTC (sem fuso) — ISO aaaa-mm-dd como representação canônica. */

export function isoDeData(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function dataDeIso(iso: string): Date {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(a!, (m ?? 1) - 1, d ?? 1));
}

export function somarDias(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86_400_000);
}

export function formatarBr(iso: string): string {
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
}

/**
 * Aceita "dd/mm/aaaa", "aaaa-mm-dd", "mm/aaaa", "aaaa-mm" (mês → dia 01).
 * Devolve ISO ou null se inválida.
 */
export function normalizarData(entrada: string): string | null {
  const t = entrada.trim();
  let a: number, m: number, d: number;
  let r: RegExpMatchArray | null;
  if ((r = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/))) {
    d = Number(r[1]); m = Number(r[2]); a = Number(r[3]);
  } else if ((r = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) {
    a = Number(r[1]); m = Number(r[2]); d = Number(r[3]);
  } else if ((r = t.match(/^(\d{1,2})\/(\d{4})$/))) {
    d = 1; m = Number(r[1]); a = Number(r[2]);
  } else if ((r = t.match(/^(\d{4})-(\d{1,2})$/))) {
    d = 1; m = Number(r[2]); a = Number(r[1]);
  } else {
    return null;
  }
  const dt = new Date(Date.UTC(a, m - 1, d));
  if (dt.getUTCFullYear() !== a || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return isoDeData(dt);
}

/** "dd/mm/aaaa" (formato do SGS/BCB) → ISO. */
export function isoDeBr(br: string): string {
  const [d, m, a] = br.split('/');
  return `${a}-${m}-${d}`;
}

export function diaDaSemana(iso: string): number {
  return dataDeIso(iso).getUTCDay();
}

export const NOMES_DIA = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
