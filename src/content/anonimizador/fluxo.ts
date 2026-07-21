/**
 * Fluxo completo de anonimização do processo:
 *   1. OCR local dos documentos digitalizados (opcional; imagem nunca sai);
 *   2. anonimização determinística (partes + regexes) com relatório de auditoria.
 *
 * O caminho é o mesmo para o botão do chat e para a aba "Anonimizar".
 */
import { log } from '@shared/log';
import type { DossieProcesso } from '@shared/tipos';
import { criarMotorOcr, type MotorOcr } from '../pje/ocr-local';
import { anonimizarDossie, type ResultadoAnonimizacao } from './anonimizar';

export interface OpcoesFluxo {
  comOcr: boolean;
  aoProgresso: (texto: string) => void;
}

export async function anonimizarProcesso(dossie: DossieProcesso, opcoes: OpcoesFluxo): Promise<ResultadoAnonimizacao> {
  if (dossie.anonimizado) throw new Error('Este processo já foi anonimizado.');

  if (opcoes.comOcr) {
    const digitalizados = dossie.documentos.filter((d) => d.paginasImagem && d.paginasImagem.length > 0);
    if (digitalizados.length > 0) {
      opcoes.aoProgresso('Inicializando OCR local (primeira execução pode demorar)…');
      let motor: MotorOcr | null = null;
      try {
        motor = await criarMotorOcr();
      } catch (erro) {
        log.aviso('OCR indisponível', String(erro));
        opcoes.aoProgresso('OCR local indisponível; documentos digitalizados serão excluídos.');
        motor = null;
      }
      if (motor) {
        try {
          let n = 0;
          for (const doc of digitalizados) {
            n++;
            const paginas = doc.paginasImagem ?? [];
            const texto = await motor.transcrever(paginas, (feita, total) =>
              opcoes.aoProgresso(`OCR local: documento ${n}/${digitalizados.length}, página ${feita}/${total}…`)
            );
            doc.texto = [doc.texto, texto].filter((t): t is string => Boolean(t)).join('\n');
            doc.paginasImagem = undefined;
            doc.transcritoPorOcr = true;
          }
        } finally {
          await motor.destruir();
        }
      }
    }
  }

  opcoes.aoProgresso('Anonimizando localmente…');
  return anonimizarDossie(dossie);
}
