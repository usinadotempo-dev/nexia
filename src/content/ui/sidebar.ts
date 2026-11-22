/** Sidebar do NexIA: cabeçalho, status, abas Chat / Resumir / Minutar / Documentos / Anonimizar. */
import type { NaturezaMinuta, StatusExtracao } from '@shared/tipos';
import { NATUREZAS } from '@shared/prompts';
import type { RelatorioAnonimizacao } from '../anonimizador/anonimizar';
import { botao, el, ICONE_NEXIA_SVG, renderizarMarkdown } from './componentes';

export interface AcoesUi {
  aoEnviarChat(texto: string): void;
  aoAnonimizar(): void;
  aoBaixarTxt(): void;
  aoRecarregarAutos(): void;
  aoGerarResumo(): void;
  aoCopiarResumo(): void;
  aoGerarMinuta(natureza: NaturezaMinuta, instrucoes: string): void;
  aoRefinarMinuta(instrucoes: string): void;
  aoCopiarMinuta(): void;
  aoExtrair(): void;
  aoCompletarSelecionados(ids: string[]): void;
}

export interface DocumentoUI {
  id: string;
  tipo: string;
  status: StatusExtracao;
  motivo?: string;
  completavel: boolean;
}

export interface ResumoDocsUI {
  textoNativo: number;
  ocr: number;
  multimodal: number;
  pendentes: number;
  erros: number;
}

const ROTULO_STATUS: Record<StatusExtracao, string> = {
  'texto-nativo': 'texto nativo',
  ocr: 'OCR local',
  'ia-multimodal': 'IA multimodal',
  pendente: 'pendente',
  erro: 'erro'
};

const ROTULOS_PII: Record<string, string> = {
  processo: 'Nº de processo',
  CPF: 'CPF',
  CNPJ: 'CNPJ',
  RG: 'RG',
  CEP: 'CEP',
  telefone: 'Telefone',
  email: 'E-mail',
  OAB: 'OAB',
  bancario: 'Dados bancários'
};

export class SidebarNexia {
  readonly elemento: HTMLElement;
  private statusEl: HTMLElement;
  private chipAnonimo: HTMLElement;
  private mensagensEl: HTMLElement;
  private entradaChat: HTMLTextAreaElement;
  private botaoEnviar: HTMLButtonElement;
  private botaoAnonimizarChat: HTMLButtonElement;
  private saidaResumo: HTMLElement;
  private saidaMinuta: HTMLElement;
  private infoModelo: HTMLElement;
  private seletorNatureza: HTMLSelectElement;
  private instrucoesMinuta: HTMLTextAreaElement;
  private instrucoesRefino: HTMLTextAreaElement;
  private botaoAnonimizarAba: HTMLButtonElement;
  private progressoAnon: HTMLElement;
  private relatorioAnon: HTMLElement;
  private botaoBaixarTxt: HTMLButtonElement;
  private resumoDocs: HTMLElement;
  private listaDocs: HTMLElement;
  private botaoExtrair: HTMLButtonElement;
  private botaoCompletar: HTMLButtonElement;
  private botoesOcupaveis: HTMLButtonElement[] = [];

