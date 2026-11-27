/** Primitivos de UI do painel (vanilla, sem framework). */

type Filho = Node | string | null | undefined | false;

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  atributos: Record<string, string | boolean | undefined> = {},
  ...filhos: Filho[]
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  for (const [nome, valor] of Object.entries(atributos)) {
    if (valor === undefined || valor === false) continue;
    if (nome === 'class') e.className = String(valor);
    else e.setAttribute(nome, valor === true ? '' : String(valor));
  }
  for (const f of filhos) if (f) e.append(f);
  return e;
}

const CAMINHOS: Record<string, string> = {
  arquivo: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
  colar: '<rect x="8" y="3" width="8" height="4" rx="1"/><path d="M16 5h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2"/>',
  pagina: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/><path d="M7 6.5h.01M10 6.5h.01"/>',
  balanca: '<path d="M12 3v18M7 21h10M5 7h14"/><path d="M5 7l-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0z"/>',
  escudo: '<path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z"/>',
  escudoOk: '<path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
  conversa: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
  busca: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  engrenagem: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  enviar: '<path d="M12 19V5M5 12l7-7 7 7"/>',
  parar: '<rect x="7" y="7" width="10" height="10" rx="1.5"/>',
  copiar: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
  baixar: '<path d="M12 4v12M6 10l6 6 6-6M4 20h16"/>',
  fechar: '<path d="M6 6l12 12M18 6L6 18"/>',
  lixeira: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  olho: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  lua: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  olhoFechado: '<path d="M3 3l18 18M10.6 10.6a3 3 0 0 0 4.2 4.2M9.9 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.6 9.6 0 0 0 5.4-1.6"/>',
  mais: '<path d="M12 5v14M5 12h14"/>',
  receitas: '<path d="M4 6h16M4 12h10M4 18h7"/><path d="M17 15l2 2 3-4"/>',
  seta: '<path d="M6 9l6 6 6-6"/>',
  voltar: '<path d="M15 18l-6-6 6-6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  ok: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  word: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M8.5 12l1.2 5 1.8-4 1.8 4 1.2-5"/>',
  ferramenta: '<path d="M14.7 6.3a4 4 0 0 0 5 5L21 13l-8 8-3-3 8-8-1.7-1.3a4 4 0 0 0-5-5L13 5z"/><path d="M3 21l6-6"/>',
  recarregar: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
  chave: '<circle cx="8" cy="15" r="4"/><path d="M10.8 12.2L20 3M16 7l3 3M14 9l2 2"/>'
};

export function icone(nome: keyof typeof CAMINHOS | string, rotulo?: string): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', 'ic');
  if (rotulo) {
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', rotulo);
  } else {
    svg.setAttribute('aria-hidden', 'true');
  }
  svg.innerHTML = CAMINHOS[nome] ?? '';
  return svg;
}

/** Logotipo monocromático (usa currentColor). */
export function logotipo(): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 128 128');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML =
    '<rect x="4" y="4" width="120" height="120" rx="26" fill="currentColor"/>' +
    '<path d="M42 90 V40 L82 88 V60" stroke="var(--fundo)" stroke-width="13" stroke-linecap="round" stroke-linejoin="round" fill="none"/>' +
    '<circle cx="82" cy="38" r="8" fill="var(--fundo)"/>';
  return svg;
}

export function botao(
  rotulo: string,
  aoClicar: (ev: MouseEvent) => void,
  opcoes: { classe?: string; icone?: string; titulo?: string; desabilitado?: boolean } = {}
): HTMLButtonElement {
  const b = el('button', { type: 'button', class: `botao ${opcoes.classe ?? ''}`.trim(), title: opcoes.titulo });
  if (opcoes.icone) b.append(icone(opcoes.icone));
  if (rotulo) b.append(rotulo);
  b.disabled = Boolean(opcoes.desabilitado);
  b.addEventListener('click', aoClicar);
  return b;
}

export function botaoIcone(nomeIcone: string, rotulo: string, aoClicar: (ev: MouseEvent) => void, classe = 'botao-icone'): HTMLButtonElement {
  const b = el('button', { type: 'button', class: classe, title: rotulo, 'aria-label': rotulo });
  b.append(icone(nomeIcone));
  b.addEventListener('click', aoClicar);
  return b;
}

