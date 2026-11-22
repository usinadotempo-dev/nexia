import { ENDPOINTS_PROVEDOR } from '@shared/constantes';
import type { ConteudoMensagem, ParteChamada, RequisicaoLLM } from '@shared/tipos';
import { extrairErroHttp, type FerramentaLLM, novoIdChamada, type OpcoesGeracao, type ProvedorLLM } from './provedor';
import { lerSse } from './sse';

function converterPartes(conteudo: ConteudoMensagem): unknown[] {
  if (typeof conteudo === 'string') return [{ text: conteudo }];
  return conteudo.map((parte) => {
    switch (parte.tipo) {
      case 'texto':
        return { text: parte.texto };
      case 'imagem':
        return { inlineData: { mimeType: parte.mediaType, data: parte.dadosBase64 } };
      case 'chamada':
        // Reenvia a parte original (preserva thoughtSignature, exigida em modelos recentes).
        return parte.bruto ?? { functionCall: { name: parte.nome, args: parte.args } };
      case 'resultado':
        return { functionResponse: { name: parte.nome, response: { resultado: parte.conteudo, ...(parte.erro ? { erro: true } : {}) } } };
    }
  });
}

function declaracao(f: FerramentaLLM): object {
  const props = (f.esquema['properties'] ?? {}) as Record<string, unknown>;
  // A API rejeita OBJECT sem propriedades: ferramenta sem parâmetros vai sem "parameters".
  return Object.keys(props).length > 0
    ? { name: f.nome, description: f.descricao, parameters: f.esquema }
    : { name: f.nome, description: f.descricao };
}

function montarCorpo(req: RequisicaoLLM, ferramentas?: FerramentaLLM[]): object {
  return {
    ...(req.system ? { systemInstruction: { parts: [{ text: req.system }] } } : {}),
    contents: req.mensagens.map((m) => ({
      role: m.papel === 'assistant' ? 'model' : 'user',
      parts: converterPartes(m.conteudo)
    })),
    ...(ferramentas?.length ? { tools: [{ functionDeclarations: ferramentas.map(declaracao) }] } : {}),
    generationConfig: {
      ...(req.temperatura !== undefined ? { temperature: req.temperatura } : {}),
      maxOutputTokens: req.maxTokens ?? 8192
    }
  };
}

async function requisitar(corpo: object, opcoes: OpcoesGeracao, stream: boolean): Promise<Response> {
  const metodo = stream ? 'streamGenerateContent?alt=sse' : 'generateContent';
  const url = `${ENDPOINTS_PROVEDOR.gemini}/models/${encodeURIComponent(opcoes.modelo)}:${metodo}`;
  const resposta = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': opcoes.chaveApi },
    body: JSON.stringify(corpo),
    signal: opcoes.sinal ?? null
  });
  if (!resposta.ok) throw await extrairErroHttp(resposta, 'Gemini');
  return resposta;
}

interface ParteGemini {
  text?: string;
  thought?: boolean;
  functionCall?: { name?: string; args?: Record<string, unknown>; id?: string };
}

interface RespostaGemini {
  candidates?: Array<{ content?: { parts?: ParteGemini[] }; finishReason?: string }>;
  promptFeedback?: { blockReason?: string };
}

function partesDe(corpo: RespostaGemini): ParteGemini[] {
  if (corpo.promptFeedback?.blockReason) throw new Error(`Gemini bloqueou a solicitação (${corpo.promptFeedback.blockReason}).`);
  return corpo.candidates?.[0]?.content?.parts ?? [];
}

function extrairTexto(partes: ParteGemini[]): string {
  return partes.filter((p) => !p.thought && p.text).map((p) => p.text ?? '').join('');
}

export const provedorGemini: ProvedorLLM = {
  async gerarStream(req, opcoes, aoTrecho) {
    const resposta = await requisitar(montarCorpo(req), opcoes, true);
    let completo = '';
    await lerSse(resposta, (dado) => {
      if (!dado) return;
      let corpo: RespostaGemini;
      try {
        corpo = JSON.parse(dado) as RespostaGemini;
      } catch {
        return;
      }
      const trecho = extrairTexto(partesDe(corpo));
      if (trecho) {
        completo += trecho;
        aoTrecho(trecho);
      }
    });
    return completo;
  },

  async gerar(req, opcoes) {
    const resposta = await requisitar(montarCorpo(req), opcoes, false);
    return extrairTexto(partesDe((await resposta.json()) as RespostaGemini));
  },

  async gerarComFerramentas(req, opcoes, ferramentas) {
    const resposta = await requisitar(montarCorpo(req, ferramentas), opcoes, false);
    const partes = partesDe((await resposta.json()) as RespostaGemini);
    const chamadas: ParteChamada[] = partes
      .filter((p) => p.functionCall?.name)
      .map((p) => ({
        tipo: 'chamada',
        id: p.functionCall?.id ?? novoIdChamada('gem'),
        nome: p.functionCall!.name!,
        args: p.functionCall?.args ?? {},
        bruto: p
      }));
    return { texto: extrairTexto(partes), chamadas };
  }
};
