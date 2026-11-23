/**
 * Logger central com redação automática de dados pessoais (LGPD).
 * Nenhum outro módulo deve chamar console.* diretamente.
 */
const PADROES_SENSIVEIS: RegExp[] = [
  /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, // CPF
  /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g, // CNPJ
  /\b\d{7}-?\d{2}\.?\d{4}\.?\d\.?\d{2}\.?\d{4}\b/g, // número de processo CNJ
  /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g // e-mail
];

export function redigir(valor: unknown): string {
  let texto: string | undefined;
  try {
    texto = typeof valor === 'string' ? valor : JSON.stringify(valor);
  } catch {
    texto = String(valor);
  }
  if (texto === undefined) texto = String(valor);
  for (const padrao of PADROES_SENSIVEIS) texto = texto.replace(padrao, '[REDIGIDO]');
  return texto;
}

export const log = {
  info: (...args: unknown[]) => console.info('[Nexpra]', ...args.map(redigir)),
  aviso: (...args: unknown[]) => console.warn('[Nexpra]', ...args.map(redigir)),
  erro: (...args: unknown[]) => console.error('[Nexpra]', ...args.map(redigir))
};
