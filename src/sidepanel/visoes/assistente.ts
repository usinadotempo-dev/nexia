import { descreverAchados, type AchadoGuarda } from '@shared/anonimizador/guarda';
import { montarSystemPrompt, preencherReceita, receitasDaArea } from '@shared/areas/catalogo';
import type { Receita } from '@shared/areas/tipos';
import { gerarDocx } from '@shared/docx';
import { obterFerramenta } from '@shared/ferramentas/definicoes';
import { gerarStream } from '@shared/llm-cliente';
import { destacarPseudonimos, markdownParaTexto, renderizarMarkdown } from '@shared/markdown';
import { enviar, type RespostaFerramenta, type RespostaModelosBuscar } from '@shared/mensagens';
import type { MensagemLLM, RequisicaoLLM } from '@shared/tipos';
import type { Contexto, Visao } from '../contexto';
import { baixar, botao, botaoIcone, copiar, dialogo, el, estimarTokens, icone, interruptor, toast } from '../dom';
import { espaco, type MensagemExibida } from '../estado';
import { plural } from './comum';

const ACK = 'Recebi as fontes e estou pronto para ajudar com base nelas.';

/** Ferramentas da área que podem ser oferecidas ao modelo (respeitando chaves e preferências). */
function ferramentasDisponiveis(): string[] {
  if (!espaco.config.ferramentasAutomaticas) return [];
  return espaco.area.ferramentas.filter((nome) => {
    const def = obterFerramenta(nome);
    if (!def || espaco.config.ferramentasDesligadas.includes(nome)) return false;
    if (def.requerChave === 'datajud' && !espaco.config.datajudChave.trim()) return false;
    if (def.requerChave === 'transparencia' && !espaco.config.transparenciaChave.trim()) return false;
    return true;
  });
}

