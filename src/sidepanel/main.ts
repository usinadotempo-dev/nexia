/**
 * Painel lateral do Nexpra — espaço de trabalho multiárea:
 * Fontes → Proteção (anonimização local) → Assistente (IA + funcionalidades + ferramentas) → Consultas (APIs públicas).
 */
import { AREAS, ORDEM_AREAS } from '@shared/areas/catalogo';
import { CHAVES_STORAGE } from '@shared/constantes';
import { enviar, type ConteudoPendente, type RespostaConfig } from '@shared/mensagens';
import type { Contexto, IdAba, Visao } from './contexto';
import { botaoIcone, el, icone, interruptor, toast } from './dom';
import { espaco } from './estado';
import { mostrarOnboarding } from './visoes/onboarding';
import { criarVisaoAssistente } from './visoes/assistente';
import { criarVisaoConsultas } from './visoes/consultas';
import { criarVisaoFontes } from './visoes/fontes';
import { criarVisaoProtecao } from './visoes/protecao';
import { confirmarTrocaProtecao } from './visoes/comum';

const ABAS: Array<{ id: IdAba; rotulo: string; icone: string }> = [
  { id: 'fontes', rotulo: 'Fontes', icone: 'arquivo' },
  { id: 'assistente', rotulo: 'Assistente', icone: 'conversa' },
  { id: 'protecao', rotulo: 'Proteção', icone: 'escudo' },
  { id: 'consultas', rotulo: 'Consultas', icone: 'busca' }
];

const app = document.getElementById('app')!;
const statusEl = el('div', { class: 'status', role: 'status', 'aria-live': 'polite' });
const botoesAba = new Map<IdAba, HTMLButtonElement>();
const contadores = new Map<IdAba, HTMLElement>();
const paineis = new Map<IdAba, HTMLElement>();
const visoes = new Map<IdAba, Visao>();
let temporizadorStatus: ReturnType<typeof setTimeout> | null = null;

const contexto: Contexto = {
  status(texto, opcoes = {}) {
    if (temporizadorStatus) clearTimeout(temporizadorStatus);
    statusEl.textContent = '';
    statusEl.classList.toggle('erro', Boolean(opcoes.erro));
    if (opcoes.carregando) statusEl.append(el('span', { class: 'girando', 'aria-hidden': 'true' }));
    if (opcoes.erro) statusEl.append(el('strong', {}, 'Erro: '));
    statusEl.append(texto);
    if (!opcoes.carregando && texto) {
      temporizadorStatus = setTimeout(() => contexto.status(resumoPadrao()), opcoes.erro ? 12_000 : 6000);
    }
  },
  irPara(aba) {
    for (const [id, botao] of botoesAba) {
      const ativo = id === aba;
      botao.setAttribute('aria-selected', String(ativo));
      botao.tabIndex = ativo ? 0 : -1;
      paineis.get(id)?.classList.toggle('ativo', ativo);
    }
    visoes.get(aba)?.aoMostrar?.();
  },
  async salvarConfig(parcial) {
    Object.assign(espaco.config, parcial);
    await enviar('CONFIG_SALVAR', { config: parcial });
  }
};

function resumoPadrao(): string {
  const n = espaco.fontesIncluidas().length;
  return `${espaco.area.nome} · ${n === 0 ? 'nenhuma fonte' : `${n} fonte(s) no contexto`} · tudo processado neste navegador`;
}

// ---------------------------------------------------------------------------
// Cabeçalho, seletor de área e barra de proteção

const rotuloArea = el('span', {});
const siglaArea = el('span', { class: 'sigla' });
const botaoArea = el('button', { type: 'button', class: 'seletor-area', 'aria-haspopup': 'listbox', 'aria-expanded': 'false', title: 'Trocar área profissional' }, siglaArea, rotuloArea, icone('seta'));
let menuArea: HTMLElement | null = null;

function fecharMenuArea(): void {
  menuArea?.remove();
  menuArea = null;
  botaoArea.setAttribute('aria-expanded', 'false');
}

