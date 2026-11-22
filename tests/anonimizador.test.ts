import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TODOS_OS_TIPOS } from '../src/shared/anonimizador/detectores.ts';
import { verificarGuarda } from '../src/shared/anonimizador/guarda.ts';
import { SessaoAnonimizacao } from '../src/shared/anonimizador/motor.ts';
import { pessoasDasPartes } from '../src/shared/anonimizador/papeis.ts';

const TEXTO =
  'O paciente José da Silva, CPF 529.982.247-25, residente na Rua das Flores, 123, CEP 60000-000, ' +
  'telefone (85) 99999-1234, e-mail jose@exemplo.com, foi atendido pela Dra. Ana Paula Ribeiro, CRM/CE 12345. ' +
  'A Lei Maria da Penha não se aplica. Processo 0000832-35.2018.4.01.3202. José da Silva retornou em 2024.';

function sessao(extra: Partial<ConstructorParameters<typeof SessaoAnonimizacao>[0]> = {}): SessaoAnonimizacao {
  return new SessaoAnonimizacao({ tipos: TODOS_OS_TIPOS, detectarNomes: true, ...extra });
}

test('remove dados pessoais e mantém o restante', () => {
  const s = sessao();
  const { texto } = s.anonimizar(TEXTO);
  for (const proibido of ['529.982.247-25', 'jose@exemplo.com', '60000-000', '99999-1234', 'José da Silva', 'Ana Paula Ribeiro', '0000832-35.2018.4.01.3202', '12345']) {
    assert.ok(!texto.includes(proibido), `vazou: ${proibido}\n${texto}`);
  }
  assert.ok(texto.includes('Maria da Penha'), 'não deveria mascarar o nome da lei');
  assert.ok(texto.includes('[CPF_1]'));
  assert.ok(texto.includes('em 2024'));
});

test('pseudônimos são estáveis e reversíveis', () => {
  const s = sessao();
  const { texto } = s.anonimizar(TEXTO);
  const ocorrencias = texto.match(/\[PESSOA_1\]/g) ?? [];
  assert.equal(ocorrencias.length, 2, texto);
  assert.equal(s.anonimizar('Novamente José da Silva.').texto, 'Novamente [PESSOA_1].');
  assert.equal(s.desanonimizar(texto), TEXTO);
});

test('ignorar uma entidade mantém o texto original', () => {
  const s = sessao();
  s.anonimizar(TEXTO);
  const cpf = s.entidades().find((e) => e.tipo === 'CPF')!;
  s.ignorar(cpf.chave, true);
  s.zerarContagens();
  assert.ok(s.anonimizar(TEXTO).texto.includes('529.982.247-25'));
});

test('não confunde valores, anos e leis com documentos', () => {
  const s = sessao();
  const original = 'Valor de R$ 1.234.567,89 no período 2020-2024, conforme a Lei 8.213/91 e o art. 5º.';
  assert.equal(s.anonimizar(original).texto, original);
});

test('pessoas conhecidas (partes do PJe) recebem o papel processual', () => {
  const pessoas = pessoasDasPartes([
    { nome: 'MARIA APARECIDA DOS SANTOS', papel: 'AUTOR', polo: 'ativo' },
    { nome: 'INSTITUTO NACIONAL DO SEGURO SOCIAL - INSS', papel: 'RÉU', polo: 'passivo' },
    { nome: 'JOÃO PEREIRA LIMA', papel: 'ADVOGADO', polo: 'ativo' }
  ]);
  assert.equal(pessoas.length, 2);
  const s = sessao({ pessoasConhecidas: pessoas });
  const r = s.anonimizar('A autora Maria Aparecida dos Santos, representada por João Pereira Lima, contra o INSS.').texto;
  assert.ok(r.includes('[PARTE AUTORA]'), r);
  assert.ok(r.includes('[ADVOGADO DO POLO ATIVO]'), r);
  assert.ok(r.includes('INSS'), r);
});

test('termos personalizados e "nunca mascarar"', () => {
  const s = sessao({ sempreMascarar: ['Clínica Bem Viver'], nuncaMascarar: ['Ana Paula Ribeiro'] });
  const r = s.anonimizar('Atendimento na Clinica Bem Viver com a Dra. Ana Paula Ribeiro.').texto;
  assert.ok(r.includes('[SIGILOSO_1]'), r);
  assert.ok(r.includes('Ana Paula Ribeiro'), r);
});

test('guarda de saída encontra CPF válido e ignora pseudônimos', () => {
  assert.deepEqual(verificarGuarda('CPF 529.982.247-25', ['CPF']), [{ tipo: 'CPF', quantidade: 1 }]);
  assert.deepEqual(verificarGuarda('CPF [CPF_1] e 123.456.789-00', ['CPF']), []);
});
