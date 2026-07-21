/**
 * Anonimização do dossiê — inteiramente local, sem nenhuma chamada de rede.
 * Após a anonimização, apenas o texto anônimo permanece em memória para envio
 * ao LLM; o mapa reverso permite exibir os nomes reais nas respostas, sem que
 * eles jamais saiam da máquina.
 */
import type { DossieProcesso } from '../../shared/tipos';
import { aplicarRegexLocalContado, contagemZerada, type ContagemPII } from './regex-local';
import { aplicarSubstituicoesContado, montarSubstituicoes, type Substituicao } from './partes-local';

export interface RelatorioDocumento {
  id: string;
  tipo: string;
  nomes: number;
  pii: number;
  transcritoPorOcr: boolean;
  excluido: boolean;
}

export interface RelatorioAnonimizacao {
  nomesMascarados: number;
  pii: ContagemPII;
  totalPii: number;
  porDocumento: RelatorioDocumento[];
  digitalizadosTranscritos: number;
  digitalizadosExcluidos: number;
}

export interface ResultadoAnonimizacao {
  /** substituto → nome original, para des-anonimizar respostas na exibição. */
  mapaReverso: Map<string, string>;
  relatorio: RelatorioAnonimizacao;
}

function somaPii(c: ContagemPII): number {
  return Object.values(c).reduce((a, b) => a + b, 0);
}

/** Anonimiza texto acumulando contagens; retorna o texto e quantos itens mascarou. */
function anonimizarBloco(texto: string, subs: Substituicao[], piiAcum: ContagemPII): { texto: string; nomes: number; pii: number } {
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
  let transcritos = 0;
  let excluidos = 0;
  const porDocumento: RelatorioDocumento[] = [];

  for (const doc of dossie.documentos) {
    let nomesDoc = 0;
    let piiDoc = 0;
    let excluido = false;

    if (doc.texto) {
      const r = anonimizarBloco(doc.texto, substituicoes, pii);
      doc.texto = r.texto;
      nomesDoc += r.nomes;
      piiDoc += r.pii;
    }
    doc.nome = aplicarSubstituicoesContado(doc.nome, substituicoes).texto;

    // Documentos digitalizados não transcritos por OCR não podem ser
    // anonimizados: são EXCLUÍDOS do contexto quando a anonimização está ativa.
    if (doc.paginasImagem && doc.paginasImagem.length > 0) {
      doc.paginasImagem = undefined;
      if (!doc.texto) doc.erro = 'documento digitalizado sem OCR — excluído do contexto pela anonimização';
      excluido = !doc.texto;
      if (excluido) excluidos++;
    }
    if (doc.transcritoPorOcr) transcritos++;

    nomesMascarados += nomesDoc;
    porDocumento.push({
      id: doc.id,
      tipo: doc.tipo,
      nomes: nomesDoc,
      pii: piiDoc,
      transcritoPorOcr: Boolean(doc.transcritoPorOcr),
      excluido
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
    relatorio: {
      nomesMascarados,
      pii,
      totalPii: somaPii(pii),
      porDocumento,
      digitalizadosTranscritos: transcritos,
      digitalizadosExcluidos: excluidos
    }
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
