import { pessoasDasPartes } from '@shared/anonimizador/papeis';
import { PORTA_PJE } from '@shared/constantes';
import type { MensagemPjeEntrada, MensagemPjeSaida, StatusAba } from '@shared/mensagens';
import type { DossieProcesso } from '@shared/tipos';
import type { Contexto, Visao } from '../contexto';
import { botao, botaoIcone, dialogo, el, estimarTokens, icone, toast } from '../dom';
import { espaco, type Fonte, type OrigemFonte } from '../estado';
import { extrairArquivo, lerAbaAtiva, TIPOS_ACEITOS } from '../extracao';
import { plural } from './comum';

const ICONE_ORIGEM: Record<OrigemFonte, string> = {
  arquivo: 'arquivo',
  colado: 'colar',
  pagina: 'pagina',
  selecao: 'pagina',
  pje: 'balanca',
  consulta: 'busca'
};

/** Texto consolidado do processo (capa, partes, movimentações e documentos). */
export function textoDoDossie(d: DossieProcesso): string {
  const l: string[] = [
    `PROCESSO ${d.numeroProcesso ?? '(número não identificado)'}`,
    `Classe: ${d.classe ?? 'não identificada'} | Órgão julgador: ${d.orgaoJulgador ?? 'não identificado'}`,
    ''
  ];
  if (d.partes.length) {
    l.push('PARTES:', ...d.partes.map((p) => `- ${p.nome} (${p.papel}, polo ${p.polo})${p.documento ? ` — doc. ${p.documento}` : ''}`), '');
  }
  if (d.movimentacoes.length) {
    l.push('MOVIMENTAÇÕES (mais recentes ao final):', ...d.movimentacoes.slice(-80).map((m) => `${m.data} — ${m.descricao}`), '');
  }
  l.push('DOCUMENTOS:');
  for (const doc of d.documentos) {
    l.push('', `--- Documento id ${doc.id} | ${doc.tipo}${doc.data ? ` | ${doc.data}` : ''}${doc.statusExtracao === 'ocr' ? ' | OCR local' : ''} ---`);
    l.push(doc.texto ? doc.texto : `[não extraído${doc.motivoPendencia ? `: ${doc.motivoPendencia}` : ''}]`);
  }
  return l.join('\n');
}

