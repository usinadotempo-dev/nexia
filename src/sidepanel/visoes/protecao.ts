import { TIPOS_ENTIDADE, TODOS_OS_TIPOS, type TipoEntidade } from '@shared/anonimizador/detectores';
import type { EntidadeRegistro } from '@shared/anonimizador/motor';
import { TIPOS_GUARDA } from '@shared/anonimizador/guarda';
import { destacarPseudonimos } from '@shared/markdown';
import type { Contexto, Visao } from '../contexto';
import { baixar, botao, copiar, el, icone, interruptor, toast } from '../dom';
import { espaco } from '../estado';
import { confirmarTrocaProtecao, plural } from './comum';

export function criarVisaoProtecao(ctx: Contexto): Visao {
  const raiz = el('div', { class: 'rolagem' });
  let fontePrevia: string | null = null;
  const gruposAbertos = new Set<TipoEntidade>();

  function textoProtegidoCompleto(): string {
    return espaco
      .fontesIncluidas()
      .map((f) => `=== ${espaco.paraIa(f.nome)} ===\n${espaco.textoParaIa(f)}`)
      .join('\n\n');
  }

  function relatorio(): string {
    const resumo = espaco.sessao.resumoPorTipo();
    const linhas = [
      'RELATÓRIO DE PSEUDONIMIZAÇÃO — NexIA (processamento local)',
      `Data: ${new Date().toLocaleString('pt-BR')}`,
      `Área: ${espaco.area.nome}`,
      `Fontes: ${espaco.fontesIncluidas().map((f) => espaco.paraIa(f.nome)).join('; ') || 'nenhuma'}`,
      '',
      'Entidades pseudonimizadas por tipo:',
      ...Object.entries(resumo).map(([t, n]) => `- ${TIPOS_ENTIDADE[t as TipoEntidade].rotulo}: ${n}`),
      '',
      `Entidades mantidas por decisão do usuário: ${espaco.sessao.entidades().filter((e) => e.ignorada).length}`,
      `Tipos detectados: ${espaco.tiposAtivos().map((t) => TIPOS_ENTIDADE[t].rotulo).join(', ')}`,
      `Detecção de nomes por dicionário: ${espaco.config.detectarNomes ? 'ligada' : 'desligada'}`,
      '',
      'Nenhum dado original consta deste relatório. O mapa de reidentificação existe apenas na memória do navegador do usuário.'
    ];
    return linhas.join('\n');
  }

  function linhaEntidade(e: EntidadeRegistro): HTMLElement {
    const marcar = el('input', { type: 'checkbox', 'aria-label': `Mascarar ${e.original}` });
    marcar.checked = !e.ignorada;
    marcar.addEventListener('change', () => {
      espaco.sessao.ignorar(e.chave, !marcar.checked);
      espaco.reprocessar();
      espaco.notificar();
    });
    return el(
      'label',
      { class: `entidade${e.ignorada ? ' ignorada' : ''}` },
      el('span', { class: 'token' }, e.token),
      el('span', { class: 'original', title: e.original }, e.original, el('span', { class: 'ajuda' }, ` · ${plural(e.ocorrencias, 'ocorrência')}`)),
      marcar
    );
  }

  function atualizar(): void {
    raiz.textContent = '';

    // --- estado geral ---
    const chave = interruptor('Proteção de dados', espaco.protecao, (ligada) => {
      void (async () => {
        if (!(await confirmarTrocaProtecao(ligada))) return atualizar();
        espaco.definirProtecao(ligada);
      })();
    });
    const cab = el(
      'div',
      { class: 'cartao suave' },
      el('div', { class: 'linha-botoes', style: 'justify-content:space-between' }, chave, el('span', { class: 'etiqueta' }, '100% local')),
      el(
        'p',
        { class: 'ajuda', style: 'margin-top:8px' },
        'Antes de qualquer envio, nomes, documentos e contatos são trocados por pseudônimos ([PESSOA_1], [CPF_2]…), sempre os mesmos dentro da sessão. Nenhuma IA participa dessa etapa. As respostas voltam com os dados reais só nesta tela.'
      )
    );
    raiz.append(cab);

    if (!espaco.protecao) {
      raiz.append(
        el(
          'div',
          { class: 'vazio' },
          icone('escudo'),
          el('strong', {}, 'Proteção desligada'),
          el('span', {}, 'As fontes e mensagens serão enviadas à IA como estão. Ligue a proteção para pseudonimizar dados pessoais.')
        )
      );
      return;
    }

    // --- resumo ---
    const entidades = espaco.sessao.entidades().filter((e) => e.ocorrencias > 0);
    const resumo = espaco.sessao.resumoPorTipo();
    const chips = el('div', { class: 'resumo-tipos' });
    for (const [tipo, n] of Object.entries(resumo)) chips.append(el('span', { class: 'etiqueta cheia' }, `${TIPOS_ENTIDADE[tipo as TipoEntidade].rotulo}: ${n}`));
    raiz.append(el('div', { class: 'titulo-secao' }, 'O que foi pseudonimizado'));
    if (entidades.length === 0) {
      raiz.append(
        el(
          'p',
          { class: 'ajuda' },
          espaco.fontes.length ? 'Nenhum dado pessoal detectado nas fontes incluídas. Revise os tipos abaixo ou adicione termos.' : 'Adicione fontes para ver aqui o que será pseudonimizado. Funciona sem chave de IA: você pode só anonimizar e copiar o resultado.'
        )
      );
    } else {
      raiz.append(chips);
      // --- revisão por tipo ---
      const porTipo = new Map<TipoEntidade, EntidadeRegistro[]>();
      for (const e of entidades) porTipo.set(e.tipo, [...(porTipo.get(e.tipo) ?? []), e]);
      const lista = el('div', { class: 'cartao' });
      for (const [tipo, itens] of porTipo) {
        const grupo = el('details', { class: 'grupo-tipo', open: gruposAbertos.has(tipo) || porTipo.size === 1 });
        grupo.addEventListener('toggle', () => (grupo.open ? gruposAbertos.add(tipo) : gruposAbertos.delete(tipo)));
        grupo.append(el('summary', {}, TIPOS_ENTIDADE[tipo].rotulo, el('span', { class: 'contador' }, String(itens.length))));
        for (const e of itens) grupo.append(linhaEntidade(e));
        lista.append(grupo);
      }
      raiz.append(lista, el('p', { class: 'ajuda' }, 'Desmarque o que NÃO é dado pessoal (ex.: nome de uma lei ou de uma empresa). A decisão vale para esta sessão.'));
    }

    // --- termos personalizados ---
    const termo = el('input', { type: 'text', placeholder: 'Ex.: nome do cliente, apelido, empresa', 'aria-label': 'Termo a mascarar' });
    const lembrar = el('input', { type: 'checkbox' });
    const adicionar = () => {
      const t = termo.value.trim();
      if (t.length < 2) return;
      if (lembrar.checked) void ctx.salvarConfig({ sempreMascarar: [...espaco.config.sempreMascarar, t] });
      else espaco.sempreMascararSessao.push(t);
      termo.value = '';
      espaco.reprocessar();
      espaco.notificar();
      toast(`"${t}" será sempre mascarado${lembrar.checked ? ' (também nas próximas sessões)' : ' nesta sessão'}.`);
    };
    termo.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') {
        ev.preventDefault();
        adicionar();
      }
    });
    raiz.append(
      el('div', { class: 'titulo-secao' }, 'Mascarar também'),
      el(
        'div',
        { class: 'cartao', style: 'display:flex;flex-direction:column;gap:8px' },
        el('div', { class: 'linha-botoes', style: 'flex-wrap:nowrap' }, termo, botao('Adicionar', adicionar, { icone: 'mais' })),
        el('label', { class: 'check' }, lembrar, 'Lembrar nas próximas sessões'),
        espaco.sempreMascararSessao.length || espaco.config.sempreMascarar.length
          ? el('p', { class: 'ajuda' }, `Termos: ${[...espaco.config.sempreMascarar, ...espaco.sempreMascararSessao].join(' · ')}`)
          : null
      )
    );

    // --- tipos detectados ---
    const ativos = new Set(espaco.tiposAtivos());
    const grade = el('div', { class: 'grade-tipos' });
    for (const tipo of TODOS_OS_TIPOS) {
      if (tipo === 'PERSONALIZADO') continue;
      const c = el('input', { type: 'checkbox' });
      c.checked = ativos.has(tipo);
      c.addEventListener('change', () => {
        const novos = TODOS_OS_TIPOS.filter((t) => (t === tipo ? c.checked : ativos.has(t) || t === 'PERSONALIZADO'));
        void ctx.salvarConfig({ detectoresPorArea: { ...espaco.config.detectoresPorArea, [espaco.area.id]: novos } });
        espaco.reprocessar();
        espaco.notificar();
      });
      grade.append(el('label', { class: 'check', title: TIPOS_ENTIDADE[tipo].descricao }, c, TIPOS_ENTIDADE[tipo].rotulo));
    }
    const nomes = interruptor('Detectar nomes por dicionário', espaco.config.detectarNomes, (v) => {
      void ctx.salvarConfig({ detectarNomes: v });
      espaco.reprocessar();
      espaco.notificar();
    });
    const detalhesTipos = el(
      'details',
      { class: 'cartao' },
      el('summary', { style: 'cursor:pointer;font-weight:600' }, `Tipos detectados — padrão da área ${espaco.area.nome}`),
      el('div', { style: 'display:flex;flex-direction:column;gap:10px;margin-top:10px' }, nomes, grade, botao('Restaurar padrão da área', () => {
        const copia = { ...espaco.config.detectoresPorArea };
        delete copia[espaco.area.id];
        void ctx.salvarConfig({ detectoresPorArea: copia });
        espaco.reprocessar();
        espaco.notificar();
      }, { classe: 'pequeno' }))
    );
    raiz.append(detalhesTipos);

    // --- prévia ---
    const incluidas = espaco.fontesIncluidas();
    if (incluidas.length) {
      if (!fontePrevia || !incluidas.some((f) => f.id === fontePrevia)) fontePrevia = incluidas[0]!.id;
      const seletor = el('select', { 'aria-label': 'Fonte da prévia' });
      for (const f of incluidas) seletor.append(el('option', { value: f.id, selected: f.id === fontePrevia }, f.nome));
      const previa = el('div', { class: 'previa-protegida', tabindex: '0', 'aria-label': 'Texto como será enviado à IA' });
      const pintar = () => {
        const f = incluidas.find((x) => x.id === fontePrevia);
        previa.innerHTML = f ? destacarPseudonimos(espaco.textoParaIa(f).slice(0, 20_000)) : '';
      };
      seletor.addEventListener('change', () => {
        fontePrevia = seletor.value;
        pintar();
      });
      pintar();
      raiz.append(
        el('div', { class: 'titulo-secao' }, 'Prévia — como a IA vai ler'),
        seletor,
        previa,
        el(
          'div',
          { class: 'linha-botoes' },
          botao('Copiar texto protegido', () => void copiar(textoProtegidoCompleto(), 'Texto protegido copiado — pode colar em qualquer IA.'), { classe: 'primario', icone: 'copiar' }),
          botao('Baixar TXT', () => baixar(textoProtegidoCompleto(), `nexia-protegido-${new Date().toISOString().slice(0, 10)}.txt`), { icone: 'baixar' }),
          botao('Copiar relatório', () => void copiar(relatorio(), 'Relatório copiado (sem dados originais).'), { classe: 'fantasma' })
        )
      );
    }

    raiz.append(
      el(
        'p',
        { class: 'ajuda' },
        `Guarda de saída: ${espaco.config.guardaSaida === 'desligada' ? 'desligada' : `${espaco.config.guardaSaida === 'bloquear' ? 'bloqueia' : 'pede confirmação para'} envios com ${espaco.config.guardaTipos.map((t) => TIPOS_GUARDA[t]).join(', ')}`}. Ajuste em Opções.`
      )
    );
  }

  return { elemento: raiz, atualizar };
}
