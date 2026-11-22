/**
 * Correção monetária por índice mensal (variação % ao mês) — determinística.
 * Fator = Π (1 + v/100) sobre os meses do período, inclusive o mês inicial e o
 * final (mesma convenção da Calculadora do Cidadão do BCB). Juros de mora e
 * regras específicas de cada tribunal/órgão NÃO estão incluídos.
 */

export interface IndiceInfo {
  id: string;
  nome: string;
  /** Código da série no SGS do Banco Central (variação mensal em %). */
  sgs: number;
  descricao: string;
}

export const INDICES: IndiceInfo[] = [
  { id: 'IPCA', nome: 'IPCA (IBGE)', sgs: 433, descricao: 'Inflação oficial; usado em muitas condenações e contratos' },
  { id: 'IPCA-E', nome: 'IPCA-E (IBGE)', sgs: 10764, descricao: 'IPCA especial; correção de débitos judiciais (EC 113/2021 antes da SELIC)' },
  { id: 'INPC', nome: 'INPC (IBGE)', sgs: 188, descricao: 'Benefícios previdenciários, verbas alimentares' },
  { id: 'IGP-M', nome: 'IGP-M (FGV)', sgs: 189, descricao: 'Reajuste de aluguéis e contratos' },
  { id: 'IGP-DI', nome: 'IGP-DI (FGV)', sgs: 190, descricao: 'Contratos e tarifas' },
  { id: 'SELIC', nome: 'SELIC acumulada no mês (BCB)', sgs: 4390, descricao: 'Tributos federais e débitos judiciais (EC 113/2021)' },
  { id: 'CDI', nome: 'CDI acumulado no mês (BCB)', sgs: 4391, descricao: 'Aplicações financeiras' },
  { id: 'INCC', nome: 'INCC (FGV) — série SGS 192', sgs: 192, descricao: 'Construção civil; reajuste de obras e imóveis na planta' },
  { id: 'INCC-M', nome: 'INCC-M (FGV) — série SGS 7456', sgs: 7456, descricao: 'Construção civil (versão de mercado)' }
];

export interface PontoMensal {
  /** ISO do primeiro dia do mês. */
  mes: string;
  /** Variação do mês em %. */
  variacao: number;
}

export interface ResultadoCorrecao {
  fator: number;
  valorOriginal: number;
  valorCorrigido: number;
  variacaoPercentual: number;
  meses: number;
  primeiroMes: string | null;
  ultimoMes: string | null;
}

export function corrigir(valor: number, pontos: PontoMensal[]): ResultadoCorrecao {
  const ordenados = [...pontos].sort((a, b) => a.mes.localeCompare(b.mes));
  let fator = 1;
  for (const p of ordenados) fator *= 1 + p.variacao / 100;
  return {
    fator,
    valorOriginal: valor,
    valorCorrigido: Math.round(valor * fator * 100) / 100,
    variacaoPercentual: (fator - 1) * 100,
    meses: ordenados.length,
    primeiroMes: ordenados[0]?.mes ?? null,
    ultimoMes: ordenados[ordenados.length - 1]?.mes ?? null
  };
}

export function formatarMoeda(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Lê valores no formato brasileiro ("1.234,56", "R$ 10.000") ou internacional ("1234.56"). */
export function lerValor(entrada: string | number): number {
  if (typeof entrada === 'number') return entrada;
  let t = entrada.replace(/[R$\s]/g, '');
  if (/,\d{1,2}$/.test(t) || (t.includes(',') && t.includes('.'))) t = t.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
  const n = Number(t);
  if (!Number.isFinite(n)) throw new Error(`Valor inválido: ${entrada}`);
  return n;
}
