import { ENDPOINTS_PROVEDOR } from '@shared/constantes';
import type { ConteudoMensagem, RequisicaoLLM } from '@shared/tipos';
import { extrairErroHttp, type OpcoesGeracao, type ProvedorLLM } from './provedor';
import { lerSse } from './sse';

function converterConteudo(conteudo: ConteudoMensagem): unknown {
  if (typeof conteudo === 'string') return conteudo;
  return conteudo.map((parte) =>
    parte.tipo === 'texto'
      ? { type: 'text', text: parte.texto }
      : { type: 'image_url', image_url: { url: `data:${parte.mediaType};base64,${parte.dadosBase64}` } }
  );
}

function montarCorpo(req: RequisicaoLLM, modelo: string, stream: boolean): object {
  const mensagens: unknown[] = [];
  if (req.system) mensagens.push({ role: 'system', content: req.system });
  for (const m of req.mensagens) mensagens.push({ role: m.papel, content: converterConteudo(m.conteudo) });
  return {
    model: modelo,
    messages: mensagens,
    max_completion_tokens: req.maxTokens ?? 8192,
    ...(req.temperatura !== undefined ? { temperature: req.temperatura } : {}),
    stream
  };
}

async function requisitar(req: RequisicaoLLM, opcoes: OpcoesGeracao, stream: boolean): Promise<Response> {
  const resposta = await fetch(ENDPOINTS_PROVEDOR.openai, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${opcoes.chaveApi}`
    },
    body: JSON.stringify(montarCorpo(req, opcoes.modelo, stream)),
    signal: opcoes.sinal ?? null
  });
  if (!resposta.ok) throw await extrairErroHttp(resposta, 'OpenAI');
  return resposta;
}

export const provedorOpenai: ProvedorLLM = {
  async gerarStream(req, opcoes, aoTrecho) {
    const resposta = await requisitar(req, opcoes, true);
    let completo = '';
    await lerSse(resposta, (dado) => {
      if (!dado || dado === '[DONE]') return;
      try {
        const evento = JSON.parse(dado) as { choices?: Array<{ delta?: { content?: string } }> };
        const trecho = evento.choices?.[0]?.delta?.content;
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
    const corpo = (await resposta.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return corpo.choices?.[0]?.message?.content ?? '';
  }
};
