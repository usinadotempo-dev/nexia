/**
 * Renderizador de markdown seguro e enxuto (escapa HTML antes de formatar).
 * Suporta: títulos, negrito, itálico, código, blocos de código, listas, citações,
 * tabelas e destaque de pseudônimos ([PESSOA_1]) para a revisão de anonimização.
 */

export function escaparHtml(texto: string): string {
  return texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function inline(texto: string): string {
  let h = escaparHtml(texto);
  h = h.replace(/`([^`\n]+)`/g, '<code>$1</code>');
  h = h.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  h = h.replace(/(^|[^*\w])\*([^*\n]+)\*(?!\w)/g, '$1<em>$2</em>');
  h = h.replace(/(^|[^_\w])_([^_\n]+)_(?!\w)/g, '$1<em>$2</em>');
  h = h.replace(/(https?:\/\/[^\s<)]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
  return h;
}

function linhaDeTabela(linha: string): string[] {
  return linha.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
}

export function renderizarMarkdown(texto: string): string {
  const linhas = texto.replace(/\r\n/g, '\n').split('\n');
  const saida: string[] = [];
  let i = 0;
  while (i < linhas.length) {
    const linha = linhas[i]!;

    if (/^```/.test(linha)) {
      const corpo: string[] = [];
      i++;
      while (i < linhas.length && !/^```/.test(linhas[i]!)) corpo.push(linhas[i++]!);
      i++;
      saida.push(`<pre><code>${escaparHtml(corpo.join('\n'))}</code></pre>`);
      continue;
    }

    const titulo = linha.match(/^(#{1,4})\s+(.*)$/);
    if (titulo) {
      const nivel = Math.min(4, titulo[1]!.length + 1);
      saida.push(`<h${nivel}>${inline(titulo[2]!)}</h${nivel}>`);
      i++;
      continue;
    }

    if (/^\s*\|.*\|\s*$/.test(linha) && i + 1 < linhas.length && /^\s*\|?\s*:?-{2,}/.test(linhas[i + 1]!)) {
      const cabecalho = linhaDeTabela(linha);
      i += 2;
      const corpo: string[][] = [];
      while (i < linhas.length && /^\s*\|.*\|\s*$/.test(linhas[i]!)) corpo.push(linhaDeTabela(linhas[i++]!));
      saida.push(
        `<div class="tabela"><table><thead><tr>${cabecalho.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${corpo
          .map((l) => `<tr>${l.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`)
          .join('')}</tbody></table></div>`
      );
      continue;
    }

    if (/^\s*[-*•]\s+/.test(linha) || /^\s*\d+[.)]\s+/.test(linha)) {
      const ordenada = /^\s*\d+[.)]\s+/.test(linha);
      const itens: string[] = [];
      while (i < linhas.length && (ordenada ? /^\s*\d+[.)]\s+/ : /^\s*[-*•]\s+/).test(linhas[i]!)) {
        itens.push(linhas[i]!.replace(ordenada ? /^\s*\d+[.)]\s+/ : /^\s*[-*•]\s+/, ''));
        i++;
      }
      const tag = ordenada ? 'ol' : 'ul';
      saida.push(`<${tag}>${itens.map((it) => `<li>${inline(it)}</li>`).join('')}</${tag}>`);
      continue;
    }

    if (/^>\s?/.test(linha)) {
      const citacao: string[] = [];
      while (i < linhas.length && /^>\s?/.test(linhas[i]!)) citacao.push(linhas[i++]!.replace(/^>\s?/, ''));
      saida.push(`<blockquote>${citacao.map(inline).join('<br>')}</blockquote>`);
      continue;
    }

    if (!linha.trim()) {
      i++;
      continue;
    }

    const paragrafo: string[] = [];
    while (
      i < linhas.length &&
      linhas[i]!.trim() &&
      !/^(#{1,4}\s|```|>\s?|\s*[-*•]\s+|\s*\d+[.)]\s+)/.test(linhas[i]!) &&
      !/^\s*\|.*\|\s*$/.test(linhas[i]!)
    ) {
      paragrafo.push(linhas[i++]!);
    }
    if (paragrafo.length === 0) {
      saida.push(`<p>${inline(linha)}</p>`);
      i++;
    } else {
      saida.push(`<p>${paragrafo.map(inline).join('<br>')}</p>`);
    }
  }
  return saida.join('');
}

/** Texto puro com os pseudônimos destacados (para a pré-visualização da anonimização). */
export function destacarPseudonimos(texto: string): string {
  return escaparHtml(texto).replace(/\[(?:[A-Z_]+_\d+|[A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-ZÁÉÍÓÚÂÊÔÃÕÇ ]+?(?: \d+)?)\]/g, (m) => `<mark>${m}</mark>`);
}

/** Remove a marcação markdown (para copiar como texto simples). */
export function markdownParaTexto(texto: string): string {
  return texto
    .replace(/```[a-z]*\n?/g, '')
    .replace(/^#{1,4}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1$2')
    .replace(/`([^`]+)`/g, '$1');
}
