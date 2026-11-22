import { LIMITES } from './constantes';
import type { DossieProcesso, MensagemLLM, NaturezaMinuta, ParteImagem, ParteTexto, RequisicaoLLM } from './tipos';

export const SYSTEM_PROMPT = `Você é o NexIA, assistente de inteligência artificial para sistemas processuais do Poder Judiciário brasileiro.

Regras permanentes:
- Responda sempre em português do Brasil, com linguagem jurídica formal, precisa e objetiva.
- Fundamente cada afirmação relevante citando o documento dos autos que a embasa, pelo identificador, no formato (doc <id>).
- Nunca invente fatos, datas, valores, dispositivos legais ou jurisprudência. Se a informação não constar dos autos fornecidos, diga expressamente que não consta.
- Alguns documentos podem ter sido digitalizados e fornecidos como imagens de páginas; leia-as com atenção.
- Os autos podem ter sido anonimizados: nomes aparecem como papéis processuais (ex.: [PARTE AUTORA]) e dados pessoais como [OMITIDO]. Mantenha esses marcadores exatamente como estão na sua resposta; não tente adivinhar os dados originais.
- Não inclua avisos genéricos sobre ser uma IA nem recomendações de consultar um advogado.`;

export const PROMPT_RESUMO = `Elabore um resumo estruturado e completo do processo com base nos autos fornecidos, nas seções abaixo, nesta ordem e com estes títulos:

1. IDENTIFICAÇÃO — classe, órgão julgador, partes (como constam), objeto da demanda e valor da causa, se houver.
2. FATOS RELEVANTES — narrativa cronológica dos fatos que originaram a demanda e dos principais atos processuais.
3. QUESTÕES JURÍDICAS — as questões controvertidas que o juízo precisa decidir.
4. DIREITO APLICÁVEL — normas, súmulas e precedentes invocados pelas partes ou aplicáveis, indicando quem os invocou.
5. ANÁLISE — confronto entre as teses das partes e as provas dos autos, apontando pontos fortes e fragilidades de cada lado.
6. SITUAÇÃO ATUAL E PRÓXIMOS PASSOS — fase em que o processo se encontra e o que se aguarda ou se recomenda como próximo ato.

Cite o documento que fundamenta cada informação no formato (doc <id>). Seja fiel aos autos; não presuma nada que não esteja escrito.`;

export const NATUREZAS: Array<{ id: NaturezaMinuta; rotulo: string }> = [
  { id: 'sentenca', rotulo: 'Sentença' },
  { id: 'decisao', rotulo: 'Decisão' },
  { id: 'despacho', rotulo: 'Despacho' },
  { id: 'voto', rotulo: 'Voto' }
];

const REGRAS_FORMATO_MINUTA = `Regras de forma da minuta:
- Escreva em prosa corrida, SEM markdown (sem asteriscos, cerquilhas ou listas com hífen). Use numeração textual quando necessário.
- Transcrições literais de dispositivos ou precedentes devem vir em parágrafo próprio iniciado por "> ".
- NÃO inclua cabeçalho, endereçamento, número do processo nem qualificação das partes no início — o sistema processual preenche esses campos.
- NÃO inclua local, data nem assinatura ao final.
- Estruture o ato conforme sua natureza (relatório, fundamentação e dispositivo, quando couber).`;

export function montarPromptMinuta(opcoes: {
  natureza: NaturezaMinuta;
  instrucoes: string;
  modeloNome?: string;
  modeloTexto?: string;
}): string {
  const { natureza, instrucoes, modeloNome, modeloTexto } = opcoes;
  const rotulo = NATUREZAS.find((n) => n.id === natureza)?.rotulo ?? natureza;
  const partes: string[] = [];

  partes.push(`Minute um(a) ${rotulo.toUpperCase()} para este processo, com base exclusivamente nos autos fornecidos.`);

  if (modeloTexto) {
    const rigido = natureza === 'sentenca' || natureza === 'voto';
    partes.push(
      rigido
        ? `Use o modelo abaixo ("${modeloNome ?? 'modelo'}") como GABARITO: reproduza sua estrutura, seus fundamentos jurídicos e seu estilo parágrafo a parágrafo, substituindo apenas os dados e as particularidades do caso concreto. Afaste-se do gabarito somente no que for incompatível com os autos, indicando o ajuste.`
        : `Use o modelo abaixo ("${modeloNome ?? 'modelo'}") como REFERÊNCIA DE ESTILO E ESTRUTURA, adaptando livremente o conteúdo ao caso concreto.`
    );
    partes.push(`--- INÍCIO DO MODELO ---\n${modeloTexto}\n--- FIM DO MODELO ---`);
  } else {
    partes.push(`Não há modelo de referência; redija o ato segundo a boa técnica para atos da natureza ${rotulo.toLowerCase()}.`);
  }

  if (instrucoes.trim()) {
    partes.push(`Instruções específicas do usuário (têm prioridade sobre o modelo):\n${instrucoes.trim()}`);
  }

  partes.push(REGRAS_FORMATO_MINUTA);
  return partes.join('\n\n');
}

