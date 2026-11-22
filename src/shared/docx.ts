/**
 * Gera um .docx mínimo e válido a partir de texto com markdown simples
 * (títulos, negrito, itálico, listas, citações e tabelas). Sem dependências:
 * ZIP no método "store" (sem compressão) + WordprocessingML.
 */

const CRC_TABELA = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(dados: Uint8Array): number {
  let crc = 0xffffffff;
  for (const b of dados) crc = CRC_TABELA[(crc ^ b) & 0xff]! ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

interface ArquivoZip {
  nome: string;
  dados: Uint8Array;
}

/** ZIP sem compressão (método 0), nomes em UTF-8. */
export function montarZip(arquivos: ArquivoZip[]): Uint8Array {
  const enc = new TextEncoder();
  const locais: Uint8Array[] = [];
  const centrais: Uint8Array[] = [];
  let deslocamento = 0;

  for (const a of arquivos) {
    const nome = enc.encode(a.nome);
    const crc = crc32(a.dados);
    const local = new Uint8Array(30 + nome.length);
    const vl = new DataView(local.buffer);
    vl.setUint32(0, 0x04034b50, true);
    vl.setUint16(4, 20, true);
    vl.setUint16(6, 0x0800, true);
    vl.setUint16(8, 0, true);
    vl.setUint16(10, 0, true);
    vl.setUint16(12, 0x21, true); // 1980-01-01
    vl.setUint32(14, crc, true);
    vl.setUint32(18, a.dados.length, true);
    vl.setUint32(22, a.dados.length, true);
    vl.setUint16(26, nome.length, true);
    vl.setUint16(28, 0, true);
    local.set(nome, 30);

    const central = new Uint8Array(46 + nome.length);
    const vc = new DataView(central.buffer);
    vc.setUint32(0, 0x02014b50, true);
    vc.setUint16(4, 20, true);
    vc.setUint16(6, 20, true);
    vc.setUint16(8, 0x0800, true);
    vc.setUint16(10, 0, true);
    vc.setUint16(12, 0, true);
    vc.setUint16(14, 0x21, true);
    vc.setUint32(16, crc, true);
    vc.setUint32(20, a.dados.length, true);
    vc.setUint32(24, a.dados.length, true);
    vc.setUint16(28, nome.length, true);
    vc.setUint32(42, deslocamento, true);
    central.set(nome, 46);

    locais.push(local, a.dados);
    centrais.push(central);
    deslocamento += local.length + a.dados.length;
  }

  const tamanhoCentral = centrais.reduce((s, c) => s + c.length, 0);
  const fim = new Uint8Array(22);
  const vf = new DataView(fim.buffer);
  vf.setUint32(0, 0x06054b50, true);
  vf.setUint16(8, arquivos.length, true);
  vf.setUint16(10, arquivos.length, true);
  vf.setUint32(12, tamanhoCentral, true);
  vf.setUint32(16, deslocamento, true);

  const total = deslocamento + tamanhoCentral + fim.length;
  const saida = new Uint8Array(total);
  let p = 0;
  for (const parte of [...locais, ...centrais, fim]) {
    saida.set(parte, p);
    p += parte.length;
  }
  return saida;
}

function xml(t: string): string {
  return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Converte negrito/itálico inline em runs do Word. */
function runs(texto: string, base = ''): string {
  const saida: string[] = [];
  const regex = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|_[^_\s][^_]*_)/g;
  let ultimo = 0;
  const run = (t: string, rpr: string) => {
    if (!t) return;
    saida.push(`<w:r>${rpr || base ? `<w:rPr>${base}${rpr}</w:rPr>` : ''}<w:t xml:space="preserve">${xml(t)}</w:t></w:r>`);
  };
  for (const m of texto.matchAll(regex)) {
    run(texto.slice(ultimo, m.index), '');
    const s = m[0];
    if (s.startsWith('**')) run(s.slice(2, -2), '<w:b/>');
    else run(s.slice(1, -1), '<w:i/>');
    ultimo = (m.index ?? 0) + s.length;
  }
  run(texto.slice(ultimo), '');
  return saida.join('');
}

function paragrafo(conteudo: string, ppr = ''): string {
  return `<w:p>${ppr ? `<w:pPr>${ppr}</w:pPr>` : ''}${conteudo}</w:p>`;
}

const ESPACO = '<w:spacing w:after="120" w:line="300" w:lineRule="auto"/>';

function tabela(linhas: string[][]): string {
  const borda = (lado: string) => `<w:${lado} w:val="single" w:sz="4" w:space="0" w:color="000000"/>`;
  const bordas = `<w:tblBorders>${['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(borda).join('')}</w:tblBorders>`;
  const corpo = linhas
    .map(
      (l, i) =>
        `<w:tr>${l
          .map((c) => `<w:tc><w:tcPr><w:tcW w:w="0" w:type="auto"/></w:tcPr>${paragrafo(runs(c, i === 0 ? '<w:b/>' : ''))}</w:tc>`)
          .join('')}</w:tr>`
    )
    .join('');
  return `<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/>${bordas}</w:tblPr>${corpo}</w:tbl>${paragrafo('')}`;
}

export function markdownParaDocumentXml(texto: string, titulo?: string): string {
  const corpo: string[] = [];
  if (titulo) corpo.push(paragrafo(runs(titulo, '<w:b/><w:sz w:val="32"/>'), ESPACO));
  const linhas = texto.replace(/\r\n/g, '\n').split('\n');
  for (let i = 0; i < linhas.length; i++) {
    const l = linhas[i]!;
    if (/^\s*\|.*\|\s*$/.test(l) && i + 1 < linhas.length && /^\s*\|?\s*:?-{2,}/.test(linhas[i + 1]!)) {
      const tab: string[][] = [l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim())];
      i += 2;
      while (i < linhas.length && /^\s*\|.*\|\s*$/.test(linhas[i]!)) {
        tab.push(linhas[i]!.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
        i++;
      }
      i--;
      corpo.push(tabela(tab));
      continue;
    }
    const titulo2 = l.match(/^(#{1,4})\s+(.*)$/);
    if (titulo2) {
      const tam = [32, 28, 26, 24][titulo2[1]!.length - 1] ?? 24;
      corpo.push(paragrafo(runs(titulo2[2]!, `<w:b/><w:sz w:val="${tam}"/>`), `<w:keepNext/>${ESPACO}`));
      continue;
    }
    const lista = l.match(/^\s*([-*•]|\d+[.)])\s+(.*)$/);
    if (lista) {
      const marcador = /\d/.test(lista[1]!) ? `${lista[1]} ` : '• ';
      corpo.push(paragrafo(runs(marcador + lista[2]!), `<w:ind w:left="360" w:hanging="240"/>${ESPACO}`));
      continue;
    }
    if (/^>\s?/.test(l)) {
      corpo.push(paragrafo(runs(l.replace(/^>\s?/, ''), '<w:i/>'), `<w:ind w:left="1134"/>${ESPACO}`));
      continue;
    }
    if (/^```/.test(l)) continue;
    corpo.push(paragrafo(runs(l), `<w:jc w:val="both"/>${ESPACO}`));
  }
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' +
    corpo.join('') +
    '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1417" w:right="1134" w:bottom="1134" w:left="1701" w:header="709" w:footer="709" w:gutter="0"/></w:sectPr>' +
    '</w:body></w:document>'
  );
}

export function gerarDocx(texto: string, titulo?: string): Blob {
  const enc = new TextEncoder();
  const zip = montarZip([
    {
      nome: '[Content_Types].xml',
      dados: enc.encode(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'
      )
    },
    {
      nome: '_rels/.rels',
      dados: enc.encode(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'
      )
    },
    { nome: 'word/document.xml', dados: enc.encode(markdownParaDocumentXml(texto, titulo)) }
  ]);
  return new Blob([zip as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}
