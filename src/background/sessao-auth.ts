import { CHAVES_STORAGE } from '@shared/constantes';
import type { SnapshotAuth } from '@shared/tipos';

function chaveDoHost(host: string): string {
  return CHAVES_STORAGE.AUTH_PREFIXO + host;
}

/**
 * Grava o snapshot de auth de um host em chrome.storage.session.
 * Nunca sobrescreve uma localização de usuário válida por vazio — sem ela,
 * escritas no PJe falham com HTTP 500.
 */
export async function gravarSnapshot(host: string, novo: SnapshotAuth): Promise<void> {
  const chave = chaveDoHost(host);
  const atual = (await chrome.storage.session.get(chave))[chave] as SnapshotAuth | undefined;
  if (atual?.xPjeUsuarioLocalizacao && !novo.xPjeUsuarioLocalizacao) {
    novo = { ...novo, xPjeUsuarioLocalizacao: atual.xPjeUsuarioLocalizacao };
  }
  await chrome.storage.session.set({ [chave]: novo });
}

export async function obterSnapshot(host: string): Promise<SnapshotAuth | null> {
  const chave = chaveDoHost(host);
  return ((await chrome.storage.session.get(chave))[chave] as SnapshotAuth | undefined) ?? null;
}

export async function listarHosts(): Promise<Array<{ host: string; capturadoEm: number }>> {
  const tudo = await chrome.storage.session.get(null);
  const hosts: Array<{ host: string; capturadoEm: number }> = [];
  for (const [chave, valor] of Object.entries(tudo)) {
    if (chave.startsWith(CHAVES_STORAGE.AUTH_PREFIXO)) {
      hosts.push({
        host: chave.slice(CHAVES_STORAGE.AUTH_PREFIXO.length),
        capturadoEm: (valor as SnapshotAuth).capturadoEm
      });
    }
  }
  return hosts.sort((a, b) => b.capturadoEm - a.capturadoEm);
}
