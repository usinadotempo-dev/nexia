import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  chaveNfeValida,
  cnpjValido,
  cnsValido,
  cpfValido,
  luhnValido,
  pisValido,
  processoCnjValido,
  tituloEleitorValido
} from '../src/shared/anonimizador/validadores.ts';

test('CPF', () => {
  assert.equal(cpfValido('529.982.247-25'), true);
  assert.equal(cpfValido('11144477735'), true);
  assert.equal(cpfValido('529.982.247-24'), false);
  assert.equal(cpfValido('111.111.111-11'), false);
});

test('CNPJ numérico e alfanumérico (IN RFB 2.229/2024)', () => {
  assert.equal(cnpjValido('11.222.333/0001-81'), true);
  assert.equal(cnpjValido('11.222.333/0001-80'), false);
  assert.equal(cnpjValido('12.ABC.345/01DE-35'), true);
  assert.equal(cnpjValido('12ABC34501DE36'), false);
});

test('PIS, CNS, título, Luhn', () => {
  assert.equal(pisValido('120.54485.89-8'), true);
  assert.equal(pisValido('120.54485.89-7'), false);
  assert.equal(cnsValido('123 4567 8901 0000'), true);
  assert.equal(cnsValido('123 4567 8901 0001'), false);
  assert.equal(tituloEleitorValido('1234 5678 0795'), true);
  assert.equal(tituloEleitorValido('1234 5678 0796'), false);
  assert.equal(luhnValido('4111 1111 1111 1111'), true);
  assert.equal(luhnValido('4111 1111 1111 1112'), false);
});

test('Número CNJ (módulo 97) e chave de NF-e (módulo 11)', () => {
  assert.equal(processoCnjValido('0000832-35.2018.4.01.3202'), true);
  assert.equal(processoCnjValido('0000832-36.2018.4.01.3202'), false);
  assert.equal(chaveNfeValida('35240111222333000181550010000001231123456780'), true);
  assert.equal(chaveNfeValida('35240111222333000181550010000001231123456781'), false);
});