  constructor(private acoes: AcoesUi) {
    // --- cabeçalho ---
    const logo = el('span');
    logo.innerHTML = ICONE_NEXIA_SVG;
    this.chipAnonimo = el('span', { class: 'nx-chip' }, 'sem anonimização');
    const fechar = el('button', { class: 'nx-fechar', title: 'Fechar' }, '✕');
    fechar.addEventListener('click', () => this.alternar(false));
    const cabecalho = el(
      'header',
      { class: 'nx-cabecalho' },
      logo,
      el('span', { class: 'titulo' }, 'NexIA'),
      el('span', { class: 'espaco' }),
      this.chipAnonimo,
      fechar
    );

    this.statusEl = el('div', { class: 'nx-status' }, 'Pronto.');

    // --- abas ---
    const abas = el('nav', { class: 'nx-abas' });
    const paineis: Record<string, HTMLElement> = {};
    for (const [id, rotulo] of [
      ['chat', 'Chat'],
      ['resumir', 'Resumir'],
      ['minutar', 'Minutar'],
      ['documentos', 'Documentos'],
      ['anonimizar', 'Anonimizar']
    ] as const) {
      const abaBotao = el('button', { class: 'nx-aba', 'data-aba': id }, rotulo);
      abaBotao.addEventListener('click', () => this.ativarAba(id));
      abas.append(abaBotao);
      paineis[id] = el('section', { class: 'nx-painel', 'data-painel': id });
    }

    // --- painel Chat ---
    this.mensagensEl = el('div', { class: 'nx-mensagens' });
    this.botaoAnonimizarChat = botao('Anonimizar autos', '', () => this.acoes.aoAnonimizar());
    const ferramentas = el(
      'div',
      { class: 'nx-ferramentas' },
      this.botaoAnonimizarChat,
      botao('Recarregar autos', '', () => this.acoes.aoRecarregarAutos())
    );
    this.entradaChat = el('textarea', { placeholder: 'Pergunte algo sobre o processo…', rows: '2' });
    this.entradaChat.addEventListener('keydown', (evento) => {
      if (evento.key === 'Enter' && !evento.shiftKey) {
        evento.preventDefault();
        this.dispararEnvioChat();
      }
    });
    this.botaoEnviar = botao('Enviar', 'primario', () => this.dispararEnvioChat());
    const compositor = el('div', { class: 'nx-compositor' }, this.entradaChat, this.botaoEnviar);
    paineis['chat']!.append(this.mensagensEl, ferramentas, compositor);

    // --- painel Resumir ---
    const botaoResumo = botao('Gerar resumo do processo', 'primario', () => this.acoes.aoGerarResumo());
    const botaoCopiarResumo = botao('Copiar', '', () => this.acoes.aoCopiarResumo());
    this.saidaResumo = el('div', { class: 'nx-saida', 'data-vazio': 'O resumo estruturado do processo aparecerá aqui.' });
    paineis['resumir']!.append(
      el('div', { class: 'nx-formulario' }, el('div', { class: 'nx-ferramentas', style: 'padding:0;border:0' }, botaoResumo, botaoCopiarResumo)),
      this.saidaResumo
    );

    // --- painel Minutar ---
    this.seletorNatureza = el('select');
    for (const natureza of NATUREZAS) {
      this.seletorNatureza.append(el('option', { value: natureza.id }, natureza.rotulo));
    }
    this.instrucoesMinuta = el('textarea', {
      rows: '3',
      placeholder: 'Instruções para a minuta (ex.: julgar procedente, fixar honorários em 10%…)'
    });
    const botaoMinutar = botao('Gerar minuta', 'primario', () =>
      this.acoes.aoGerarMinuta(this.seletorNatureza.value as NaturezaMinuta, this.instrucoesMinuta.value)
    );
    this.infoModelo = el('div', { class: 'nx-info-modelo' });
    this.saidaMinuta = el('div', { class: 'nx-saida', 'data-vazio': 'A minuta aparecerá aqui.' });
    this.instrucoesRefino = el('textarea', { rows: '2', placeholder: 'Instruções de refinamento da minuta gerada…' });
    const botaoRefinar = botao('Refinar', '', () => {
      if (this.instrucoesRefino.value.trim()) this.acoes.aoRefinarMinuta(this.instrucoesRefino.value);
    });
    const botaoCopiarMinuta = botao('Copiar minuta', '', () => this.acoes.aoCopiarMinuta());
    paineis['minutar']!.append(
      el(
        'div',
        { class: 'nx-formulario' },
        el('label', {}, 'Natureza do ato'),
        this.seletorNatureza,
        this.instrucoesMinuta,
        el('div', { class: 'nx-ferramentas', style: 'padding:0;border:0' }, botaoMinutar, botaoCopiarMinuta),
        this.infoModelo
      ),
      this.saidaMinuta,
      el('div', { class: 'nx-formulario' }, this.instrucoesRefino, botaoRefinar)
    );

    // --- painel Documentos ---
    this.botaoExtrair = botao('Extrair documentos do processo', 'primario', () => this.acoes.aoExtrair());
    this.botaoCompletar = botao('Completar selecionados com IA', '', () =>
      this.acoes.aoCompletarSelecionados(this.documentosSelecionados())
    );
    this.botaoCompletar.disabled = true;
    this.resumoDocs = el('div', { class: 'nx-info-modelo' });
    this.listaDocs = el('div', { class: 'nx-saida', 'data-vazio': 'Extraia o processo para ver o estado de cada documento.' });
    paineis['documentos']!.append(
      el(
        'div',
        { class: 'nx-formulario' },
        el(
          'label',
          {},
          'Extração local (texto nativo + OCR, sem IA). Documentos que não puderam ser lidos localmente podem ser completados com IA multimodal — isso envia a imagem do documento ao modelo.'
        ),
        el('div', { class: 'nx-ferramentas', style: 'padding:0;border:0' }, this.botaoExtrair, this.botaoCompletar),
        this.resumoDocs
      ),
      this.listaDocs
    );

    // --- painel Anonimizar ---
    this.botaoAnonimizarAba = botao('Extrair e anonimizar processo', 'primario', () => this.acoes.aoAnonimizar());
    this.botaoBaixarTxt = botao('Baixar TXT anonimizado', '', () => this.acoes.aoBaixarTxt());
    this.botaoBaixarTxt.disabled = true;
    this.progressoAnon = el('div', { class: 'nx-info-modelo' });
    this.relatorioAnon = el('div', { class: 'nx-saida', 'data-vazio': 'O relatório de auditoria da anonimização aparecerá aqui.' });
    paineis['anonimizar']!.append(
      el(
        'div',
        { class: 'nx-formulario' },
        el(
          'label',
          {},
          'Extrai todo o conteúdo do processo (com OCR local nos documentos digitalizados), anonimiza localmente e gera um TXT único. Nenhum dado pessoal é enviado à IA.'
        ),
        el('div', { class: 'nx-ferramentas', style: 'padding:0;border:0' }, this.botaoAnonimizarAba, this.botaoBaixarTxt),
        this.progressoAnon
      ),
      this.relatorioAnon
    );

    this.botoesOcupaveis = [
      this.botaoEnviar,
      botaoResumo,
      botaoMinutar,
      botaoRefinar,
      this.botaoAnonimizarChat,
      this.botaoAnonimizarAba,
      this.botaoExtrair
    ];

    this.elemento = el('aside', { class: 'nx-sidebar' }, cabecalho, this.statusEl, abas, ...Object.values(paineis));
    this.ativarAba('chat');
  }

