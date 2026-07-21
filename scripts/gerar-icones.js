/**
 * Gera os ícones PNG do NexIA (16/32/48/128) a partir do desenho da marca,
 * sem dependências externas: rasteriza em RGBA com supersampling 4x e codifica
 * PNG com zlib nativo do Node. O desenho replica assets/icone-fonte.svg.
 *
 * Uso: node scripts/gerar-icones.js
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

// Paleta NexIA
const INDIGO = [0x4f, 0x46, 0xe5];
const VIOLETA = [0x7c, 0x3a, 0xed];
const CIANO = [0x22, 0xd3, 0xee];
const CLARO = [0xe7, 0xe9, 0xf0];

// Geometria em coordenadas 0..128 (compatível com o SVG fonte)
const RAIO_CANTO = 28;
const MARGEM = 4;
const NOS = [
  { x: 40, y: 40, r: 11, cor: CIANO },
  { x: 88, y: 92, r: 11, cor: CIANO },
  { x: 88, y: 36, r: 11, cor: CLARO }
];
const SEGMENTOS = [
  { x1: 40, y1: 92, x2: 40, y2: 40 },
  { x1: 40, y1: 40, x2: 88, y2: 92 },
  { x1: 88, y1: 92, x2: 88, y2: 36 }
];
const ESPESSURA = 9;

function distanciaSegmento(px, py, s) {
  const dx = s.x2 - s.x1;
  const dy = s.y2 - s.y1;
  const comp2 = dx * dx + dy * dy;
  let t = comp2 === 0 ? 0 : ((px - s.x1) * dx + (py - s.y1) * dy) / comp2;
  t = Math.max(0, Math.min(1, t));
  const cx = s.x1 + t * dx;
  const cy = s.y1 + t * dy;
  return Math.hypot(px - cx, py - cy);
}

function dentroDoCartao(x, y) {
  const min = MARGEM;
  const max = 128 - MARGEM;
  if (x < min || x > max || y < min || y > max) return false;
  const r = RAIO_CANTO;
  const qx = Math.max(min + r - x, x - (max - r), 0);
  const qy = Math.max(min + r - y, y - (max - r), 0);
  return qx * qx + qy * qy <= r * r;
}

/** Cor RGBA do desenho no ponto (x, y) em coordenadas 0..128. */
function corNoPonto(x, y) {
  if (!dentroDoCartao(x, y)) return [0, 0, 0, 0];

  // nós por cima do traço
  for (const no of NOS) {
    if (Math.hypot(x - no.x, y - no.y) <= no.r) return [...no.cor, 255];
  }
  for (const s of SEGMENTOS) {
    if (distanciaSegmento(x, y, s) <= ESPESSURA / 2) return [...CIANO, 255];
  }
  // gradiente diagonal índigo→violeta
  const t = Math.max(0, Math.min(1, (x + y) / 256));
  return [
    Math.round(INDIGO[0] + (VIOLETA[0] - INDIGO[0]) * t),
    Math.round(INDIGO[1] + (VIOLETA[1] - INDIGO[1]) * t),
    Math.round(INDIGO[2] + (VIOLETA[2] - INDIGO[2]) * t),
    255
  ];
}

function rasterizar(tamanho) {
  const SS = 4; // supersampling
  const pixels = Buffer.alloc(tamanho * tamanho * 4);
  for (let y = 0; y < tamanho; y++) {
    for (let x = 0; x < tamanho; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px = ((x + (sx + 0.5) / SS) / tamanho) * 128;
          const py = ((y + (sy + 0.5) / SS) / tamanho) * 128;
          const cor = corNoPonto(px, py);
          r += cor[0] * (cor[3] / 255);
          g += cor[1] * (cor[3] / 255);
          b += cor[2] * (cor[3] / 255);
          a += cor[3];
        }
      }
      const amostras = SS * SS;
      const alfa = a / amostras;
      const idx = (y * tamanho + x) * 4;
      const fator = alfa > 0 ? 255 / alfa : 0;
      pixels[idx] = Math.min(255, Math.round((r / amostras) * fator));
      pixels[idx + 1] = Math.min(255, Math.round((g / amostras) * fator));
      pixels[idx + 2] = Math.min(255, Math.round((b / amostras) * fator));
      pixels[idx + 3] = Math.round(alfa);
    }
  }
  return pixels;
}

// ---------------------------------------------------------------------------
// Codificação PNG

const TABELA_CRC = (() => {
  const tabela = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    tabela[n] = c >>> 0;
  }
  return tabela;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = TABELA_CRC[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(tipo, dados) {
  const comprimento = Buffer.alloc(4);
  comprimento.writeUInt32BE(dados.length);
  const corpo = Buffer.concat([Buffer.from(tipo, 'ascii'), dados]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(corpo));
  return Buffer.concat([comprimento, corpo, crc]);
}

function codificarPng(pixels, tamanho) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(tamanho, 0);
  ihdr.writeUInt32BE(tamanho, 4);
  ihdr[8] = 8; // profundidade
  ihdr[9] = 6; // RGBA
  const linhas = [];
  for (let y = 0; y < tamanho; y++) {
    linhas.push(Buffer.from([0]), pixels.subarray(y * tamanho * 4, (y + 1) * tamanho * 4));
  }
  const idat = zlib.deflateSync(Buffer.concat(linhas), { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

// ---------------------------------------------------------------------------

const destino = path.resolve(__dirname, '..', 'public', 'icons');
fs.mkdirSync(destino, { recursive: true });
for (const tamanho of [16, 32, 48, 128]) {
  const arquivo = path.join(destino, `nexia-${tamanho}.png`);
  fs.writeFileSync(arquivo, codificarPng(rasterizar(tamanho), tamanho));
  console.log(`gerado ${arquivo}`);
}
