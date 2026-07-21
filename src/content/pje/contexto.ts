/**
 * Orquestra a coleta completa de um processo e monta o dossiê em memória.
 * Nada disto é persistido em disco (LGPD): o dossiê vive na aba.
 */
import { log } from '@shared/log';
import { enviar } from '@shared/mensagens';
import type { DossieProcesso, SnapshotAuth } from '@shared/tipos';
import { coletarAutos } from './autos-ssr';
import { extrairDocumentos } from './extrator-docs';
import { gerarChaveAcesso, obterResumoProcesso } from './rest';

/** Localiza o idProcesso na URL atual, nos iframes ou nos links da página. */
export function detectarIdProcesso(): string | null {
  const daUrl = (url: string): string | null => {
    const m = url.match(/[?&]idProcesso=(\d+)/);
    return m?.[1] ?? null;
  };

  const proprio = daUrl(location.href);
  if (proprio) return proprio;

  for (const iframe of document.querySelectorAll<HTMLIFrameElement>('iframe, frame')) {
    try {
      const src = iframe.src || '';
      const doIframe = daUrl(src);
      if (doIframe) return doIframe;
      const interno = iframe.contentWindow?.location?.href;
      if (interno) {
        const doInterno = daUrl(interno);
        if (doInterno) return doInterno;
      }
    } catch {
      /* iframe de outra origem */
    }
  }

  for (const ancora of document.querySelectorAll<HTMLAnchorElement>('a[href*="idProcesso="]')) {
    const doLink = daUrl(ancora.href);
    if (doLink) return doLink;
  }
  return null;
}

export interface ProgressoColeta {
  etapa: string;
  feitos?: number;
  total?: number;
}

export async function coletarProcesso(aoProgresso: (p: ProgressoColeta) => void): Promise<DossieProcesso> {
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

  aoProgresso({ etapa: 'Extraindo documentos…', feitos: 0, total: autos.documentos.length });
  await extrairDocumentos(autos.documentos, {
    origem,
    auth: snapshot,
    aoProgresso: (feitos, total) => aoProgresso({ etapa: 'Extraindo documentos…', feitos, total })
  });

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
