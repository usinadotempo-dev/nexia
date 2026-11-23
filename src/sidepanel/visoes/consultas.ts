import { FERRAMENTAS, ROTULOS_CATEGORIA, type DefinicaoFerramenta } from '@shared/ferramentas/definicoes';
import { renderizarMarkdown } from '@shared/markdown';
import { enviar, type RespostaFerramenta } from '@shared/mensagens';
import type { Contexto, Visao } from '../contexto';
import { botao, botaoIcone, copiar, el, icone, toast } from '../dom';
import { espaco } from '../estado';

function chaveFaltando(def: DefinicaoFerramenta): string | null {
  if (def.requerChave === 'datajud' && !espaco.config.datajudChave.trim()) return 'requer chave do DataJud';
  if (def.requerChave === 'transparencia' && !espaco.config.transparenciaChave.trim()) return 'requer chave gratuita';
  return null;
}

export function criarVisaoConsultas(ctx: Contexto): Visao {
  const raiz = el('div', { class: 'rolagem' });
  let selecionada: DefinicaoFerramenta | null = null;
  let filtro = '';
  let ultimoResultado: { titulo: string; texto: string } | null = null;

  function abrir(def: DefinicaoFerramenta): void {
    selecionada = def;
    ultimoResultado = null;
    atualizar();
  }

  function itemFerramenta(def: DefinicaoFerramenta): HTMLElement {
    const falta = chaveFaltando(def);
    const desligada = espaco.config.ferramentasDesligadas.includes(def.nome);
    const b = el(
      'button',
      { type: 'button', class: 'ferramenta' },
      icone('ferramenta'),
      el('span', { class: 'corpo' }, el('b', {}, def.titulo), el('span', {}, def.descricao)),
      falta ? el('span', { class: 'etiqueta' }, falta) : desligada ? el('span', { class: 'etiqueta' }, 'desligada') : el('span', { class: 'etiqueta' }, ROTULOS_CATEGORIA[def.categoria])
    );
    b.addEventListener('click', () => abrir(def));
    return b;
  }

  function lista(): void {
    const busca = el('input', { type: 'search', placeholder: 'Buscar consulta (CNPJ, prazo, IPCA, bula…)', 'aria-label': 'Buscar consulta', value: filtro });
    busca.addEventListener('input', () => {
      filtro = busca.value;
      pintarLista();
    });
    const caixa = el('div', { style: 'display:flex;flex-direction:column;gap:12px' });
    const pintarLista = () => {
      caixa.textContent = '';
      const f = filtro.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
      const casa = (d: DefinicaoFerramenta) => !f || `${d.titulo} ${d.descricao} ${d.fonte}`.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().includes(f);
      const daArea = FERRAMENTAS.filter((d) => espaco.area.ferramentas.includes(d.nome) && casa(d));
      const outras = FERRAMENTAS.filter((d) => !espaco.area.ferramentas.includes(d.nome) && casa(d));
      if (daArea.length) caixa.append(el('div', { class: 'titulo-secao' }, `Para ${espaco.area.nome}`), el('div', { class: 'lista-ferramentas' }, ...daArea.map(itemFerramenta)));
      if (outras.length) caixa.append(el('div', { class: 'titulo-secao' }, 'Outras consultas'), el('div', { class: 'lista-ferramentas' }, ...outras.map(itemFerramenta)));
      if (!daArea.length && !outras.length) caixa.append(el('p', { class: 'ajuda' }, 'Nenhuma consulta encontrada.'));
    };
    pintarLista();
    raiz.append(
      el('p', { class: 'ajuda' }, 'Fontes oficiais e abertas, consultadas direto do seu navegador — funcionam sem chave de IA. Com "Consultas" ligado no Assistente, a IA também pode usá-las ao responder.'),
      busca,
      caixa
    );
  }

  function formulario(def: DefinicaoFerramenta): void {
    const campos = new Map<string, HTMLInputElement | HTMLSelectElement>();
    const corpo = el('div', { class: 'cartao', style: 'display:flex;flex-direction:column;gap:10px' });
    for (const p of def.parametros) {
      let campo: HTMLInputElement | HTMLSelectElement;
      if (p.enum) {
        campo = el('select', {});
        if (!p.obrigatorio && p.padrao === undefined) campo.append(el('option', { value: '' }, '—'));
        for (const o of p.enum) campo.append(el('option', { value: o, selected: p.padrao === o }, o));
      } else if (p.tipo === 'boolean') {
        campo = el('input', { type: 'checkbox' });
        (campo as HTMLInputElement).checked = p.padrao === true;
      } else {
        campo = el('input', { type: p.tipo === 'string' ? 'text' : 'number', placeholder: p.exemplo ?? '', value: p.padrao !== undefined ? String(p.padrao) : undefined });
      }
      campo.id = `cs-${p.nome}`;
      campos.set(p.nome, campo);
      if (p.tipo === 'boolean') {
        corpo.append(el('label', { class: 'check', for: campo.id }, campo, p.descricao));
      } else {
        corpo.append(el('div', { class: 'campo' }, el('label', { for: campo.id }, p.descricao, p.obrigatorio ? '' : el('span', { class: 'opcional' }, ' (opcional)')), campo));
      }
    }
    const resultado = el('div', {});
    const falta = chaveFaltando(def);
    const executar = async () => {
      const args: Record<string, unknown> = {};
      for (const p of def.parametros) {
        const c = campos.get(p.nome)!;
        const v = c instanceof HTMLInputElement && c.type === 'checkbox' ? c.checked : c.value.trim();
        if (p.obrigatorio && v === '') {
          c.focus();
          toast(`Preencha "${p.descricao}".`);
          return;
        }
        if (v !== '') args[p.nome] = v;
      }
      botaoExecutar.disabled = true;
      ctx.status(`Consultando: ${def.titulo}…`, { carregando: true });
      try {
        // Consulta feita à mão pode esperar mais que a IA (o usuário vê o andamento).
        const r = await enviar<RespostaFerramenta>('FERRAMENTA_EXECUTAR', { nome: def.nome, args, prazoMs: 90_000 });
        if (r.falha) {
          ultimoResultado = null;
          resultado.textContent = '';
          resultado.append(el('div', { class: 'erro-msg' }, r.falha));
          ctx.status(r.falha, { erro: true });
        } else {
          ultimoResultado = { titulo: def.titulo, texto: r.texto };
          pintarResultado();
          ctx.status(`${def.titulo}: concluído.`);
        }
      } finally {
        botaoExecutar.disabled = false;
      }
    };
    const pintarResultado = () => {
      resultado.textContent = '';
      if (!ultimoResultado) return;
      const conteudo = el('div', { class: 'bolha resultado' });
      conteudo.innerHTML = renderizarMarkdown(ultimoResultado.texto);
      const r = ultimoResultado;
      resultado.append(
        el('div', { class: 'titulo-secao' }, 'Resultado'),
        el('div', { class: 'cartao' }, conteudo),
        el(
          'div',
          { class: 'linha-botoes', style: 'margin-top:8px' },
          botao('Copiar', () => void copiar(r.texto), { icone: 'copiar' }),
          botao('Adicionar às fontes', () => {
            espaco.adicionarFonte({ nome: `Consulta — ${r.titulo}`, origem: 'consulta', tipo: 'Resultado de consulta', detalhe: def.fonte, texto: r.texto, status: 'pronta' });
            espaco.reprocessar();
            espaco.notificar();
            toast('Resultado adicionado às fontes.', { rotulo: 'Perguntar à IA', aoClicar: () => ctx.irPara('assistente') });
          }, { icone: 'mais' })
        )
      );
    };
    const botaoExecutar = botao('Consultar', () => void executar(), { classe: 'primario', icone: 'busca', desabilitado: Boolean(falta) });
    corpo.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' && (ev.target as HTMLElement).tagName === 'INPUT') {
        ev.preventDefault();
        void executar();
      }
    });
    raiz.append(
      el('div', { class: 'linha-botoes' }, botaoIcone('voltar', 'Voltar à lista de consultas', () => {
        selecionada = null;
        atualizar();
      }), el('strong', { style: 'font-size:14px' }, def.titulo)),
      el('p', { class: 'ajuda' }, def.descricao),
      el('div', { class: 'transparencia' }, icone('info'), el('span', {}, `Fonte: ${def.fonte}. Ao consultar, sai deste navegador: ${def.envia}.`)),
      ...(falta ? [el('div', { class: 'erro-msg' }, `Esta consulta ${falta}. Configure em Opções → Integrações.`)] : []),
      corpo,
      el('div', { class: 'linha-botoes' }, botaoExecutar),
      resultado
    );
    pintarResultado();
    setTimeout(() => corpo.querySelector<HTMLElement>('input, select')?.focus(), 0);
  }

  function atualizar(): void {
    raiz.textContent = '';
    if (selecionada) formulario(selecionada);
    else lista();
  }

  // Não redesenha o formulário aberto (preserva o que o usuário digitou).
  const seguro = () => {
    if (!selecionada || !raiz.firstChild) atualizar();
  };
  return { elemento: raiz, atualizar: seguro, aoMostrar: seguro };
}