/**
 * Monta a primeira mensagem de usuário com o dossiê do processo.
 * É sempre TEXTO: o conteúdo dos documentos vem da extração local (texto nativo,
 * OCR) ou da conclusão multimodal (Fase C). Documentos ainda não extraídos são
 * apenas anotados — nenhuma imagem crua é enviada ao modelo.
 */
export function montarMensagemContexto(dossie: DossieProcesso): MensagemLLM {
  const blocos: string[] = [];

  blocos.push(`AUTOS DO PROCESSO PARA CONSULTA`);
  blocos.push(
    [
      `Número: ${dossie.numeroProcesso ?? 'não identificado'}`,
      `Classe: ${dossie.classe ?? 'não identificada'}`,
      `Órgão julgador: ${dossie.orgaoJulgador ?? 'não identificado'}`,
      `Autos ${dossie.anonimizado ? 'ANONIMIZADOS (nomes substituídos por papéis processuais)' : 'sem anonimização'}`
    ].join('\n')
  );

  if (dossie.partes.length > 0) {
    blocos.push(
      'PARTES:\n' +
        dossie.partes.map((p) => `- ${p.nome} (${p.papel}, polo ${p.polo})`).join('\n')
    );
  }

  if (dossie.movimentacoes.length > 0) {
    const movs = dossie.movimentacoes.slice(-LIMITES.MAX_MOVIMENTACOES);
    blocos.push('MOVIMENTAÇÕES (mais recentes ao final):\n' + movs.map((m) => `${m.data} — ${m.descricao}`).join('\n'));
  }

  for (const doc of dossie.documentos) {
    const cabecalho = `--- Documento id ${doc.id} | ${doc.tipo} | ${doc.nome}${doc.data ? ` | ${doc.data}` : ''} ---`;
    if (doc.texto) {
      blocos.push(`${cabecalho}\n${doc.texto}`);
    } else {
      blocos.push(`${cabecalho}\n[Documento não extraído${doc.motivoPendencia ? `: ${doc.motivoPendencia}` : ''}]`);
    }
  }

  return { papel: 'user', conteudo: blocos.join('\n\n') };
}

/** Fase C — requisição multimodal para transcrever literalmente um documento digitalizado. */
export function montarRequisicaoTranscricao(doc: { paginasImagem?: string[] }): RequisicaoLLM {
  const partes: Array<ParteTexto | ParteImagem> = [
    {
      tipo: 'texto',
      texto:
        'Transcreva integral e literalmente todo o texto legível das imagens a seguir, que são páginas de um documento processual digitalizado. ' +
        'Preserve a ordem e a estrutura. Não resuma, não comente, não interprete. Devolva apenas a transcrição.'
    }
  ];
  for (const dataUrl of (doc.paginasImagem ?? []).slice(0, LIMITES.MAX_IMAGENS)) {
    const mediaType = dataUrl.slice(5, dataUrl.indexOf(';'));
    partes.push({ tipo: 'imagem', mediaType, dadosBase64: dataUrl.slice(dataUrl.indexOf(',') + 1) });
  }
  return {
    system: 'Você é um transcritor fiel de documentos. Devolve apenas a transcrição literal, sem qualquer acréscimo.',
    mensagens: [{ papel: 'user', conteudo: partes }],
    temperatura: 0
  };
}

export const RESPOSTA_CONTEXTO_ACK =
  'Recebi os autos do processo e estou pronto para ajudar com base neles. O que deseja?';
