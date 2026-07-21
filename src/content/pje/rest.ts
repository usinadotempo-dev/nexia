/**
 * Cliente REST do PJe (backend "pje-legacy"), executado no content script:
 * mesmas-origem com o PJe, os cookies de sessão acompanham automaticamente
 * e os cabeçalhos replicam o snapshot capturado no page world.
 */
import type { SnapshotAuth } from '@shared/tipos';

export function baseRest(origem: string): string {
  return `${origem}/pje/seam/resource/rest/pje-legacy`;
}

export function montarCabecalhos(auth: SnapshotAuth | null, json = false): Record<string, string> {
  const cabecalhos: Record<string, string> = { accept: '*/*' };
  if (json) cabecalhos['content-type'] = 'application/json';
  if (auth) {
    if (auth.authorization) cabecalhos['authorization'] = auth.authorization;
    if (auth.xPjeCookies) cabecalhos['x-pje-cookies'] = auth.xPjeCookies;
    if (auth.xPjeLegacyApp) cabecalhos['x-pje-legacy-app'] = auth.xPjeLegacyApp;
    if (auth.xPjeUsuarioLocalizacao) cabecalhos['x-pje-usuario-localizacao'] = auth.xPjeUsuarioLocalizacao;
    if (auth.xNoSso) cabecalhos['x-no-sso'] = auth.xNoSso;
    if (auth.xPjeAuthorization) cabecalhos['x-pje-authorization'] = auth.xPjeAuthorization;
  }
  return cabecalhos;
}

/** Gera a chave de acesso (`ca`) exigida pela página de autos digitais. */
export async function gerarChaveAcesso(origem: string, auth: SnapshotAuth | null, idProcesso: string): Promise<string | null> {
  const resposta = await fetch(`${baseRest(origem)}/painelUsuario/gerarChaveAcessoProcesso/${idProcesso}`, {
    headers: montarCabecalhos(auth),
    credentials: 'include'
  });
  if (!resposta.ok) return null;
  let texto = (await resposta.text()).trim();
  texto = texto.replace(/^"+|"+$/g, '');
  return /^[0-9a-f]{8,}$/i.test(texto) ? texto : null;
}

export interface ResumoProcessoRest {
  classeJudicial?: string;
  orgaoJulgador?: string;
  jurisdicao?: string;
  status?: string;
  dataDistribuicao?: string;
}

export async function obterResumoProcesso(
  origem: string,
  auth: SnapshotAuth | null,
  idProcesso: string
): Promise<ResumoProcessoRest | null> {
  try {
    const resposta = await fetch(`${baseRest(origem)}/processos/${idProcesso}`, {
      headers: montarCabecalhos(auth),
      credentials: 'include'
    });
    if (!resposta.ok) return null;
    return (await resposta.json()) as ResumoProcessoRest;
  } catch {
    return null;
  }
}

export function urlDownloadDocumento(origem: string, idDocumento: string): string {
  return `${baseRest(origem)}/documento/download/${idDocumento}`;
}

export function urlAutosDigitais(origem: string, idProcesso: string, ca: string | null): string {
  const parametros = new URLSearchParams({ idProcesso });
  if (ca) parametros.set('ca', ca);
  return `${origem}/pje/Processo/ConsultaProcesso/Detalhe/listAutosDigitais.seam?${parametros.toString()}`;
}
