import assert from 'node:assert/strict';
import { test } from 'node:test';
import { aplicarRegexLocal, aplicarRegexLocalContado, verificarResiduos } from '../src/content/anonimizador/regex-local.ts';
import {
  aplicarSubstituicoes,
  aplicarSubstituicoesContado,
  montarSubstituicoes,
  regexDeNome
} from '../src/content/anonimizador/partes-local.ts';

test('mascara CPF formatado e ancorado', () => {
  const saida = aplicarRegexLocal('O autor, CPF 123.456.789-01, e o corréu (CPF: 98765432100).');
  assert.ok(!saida.includes('123.456.789-01'));
  assert.ok(!saida.includes('98765432100'));
  assert.ok(saida.includes('[CPF OMITIDO]'));
});

test('mascara CNPJ, e-mail, CEP, telefone e OAB', () => {
  const saida = aplicarRegexLocal(
    'Empresa 12.345.678/0001-90, contato@escritorio.adv.br, CEP 60000-000, fone (85) 99999-8888, OAB/CE 12345.'
  );
  assert.ok(!/12\.345\.678\/0001-90/.test(saida));
  assert.ok(!saida.includes('contato@escritorio.adv.br'));
  assert.ok(!saida.includes('60000-000'));
  assert.ok(!saida.includes('99999-8888'));
  assert.ok(!/OAB\/CE\s*12345/.test(saida));
});

test('mascara número de processo CNJ', () => {
  const saida = aplicarRegexLocal('Processo 0801234-55.2024.4.05.8100 em curso.');
  assert.ok(saida.includes('[NUMERO DE PROCESSO OMITIDO]'));
  assert.ok(!saida.includes('0801234-55'));
});

test('RG não colide com trechos com barra ou pontos de leis', () => {
  const entrada = 'Nos termos da Lei 8.213/91 e do art. 1.022 do CPC. RG 12.345.678-9 do autor.';
  const saida = aplicarRegexLocal(entrada);
  assert.ok(saida.includes('8.213/91'), 'referência de lei preservada');
  assert.ok(!saida.includes('12.345.678-9'), 'RG mascarado');
});

test('regex de nome é acento- e caixa-insensível', () => {
  // regexDeNome tem flag /g (necessária para replace-all), então cada teste
  // usa uma instância nova para não herdar o lastIndex da chamada anterior.
  assert.ok(regexDeNome('José da Conceição').test('JOSE DA CONCEICAO compareceu'));
  assert.ok(regexDeNome('José da Conceição').test('o senhor josé da conceição'));
  assert.ok(!regexDeNome('José da Conceição').test('Maria José da Conceiçãozinha'));
});

test('substituição usa papel processual das partes qualificadas do PJe', () => {
  const substituicoes = montarSubstituicoes([
    { nome: 'Francisco das Chagas Silva', papel: 'AUTOR', polo: 'ativo', documento: '123.456.789-01' },
    { nome: 'Maria Oliveira Costa', papel: 'ADVOGADA', polo: 'ativo' },
    { nome: 'INSS - INSTITUTO NACIONAL DO SEGURO SOCIAL', papel: 'REU', polo: 'passivo' }
  ]);
  const texto = 'FRANCISCO DAS CHAGAS SILVA, representado por Maria Oliveira Costa, move ação contra o INSS.';
  const saida = aplicarSubstituicoes(texto, substituicoes);
  assert.ok(saida.includes('[PARTE AUTORA]'));
  assert.ok(saida.includes('[ADVOGADO DO POLO ATIVO]'));
  assert.ok(saida.includes('INSS'), 'ente público preservado');
  assert.ok(!/(Francisco|Maria Oliveira)/i.test(saida));
});

test('contagem de PII por tipo alimenta o relatório de auditoria', () => {
  const { contagem } = aplicarRegexLocalContado(
    'CPF 123.456.789-01, CPF 987.654.321-00, CNPJ 12.345.678/0001-90, e-mail a@b.com.'
  );
  assert.equal(contagem.CPF, 2);
  assert.equal(contagem.CNPJ, 1);
  assert.equal(contagem.email, 1);
  assert.equal(contagem.RG, 0);
});

test('contagem de substituições de nome', () => {
  const subs = montarSubstituicoes([{ nome: 'Carlos Eduardo Nunes', papel: 'AUTOR', polo: 'ativo' }]);
  const { texto, contagem } = aplicarSubstituicoesContado(
    'Carlos Eduardo Nunes assina. Depois, CARLOS EDUARDO NUNES ratifica.',
    subs
  );
  assert.equal(contagem, 2);
  assert.ok(!/Carlos Eduardo/i.test(texto));
});

test('pipeline completo não deixa resíduos de PII', () => {
  const substituicoes = montarSubstituicoes([{ nome: 'Ana Beatriz Ramos', papel: 'REQUERENTE', polo: 'ativo' }]);
  const bruto =
    'Ana Beatriz Ramos, CPF 111.222.333-44, e-mail ana@exemplo.com, processo 0800001-11.2025.4.05.8100.';
  const saida = aplicarRegexLocal(aplicarSubstituicoes(bruto, substituicoes));
  assert.deepEqual(verificarResiduos(saida), []);
  assert.ok(!/Ana Beatriz/i.test(saida));
});
