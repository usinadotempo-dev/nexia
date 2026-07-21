import { CHAVES_STORAGE, CONFIG_PADRAO } from '@shared/constantes';
import type { ConfigNexia } from '@shared/tipos';

export async function obterConfig(): Promise<ConfigNexia> {
  const salvo = (await chrome.storage.local.get(CHAVES_STORAGE.CONFIG))[CHAVES_STORAGE.CONFIG] as
    | Partial<ConfigNexia>
    | undefined;
  return {
    ...CONFIG_PADRAO,
    ...salvo,
    modelos: { ...CONFIG_PADRAO.modelos, ...(salvo?.modelos ?? {}) }
  };
}

export async function salvarConfig(config: ConfigNexia): Promise<void> {
  await chrome.storage.local.set({ [CHAVES_STORAGE.CONFIG]: config });
}
