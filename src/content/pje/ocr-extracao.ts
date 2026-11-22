/**
 * Fase A — passo de OCR local da extração. Roda somente sobre documentos
 * imagem-pura (statusExtracao 'pendente' com páginas-imagem), com limites
 * rígidos de páginas para garantir tempo de execução previsível. Sem LLM.
 */
import { log } from '@shared/log';
import type { DocumentoProcesso } from '@shared/tipos';
import { criarMotorOcr } from './ocr-local';

export interface OpcoesOcr {
  automatico: boolean;
  maxPaginasPorDoc: number;
  maxPaginasTotal: number;
}

export interface ProgressoOcr {
  documento: number;
  totalDocumentos: number;
  pagina: number;
  totalPaginas: number;
}

const MIN_CHARS_OCR_UTIL = 20;

/** Transcreve por OCR os documentos pendentes com imagem, dentro dos limites. */
export async function ocrDocumentosPendentes(
  documentos: DocumentoProcesso[],
  opcoes: OpcoesOcr,
  aoProgresso: (p: ProgressoOcr) => void
): Promise<void> {
  if (!opcoes.automatico) return;
  const scans = documentos.filter((d) => d.statusExtracao === 'pendente' && (d.paginasImagem?.length ?? 0) > 0);
  if (scans.length === 0) return;

  let motor;
  try {
    motor = await criarMotorOcr();
  } catch (erro) {
    log.aviso('OCR local indisponível', String(erro));
    for (const doc of scans) doc.motivoPendencia = 'OCR local indisponível (verifique o idioma instalado)';
    return;
  }

  let totalPaginas = 0;
  try {
    let n = 0;
    for (const doc of scans) {
      n++;
      const paginasDoc = doc.paginasImagem ?? [];
      const restanteGlobal = opcoes.maxPaginasTotal - totalPaginas;
      if (restanteGlobal <= 0) {
        doc.motivoPendencia = 'limite total de páginas de OCR atingido';
        continue;
      }
      const usar = paginasDoc.slice(0, Math.min(opcoes.maxPaginasPorDoc, restanteGlobal));
      const texto = await motor.transcrever(usar, (feita, total) =>
        aoProgresso({ documento: n, totalDocumentos: scans.length, pagina: feita, totalPaginas: total })
      );
      totalPaginas += usar.length;

      if (texto.trim().length >= MIN_CHARS_OCR_UTIL) {
        doc.texto = [doc.texto, texto].filter((t): t is string => Boolean(t)).join('\n');
        doc.statusExtracao = 'ocr';
        if (usar.length < paginasDoc.length) {
          doc.motivoPendencia = `OCR parcial (${usar.length} de ${paginasDoc.length} páginas)`;
        } else {
          doc.motivoPendencia = undefined;
          doc.paginasImagem = undefined; // totalmente transcrito: libera memória
        }
      } else {
        doc.statusExtracao = 'pendente';
        doc.motivoPendencia = 'OCR não reconheceu texto (documento a completar com IA)';
      }
    }
  } finally {
    await motor.destruir();
  }
}
