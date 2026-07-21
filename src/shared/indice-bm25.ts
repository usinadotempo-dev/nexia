/** Índice BM25 simples para busca de modelos de minuta (PT-BR). Sem dependências. */

const STOPWORDS = new Set(
  ('a o e de da do das dos em no na nos nas um uma uns umas por para com sem sob sobre entre ao aos à às que se não ' +
    'é são foi ser ter há como mais menos muito já ou nem seu sua seus suas este esta isto esse essa isso aquele aquela ' +
    'pelo pela pelos pelas lhe ele ela eles elas nós vos qual quais quando onde cujo cuja porque pois assim ainda também').split(' ')
);

export function tokenizar(texto: string): string[] {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

interface DocIndexado {
  id: string;
  tamanho: number;
  frequencias: Map<string, number>;
}

export class IndiceBm25 {
  private docs: DocIndexado[] = [];
  private df = new Map<string, number>();
  private tamanhoMedio = 0;
  private readonly k1 = 1.4;
  private readonly b = 0.75;

  constructor(documentos: Array<{ id: string; texto: string }>) {
    for (const d of documentos) {
      const tokens = tokenizar(d.texto);
      const freq = new Map<string, number>();
      for (const t of tokens) freq.set(t, (freq.get(t) ?? 0) + 1);
      this.docs.push({ id: d.id, tamanho: tokens.length, frequencias: freq });
      for (const termo of freq.keys()) this.df.set(termo, (this.df.get(termo) ?? 0) + 1);
    }
    const total = this.docs.reduce((soma, d) => soma + d.tamanho, 0);
    this.tamanhoMedio = this.docs.length > 0 ? total / this.docs.length : 0;
  }

  buscar(consulta: string, limite = 5): Array<{ id: string; pontuacao: number }> {
    const termos = tokenizar(consulta);
    const n = this.docs.length;
    if (n === 0 || termos.length === 0) return [];

    const pontuacoes = new Map<string, number>();
    for (const doc of this.docs) {
      let pontuacao = 0;
      for (const termo of termos) {
        const f = doc.frequencias.get(termo);
        if (!f) continue;
        const df = this.df.get(termo) ?? 0;
        const idf = Math.log(1 + (n - df + 0.5) / (df + 0.5));
        const norm = f * (this.k1 + 1) / (f + this.k1 * (1 - this.b + (this.b * doc.tamanho) / (this.tamanhoMedio || 1)));
        pontuacao += idf * norm;
      }
      if (pontuacao > 0) pontuacoes.set(doc.id, pontuacao);
    }
    return [...pontuacoes.entries()]
      .map(([id, pontuacao]) => ({ id, pontuacao }))
      .sort((x, y) => y.pontuacao - x.pontuacao)
      .slice(0, limite);
  }
}
