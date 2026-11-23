import { CHAVES_STORAGE, CONFIG_PADRAO, MODELOS_SUBSTITUIDOS } from '@shared/constantes';
import type { ConfigNexpra, ProvedorId } from '@shared/tipos';

export async function obterConfig(): Promise<ConfigNexpra> {
  const salvo = (await chrome.storage.local.get(CHAVES_STORAGE.CONFIG))[CHAVES_STORAGE.CONFIG] as
    | Partial<ConfigNexpra>
    | undefined;
  const modelos = { ...CONFIG_PADRAO.modelos, ...(salvo?.modelos ?? {}) };
  // Modelos desligados/descontinuados pelos provedores → substituto atual.
  for (const provedor of Object.keys(modelos) as ProvedorId[]) {
    const substituto = MODELOS_SUBSTITUIDOS[modelos[provedor]];
    if (substituto) modelos[provedor] = substituto;
  }
  return { ...CONFIG_PADRAO, ...salvo, modelos };
}

export async function salvarConfig(config: ConfigNexpra): Promise<void> {
  await chrome.storage.local.set({ [CHAVES_STORAGE.CONFIG]: config });
}
