/**
 * Empacota dist/ em release/nexpra-<versão>.zip para envio à Chrome Web Store.
 * Sem dependências: ZIP com deflate do zlib nativo. Antes de empacotar, valida o
 * básico que a loja rejeitaria (manifesto, versão, ícones, sourcemaps, tamanho).
 *
 * Uso (após npm run build):  node scripts/empacotar.js
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(raiz, 'dist');
const pacote = JSON.parse(fs.readFileSync(path.join(raiz, 'package.json'), 'utf8'));

function falhar(msg) {
  console.error(`ERRO: ${msg}`);
  process.exit(1);
}

if (!fs.existsSync(path.join(dist, 'manifest.json'))) falhar('dist/manifest.json não existe — rode "npm run build" antes.');
const manifesto = JSON.parse(fs.readFileSync(path.join(dist, 'manifest.json'), 'utf8'));
if (manifesto.manifest_version !== 3) falhar('manifest_version deve ser 3.');
if (manifesto.version !== pacote.version) falhar(`versão do manifesto (${manifesto.version}) difere do package.json (${pacote.version}).`);
if ((manifesto.description ?? '').length > 132) falhar('descrição do manifesto passa de 132 caracteres.');
for (const icone of Object.values(manifesto.icons ?? {})) {
  if (!fs.existsSync(path.join(dist, icone))) falhar(`ícone ausente no pacote: ${icone}`);
}
for (const pagina of [manifesto.side_panel?.default_path, manifesto.options_page].filter(Boolean)) {
  if (!fs.existsSync(path.join(dist, pagina))) falhar(`página ausente no pacote: ${pagina}`);
}

function listar(dir, prefixo = '') {
  const saida = [];
  for (const nome of fs.readdirSync(dir).sort()) {
    const completo = path.join(dir, nome);
    const relativo = prefixo ? `${prefixo}/${nome}` : nome;
    if (fs.statSync(completo).isDirectory()) saida.push(...listar(completo, relativo));
    else saida.push({ completo, relativo });
  }
  return saida;
}

const arquivos = listar(dist).filter((a) => !a.relativo.endsWith('.map'));
const comMapaInline = arquivos.filter((a) => a.relativo.endsWith('.js') && fs.readFileSync(a.completo, 'utf8').includes('sourceMappingURL=data:'));
if (comMapaInline.length) console.warn(`AVISO: ${comMapaInline.length} arquivo(s) com sourcemap inline (build de depuração?). Rode o build sem NEXPRA_DEPURAR.`);

// ---------------------------------------------------------------------------
const TABELA = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let crc = 0xffffffff;
  for (const b of buf) crc = TABELA[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

const locais = [];
const centrais = [];
let deslocamento = 0;
for (const { completo, relativo } of arquivos) {
  const dados = fs.readFileSync(completo);
  const comprimido = zlib.deflateRawSync(dados, { level: 9 });
  const usarDeflate = comprimido.length < dados.length;
  const corpo = usarDeflate ? comprimido : dados;
  const nome = Buffer.from(relativo, 'utf8');
  const crc = crc32(dados);

  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4);
  local.writeUInt16LE(0x0800, 6);
  local.writeUInt16LE(usarDeflate ? 8 : 0, 8);
  local.writeUInt16LE(0, 10);
  local.writeUInt16LE(0x21, 12);
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(corpo.length, 18);
  local.writeUInt32LE(dados.length, 22);
  local.writeUInt16LE(nome.length, 26);
  local.writeUInt16LE(0, 28);

  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4);
  central.writeUInt16LE(20, 6);
  central.writeUInt16LE(0x0800, 8);
  central.writeUInt16LE(usarDeflate ? 8 : 0, 10);
  central.writeUInt16LE(0, 12);
  central.writeUInt16LE(0x21, 14);
  central.writeUInt32LE(crc, 16);
  central.writeUInt32LE(corpo.length, 20);
  central.writeUInt32LE(dados.length, 24);
  central.writeUInt16LE(nome.length, 28);
  central.writeUInt32LE(deslocamento, 42);

  locais.push(local, nome, corpo);
  centrais.push(central, nome);
  deslocamento += local.length + nome.length + corpo.length;
}
const tamanhoCentral = centrais.reduce((s, b) => s + b.length, 0);
const fim = Buffer.alloc(22);
fim.writeUInt32LE(0x06054b50, 0);
fim.writeUInt16LE(arquivos.length, 8);
fim.writeUInt16LE(arquivos.length, 10);
fim.writeUInt32LE(tamanhoCentral, 12);
fim.writeUInt32LE(deslocamento, 16);

const destino = path.join(raiz, 'release');
fs.mkdirSync(destino, { recursive: true });
const arquivoZip = path.join(destino, `nexpra-${manifesto.version}.zip`);
fs.writeFileSync(arquivoZip, Buffer.concat([...locais, ...centrais, fim]));

const mb = (fs.statSync(arquivoZip).size / 1024 / 1024).toFixed(1);
console.log(`Pacote pronto: ${arquivoZip}`);
console.log(`${arquivos.length} arquivos, ${mb} MB. Envie este .zip no painel do desenvolvedor da Chrome Web Store.`);