  private dispararEnvioChat(): void {
    const texto = this.entradaChat.value.trim();
    if (!texto || this.botaoEnviar.disabled) return;
    this.entradaChat.value = '';
    this.acoes.aoEnviarChat(texto);
  }

  ativarAba(id: string): void {
    this.elemento.querySelectorAll<HTMLElement>('.nx-aba').forEach((aba) => {
      aba.classList.toggle('ativa', aba.dataset['aba'] === id);
    });
    this.elemento.querySelectorAll<HTMLElement>('.nx-painel').forEach((painel) => {
      painel.classList.toggle('ativo', painel.dataset['painel'] === id);
    });
  }

  alternar(abrir?: boolean): void {
    const abriu = abrir ?? !this.elemento.classList.contains('aberta');
    this.elemento.classList.toggle('aberta', abriu);
  }

  definirStatus(texto: string, erro = false): void {
    this.statusEl.textContent = texto;
    this.statusEl.classList.toggle('erro', erro);
  }

  definirProgressoAnonimizacao(texto: string): void {
    this.progressoAnon.textContent = texto;
  }

  definirAnonimizado(): void {
    this.chipAnonimo.textContent = 'autos anonimizados';
    this.chipAnonimo.classList.add('anonimizado');
    for (const b of [this.botaoAnonimizarChat, this.botaoAnonimizarAba]) {
      b.classList.remove('primario');
      b.classList.add('ativo');
      b.disabled = true;
      b.textContent = 'Processo anonimizado ✓';
    }
    this.botaoBaixarTxt.disabled = false;
  }

  definirRelatorio(relatorio: RelatorioAnonimizacao): void {
    const linhas: string[] = [];
    linhas.push('**Relatório de anonimização**');
    linhas.push(`Nomes substituídos por papéis processuais: ${relatorio.nomesMascarados}`);
    linhas.push(`Dados pessoais mascarados (total): ${relatorio.totalPii}`);
    const detalhe = Object.entries(relatorio.pii)
      .filter(([, n]) => n > 0)
      .map(([tipo, n]) => `${ROTULOS_PII[tipo] ?? tipo}: ${n}`)
      .join(' · ');
    if (detalhe) linhas.push(detalhe);
    if (relatorio.digitalizadosTranscritos > 0) linhas.push(`Documentos digitalizados transcritos por OCR: ${relatorio.digitalizadosTranscritos}`);
    if (relatorio.digitalizadosExcluidos > 0) linhas.push(`Documentos digitalizados excluídos (sem OCR): ${relatorio.digitalizadosExcluidos}`);
    linhas.push('');
    linhas.push('Por documento (nomes / dados pessoais):');
    for (const d of relatorio.porDocumento) {
      const marcas = [d.transcritoPorOcr ? 'OCR' : '', d.excluido ? 'excluído' : ''].filter(Boolean).join(', ');
      linhas.push(`doc ${d.id} (${d.tipo})${marcas ? ` [${marcas}]` : ''}: ${d.nomes} / ${d.pii}`);
    }
    this.relatorioAnon.innerHTML = renderizarMarkdown(linhas.join('\n'));
  }

