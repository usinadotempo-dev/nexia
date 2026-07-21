import { ENDPOINTS_PROVEDOR } from '@shared/constantes';
import type { ConteudoMensagem, RequisicaoLLM } from '@shared/tipos';
import { extrairErroHttp, type OpcoesGeracao, type ProvedorLLM } from './provedor';
import { lerSse } from './sse';

function converterConteudo(conteudo: ConteudoMensagem): unknown {
  if (typeof conteudo === 'string') return conteudo;
  return conteudo.map((parte) =>
    parte.tipo === 'texto'
      ? { type: 'text', text: parte.texto }
      : { type: 'image', source: { type: 'base64', media_type: parte.mediaType, data: parte.dadosBase64 } }
  );
}

function montarCorpo(req: RequisicaoLLM, modelo: string, stream: boolean): object {
  return {
    model: modelo,
    max_tokens: req.maxTokens ?? 8192,
    ...(req.temperatura !== undefined ? { temperature: req.temperatura } : {}),
    ...(req.system ? { system: req.system } : {}),
    messages: req.mensagens.map((m) => ({ role: m.papel, content: converterConteudo(m.conteudo) })),
    stream
  };
}

async function requisitar(req: RequisicaoLLM, opcoes: OpcoesGeracao, stream: boolean): Promise<Response> {
  const resposta = await fetch(ENDPOINTS_PROVEDOR.anthropic, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': opcoes.chaveApi,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify(montarCorpo(req, opcoes.modelo, stream)),
    signal: opcoes.sinal ?? null
  });
  if (!resposta.ok) throw await extrairErroHttp(resposta, 'Anthropic');
  return resposta;
}

export const provedorAnthropic: ProvedorLLM = {
  async gerarStream(req, opcoes, aoTrecho) {
    const resposta = await requisitar(req, opcoes, true);
    let completo = '';
    await lerSse(resposta, (dado) => {
      if (!dado || dado === '[DONE]') return;
      try {
        const evento = JSON.parse(dado) as { type?: string; delta?: { type?: string; text?: string } };
        if (evento.type === 'content_block_delta' && evento.delta?.text) {
          completo += evento.delta.text;
          aoTrecho(evento.delta.text);
        }
      } catch {
        /* linha não-JSON */
      }
    });
    return completo;
  },

  async gerar(req, opcoes) {
    const resposta = await requisitar(req, opcoes, false);
    const corpo = (await resposta.json()) as { content?: Array<{ type: string; text?: string }> };
    return (corpo.content ?? [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text ?? '')
      .join('');
  }
};
