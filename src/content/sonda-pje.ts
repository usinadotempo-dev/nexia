/**
 * Decide se a página atual pertence a um PJe. Nada de tribunal hardcoded:
 * a detecção é por artefatos genéricos do sistema, e o usuário pode bloquear
 * hosts específicos nas opções.
 */
export function pareceSerPje(): boolean {
  const caminho = location.pathname.toLowerCase();
  if (caminho.startsWith('/pje') || caminho.includes('/pje/')) return true;

  // Artefatos típicos: recursos seam/RichFaces do PJe referenciados na página.
  const seletores = ['script[src*="/pje/"]', 'link[href*="/pje/"]', 'a[href*="/pje/"]', 'frame[src*="/pje/"]', 'iframe[src*="/pje/"]'];
  for (const seletor of seletores) {
    if (document.querySelector(seletor)) return true;
  }
  return false;
}

export function hostBloqueado(hostsBloqueados: string[]): boolean {
  const host = location.host.toLowerCase();
  return hostsBloqueados.some((h) => h.trim().toLowerCase() === host);
}
