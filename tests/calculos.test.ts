import { test } from 'node:test';
import assert from 'node:assert/strict';
import { interpretarNumeroCnj } from '../src/shared/calculos/cnj.ts';
import { corrigir, lerValor } from '../src/shared/calculos/correcao.ts';
import { normalizarData } from '../src/shared/calculos/datas.ts';
import { contarPrazo } from '../src/shared/calculos/prazos.ts';

test('número CNJ → tribunal do DataJud', () => {
  assert.equal(interpretarNumeroCnj('0000832-35.2018.4.01.3202')?.aliasDatajud, 'trf1');
  assert.equal(interpretarNumeroCnj('0000832-35.2018.4.01.3202')?.dvValido, true);
  assert.equal(interpretarNumeroCnj('00000000020248060001')?.aliasDatajud, 'tjce');
  assert.equal(interpretarNumeroCnj('00000000020248070001')?.aliasDatajud, 'tjdft');
  assert.equal(interpretarNumeroCnj('00000000020245000001')?.aliasDatajud, 'tst');
  assert.equal(interpretarNumeroCnj('123'), null);
});

test('datas', () => {
  assert.equal(normalizarData('01/03/2024'), '2024-03-01');
  assert.equal(normalizarData('03/2024'), '2024-03-01');
  assert.equal(normalizarData('31/02/2024'), null);
});

const SEXTA_SANTA = new Set(['2024-03-29']);

test('prazo em dias úteis (exclui o início, pula feriado)', () => {
  assert.equal(contarPrazo({ inicio: '2024-03-01', dias: 15, tipo: 'uteis', feriados: SEXTA_SANTA, recessoForense: false }).vencimento, '2024-03-22');
  assert.equal(contarPrazo({ inicio: '2024-03-22', dias: 5, tipo: 'uteis', feriados: SEXTA_SANTA, recessoForense: false }).vencimento, '2024-04-01');
});

test('prazo corrido vencendo no sábado é prorrogado', () => {
  const r = contarPrazo({ inicio: '2024-03-01', dias: 15, tipo: 'corridos', feriados: new Set(), recessoForense: false });
  assert.equal(r.vencimento, '2024-03-18');
  assert.equal(r.prorrogado, true);
});

test('recesso forense suspende de 20/12 a 20/01', () => {
  const r = contarPrazo({ inicio: '2024-12-18', dias: 5, tipo: 'uteis', feriados: new Set(), recessoForense: true });
  assert.equal(r.vencimento, '2025-01-24');
});

test('correção monetária e leitura de valores', () => {
  const r = corrigir(1000, [
    { mes: '2024-02-01', variacao: 2 },
    { mes: '2024-01-01', variacao: 1 }
  ]);
  assert.equal(r.valorCorrigido, 1030.2);
  assert.equal(r.meses, 2);
  assert.equal(r.primeiroMes, '2024-01-01');
  assert.equal(lerValor('1.234,56'), 1234.56);
  assert.equal(lerValor('R$ 10.000'), 10000);
  assert.equal(lerValor('1234.56'), 1234.56);
});
