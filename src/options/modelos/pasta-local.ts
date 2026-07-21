/**
 * Pasta local de modelos de minuta via File System Access API.
 * O handle da pasta fica em IndexedDB (chrome.storage não serializa handles);
 * o TEXTO extraído de cada modelo é gravado junto, para que o service worker
 * faça a busca BM25 sem precisar reabrir os arquivos.
 */
import { obterHandlePasta, salvarModelos } from '@shared/modelos-store';
import type { ModeloMinuta, NaturezaMinuta } from '@shared/tipos';
import { extrairTextoDocx } from './leitor-docx';

// Tipos mínimos da File System Access API (ausentes no lib.dom em alguns alvos).
interface HandleArquivo {
  kind: 'file';
  name: string;
  getFile(): Promise<File>;
}
interface HandlePasta {
  kind: 'directory';
  name: string;
  values(): AsyncIterable<HandleArquivo | HandlePasta>;
  queryPermission(desc: { mode: string }): Promise<string>;
  requestPermission(desc: { mode: string }): Promise<string>;
}

type AbridorDePasta = (opcoes?: { id?: string; mode?: string }) => Promise<HandlePasta>;

function abrirSeletorDePasta(opcoes?: { id?: string; mode?: string }): Promise<HandlePasta> {
  const abridor = (window as unknown as { showDirectoryPicker?: AbridorDePasta }).showDirectoryPicker;
  if (!abridor) throw new Error('Este navegador não suporta seleção de pasta (File System Access API).');
  return abridor(opcoes);
}

function inferirNatureza(nomeArquivo: string): NaturezaMinuta | 'outro' {
  const baixo = nomeArquivo.toLowerCase();
  if (/senten/.test(baixo)) return 'sentenca';
  if (/decis/.test(baixo)) return 'decisao';
  if (/despach/.test(baixo)) return 'despacho';
  if (/voto|acord/.test(baixo)) return 'voto';
  return 'outro';
}

async function coletarArquivos(pasta: HandlePasta, prefixo = '', profundidade = 0): Promise<Array<{ handle: HandleArquivo; caminho: string }>> {
  if (profundidade > 4) return [];
  const arquivos: Array<{ handle: HandleArquivo; caminho: string }> = [];
  for await (const item of pasta.values()) {
    if (item.kind === 'file') {
      if (/\.(docx|txt)$/i.test(item.name)) arquivos.push({ handle: item, caminho: prefixo + item.name });
    } else {
      arquivos.push(...(await coletarArquivos(item, `${prefixo}${item.name}/`, profundidade + 1)));
    }
  }
  return arquivos;
}

export interface ResultadoIndexacao {
  quantidade: number;
  falhas: string[];
  nomePasta: string;
}

async function indexarPasta(pasta: HandlePasta): Promise<ResultadoIndexacao> {
  const arquivos = await coletarArquivos(pasta);
  const modelos: ModeloMinuta[] = [];
  const falhas: string[] = [];

  for (const { handle, caminho } of arquivos) {
    try {
      const arquivo = await handle.getFile();
      const texto = /\.docx$/i.test(handle.name)
        ? await extrairTextoDocx(await arquivo.arrayBuffer())
        : await arquivo.text();
      if (texto.trim().length < 50) continue;
      modelos.push({
        id: caminho,
        nome: handle.name.replace(/\.(docx|txt)$/i, ''),
        natureza: inferirNatureza(handle.name),
        texto: texto.slice(0, 60_000)
      });
    } catch {
      falhas.push(caminho);
    }
  }

  await salvarModelos(modelos, { atualizadoEm: Date.now(), nomePasta: pasta.name }, pasta);
  return { quantidade: modelos.length, falhas, nomePasta: pasta.name };
}

/** Abre o seletor de pasta (requer gesto do usuário) e indexa os modelos. */
export async function escolherEIndexarPasta(): Promise<ResultadoIndexacao> {
  const pasta = await abrirSeletorDePasta({ id: 'nexia-modelos', mode: 'read' });
  return indexarPasta(pasta);
}

/** Reindexa a pasta já escolhida, pedindo permissão novamente se necessário. */
export async function reindexarPastaSalva(): Promise<ResultadoIndexacao> {
  const handle = (await obterHandlePasta()) as HandlePasta | null;
  if (!handle) throw new Error('Nenhuma pasta escolhida ainda. Use "Escolher pasta de modelos".');
  let permissao = await handle.queryPermission({ mode: 'read' });
  if (permissao !== 'granted') permissao = await handle.requestPermission({ mode: 'read' });
  if (permissao !== 'granted') throw new Error('Permissão de leitura da pasta negada pelo navegador.');
  return indexarPasta(handle);
}
