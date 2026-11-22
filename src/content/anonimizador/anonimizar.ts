/**
 * Anonimização do dossiê — inteiramente local, sem nenhuma chamada de rede.
 * A extração (texto nativo/OCR) já ocorreu; aqui apenas substituímos nomes por
 * papéis processuais e mascaramos PII no texto já disponível. Documentos ainda
 * pendentes (sem texto) permanecem pendentes e podem ser completados na Fase C.
 */
import type { DossieProcesso, StatusExtracao } from '../../shared/tipos';
import { aplicarRegexLocalContado, contagemZerada, type ContagemPII } from './regex-local';
import { aplicarSubstituicoesContado, montarSubstituicoes, type Substituicao } from './partes-local';

export interface RelatorioDocumento {
  id: string;
  tipo: string;
  status: StatusExtracao;
  nomes: number;
  pii: number;
}

export interface RelatorioAnonimizacao {
  nomesMascarados: number;
  pii: ContagemPII;
  totalPii: number;
  porDocumento: RelatorioDocumento[];
  pendentes: number;
}

export interface ResultadoAnonimizacao {
  /** substituto → nome original, para des-anonimizar respostas na exibição. */
  mapaReverso: Map<string, string>;
  /** substituições nome→papel, para reanonimizar texto obtido depois (Fase C). */
  substituicoes: Substituicao[];
  relatorio: RelatorioAnonimizacao;
}

/** Anonimiza um texto avulso com as substituições já calculadas (Fase C). */
export function anonimizarTexto(texto: string, substituicoes: Substituicao[]): string {
  return aplicarRegexLocalContado(aplicarSubstituicoesContado(texto, substituicoes).texto).texto;
}

function somaPii(c: ContagemPII): number {
  return Object.values(c).reduce((a, b) => a + b, 0);
}

function anonimizarBloco(
  texto: string,
  subs: Substituicao[],
  piiAcum: ContagemPII
): { texto: string; nomes: number; pii: number } {
  const nomes = aplicarSubstituicoesContado(texto, subs);
  const antes = somaPii(piiAcum);
  const regex = aplicarRegexLocalContado(nomes.texto, piiAcum);
  return { texto: regex.texto, nomes: nomes.contagem, pii: somaPii(piiAcum) - antes };
}

export function anonimizarDossie(dossie: DossieProcesso): ResultadoAnonimizacao {
  const substituicoes = montarSubstituicoes(dossie.partes);
  const mapaReverso = new Map<string, string>();
  for (const s of substituicoes) {
    if (!mapaReverso.has(s.substituto)) mapaReverso.set(s.substituto, s.original);
  }

  const pii = contagemZerada();
  let nomesMascarados = 0;
  let pendentes = 0;
  const porDocumento: RelatorioDocumento[] = [];

  for (const doc of dossie.documentos) {
    let nomesDoc = 0;
    let piiDoc = 0;

    if (doc.texto) {
      const r = anonimizarBloco(doc.texto, substituicoes, pii);
      doc.texto = r.texto;
      nomesDoc = r.nomes;
      piiDoc = r.pii;
    } else {
      pendentes++;
    }
    doc.nome = aplicarSubstituicoesContado(doc.nome, substituicoes).texto;

    nomesMascarados += nomesDoc;
    porDocumento.push({
      id: doc.id,
      tipo: doc.tipo,
      status: doc.statusExtracao ?? 'pendente',
      nomes: nomesDoc,
      pii: piiDoc
    });
  }

  for (const mov of dossie.movimentacoes) {
    const r = anonimizarBloco(mov.descricao, substituicoes, pii);
    mov.descricao = r.texto;
    nomesMascarados += r.nomes;
  }

  for (const parte of dossie.partes) {
    parte.nome = aplicarSubstituicoesContado(parte.nome, substituicoes).texto;
    parte.documento = undefined;
  }

  if (dossie.numeroProcesso) dossie.numeroProcesso = '[NUMERO DE PROCESSO OMITIDO]';
  dossie.anonimizado = true;

  return {
    mapaReverso,
    substituicoes,
    relatorio: { nomesMascarados, pii, totalPii: somaPii(pii), porDocumento, pendentes }
  };
}

/** Reinsere os nomes reais em um texto de resposta, apenas para exibição local. */
export function desanonimizar(texto: string, mapaReverso: Map<string, string>): string {
  let resultado = texto;
  for (const [substituto, original] of mapaReverso) {
    resultado = resultado.split(substituto).join(original);
  }
  return resultado;
}