  definirOcupado(ocupado: boolean): void {
    for (const botaoEl of this.botoesOcupaveis) {
      if (botaoEl.classList.contains('ativo')) continue;
      botaoEl.disabled = ocupado;
    }
  }

  // ----- chat -----
  adicionarMensagemChat(papel: 'usuario' | 'assistente', texto: string): HTMLElement {
    const bolha = el('div', { class: `nx-bolha ${papel}` });
    bolha.innerHTML = renderizarMarkdown(texto);
    this.mensagensEl.append(bolha);
    this.mensagensEl.scrollTop = this.mensagensEl.scrollHeight;
    return bolha;
  }

  atualizarMensagemChat(bolha: HTMLElement, texto: string, gerando: boolean): void {
    bolha.innerHTML = renderizarMarkdown(texto);
    bolha.classList.toggle('gerando', gerando);
    this.mensagensEl.scrollTop = this.mensagensEl.scrollHeight;
  }

  // ----- resumo / minuta -----
  atualizarSaidaResumo(texto: string, gerando: boolean): void {
    this.saidaResumo.innerHTML = renderizarMarkdown(texto);
    this.saidaResumo.classList.toggle('gerando', gerando);
    this.saidaResumo.scrollTop = this.saidaResumo.scrollHeight;
  }

  atualizarSaidaMinuta(texto: string, gerando: boolean): void {
    this.saidaMinuta.innerHTML = renderizarMarkdown(texto);
    this.saidaMinuta.classList.toggle('gerando', gerando);
    this.saidaMinuta.scrollTop = this.saidaMinuta.scrollHeight;
  }

  // ----- documentos (extração) -----
  renderizarDocumentos(itens: DocumentoUI[], resumo: ResumoDocsUI): void {
    this.resumoDocs.textContent =
      `${resumo.textoNativo} texto nativo · ${resumo.ocr} OCR · ${resumo.multimodal} IA · ` +
      `${resumo.pendentes} pendente(s) · ${resumo.erros} erro(s)`;

    this.listaDocs.textContent = '';
    for (const item of itens) {
      const linha = el('label', { class: 'nx-doc-linha' });
      if (item.completavel) {
        const chk = el('input', { type: 'checkbox', 'data-id': item.id });
        chk.addEventListener('change', () => this.atualizarBotaoCompletar());
        linha.append(chk);
      } else {
        linha.append(el('span', { class: 'nx-doc-espaco' }));
      }
      const texto = `doc ${item.id} · ${item.tipo} · ${ROTULO_STATUS[item.status]}${item.motivo ? ` (${item.motivo})` : ''}`;
      linha.append(el('span', { class: `nx-doc-txt nx-doc-${item.status}` }, texto));
      this.listaDocs.append(linha);
    }
    this.atualizarBotaoCompletar();
  }

  private atualizarBotaoCompletar(): void {
    this.botaoCompletar.disabled = this.documentosSelecionados().length === 0;
  }

  documentosSelecionados(): string[] {
    return [...this.listaDocs.querySelectorAll<HTMLInputElement>('input[type="checkbox"]:checked')].map(
      (c) => c.dataset['id'] ?? ''
    );
  }

  definirModeloUsado(nome: string | null): void {
    if (nome) {
      this.infoModelo.textContent = 'Modelo usado como referência: ';
      const negrito = el('b');
      negrito.textContent = nome;
      this.infoModelo.append(negrito);
    } else {
      this.infoModelo.textContent = 'Nenhum modelo local pertinente — minuta gerada sem gabarito.';
    }
  }
}

export function criarFab(aoClicar: () => void): HTMLElement {
  const fab = el('button', { class: 'nx-fab', title: 'Abrir NexIA' });
  fab.innerHTML = ICONE_NEXIA_SVG;
  fab.addEventListener('click', aoClicar);
  return fab;
}