export function interruptor(rotulo: string, marcado: boolean, aoMudar: (v: boolean) => void, descricao?: string): HTMLLabelElement {
  const input = el('input', { type: 'checkbox', role: 'switch' });
  input.checked = marcado;
  input.addEventListener('change', () => aoMudar(input.checked));
  return el('label', { class: 'interruptor', title: descricao }, input, el('span', { class: 'trilho', 'aria-hidden': 'true' }), rotulo ? el('span', {}, rotulo) : null);
}

let toastAtual: HTMLElement | null = null;

export function toast(mensagem: string, acao?: { rotulo: string; aoClicar: () => void }, ms = 4500): void {
  toastAtual?.remove();
  const t = el('div', { class: 'toast', role: 'status', 'aria-live': 'polite' }, mensagem);
  if (acao) {
    const b = el('button', { type: 'button' }, acao.rotulo);
    b.addEventListener('click', () => {
      acao.aoClicar();
      t.remove();
    });
    t.append(b);
  }
  document.body.append(t);
  toastAtual = t;
  setTimeout(() => {
    if (toastAtual === t) {
      t.remove();
      toastAtual = null;
    }
  }, ms);
}

/** Diálogo modal acessível (foco preso, Esc fecha). Resolve com o id do botão escolhido ou null. */
export function dialogo(opcoes: {
  titulo: string;
  corpo: Node | string;
  botoes: Array<{ id: string; rotulo: string; primario?: boolean }>;
  fecharComEsc?: boolean;
}): Promise<string | null> {
  return new Promise((resolver) => {
    const anterior = document.activeElement as HTMLElement | null;
    const caixa = el('div', { class: 'dialogo', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'dlg-titulo' });
    const titulo = el('h2', { id: 'dlg-titulo' }, opcoes.titulo);
    const corpo = typeof opcoes.corpo === 'string' ? el('p', {}, opcoes.corpo) : opcoes.corpo;
    const linha = el('div', { class: 'linha-botoes', style: 'justify-content:flex-end' });
    const veu = el('div', { class: 'veu' }, caixa);
    const fechar = (valor: string | null) => {
      veu.remove();
      document.removeEventListener('keydown', teclado, true);
      anterior?.focus();
      resolver(valor);
    };
    for (const b of opcoes.botoes) {
      linha.append(botao(b.rotulo, () => fechar(b.id), { classe: b.primario ? 'primario' : '' }));
    }
    caixa.append(titulo, corpo, linha);
    const teclado = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape' && opcoes.fecharComEsc !== false) {
        ev.preventDefault();
        fechar(null);
      } else if (ev.key === 'Tab') {
        const focaveis = [...caixa.querySelectorAll<HTMLElement>('button, input, select, textarea, [tabindex="0"]')].filter((e) => !e.hasAttribute('disabled'));
        if (focaveis.length === 0) return;
        const primeiro = focaveis[0]!;
        const ultimo = focaveis[focaveis.length - 1]!;
        if (ev.shiftKey && document.activeElement === primeiro) {
          ev.preventDefault();
          ultimo.focus();
        } else if (!ev.shiftKey && document.activeElement === ultimo) {
          ev.preventDefault();
          primeiro.focus();
        }
      }
    };
    document.addEventListener('keydown', teclado, true);
    document.body.append(veu);
    (linha.querySelector<HTMLElement>('.primario') ?? linha.querySelector<HTMLElement>('button'))?.focus();
  });
}

export async function copiar(texto: string, mensagem = 'Copiado.'): Promise<void> {
  try {
    await navigator.clipboard.writeText(texto);
    toast(mensagem);
  } catch {
    toast('Não foi possível copiar automaticamente.');
  }
}

export function baixar(conteudo: Blob | string, nomeArquivo: string): void {
  const blob = typeof conteudo === 'string' ? new Blob([conteudo], { type: 'text/plain;charset=utf-8' }) : conteudo;
  const url = URL.createObjectURL(blob);
  const a = el('a', { href: url, download: nomeArquivo });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function formatarNumero(n: number): string {
  return n.toLocaleString('pt-BR');
}

/** Estimativa grosseira de tokens (≈ 4 caracteres por token em PT-BR). */
export function estimarTokens(caracteres: number): string {
  const t = Math.round(caracteres / 4);
  return t >= 1000 ? `~${(t / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil tokens` : `~${t} tokens`;
}
