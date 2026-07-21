/**
 * Guarda as chaves de API do usuário em chrome.storage.local com ofuscação
 * AES-GCM (chave derivada por PBKDF2 de um segredo fixo do build).
 *
 * IMPORTANTE: isto NÃO é criptografia forte — o segredo está no pacote da
 * extensão. Serve apenas para evitar leitura casual em dumps de storage.
 * As chaves só são lidas neste service worker; nunca trafegam ao content script.
 */
import { CHAVES_STORAGE } from '@shared/constantes';
import type { ProvedorId } from '@shared/tipos';

const SEGREDO_BUILD = 'nexia-ofuscacao-v1-7f3a91c2';
const SAL = new TextEncoder().encode('nexia-sal-fixo-v1');

let chaveCache: CryptoKey | null = null;

async function chaveCripto(): Promise<CryptoKey> {
  if (chaveCache) return chaveCache;
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(SEGREDO_BUILD), 'PBKDF2', false, [
    'deriveKey'
  ]);
  chaveCache = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: SAL, iterations: 100_000, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
  return chaveCache;
}

function paraBase64(dados: ArrayBuffer | Uint8Array): string {
  const bytes = dados instanceof Uint8Array ? dados : new Uint8Array(dados);
  let binario = '';
  for (const b of bytes) binario += String.fromCharCode(b);
  return btoa(binario);
}

function deBase64(texto: string): Uint8Array {
  const binario = atob(texto);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return bytes;
}

function chaveStorage(provedor: ProvedorId): string {
  return CHAVES_STORAGE.CHAVE_API_PREFIXO + provedor;
}

export async function salvarChaveApi(provedor: ProvedorId, valor: string): Promise<void> {
  const chave = chaveStorage(provedor);
  if (!valor) {
    await chrome.storage.local.remove(chave);
    return;
  }
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cifra = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await chaveCripto(), new TextEncoder().encode(valor));
  await chrome.storage.local.set({ [chave]: `${paraBase64(iv)}.${paraBase64(cifra)}` });
}

export async function obterChaveApi(provedor: ProvedorId): Promise<string | null> {
  const chave = chaveStorage(provedor);
  const guardado = (await chrome.storage.local.get(chave))[chave] as string | undefined;
  if (!guardado) return null;
  const [ivB64, cifraB64] = guardado.split('.');
  if (!ivB64 || !cifraB64) return null;
  try {
    const plano = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: deBase64(ivB64) as BufferSource },
      await chaveCripto(),
      deBase64(cifraB64) as BufferSource
    );
    return new TextDecoder().decode(plano);
  } catch {
    return null;
  }
}

export async function statusChaves(): Promise<Record<ProvedorId, boolean>> {
  const provedores: ProvedorId[] = ['anthropic', 'openai', 'gemini'];
  const status = {} as Record<ProvedorId, boolean>;
  for (const p of provedores) status[p] = (await obterChaveApi(p)) !== null;
  return status;
}
