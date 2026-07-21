/**
 * Extrai o texto de um arquivo .docx sem dependências externas:
 * o .docx é um ZIP; localizamos word/document.xml no diretório central,
 * inflamos com DecompressionStream('deflate-raw') e removemos as tags XML.
 */

async function inflar(dados: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([dados as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

interface EntradaZip {
  nome: string;
  metodo: number;
  tamanhoComprimido: number;
  offsetLocal: number;
}

function lerDiretorioCentral(bytes: Uint8Array, visao: DataView): EntradaZip[] {
  // End of Central Directory: assinatura 0x06054b50, varrida do fim.
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65558); i--) {
    if (visao.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('arquivo .docx inválido (EOCD ausente)');

  const totalEntradas = visao.getUint16(eocd + 10, true);
  let cursor = visao.getUint32(eocd + 16, true);
  const entradas: EntradaZip[] = [];

  for (let n = 0; n < totalEntradas; n++) {
    if (visao.getUint32(cursor, true) !== 0x02014b50) break;
    const metodo = visao.getUint16(cursor + 10, true);
    const tamanhoComprimido = visao.getUint32(cursor + 20, true);
    const tamanhoNome = visao.getUint16(cursor + 28, true);
    const tamanhoExtra = visao.getUint16(cursor + 30, true);
    const tamanhoComentario = visao.getUint16(cursor + 32, true);
    const offsetLocal = visao.getUint32(cursor + 42, true);
    const nome = new TextDecoder().decode(bytes.subarray(cursor + 46, cursor + 46 + tamanhoNome));
    entradas.push({ nome, metodo, tamanhoComprimido, offsetLocal });
    cursor += 46 + tamanhoNome + tamanhoExtra + tamanhoComentario;
  }
  return entradas;
}

async function extrairEntrada(bytes: Uint8Array, visao: DataView, entrada: EntradaZip): Promise<Uint8Array> {
  const p = entrada.offsetLocal;
  if (visao.getUint32(p, true) !== 0x04034b50) throw new Error('cabeçalho local ZIP inválido');
  const tamanhoNome = visao.getUint16(p + 26, true);
  const tamanhoExtra = visao.getUint16(p + 28, true);
  const inicioDados = p + 30 + tamanhoNome + tamanhoExtra;
  const comprimido = bytes.subarray(inicioDados, inicioDados + entrada.tamanhoComprimido);
  if (entrada.metodo === 0) return comprimido;
  if (entrada.metodo === 8) return inflar(comprimido);
  throw new Error(`método de compressão ZIP não suportado: ${entrada.metodo}`);
}

function xmlParaTexto(xml: string): string {
  return xml
    .replace(/<w:tab[^>]*\/>/g, '\t')
    .replace(/<w:br[^>]*\/>/g, '\n')
    .replace(/<\/w:p>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function extrairTextoDocx(arquivo: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(arquivo);
  const visao = new DataView(arquivo);
  const entradas = lerDiretorioCentral(bytes, visao);
  const documento = entradas.find((e) => e.nome === 'word/document.xml');
  if (!documento) throw new Error('.docx sem word/document.xml');
  const xml = new TextDecoder().decode(await extrairEntrada(bytes, visao, documento));
  return xmlParaTexto(xml);
}