function abrirMenuArea(): void {
  if (menuArea) return fecharMenuArea();
  const lista = el('div', { role: 'listbox', 'aria-label': 'Área profissional' });
  for (const id of ORDEM_AREAS) {
    const area = AREAS[id];
    const opcao = el(
      'button',
      { type: 'button', class: 'opcao-receita', role: 'option', 'aria-selected': String(area.id === espaco.area.id) },
      el('b', {}, `${area.id === espaco.area.id ? '✓ ' : ''}${area.nome}`),
      el('span', {}, area.publico)
    );
    opcao.addEventListener('click', () => {
      fecharMenuArea();
      if (area.id === espaco.area.id) return;
      espaco.trocarArea(area);
      void contexto.salvarConfig({ areaAtiva: area.id });
      contexto.status(`Área: ${area.nome}. Funcionalidades, consultas e proteção ajustadas.`);
    });
    lista.append(opcao);
  }
  menuArea = el('div', { class: 'folha menu-area' }, el('div', { class: 'cab' }, el('strong', {}, 'Área profissional')), lista);
  app.append(menuArea);
  botaoArea.setAttribute('aria-expanded', 'true');
  lista.querySelector<HTMLElement>('[aria-selected="true"]')?.focus();
}
botaoArea.addEventListener('click', (ev) => {
  ev.stopPropagation();
  abrirMenuArea();
});
document.addEventListener('click', (ev) => {
  if (menuArea && !menuArea.contains(ev.target as Node)) fecharMenuArea();
});
document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape' && menuArea) {
    fecharMenuArea();
    botaoArea.focus();
  }
});

// Cabeçalho único: o Chrome já exibe ícone e nome da extensão acima do painel, então
// não repetimos a marca — proteção à esquerda, área e opções à direita.
const estadoProtecao = el('span', { class: 'estado' });
const barraProtecao = el('header', { class: 'barra-protecao' });
let interruptorProtecao: HTMLLabelElement;

function montarBarraProtecao(): void {
  interruptorProtecao = interruptor('Proteção', espaco.protecao, (ligada) => {
    void (async () => {
      if (!(await confirmarTrocaProtecao(ligada))) {
        (interruptorProtecao.querySelector('input') as HTMLInputElement).checked = espaco.protecao;
        return;
      }
      espaco.definirProtecao(ligada);
      contexto.status(ligada ? 'Proteção ligada: dados pessoais serão pseudonimizados antes de qualquer envio.' : 'Proteção desligada: as fontes serão enviadas como estão.');
    })();
  }, 'Pseudonimiza dados pessoais localmente antes de enviar à IA');
  barraProtecao.append(
    interruptorProtecao,
    estadoProtecao,
    botaoArea,
    botaoIcone('engrenagem', 'Opções (provedor de IA, chaves, privacidade)', () => chrome.runtime.openOptionsPage())
  );
}

function atualizarBarraProtecao(): void {
  const input = interruptorProtecao.querySelector('input') as HTMLInputElement;
  input.checked = espaco.protecao;
  barraProtecao.classList.toggle('desligada', !espaco.protecao);
  estadoProtecao.textContent = '';
  if (!espaco.protecao) {
    estadoProtecao.title = 'As fontes vão à IA sem pseudonimização';
    estadoProtecao.append(el('b', {}, 'Desligada'));
    return;
  }
  const total = espaco.sessao.entidades().filter((e) => !e.ignorada && e.ocorrencias > 0).length;
  const revisar = el('button', { type: 'button', class: 'link' }, total > 0 ? `${total} ${total === 1 ? 'dado protegido' : 'dados protegidos'}` : 'Ligada');
  revisar.title = 'Dados pessoais são pseudonimizados neste navegador antes de qualquer envio. Clique para revisar.';
  revisar.addEventListener('click', () => contexto.irPara('protecao'));
  estadoProtecao.title = '';
  estadoProtecao.append(revisar);
}

// ---------------------------------------------------------------------------
// Abas

const navAbas = el('nav', { class: 'abas', role: 'tablist', 'aria-label': 'Seções do Nexpra' });
for (const aba of ABAS) {
  const contador = el('span', { class: 'contador', hidden: true });
  const b = el('button', { type: 'button', class: 'aba', role: 'tab', id: `aba-${aba.id}`, 'aria-controls': `painel-${aba.id}`, 'aria-selected': 'false' }, icone(aba.icone), aba.rotulo, contador);
  b.addEventListener('click', () => contexto.irPara(aba.id));
  b.addEventListener('keydown', (ev) => {
    const i = ABAS.findIndex((a) => a.id === aba.id);
    let alvo: number | null = null;
    if (ev.key === 'ArrowRight') alvo = (i + 1) % ABAS.length;
    if (ev.key === 'ArrowLeft') alvo = (i - 1 + ABAS.length) % ABAS.length;
    if (ev.key === 'Home') alvo = 0;
    if (ev.key === 'End') alvo = ABAS.length - 1;
    if (alvo !== null) {
      ev.preventDefault();
      const id = ABAS[alvo]!.id;
      contexto.irPara(id);
      botoesAba.get(id)?.focus();
    }
  });
  botoesAba.set(aba.id, b);
  contadores.set(aba.id, contador);
  navAbas.append(b);
  paineis.set(aba.id, el('section', { class: 'painel', role: 'tabpanel', id: `painel-${aba.id}`, 'aria-labelledby': `aba-${aba.id}` }));
}

