/**
 * Fase C — completa a extração de um documento digitalizado enviando suas
 * páginas-imagem ao modelo multimodal. É opt-in: a imagem (com dados pessoais)
 * vai à IA. Quem chama é responsável por avisar o usuário.
 */
import { enviar, type RespostaLlmGerar } from '@shared/mensagens';
import { montarRequisicaoTranscricao } from '@shared/prompts';
import type { DocumentoProcesso } from '@shared/tipos';
import { anonimizarTexto } from '../anonimizador/anonimizar';
import type { Substituicao } from '../anonimizador/partes-local';

/**
 * Transcreve o documento via IA e mescla o texto no dossiê.
 * Se `substituicoes` for fornecido (dossiê já anonimizado), o texto retornado é
 * anonimizado localmente antes de ficar disponível na sessão.
 */
export async function completarDocumentoComIa(
  doc: DocumentoProcesso,
  substituicoes: Substituicao[] | null
): Promise<void> {
  if (!doc.paginasImagem || doc.paginasImagem.length === 0) {
    throw new Error('Documento sem páginas-imagem para transcrever.');
  }
  const { texto } = await enviar<RespostaLlmGerar>('LLM_GERAR', {
    requisicao: montarRequisicaoTranscricao(doc)
  });
  const transcrito = substituicoes ? anonimizarTexto(texto, substituicoes) : texto;

  doc.texto = [doc.texto, transcrito].filter((t): t is string => Boolean(t)).join('\n');
  doc.statusExtracao = 'ia-multimodal';
  doc.completadoPorIa = true;
  doc.motivoPendencia = undefined;
  doc.paginasImagem = undefined;
}
