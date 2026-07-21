/**
 * Monta e baixa o TXT único e consolidado do processo. Quando o dossiê está
 * anonimizado, o arquivo contém apenas o texto anonimizado (sem PII).
 * O relatório de auditoria NÃO vai no arquivo — é exibido na interface.
 */
import type { DossieProcesso } from '@shared/tipos';

export function montarTxtProcesso(dossie: DossieProcesso): string {
  const linhas: string[] = [];
  const sep = '='.repeat(72);

  linhas.push(sep);
  linhas.push(`PROCESSO${dossie.anonimizado ? ' — CONTEÚDO ANONIMIZADO' : ''}`);
  linhas.push(sep);
  linhas.push(`Número: ${dossie.numeroProcesso ?? 'não identificado'}`);
  linhas.push(`Classe: ${dossie.classe ?? 'não identificada'}`);
  linhas.push(`Órgão julgador: ${dossie.orgaoJulgador ?? 'não identificado'}`);
  linhas.push('');

  if (dossie.partes.length > 0) {
    linhas.push('PARTES');
    linhas.push('-'.repeat(72));
    for (const p of dossie.partes) linhas.push(`- ${p.nome} (${p.papel}, polo ${p.polo})`);
    linhas.push('');
  }

  if (dossie.movimentacoes.length > 0) {
    linhas.push('MOVIMENTAÇÕES');
    linhas.push('-'.repeat(72));
    for (const m of dossie.movimentacoes) linhas.push(`${m.data} — ${m.descricao}`);
    linhas.push('');
  }

  linhas.push('DOCUMENTOS');
  linhas.push('-'.repeat(72));
  for (const doc of dossie.documentos) {
    linhas.push('');
    linhas.push(`### Documento id ${doc.id} | ${doc.tipo}${doc.data ? ` | ${doc.data}` : ''}${doc.transcritoPorOcr ? ' | [OCR local]' : ''}`);
    if (doc.texto) linhas.push(doc.texto);
    else linhas.push(`[conteúdo indisponível${doc.erro ? `: ${doc.erro}` : ''}]`);
  }

  return linhas.join('\n');
}

export function baixarTxtProcesso(dossie: DossieProcesso): void {
  const conteudo = montarTxtProcesso(dossie);
  const blob = new Blob([conteudo], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const ancora = document.createElement('a');
  ancora.href = url;
  ancora.download = `nexia-processo-${dossie.anonimizado ? 'anonimizado' : 'integral'}.txt`;
  ancora.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
