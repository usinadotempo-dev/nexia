import { ENDPOINTS_PROVEDOR } from '@shared/constantes';
import type { ConteudoMensagem, RequisicaoLLM } from '@shared/tipos';
import { extrairErroHttp, type OpcoesGeracao, type ProvedorLLM } from './provedor';
import { lerSse } from './sse';

function converterPartes(conteudo: ConteudoMensagem): unknown[] {
  if (typeof conteudo === 'string') return [{ text: conteudo }];
  return conteudo.map((parte) =>
    parte.tipo === 'texto'
      ? { text: parte.texto }
      : { inlineData: { mimeType: parte.mediaType, data: parte.dadosBase64 } }
  );
}

function montarCorpo(req: RequisicaoLLM): object {
  return {
    ...(req.system ? { systemInstruction: { parts: [{ text: req.system }] } } : {}),
    contents: req.mensagens.map((m) => ({
      role: m.papel === 'assistant' ? 'model' : 'user',
      parts: converterPartes(m.conteudo)
    })),
    generationConfig: {
      ...(req.temperatura !== undefined ? { temperature: req.temperatura } : {}),
      maxOutputTokens: req.maxTokens ?? 8192
    }
  };
}

async function requisitar(req: RequisicaoLLM, opcoes: OpcoesGeracao, stream: boolean): Promise<Response> {
  const metodo = stream ? 'streamGenerateContent?alt=sse' : 'generateContent';
  const url = `${ENDPOINTS_PROVEDOR.gemini}/models/${opcoes.modelo}:${metodo}`;
  const resposta = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-goog-api-key': opcoes.chaveApi
    },
    body: JSON.stringify(montarCorpo(req)),
    signal: opcoes.sinal ?? null
  });
  if (!resposta.ok) throw await extrairErroHttp(resposta, 'Gemini');
  return resposta;
}

interface RespostaGemini {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
}

function extrairTexto(corpo: RespostaGemini): string {
  return (corpo.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? '').join('');
}

export const provedorGemini: ProvedorLLM = {
  async gerarStream(req, opcoes, aoTrecho) {
    const resposta = await requisitar(req, opcoes, true);
    let completo = '';
    await lerSse(resposta, (dado) => {
      if (!dado) return;
      try {
        const trecho = extrairTexto(JSON.parse(dado) as RespostaGemini);
        if (trecho) {
          completo += trecho;
          aoTrecho(trecho);
        }
      } catch {
        /* linha não-JSON */
      }
    });
    return completo;
  },

  async gerar(req, opcoes) {
    const resposta = await requisitar(req, opcoes, false);
    return extrairTexto((await resposta.json()) as RespostaGemini);
  }
};