export function criarVisaoFontes(ctx: Contexto): Visao {
  const raiz = el('div', { class: 'rolagem' });
  const entradaArquivo = el('input', { type: 'file', multiple: true, accept: TIPOS_ACEITOS, hidden: true });
  const lista = el('div', {});
  const resumo = el('div', { class: 'ajuda' });
  const previasAbertas = new Set<string>();

  // --- adicionar fontes ---
  async function processarArquivos(arquivos: FileList | File[]): Promise<void> {
    for (const arquivo of Array.from(arquivos)) {
      const fonte = espaco.adicionarFonte({ nome: arquivo.name, origem: 'arquivo', tipo: 'Arquivo', texto: '', status: 'extraindo' });
      try {
        const r = await extrairArquivo(arquivo, {
          maxPaginasOcr: espaco.config.ocrMaxPaginasPorDoc,
          aoProgresso: (t) => ctx.status(`${arquivo.name}: ${t}`, { carregando: true })
        });
        espaco.atualizarFonte(fonte.id, { texto: r.texto, tipo: r.tipo, detalhe: r.detalhe, status: 'pronta' });
        ctx.status(`${arquivo.name}: ${r.tipo}${r.detalhe ? ` (${r.detalhe})` : ''} — pronto.`);
      } catch (erro) {
        espaco.atualizarFonte(fonte.id, { status: 'erro', erro: erro instanceof Error ? erro.message : String(erro) });
        ctx.status(`${arquivo.name}: ${erro instanceof Error ? erro.message : String(erro)}`, { erro: true });
      }
    }
    espaco.reprocessar();
    espaco.notificar();
  }

  async function colarTexto(): Promise<void> {
    const nome = el('input', { type: 'text', placeholder: 'Ex.: Anotações da consulta', 'aria-label': 'Nome da fonte' });
    const texto = el('textarea', { rows: '10', placeholder: 'Cole aqui o texto…', 'aria-label': 'Texto' });
    const corpo = el(
      'div',
      { style: 'display:flex;flex-direction:column;gap:8px' },
      el('div', { class: 'campo' }, el('label', {}, 'Nome ', el('span', { class: 'opcional' }, '(opcional)')), nome),
      el('div', { class: 'campo' }, el('label', {}, 'Texto'), texto),
      el('p', { class: 'ajuda' }, 'O texto fica só na memória deste painel e passa pela proteção de dados antes de ir à IA.')
    );
    setTimeout(() => texto.focus(), 0);
    const escolha = await dialogo({ titulo: 'Colar texto', corpo, botoes: [{ id: 'cancelar', rotulo: 'Cancelar' }, { id: 'ok', rotulo: 'Adicionar', primario: true }] });
    if (escolha !== 'ok' || !texto.value.trim()) return;
    espaco.adicionarFonte({ nome: nome.value.trim() || `Texto colado ${espaco.fontes.length + 1}`, origem: 'colado', tipo: 'Texto', texto: texto.value.trim(), status: 'pronta' });
    espaco.reprocessar();
    espaco.notificar();
  }

  async function lerPagina(): Promise<void> {
    try {
      ctx.status('Lendo a página atual…', { carregando: true });
      const p = await lerAbaAtiva();
      espaco.adicionarFonte({
        nome: p.selecao ? `Seleção — ${p.titulo}` : p.titulo,
        origem: p.selecao ? 'selecao' : 'pagina',
        tipo: p.selecao ? 'Seleção de texto' : 'Página web',
        detalhe: new URL(p.url).host,
        texto: p.texto,
        status: 'pronta'
      });
      espaco.reprocessar();
      espaco.notificar();
      ctx.status(p.selecao ? 'Seleção da página adicionada.' : 'Página adicionada.');
    } catch (erro) {
      ctx.status(erro instanceof Error ? erro.message : String(erro), { erro: true });
    }
  }

  async function importarPje(): Promise<void> {
    const [aba] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    let st: StatusAba | null = null;
    if (aba?.id) {
      try {
        st = (await chrome.tabs.sendMessage(aba.id, { canal: 'STATUS_ABA' })) as StatusAba;
      } catch {
        st = null;
      }
    }
    if (!aba?.id || !st?.processo) {
      await dialogo({
        titulo: 'Importar processo do PJe',
        corpo: el(
          'div',
          { style: 'display:flex;flex-direction:column;gap:8px' },
          el('p', {}, st?.pje ? 'O PJe está aberto, mas nenhum processo foi detectado nesta aba.' : 'A aba ativa não é uma página do PJe.'),
          el('p', { class: 'ajuda' }, 'Abra os autos de um processo (ou uma tarefa com o processo) no PJe de qualquer tribunal, mantenha a aba ativa e tente de novo. A coleta usa a sua própria sessão no PJe; nada é enviado a servidores do NexIA.')
        ),
        botoes: [{ id: 'ok', rotulo: 'Entendi', primario: true }]
      });
      return;
    }
    const fonte = espaco.adicionarFonte({ nome: 'Processo do PJe', origem: 'pje', tipo: 'Processo judicial', texto: '', status: 'extraindo' });
    const porta = chrome.tabs.connect(aba.id, { name: PORTA_PJE });
    let concluido = false;
    porta.onMessage.addListener((m: MensagemPjeSaida) => {
      if (m.tipo === 'progresso') ctx.status(`PJe: ${m.texto}`, { carregando: true });
      else if (m.tipo === 'erro') {
        concluido = true;
        espaco.atualizarFonte(fonte.id, { status: 'erro', erro: m.mensagem });
        ctx.status(m.mensagem, { erro: true });
        porta.disconnect();
      } else if (m.tipo === 'dossie') {
        concluido = true;
        const d = m.dossie;
        espaco.pessoasConhecidas = [...pessoasDasPartes(d.partes), ...espaco.pessoasConhecidas];
        const extraidos = d.documentos.filter((x) => x.texto).length;
        espaco.atualizarFonte(fonte.id, {
          nome: `Processo ${d.numeroProcesso ?? d.idProcesso}`,
          texto: textoDoDossie(d),
          detalhe: `${plural(d.partes.length, 'parte')}, ${extraidos}/${d.documentos.length} documento(s) extraído(s)`,
          status: 'pronta'
        });
        espaco.reprocessar();
        espaco.notificar();
        ctx.status('Processo importado. As partes qualificadas serão pseudonimizadas pelo papel processual.');
        porta.disconnect();
      }
    });
    porta.onDisconnect.addListener(() => {
      if (!concluido) {
        espaco.atualizarFonte(fonte.id, { status: 'erro', erro: 'A página do PJe foi fechada ou recarregada durante a coleta.' });
        ctx.status('Coleta do PJe interrompida.', { erro: true });
      }
    });
    porta.postMessage({ tipo: 'coletar' } satisfies MensagemPjeEntrada);
  }

  // --- zona de soltar ---
  const zona = el(
    'div',
    { class: 'zona-soltar', role: 'button', tabindex: '0', 'aria-label': 'Escolher arquivos ou soltar aqui' },
    icone('arquivo'),
    el('strong', {}, 'Solte arquivos aqui ou clique para escolher'),
    el('span', { class: 'ajuda' }, 'PDF (inclusive digitalizado, com OCR local), Word, imagens, XML de NF-e, CSV, TXT')
  );
  zona.addEventListener('click', () => entradaArquivo.click());
  zona.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      entradaArquivo.click();
    }
  });
  zona.addEventListener('dragover', (ev) => {
    ev.preventDefault();
    zona.classList.add('sobre');
  });
  zona.addEventListener('dragleave', () => zona.classList.remove('sobre'));
  zona.addEventListener('drop', (ev) => {
    ev.preventDefault();
    zona.classList.remove('sobre');
    if (ev.dataTransfer?.files.length) void processarArquivos(ev.dataTransfer.files);
  });
  entradaArquivo.addEventListener('change', () => {
    if (entradaArquivo.files?.length) void processarArquivos(entradaArquivo.files);
    entradaArquivo.value = '';
  });

  const atalhos = el(
    'div',
    { class: 'atalhos-fonte' },
    botao('Colar texto', () => void colarTexto(), { icone: 'colar' }),
    botao('Página atual', () => void lerPagina(), { icone: 'pagina', titulo: 'Lê a seleção ou o texto visível da aba ativa' }),
    botao('Processo do PJe', () => void importarPje(), { icone: 'balanca', titulo: 'Importa autos do PJe aberto na aba ativa' })
  );

  raiz.append(zona, entradaArquivo, atalhos, el('div', { class: 'titulo-secao' }, 'Fontes desta sessão'), lista, resumo);

  // --- lista ---
  function itemFonte(f: Fonte): HTMLElement {
    const marcar = el('input', { type: 'checkbox', 'aria-label': `Incluir "${f.nome}" no contexto` });
    marcar.checked = f.incluida;
    marcar.disabled = f.status !== 'pronta';
    marcar.addEventListener('change', () => espaco.atualizarFonte(f.id, { incluida: marcar.checked }));

    const meta = el('div', { class: 'meta' }, el('span', {}, f.tipo));
    if (f.detalhe) meta.append(el('span', {}, `· ${f.detalhe}`));
    if (f.status === 'pronta') meta.append(el('span', {}, `· ${estimarTokens(f.texto.length)}`));
    if (f.status === 'extraindo') meta.append(el('span', { class: 'etiqueta' }, 'extraindo…'));
    if (f.status === 'erro') meta.append(el('span', { class: 'etiqueta cheia' }, 'erro'));

    const corpo = el('div', { class: 'corpo' }, el('span', { class: 'nome', title: f.nome }, f.nome), meta);
    if (f.status === 'erro' && f.erro) corpo.append(el('span', { class: 'ajuda' }, f.erro));
    if (previasAbertas.has(f.id) && f.status === 'pronta') {
      corpo.append(el('div', { class: 'previa', tabindex: '0', 'aria-label': 'Prévia do texto extraído' }, f.texto.slice(0, 6000) + (f.texto.length > 6000 ? '\n…' : '')));
    }

    const acoes = el('div', { class: 'acoes' });
    if (f.status === 'pronta') {
      acoes.append(
        botaoIcone(previasAbertas.has(f.id) ? 'olhoFechado' : 'olho', previasAbertas.has(f.id) ? 'Ocultar prévia' : 'Ver texto extraído', () => {
          if (previasAbertas.has(f.id)) previasAbertas.delete(f.id);
          else previasAbertas.add(f.id);
          atualizar();
        })
      );
    }
    acoes.append(
      botaoIcone('lixeira', `Remover "${f.nome}"`, () => {
        espaco.removerFonte(f.id);
        toast(`"${f.nome}" removida.`);
      })
    );
    return el('div', { class: `item${f.incluida ? '' : ' excluida'}` }, marcar, icone(ICONE_ORIGEM[f.origem]), corpo, acoes);
  }

  function atualizar(): void {
    lista.textContent = '';
    resumo.textContent = '';
    if (espaco.fontes.length === 0) {
      lista.append(
        el(
          'div',
          { class: 'vazio' },
          icone('arquivo'),
          el('strong', {}, 'Nenhuma fonte ainda'),
          el('span', {}, 'Fontes são o material que a IA vai ler: documentos, páginas, processos. Você também pode conversar sem fontes.')
        )
      );
      return;
    }
    const caixa = el('div', { class: 'lista' });
    for (const f of espaco.fontes) caixa.append(itemFonte(f));
    lista.append(caixa);
    const incluidas = espaco.fontesIncluidas();
    resumo.append(
      `${plural(incluidas.length, 'fonte')} no contexto · ${estimarTokens(espaco.caracteresContexto())}. `,
      espaco.protecao ? 'Os dados pessoais são pseudonimizados antes do envio.' : 'Proteção desligada: o texto vai como está.'
    );
  }

  return { elemento: raiz, atualizar };
}
