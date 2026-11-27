/**
 * Tema claro/escuro. Sem escolha do usuário, segue o sistema (prefers-color-scheme).
 * A escolha fica em localStorage (leitura síncrona, sem piscar ao abrir) e vale para o
 * painel e para a página de opções, que compartilham a origem da extensão.
 */
export type Tema = 'claro' | 'escuro';

const CHAVE = 'nexia.tema';

function escolhido(): Tema | null {
  try {
    const v = localStorage.getItem(CHAVE);
    return v === 'claro' || v === 'escuro' ? v : null;
  } catch {
    return null;
  }
}

/** Tema em vigor: a escolha do usuário ou, na falta dela, o do sistema. */
export function temaAtual(): Tema {
  return escolhido() ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro');
}

export function aplicarTema(): void {
  const tema = escolhido();
  if (tema) document.documentElement.dataset['tema'] = tema;
  else delete document.documentElement.dataset['tema'];
}

export function alternarTema(): Tema {
  const novo: Tema = temaAtual() === 'escuro' ? 'claro' : 'escuro';
  try {
    localStorage.setItem(CHAVE, novo);
  } catch {
    /* sem armazenamento: vale só para esta janela */
  }
  document.documentElement.dataset['tema'] = novo;
  return novo;
}

/** Aplica o tema e acompanha mudanças feitas em outra página da extensão ou no sistema. */
export function iniciarTema(aoMudar?: () => void): void {
  aplicarTema();
  addEventListener('storage', (ev) => {
    if (ev.key !== CHAVE) return;
    aplicarTema();
    aoMudar?.();
  });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => aoMudar?.());
}
