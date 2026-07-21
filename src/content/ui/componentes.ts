/** Primitivos de UI do NexIA (vanilla, dentro de Shadow DOM). */

export const ICONE_NEXIA_SVG = `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M20 46 V20 L44 46 V18" stroke="#22D3EE" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <circle cx="20" cy="20" r="5.5" fill="#22D3EE"/>
  <circle cx="44" cy="46" r="5.5" fill="#22D3EE"/>
  <circle cx="44" cy="18" r="5.5" fill="#E7E9F0"/>
</svg>`;

type Filho = Node | string;

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  atributos: Record<string, string> = {},
  ...filhos: Filho[]
): HTMLElementTagNameMap[K] {
  const elemento = document.createElement(tag);
  for (const [nome, valor] of Object.entries(atributos)) {
    if (nome === 'class') elemento.className = valor;
    else elemento.setAttribute(nome, valor);
  }
  for (const filho of filhos) elemento.append(filho);
  return elemento;
}

export function botao(rotulo: string, classes: string, aoClicar: () => void): HTMLButtonElement {
  const b = el('button', { class: `nx-botao ${classes}`.trim(), type: 'button' });
  b.textContent = rotulo;
  b.addEventListener('click', aoClicar);
  return b;
}

function escaparHtml(texto: string): string {
  return texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Renderização de markdown mínima e segura (escapa HTML antes de formatar). */
export function renderizarMarkdown(texto: string): string {
  let html = escaparHtml(texto);
  html = html.replace(/```([\s\S]*?)```/g, (_m, corpo: string) => `<code>${corpo.trim()}</code>`);
  html = html.replace(/`([^`\n]+)`/g, '<code>$1</code>');
  html = html.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/(^|\n)#{1,4}\s*([^\n]+)/g, '$1<strong>$2</strong>');
  return html;
}

let toastAtual: HTMLElement | null = null;

export function mostrarToast(raiz: ShadowRoot, mensagem: string, tipo: 'info' | 'erro' = 'info'): void {
  toastAtual?.remove();
  const toast = el('div', { class: `nx-toast${tipo === 'erro' ? ' erro' : ''}` });
  toast.textContent = mensagem;
  raiz.append(toast);
  toastAtual = toast;
  setTimeout(() => {
    if (toastAtual === toast) {
      toast.remove();
      toastAtual = null;
    }
  }, 6000);
}

export async function copiarParaAreaDeTransferencia(raiz: ShadowRoot, texto: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(texto);
    mostrarToast(raiz, 'Copiado para a área de transferência.');
  } catch {
    mostrarToast(raiz, 'Não foi possível copiar automaticamente.', 'erro');
  }
}
