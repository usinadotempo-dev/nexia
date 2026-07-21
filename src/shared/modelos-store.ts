/**
 * Armazenamento IndexedDB dos modelos de minuta (texto extraído + metadados).
 * Compartilhado entre a página de opções (indexação) e o service worker (busca) —
 * ambos rodam na mesma origem chrome-extension://.
 */
import type { ModeloMinuta } from './tipos';

const NOME_BANCO = 'nexia-modelos';
const STORE_MODELOS = 'modelos';
const STORE_META = 'meta';

function abrirBanco(): Promise<IDBDatabase> {
  return new Promise((resolver, rejeitar) => {
    const pedido = indexedDB.open(NOME_BANCO, 1);
    pedido.onupgradeneeded = () => {
      const banco = pedido.result;
      if (!banco.objectStoreNames.contains(STORE_MODELOS)) banco.createObjectStore(STORE_MODELOS, { keyPath: 'id' });
      if (!banco.objectStoreNames.contains(STORE_META)) banco.createObjectStore(STORE_META);
    };
    pedido.onsuccess = () => resolver(pedido.result);
    pedido.onerror = () => rejeitar(pedido.error);
  });
}

function requisicao<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolver, rejeitar) => {
    req.onsuccess = () => resolver(req.result);
    req.onerror = () => rejeitar(req.error);
  });
}

export interface MetaModelos {
  atualizadoEm: number;
  nomePasta: string;
}

export async function salvarModelos(modelos: ModeloMinuta[], meta: MetaModelos, handle?: unknown): Promise<void> {
  const banco = await abrirBanco();
  try {
    const tx = banco.transaction([STORE_MODELOS, STORE_META], 'readwrite');
    tx.objectStore(STORE_MODELOS).clear();
    for (const modelo of modelos) tx.objectStore(STORE_MODELOS).put(modelo);
    tx.objectStore(STORE_META).put(meta, 'meta');
    if (handle !== undefined) tx.objectStore(STORE_META).put(handle, 'handlePasta');
    await new Promise<void>((resolver, rejeitar) => {
      tx.oncomplete = () => resolver();
      tx.onerror = () => rejeitar(tx.error);
    });
  } finally {
    banco.close();
  }
}

export async function listarModelos(): Promise<ModeloMinuta[]> {
  const banco = await abrirBanco();
  try {
    const tx = banco.transaction(STORE_MODELOS, 'readonly');
    return (await requisicao(tx.objectStore(STORE_MODELOS).getAll())) as ModeloMinuta[];
  } finally {
    banco.close();
  }
}

export async function obterMeta(): Promise<MetaModelos | null> {
  const banco = await abrirBanco();
  try {
    const tx = banco.transaction(STORE_META, 'readonly');
    return ((await requisicao(tx.objectStore(STORE_META).get('meta'))) as MetaModelos | undefined) ?? null;
  } finally {
    banco.close();
  }
}

export async function obterHandlePasta(): Promise<unknown | null> {
  const banco = await abrirBanco();
  try {
    const tx = banco.transaction(STORE_META, 'readonly');
    return ((await requisicao(tx.objectStore(STORE_META).get('handlePasta'))) as unknown) ?? null;
  } finally {
    banco.close();
  }
}

export async function limparModelos(): Promise<void> {
  await new Promise<void>((resolver, rejeitar) => {
    const pedido = indexedDB.deleteDatabase(NOME_BANCO);
    pedido.onsuccess = () => resolver();
    pedido.onerror = () => rejeitar(pedido.error);
    pedido.onblocked = () => resolver();
  });
}