function atualizarContadores(): void {
  const definir = (id: IdAba, n: number) => {
    const c = contadores.get(id)!;
    c.hidden = n === 0;
    c.textContent = String(n);
  };
  definir('fontes', espaco.fontes.length);
  definir('protecao', espaco.protecao ? espaco.sessao.entidades().filter((e) => !e.ignorada && e.ocorrencias > 0).length : 0);
}

function atualizarTudo(): void {
  siglaArea.textContent = espaco.area.sigla;
  rotuloArea.textContent = espaco.area.nome;
  atualizarBarraProtecao();
  atualizarContadores();
  for (const v of visoes.values()) v.atualizar();
}

// ---------------------------------------------------------------------------
// Conteúdo enviado pelo menu de contexto (seleção / página)

async function importarPendente(): Promise<void> {
  const dados = await chrome.storage.session.get(CHAVES_STORAGE.PENDENTE_PAINEL);
  const pendente = dados[CHAVES_STORAGE.PENDENTE_PAINEL] as ConteudoPendente | undefined;
  if (!pendente) return;
  await chrome.storage.session.remove(CHAVES_STORAGE.PENDENTE_PAINEL);
  espaco.adicionarFonte({
    nome: pendente.titulo,
    origem: pendente.origem,
    tipo: pendente.origem === 'selecao' ? 'Seleção de texto' : 'Página web',
    detalhe: pendente.url ? new URL(pendente.url).host : undefined,
    texto: pendente.texto,
    status: 'pronta'
  });
  espaco.reprocessar();
  espaco.notificar();
  toast(`${pendente.origem === 'selecao' ? 'Seleção' : 'Página'} adicionada às fontes.`, { rotulo: 'Perguntar', aoClicar: () => contexto.irPara('assistente') });
}

// ---------------------------------------------------------------------------
// Inicialização

async function principal(): Promise<void> {
  const { config } = await enviar<RespostaConfig>('CONFIG_OBTER');
  espaco.iniciar(config);
  montarBarraProtecao();

  visoes.set('fontes', criarVisaoFontes(contexto));
  visoes.set('assistente', criarVisaoAssistente(contexto));
  visoes.set('protecao', criarVisaoProtecao(contexto));
  visoes.set('consultas', criarVisaoConsultas(contexto));
  for (const [id, visao] of visoes) paineis.get(id)!.append(visao.elemento);

  app.append(barraProtecao, navAbas, ...paineis.values(), statusEl);
  espaco.aoMudar(atualizarTudo);
  atualizarTudo();
  contexto.irPara(espaco.fontes.length ? 'assistente' : 'fontes');
  contexto.status(resumoPadrao());

  // Mantém o painel em sincronia com mudanças feitas na página de opções.
  chrome.storage.onChanged.addListener((mudancas, area) => {
    if (area === 'local' && mudancas[CHAVES_STORAGE.CONFIG]) {
      void enviar<RespostaConfig>('CONFIG_OBTER').then(({ config: nova }) => {
        const areaMudou = nova.areaAtiva !== espaco.area.id;
        espaco.config = nova;
        if (areaMudou) espaco.trocarArea(AREAS[nova.areaAtiva]);
        else {
          espaco.reprocessar();
          espaco.notificar();
        }
      });
    }
    if (area === 'session' && mudancas[CHAVES_STORAGE.PENDENTE_PAINEL]?.newValue) {
      void importarPendente().then(() => contexto.irPara('fontes'));
    }
  });
  await importarPendente();

  if (!config.onboardingConcluido) {
    await mostrarOnboarding(contexto);
    atualizarTudo();
  }
}

// O painel ouve mensagens de runtime de outros contextos (ex.: relay do OCR):
// nada a responder aqui — devolver false explicitamente evita "porta fechada".
chrome.runtime.onMessage.addListener(() => false);

principal().catch((erro: unknown) => {
  app.textContent = '';
  app.append(el('div', { class: 'vazio' }, el('strong', {}, 'Não foi possível iniciar o Nexpra'), el('span', {}, erro instanceof Error ? erro.message : String(erro))));
});
