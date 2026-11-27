import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dimensionarCipa, dimensionarSesmt } from '../src/shared/calculos/sst.ts';
import { AREAS } from '../src/shared/areas/catalogo.ts';

const resumo = (grau: number, n: number) =>
  Object.fromEntries(dimensionarSesmt(grau, n).itens.map((i) => [i.profissional, i.quantidade]));

test('SESMT: abaixo do mínimo do Anexo II não é obrigatório', () => {
  assert.equal(dimensionarSesmt(4, 49).obrigatorio, false);
  assert.equal(dimensionarSesmt(1, 500).obrigatorio, false);
  assert.equal(dimensionarSesmt(3, 100).obrigatorio, false);
});

test('SESMT: faixas e limites', () => {
  assert.deepEqual(resumo(4, 50), { tecnico: 1 });
  assert.deepEqual(resumo(3, 101), { tecnico: 1 });
  assert.deepEqual(resumo(3, 250), { tecnico: 1 });
  assert.deepEqual(resumo(3, 251), { tecnico: 2 });
  assert.deepEqual(resumo(1, 501), { tecnico: 1 });
  assert.deepEqual(resumo(3, 3000), { tecnico: 6, engenheiro: 1, enfermagem: 1, enfermeiro: 1, medico: 1 });
  assert.deepEqual(resumo(4, 5000), { tecnico: 10, engenheiro: 3, enfermagem: 1, enfermeiro: 1, medico: 3 });
});

test('SESMT: tempo parcial e opção por enfermeiro', () => {
  const r = dimensionarSesmt(4, 200);
  assert.equal(r.itens.find((i) => i.profissional === 'engenheiro')?.tempoParcial, true);
  assert.equal(r.itens.find((i) => i.profissional === 'tecnico')?.tempoParcial, false);
  const g2 = dimensionarSesmt(2, 1500);
  assert.equal(g2.itens.find((i) => i.profissional === 'enfermagem')?.enfermeiroOpcional, true);
  assert.equal(dimensionarSesmt(1, 3000).itens.find((i) => i.profissional === 'engenheiro')?.enfermeiroOpcional, false);
});

test('SESMT: acima de 5.000 soma grupos de 4.000 ou fração acima de 2.000', () => {
  assert.equal(dimensionarSesmt(3, 7000).gruposAdicionais, 0);
  assert.equal(dimensionarSesmt(3, 7001).gruposAdicionais, 1);
  assert.equal(dimensionarSesmt(3, 9000).gruposAdicionais, 1);
  assert.equal(dimensionarSesmt(3, 11001).gruposAdicionais, 2);
  assert.deepEqual(resumo(3, 9000), { tecnico: 11, engenheiro: 3, enfermagem: 2, enfermeiro: 1, medico: 3 });
  const eng = dimensionarSesmt(1, 9000).itens.find((i) => i.profissional === 'engenheiro')!;
  assert.equal(eng.quantidade, 2);
  assert.equal(eng.tempoParcial, false, 'o da faixa-base é integral; só o adicional é parcial');
  assert.ok(eng.detalhe?.includes('tempo parcial'));
});

test('CIPA: enquadramento no Quadro I', () => {
  assert.equal(dimensionarCipa(4, 19).obrigatoria, false);
  assert.equal(dimensionarCipa(1, 80).obrigatoria, false);
  assert.equal(dimensionarCipa(2, 50).obrigatoria, false);
  const r = dimensionarCipa(3, 20);
  assert.deepEqual([r.efetivos, r.suplentes], [1, 1]);
});

test('CIPA: faixas e acréscimo acima de 10.000', () => {
  const par = (g: number, n: number) => {
    const r = dimensionarCipa(g, n);
    return [r.efetivos, r.suplentes];
  };
  assert.deepEqual(par(1, 81), [1, 1]);
  assert.deepEqual(par(2, 141), [3, 2]);
  assert.deepEqual(par(3, 500), [5, 4]);
  assert.deepEqual(par(4, 1001), [9, 7]);
  assert.deepEqual(par(4, 10000), [13, 10]);
  assert.deepEqual(par(4, 12499), [13, 10]);
  assert.deepEqual(par(4, 12500), [15, 12]);
  assert.deepEqual(par(1, 15000), [10, 8]);
});

test('entradas inválidas', () => {
  assert.throws(() => dimensionarSesmt(5, 100));
  assert.throws(() => dimensionarCipa(0, 100));
  assert.throws(() => dimensionarCipa(2, -1));
});

test('área SST usa os dois dimensionamentos', () => {
  assert.ok(AREAS.sst.ferramentas.includes('dimensionar_sesmt'));
  assert.ok(AREAS.sst.ferramentas.includes('dimensionar_cipa'));
});