export function criarVisaoAssistente(ctx: Contexto): Visao {
  const raiz = el('div', { style: 'display:flex;flex-direction:column;flex:1;min-height:0' });
  const conversa = el('div', { class: 'conversa', 'aria-live': 'polite', 'aria-busy': 'false' });
  const infoContexto = el('div', { class: 'contexto-info' });
  const folhaHost = el('div', {});
  const entrada = el('textarea', { rows: '1', placeholder: 'Pergunte, peça um texto, uma análise…', 'aria-label': 'Mensagem para o assistente' });
  const botaoEnviar = el('button', { type: 'button', class: 'enviar', title: 'Enviar (Enter)', 'aria-label': 'Enviar' }, icone('enviar'));
  const verPseudonimos = new Set<MensagemExibida>();
  let abortar: (() => void) | null = null;

  // ------------------------------------------------------------------ envio
  function requisicao(guardaConfirmada: boolean, temperatura?: number): RequisicaoLLM {
    const ferramentas = ferramentasDisponiveis();
    const ctxMsg = espaco.mensagemDeContexto();
    const mensagens: MensagemLLM[] = ctxMsg ? [ctxMsg, { papel: 'assistant', conteudo: ACK }, ...espaco.historico] : [...espaco.historico];
    return {
      system: montarSystemPrompt(espaco.area, { anonimizado: espaco.protecao, comFerramentas: ferramentas.length > 0 }),
      mensagens,
      ferramentas,
      guardaConfirmada,
      ...(temperatura !== undefined ? { temperatura } : {})
    };
  }

  function definirOcupado(ocupado: boolean): void {
    espaco.ocupado = ocupado;
    conversa.setAttribute('aria-busy', String(ocupado));
    botaoEnviar.textContent = '';
    botaoEnviar.append(icone(ocupado ? 'parar' : 'enviar'));
    botaoEnviar.title = ocupado ? 'Parar' : 'Enviar (Enter)';
    botaoEnviar.setAttribute('aria-label', ocupado ? 'Parar geração' : 'Enviar');
    atualizarBotaoEnviar();
  }

  /** Envia uma mensagem. `paraIa` já pode conter prompt de receita; `exibido` é o que aparece na bolha. */
  function enviarMensagem(paraIa: string, exibido: string, receita?: Receita): void {
    if (espaco.ocupado) return;
    espaco.historico.push({ papel: 'user', conteudo: espaco.paraIa(paraIa) });
    espaco.exibidas.push({ papel: 'usuario', texto: espaco.paraIa(exibido), receita: receita?.nome, consultas: [] });
    const resposta: MensagemExibida = { papel: 'assistente', texto: '', consultas: [] };
    espaco.exibidas.push(resposta);
    renderizarConversa();
    executar(resposta, false, receita?.temperatura);
  }

  function guardarPendente(resposta: MensagemExibida): void {
    const ultima = espaco.historico[espaco.historico.length - 1];
    if (ultima?.papel === 'user') {
      espaco.historico.pop();
      resposta.pendenteIa = typeof ultima.conteudo === 'string' ? ultima.conteudo : undefined;
    }
  }

  function tentarDeNovo(resposta: MensagemExibida): void {
    if (espaco.ocupado || resposta.pendenteIa === undefined) return;
    espaco.historico.push({ papel: 'user', conteudo: resposta.pendenteIa });
    resposta.pendenteIa = undefined;
    resposta.consultas = [];
    executar(resposta, false);
  }

  function executar(resposta: MensagemExibida, guardaConfirmada: boolean, temperatura?: number): void {
    definirOcupado(true);
    resposta.erro = undefined;
    resposta.texto = '';
    ctx.status('Gerando resposta…', { carregando: true });
    abortar = gerarStream(requisicao(guardaConfirmada, temperatura), {
      aoTrecho: (t) => {
        resposta.texto += t;
        atualizarBolha(resposta, true);
      },
      aoFim: (completo) => {
        resposta.texto = completo || resposta.texto;
        espaco.historico.push({ papel: 'assistant', conteudo: resposta.texto });
        definirOcupado(false);
        atualizarBolha(resposta, false);
        ctx.status('Resposta concluída. Revise antes de usar.');
        abortar = null;
      },
      aoErro: (mensagem) => {
        guardarPendente(resposta); // a pergunta volta a ficar "não respondida"
        resposta.erro = mensagem;
        definirOcupado(false);
        atualizarBolha(resposta, false);
        ctx.status(mensagem, { erro: true });
        abortar = null;
      },
      aoGuarda: (achados) => {
        definirOcupado(false);
        abortar = null;
        void tratarGuarda(resposta, achados, temperatura);
      },
      aoFerramenta: async (nome, args) => {
        const def = obterFerramenta(nome);
        const chip = { titulo: def?.titulo ?? nome, estado: 'andamento' as 'andamento' | 'ok' | 'falha', detalhe: def ? `${def.fonte} — envia ${def.envia}` : undefined };
        resposta.consultas.push(chip);
        atualizarBolha(resposta, true);
        ctx.status(`Consultando: ${chip.titulo}…`, { carregando: true });
        // Marcadores ([CNPJ_1]) são resolvidos AQUI, localmente, só para a consulta.
        const argsReais: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(args)) argsReais[k] = typeof v === 'string' ? espaco.paraTela(v) : v;
        const r = await enviar<RespostaFerramenta>('FERRAMENTA_EXECUTAR', { nome, args: argsReais });
        chip.estado = r.falha ? 'falha' : 'ok';
        if (r.falha) chip.detalhe = r.falha;
        atualizarBolha(resposta, true);
        ctx.status('Gerando resposta…', { carregando: true });
        if (r.falha) return { conteudo: `Falha na consulta: ${r.falha}`, erro: true };
        const conteudo = espaco.paraIa(r.texto); // o retorno também é pseudonimizado
        espaco.notificar();
        return { conteudo };
      }
    });
  }

  async function tratarGuarda(resposta: MensagemExibida, achados: AchadoGuarda[], temperatura?: number): Promise<void> {
    const escolha = await dialogo({
      titulo: 'Dados pessoais no conteúdo',
      corpo: el(
        'div',
        { style: 'display:flex;flex-direction:column;gap:8px' },
        el('p', {}, `A guarda de saída encontrou ${descreverAchados(achados)} no que seria enviado à IA.`),
        el('p', { class: 'ajuda' }, espaco.protecao ? 'Esses dados não foram reconhecidos pela proteção (ex.: tipo desligado). Revise os tipos detectados em Proteção.' : 'A proteção de dados está desligada.')
      ),
      botoes: [
        { id: 'cancelar', rotulo: 'Cancelar' },
        { id: 'enviar', rotulo: 'Enviar mesmo assim' },
        ...(espaco.protecao ? [{ id: 'revisar', rotulo: 'Revisar proteção', primario: true }] : [{ id: 'proteger', rotulo: 'Ligar proteção', primario: true }])
      ]
    });
    if (escolha === 'enviar') {
      executar(resposta, true, temperatura);
      return;
    }
    // Desfaz a pergunta pendente.
    const pergunta = espaco.exibidas[espaco.exibidas.length - 2];
    espaco.historico.pop();
    espaco.exibidas.splice(-2, 2);
    renderizarConversa();
    if (escolha === 'proteger') {
      espaco.definirProtecao(true);
      if (pergunta) entrada.value = espaco.paraTela(pergunta.texto);
      toast('Proteção ligada. Revise e envie novamente.');
    } else if (escolha === 'revisar') {
      ctx.irPara('protecao');
    }
  }

  // ------------------------------------------------------------------ receitas
  function fecharFolha(): void {
    folhaHost.textContent = '';
  }

  function abrirListaReceitas(): void {
    if (folhaHost.firstChild) return fecharFolha();
    const receitas = receitasDaArea(espaco.area, espaco.config.receitasPersonalizadas);
    const cab = el('div', { class: 'cab' }, icone('receitas'), el('strong', {}, `Receitas — ${espaco.area.nome}`), botaoIcone('fechar', 'Fechar', fecharFolha));
    const folha = el('div', { class: 'folha', role: 'dialog', 'aria-label': 'Receitas' }, cab);
    for (const r of receitas) {
      const opcao = el('button', { type: 'button', class: 'opcao-receita' }, el('b', {}, r.nome + (r.personalizada ? ' (minha)' : '')), el('span', {}, r.descricao));
      opcao.addEventListener('click', () => abrirFormularioReceita(r));
      folha.append(opcao);
    }
    folhaHost.append(folha);
    folha.querySelector<HTMLElement>('.opcao-receita')?.focus();
  }

  function abrirFormularioReceita(receita: Receita): void {
    fecharFolha();
    const valores = new Map<string, HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>();
    const conteudo = el('div', { class: 'conteudo' }, el('p', { class: 'ajuda' }, receita.descricao));
    if (receita.exigeFontes && espaco.fontesIncluidas().length === 0) {
      conteudo.append(el('div', { class: 'erro-msg' }, 'Esta receita trabalha sobre fontes. Adicione ao menos uma em "Fontes".'));
    }
    for (const c of receita.campos ?? []) {
      let campo: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      if (c.tipo === 'opcoes') {
        campo = el('select', {});
        for (const o of c.opcoes ?? []) campo.append(el('option', { value: o }, o));
      } else if (c.tipo === 'texto-longo') {
        campo = el('textarea', { rows: '3', placeholder: c.placeholder });
      } else {
        campo = el('input', { type: 'text', placeholder: c.placeholder });
      }
      campo.id = `rc-${c.id}`;
      valores.set(c.id, campo);
      conteudo.append(el('div', { class: 'campo' }, el('label', { for: campo.id }, c.rotulo, c.obrigatorio ? '' : el('span', { class: 'opcional' }, ' (opcional)')), campo));
    }
    const executarReceita = async () => {
      const preenchidos: Record<string, string> = {};
      for (const c of receita.campos ?? []) {
        const v = valores.get(c.id)!.value.trim();
        if (c.obrigatorio && !v) {
          valores.get(c.id)!.focus();
          toast(`Preencha "${c.rotulo}".`);
          return;
        }
        preenchidos[c.id] = v;
      }
      if (receita.exigeFontes && espaco.fontesIncluidas().length === 0) {
        ctx.irPara('fontes');
        toast('Adicione uma fonte para usar esta receita.');
        return;
      }
      let prompt = preencherReceita(receita, preenchidos);
      if (receita.usaBiblioteca) {
        try {
          const amostra = espaco.fontesIncluidas()[0]?.texto.slice(0, 600) ?? '';
          const { resultados } = await enviar<RespostaModelosBuscar>('MODELOS_BUSCAR', { consulta: `${receita.nome} ${Object.values(preenchidos).join(' ')} ${amostra}`, limite: 1 });
          const modelo = resultados[0];
          if (modelo) {
            prompt += `\n\nModelo de referência da biblioteca do usuário ("${modelo.nome}"): use-o como referência de estrutura, linguagem e estilo, adaptando ao caso concreto.\n--- INÍCIO DO MODELO ---\n${modelo.texto}\n--- FIM DO MODELO ---`;
            toast(`Usando o modelo "${modelo.nome}" da sua biblioteca.`);
          }
        } catch {
          /* sem biblioteca: segue sem modelo */
        }
      }
      fecharFolha();
      const resumoCampos = Object.entries(preenchidos)
        .filter(([, v]) => v)
        .map(([k, v]) => `${receita.campos?.find((c) => c.id === k)?.rotulo ?? k}: ${v}`)
        .join('\n');
      enviarMensagem(prompt, `${receita.nome}${resumoCampos ? `\n${resumoCampos}` : ''}`, receita);
    };
    const folha = el(
      'div',
      { class: 'folha', role: 'dialog', 'aria-label': receita.nome },
      el('div', { class: 'cab' }, botaoIcone('voltar', 'Voltar às receitas', abrirListaReceitas), el('strong', {}, receita.nome), botaoIcone('fechar', 'Fechar', fecharFolha)),
      conteudo
    );
    conteudo.append(el('div', { class: 'linha-botoes' }, botao('Executar', () => void executarReceita(), { classe: 'primario', icone: 'enviar' })));
    folhaHost.append(folha);
    (conteudo.querySelector<HTMLElement>('input, select, textarea') ?? conteudo.querySelector<HTMLElement>('button'))?.focus();
  }

  // ------------------------------------------------------------------ render
  const elementosBolha = new Map<MensagemExibida, HTMLElement>();

  function conteudoBolha(m: MensagemExibida): string {
    if (m.papel === 'usuario') return '';
    return verPseudonimos.has(m) ? destacarPseudonimos(m.texto) : renderizarMarkdown(espaco.paraTela(m.texto));
  }

  function montarMensagem(m: MensagemExibida): HTMLElement {
    const caixa = el('div', { class: `msg ${m.papel}` });
    if (m.papel === 'usuario') {
      if (m.receita) caixa.append(el('span', { class: 'rotulo-receita' }, `Receita: ${m.receita}`));
      caixa.append(el('div', { class: 'bolha' }, espaco.paraTela(m.texto)));
      return caixa;
    }
    preencherMensagemAssistente(caixa, m, espaco.ocupado && m === espaco.exibidas[espaco.exibidas.length - 1]);
    elementosBolha.set(m, caixa);
    return caixa;
  }

  function preencherMensagemAssistente(caixa: HTMLElement, m: MensagemExibida, gerando: boolean): void {
    caixa.textContent = '';
    caixa.classList.toggle('gerando', gerando);
    for (const c of m.consultas) {
      caixa.append(el('span', { class: `consulta-chip ${c.estado}`, title: c.detalhe }, `${c.estado === 'andamento' ? 'Consultando' : 'Consultou'}: ${c.titulo}`));
    }
    const bolha = el('div', { class: 'bolha' });
    bolha.innerHTML = conteudoBolha(m);
    if (m.texto || gerando) caixa.append(bolha);
    if (m.erro) {
      const ehUltima = m === espaco.exibidas[espaco.exibidas.length - 1];
      const tentar = ehUltima && m.pendenteIa !== undefined ? botao('Tentar de novo', () => tentarDeNovo(m), { classe: 'pequeno', icone: 'recarregar' }) : null;
      caixa.append(el('div', { class: 'erro-msg' }, el('div', {}, m.erro, tentar ? el('div', { style: 'margin-top:6px' }, tentar) : null)));
    }
    if (!gerando && m.texto) {
      const tela = () => espaco.paraTela(m.texto);
      caixa.append(
        el(
          'div',
          { class: 'acoes-msg' },
          botao('Copiar', () => void copiar(tela()), { classe: 'fantasma pequeno', icone: 'copiar', titulo: 'Copiar com formatação markdown' }),
          botao('Texto', () => void copiar(markdownParaTexto(tela()), 'Copiado como texto simples.'), { classe: 'fantasma pequeno', titulo: 'Copiar sem marcação' }),
          botao('Word', () => baixar(gerarDocx(tela()), `nexia-${espaco.area.id}-${new Date().toISOString().slice(0, 10)}.docx`), { classe: 'fantasma pequeno', icone: 'word', titulo: 'Baixar .docx' }),
          botao('Usar como fonte', () => {
            espaco.adicionarFonte({ nome: `Resposta do assistente ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, origem: 'colado', tipo: 'Texto gerado', texto: tela(), status: 'pronta' });
            espaco.reprocessar();
            espaco.notificar();
            toast('Resposta adicionada às fontes.');
          }, { classe: 'fantasma pequeno', icone: 'mais' }),
          espaco.protecao
            ? botao(verPseudonimos.has(m) ? 'Ver dados reais' : 'Ver como a IA viu', () => {
                if (verPseudonimos.has(m)) verPseudonimos.delete(m);
                else verPseudonimos.add(m);
                preencherMensagemAssistente(caixa, m, false);
              }, { classe: 'fantasma pequeno', icone: verPseudonimos.has(m) ? 'olho' : 'olhoFechado', titulo: 'Alterna entre o texto com pseudônimos (o que trafegou) e o texto com dados reais (só nesta tela)' })
            : null
        )
      );
    }
  }

  function atualizarBolha(m: MensagemExibida, gerando: boolean): void {
    const caixa = elementosBolha.get(m);
    if (!caixa) return renderizarConversa();
    const noFim = conversa.scrollHeight - conversa.scrollTop - conversa.clientHeight < 80;
    preencherMensagemAssistente(caixa, m, gerando);
    if (noFim) conversa.scrollTop = conversa.scrollHeight;
  }

  function estadoVazio(): HTMLElement {
    const area = espaco.area;
    const sugestoes = el('div', { class: 'sugestoes' });
    for (const r of receitasDaArea(area, espaco.config.receitasPersonalizadas).slice(0, 4)) {
      const b = el('button', { type: 'button', class: 'sugestao' }, el('b', {}, r.nome), el('span', {}, r.descricao));
      b.addEventListener('click', () => abrirFormularioReceita(r));
      sugestoes.append(b);
    }
    return el(
      'div',
      { class: 'vazio' },
      icone('conversa'),
      el('strong', {}, `Assistente — ${area.nome}`),
      el('span', {}, espaco.fontesIncluidas().length ? `Pergunte sobre as ${plural(espaco.fontesIncluidas().length, 'fonte')} carregadas ou comece por uma receita.` : 'Converse livremente ou adicione fontes para a IA trabalhar sobre seus documentos.'),
      sugestoes,
      area.aviso ? el('p', { class: 'aviso-area' }, area.aviso) : null
    );
  }

  function renderizarConversa(): void {
    conversa.textContent = '';
    elementosBolha.clear();
    if (espaco.exibidas.length === 0) {
      conversa.append(estadoVazio());
      return;
    }
    for (const m of espaco.exibidas) conversa.append(montarMensagem(m));
    conversa.scrollTop = conversa.scrollHeight;
  }

  function atualizarInfoContexto(): void {
    infoContexto.textContent = '';
    const n = espaco.fontesIncluidas().length;
    infoContexto.append(
      icone(espaco.protecao ? 'escudoOk' : 'escudo'),
      el('b', {}, espaco.protecao ? 'Protegido' : 'Sem proteção'),
      ` · ${n ? `${plural(n, 'fonte')} · ${estimarTokens(espaco.caracteresContexto())}` : 'sem fontes'}`
    );
    const ferramentas = ferramentasDisponiveis();
    if (ferramentas.length) infoContexto.append(` · ${plural(ferramentas.length, 'consulta disponível', 'consultas disponíveis')}`);
  }

  function atualizarBotaoEnviar(): void {
    botaoEnviar.disabled = !espaco.ocupado && !entrada.value.trim();
  }

  // ------------------------------------------------------------------ compositor
  function enviarDoCampo(): void {
    if (espaco.ocupado) {
      abortar?.();
      abortar = null;
      const ultima = espaco.exibidas[espaco.exibidas.length - 1];
      if (ultima && ultima.papel === 'assistente') {
        if (ultima.texto) espaco.historico.push({ papel: 'assistant', conteudo: `${ultima.texto}\n[resposta interrompida pelo usuário]` });
        else guardarPendente(ultima);
        ultima.erro = ultima.texto ? undefined : 'Geração interrompida.';
      }
      definirOcupado(false);
      renderizarConversa();
      ctx.status('Geração interrompida.');
      return;
    }
    const texto = entrada.value.trim();
    if (!texto) return;
    entrada.value = '';
    ajustarAltura();
    enviarMensagem(texto, texto);
  }

  function ajustarAltura(): void {
    entrada.style.height = 'auto';
    entrada.style.height = `${Math.min(160, entrada.scrollHeight)}px`;
    atualizarBotaoEnviar();
  }

  entrada.addEventListener('input', ajustarAltura);
  entrada.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' && !ev.shiftKey && !ev.isComposing) {
      ev.preventDefault();
      enviarDoCampo();
    }
  });
  botaoEnviar.addEventListener('click', enviarDoCampo);

  const consultasAuto = interruptor('Consultas', espaco.config.ferramentasAutomaticas, (v) => {
    void ctx.salvarConfig({ ferramentasAutomaticas: v });
    atualizarInfoContexto();
    ctx.status(v ? 'A IA poderá consultar APIs públicas e fazer cálculos (cada consulta aparece na resposta).' : 'Consultas automáticas desligadas.');
  }, 'Permite que a IA use APIs públicas (CNPJ, índices, prazos, DataJud…) durante a resposta');

  const barra = el(
    'div',
    { class: 'barra-compositor' },
    botao('Receitas', abrirListaReceitas, { classe: 'fantasma pequeno', icone: 'receitas', titulo: 'Prompts prontos da sua área' }),
    consultasAuto,
    el('span', { class: 'espaco' }),
    botao('Nova conversa', () => {
      if (espaco.ocupado) return;
      espaco.reiniciarConversa();
      ctx.status('Conversa reiniciada. As fontes continuam carregadas.');
    }, { classe: 'fantasma pequeno', icone: 'recarregar' })
  );

  raiz.append(conversa, el('div', { class: 'compositor' }, folhaHost, infoContexto, el('div', { class: 'entrada' }, entrada, botaoEnviar), barra));

  return {
    elemento: raiz,
    atualizar() {
      if (!espaco.ocupado) renderizarConversa();
      atualizarInfoContexto();
      (consultasAuto.querySelector('input') as HTMLInputElement).checked = espaco.config.ferramentasAutomaticas;
      atualizarBotaoEnviar();
    },
    aoMostrar() {
      setTimeout(() => entrada.focus(), 0);
    }
  };
}
