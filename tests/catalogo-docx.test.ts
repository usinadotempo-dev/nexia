import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AREAS, ORDEM_AREAS, preencherReceita, receitasDaArea } from '../src/shared/areas/catalogo.ts';
import { crc32, gerarDocx } from '../src/shared/docx.ts';
import { esquemaJson, FERRAMENTAS } from '../src/shared/ferramentas/definicoes.ts';

test('toda ferramenta citada por uma área existe', () => {
  const nomes = new Set(FERRAMENTAS.map((f) => f.nome));
  for (const id of ORDEM_AREAS) {
    for (const f of AREAS[id].ferramentas) assert.ok(nomes.has(f), `${id}: ferramenta inexistente ${f}`);
  }
});

test('ids de receitas são únicos por área e os campos citados existem', () => {
  for (const id of ORDEM_AREAS) {
    const ids = AREAS[id].receitas.map((r) => r.id);
    assert.equal(new Set(ids).size, ids.length, id);
    for (const r of AREAS[id].receitas) {
      for (const [, campo] of r.prompt.matchAll(/\{\{(\w+)\}\}/g)) {
        assert.ok(r.campos?.some((c) => c.id === campo), `${id}/${r.id}: campo {{${campo}}} sem definição`);
      }
    }
  }
});

test('preencher receita remove linhas vazias de campos opcionais', () => {
  const receita = AREAS.juridico.receitas.find((r) => r.id === 'peca')!;
  const texto = preencherReceita(receita, { tipo: 'contestação', instrucoes: '' });
  assert.ok(texto.includes('contestação'));
  assert.ok(!texto.includes('{{'));
  assert.ok(!texto.includes('prioritárias)'), 'linha de instruções vazia deveria sumir');
  assert.ok(texto.includes('SEM markdown'), 'formato documento acrescenta regras de forma');
});

test('receitas personalizadas entram na área certa', () => {
  const r = receitasDaArea(AREAS.saude, [
    { id: '1', area: 'saude', nome: 'Minha', descricao: 'x', prompt: 'Faça {{instrucoes}}', formato: 'markdown' },
    { id: '2', area: 'juridico', nome: 'Outra', descricao: 'x', prompt: 'y', formato: 'markdown' }
  ]);
  assert.ok(r.some((x) => x.nome === 'Minha' && x.campos?.[0]?.id === 'instrucoes'));
  assert.ok(!r.some((x) => x.nome === 'Outra'));
});

test('esquema JSON das ferramentas', () => {
  const e = esquemaJson(FERRAMENTAS.find((f) => f.nome === 'corrigir_valor')!);
  assert.equal(e['type'], 'object');
  assert.deepEqual(e['required'], ['valor', 'indice', 'mes_inicial', 'mes_final']);
});

test('docx: CRC32 e assinatura ZIP', async () => {
  assert.equal(crc32(new TextEncoder().encode('123456789')), 0xcbf43926);
  const blob = gerarDocx('# Título\n\nParágrafo com **negrito**.\n\n| A | B |\n|---|---|\n| 1 | 2 |');
  const bytes = new Uint8Array(await blob.arrayBuffer());
  assert.deepEqual([...bytes.slice(0, 4)], [0x50, 0x4b, 0x03, 0x04]);
  assert.ok(new TextDecoder().decode(bytes).includes('word/document.xml'));
});
