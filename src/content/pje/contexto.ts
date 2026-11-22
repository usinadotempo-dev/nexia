/**
 * Orquestra a coleta completa de um processo e monta o dossiê em memória.
 * Nada disto é persistido em disco (LGPD): o dossiê vive na aba.
 */
import { log } from '@shared/log';
import { enviar } from '@shared/mensagens';
import type { DossieProcesso, SnapshotAuth } from '@shared/tipos';
import { coletarAutos } from './autos-ssr';
import { extrairDocumentos } from './extrator-docs';
import { ocrDocumentosPendentes, type OpcoesOcr } from './ocr-extracao';
import { gerarChaveAcesso, obterResumoProcesso } from './rest';

function idNaUrl(url: string): string | null {
  const m = url.match(/[?&]idProcesso=(\d+)/);
  return m?.[1] ?? null;
}

/**
 * Detecção ESTRITA: há um processo realmente aberto na tela quando a URL
 * (da aba ou de um iframe) contém idProcesso. Não considera links da página,
 * para que a extensão não apareça em telas de listagem (painel, consulta).
 */
export function idProcessoDaTela(): string | null {
  const proprio = idNaUrl(location.href);
  if (proprio) return proprio;

  for (const iframe of document.querySelectorAll<HTMLIFrameElement>('iframe, frame')) {
    try {
      const src = iframe.src || '';
      const doIframe = idNaUrl(src);
      if (doIframe) return doIframe;
      const interno = iframe.contentWindow?.location?.href;
      if (interno) {
        const doInterno = idNaUrl(interno);
        if (doInterno) return doInterno;
      }
    } catch {
      /* iframe de outra origem */
    }
  }
  return null;
}

/** Localiza o idProcesso: primeiro pela tela; como último recurso, por links. */
export function detectarIdProcesso(): string | null {
  const daTela = idProcessoDaTela();
  if (daTela) return daTela;

  for (const ancora of document.querySelectorAll<HTMLAnchorElement>('a[href*="idProcesso="]')) {
    const doLink = idNaUrl(ancora.href);
    if (doLink) return doLink;
  }
  return null;
}

export interface ProgressoColeta {
  etapa: string;
  feitos?: number;
  total?: number;
}

export async function coletarProcesso(
  opcoesOcr: OpcoesOcr,
  aoProgresso: (p: ProgressoColeta) => void
): Promise<DossieProcesso> {
  const origem = location.origin;
  const host = location.host;

  const idProcesso = detectarIdProcesso();
  if (!idProcesso) {
    throw new Error('Não encontrei um processo aberto nesta tela. Abra os autos ou uma tarefa de um processo e tente novamente.');
  }

  aoProgresso({ etapa: 'Obtendo sessão e chave de acesso…' });
  const { snapshot } = await enviar<{ snapshot: SnapshotAuth | null }>('AUTH_OBTER', { host });

  let ca: string | null = null;
  try {
    ca = await gerarChaveAcesso(origem, snapshot, idProcesso);
  } catch (erro) {
    log.aviso('Chave de acesso indisponível, tentando sem ca', String(erro));
  }

  aoProgresso({ etapa: 'Lendo os autos digitais…' });
  const [autos, resumo] = await Promise.all([
    coletarAutos(origem, idProcesso, ca),
    obterResumoProcesso(origem, snapshot, idProcesso)
  ]);
  if (autos.avisos.length > 0) log.aviso('Avisos na coleta dos autos', autos.avisos.join('; '));

  // Fase A.1 — extração instantânea (texto nativo) + render de imagem-pura.
  aoProgresso({ etapa: 'Extraindo texto dos documentos…', feitos: 0, total: autos.documentos.length });
  await extrairDocumentos(autos.documentos, {
    origem,
    auth: snapshot,
    aoProgresso: (feitos, total) => aoProgresso({ etapa: 'Extraindo texto dos documentos…', feitos, total })
  });

  // Fase A.2 — OCR local dos documentos imagem-pura (com limites, sem LLM).
  await ocrDocumentosPendentes(autos.documentos, opcoesOcr, (p) =>
    aoProgresso({
      etapa: `OCR local (documento ${p.documento}/${p.totalDocumentos})`,
      feitos: p.pagina,
      total: p.totalPaginas
    })
  );

  return {
    host,
    idProcesso,
    numeroProcesso: autos.numeroProcesso,
    classe: resumo?.classeJudicial,
    orgaoJulgador: resumo?.orgaoJulgador,
    partes: autos.partes,
    movimentacoes: autos.movimentacoes,
    documentos: autos.documentos,
    anonimizado: false
  };
}

/** Contagem por status de extração, para o resumo apresentado ao usuário. */
export function resumoExtracao(dossie: DossieProcesso): {
  textoNativo: number;
  ocr: number;
  multimodal: number;
  pendentes: number;
  erros: number;
} {
  const r = { textoNativo: 0, ocr: 0, multimodal: 0, pendentes: 0, erros: 0 };
  for (const d of dossie.documentos) {
    if (d.statusExtracao === 'texto-nativo') r.textoNativo++;
    else if (d.statusExtracao === 'ocr') r.ocr++;
    else if (d.statusExtracao === 'ia-multimodal') r.multimodal++;
    else if (d.statusExtracao === 'erro') r.erros++;
    else r.pendentes++;
  }
  return r;
}
