import { ENDPOINTS_PROVEDOR } from '@shared/constantes';
import type { ConteudoMensagem, ParteChamada, RequisicaoLLM } from '@shared/tipos';
import { extrairErroHttp, type FerramentaLLM, type OpcoesGeracao, type ProvedorLLM } from './provedor';
import { lerSse } from './sse';

function converterConteudo(conteudo: ConteudoMensagem): unknown {
  if (typeof conteudo === 'string') return conteudo;
  return conteudo.map((parte) => {
    switch (parte.tipo) {
      case 'texto':
        return { type: 'text', text: parte.texto };
      case 'imagem':
        return { type: 'image', source: { type: 'base64', media_type: parte.mediaType, data: parte.dadosBase64 } };
      case 'chamada':
        return { type: 'tool_use', id: parte.id, name: parte.nome, input: parte.args };
      case 'resultado':
        return { type: 'tool_result', tool_use_id: parte.id, content: parte.conteudo, ...(parte.erro ? { is_error: true } : {}) };
    }
  });
}

function montarCorpo(req: RequisicaoLLM, modelo: string, stream: boolean, ferramentas?: FerramentaLLM[]): object {
  return {
    model: modelo,
    max_tokens: req.maxTokens ?? 8192,
    ...(req.temperatura !== undefined ? { temperature: req.temperatura } : {}),
    ...(req.system ? { system: req.system } : {}),
    messages: req.mensagens.map((m) => ({ role: m.papel, content: converterConteudo(m.conteudo) })),
    ...(ferramentas?.length
      ? { tools: ferramentas.map((f) => ({ name: f.nome, description: f.descricao, input_schema: f.esquema })) }
      : {}),
    stream
  };
}

async function requisitar(corpo: object, opcoes: OpcoesGeracao): Promise<Response> {
  const resposta = await fetch(ENDPOINTS_PROVEDOR.anthropic, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': opcoes.chaveApi,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify(corpo),
    signal: opcoes.sinal ?? null
  });
  if (!resposta.ok) throw await extrairErroHttp(resposta, 'Anthropic');
  return resposta;
}

interface BlocoAnthropic {
  type: string;
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
}

export const provedorAnthropic: ProvedorLLM = {
  async gerarStream(req, opcoes, aoTrecho) {
    const resposta = await requisitar(montarCorpo(req, opcoes.modelo, true), opcoes);
    let completo = '';
    await lerSse(resposta, (dado) => {
      if (!dado || dado === '[DONE]') return;
      try {
        const evento = JSON.parse(dado) as { type?: string; delta?: { type?: string; text?: string }; error?: { message?: string } };
        if (evento.type === 'content_block_delta' && evento.delta?.text) {
          completo += evento.delta.text;
          aoTrecho(evento.delta.text);
        } else if (evento.type === 'error') {
          throw new Error(`Anthropic: ${evento.error?.message ?? 'erro no streaming'}`);
        }
      } catch (erro) {
        if (erro instanceof Error && erro.message.startsWith('Anthropic:')) throw erro;
      }
    });
    return completo;
  },

  async gerar(req, opcoes) {
    const resposta = await requisitar(montarCorpo(req, opcoes.modelo, false), opcoes);
    const corpo = (await resposta.json()) as { content?: BlocoAnthropic[] };
    return (corpo.content ?? []).filter((b) => b.type === 'text').map((b) => b.text ?? '').join('');
  },

  async gerarComFerramentas(req, opcoes, ferramentas) {
    const resposta = await requisitar(montarCorpo(req, opcoes.modelo, false, ferramentas), opcoes);
    const corpo = (await resposta.json()) as { content?: BlocoAnthropic[] };
    const blocos = corpo.content ?? [];
    const chamadas: ParteChamada[] = blocos
      .filter((b) => b.type === 'tool_use' && b.id && b.name)
      .map((b) => ({ tipo: 'chamada', id: b.id!, nome: b.name!, args: b.input ?? {} }));
    const texto = blocos.filter((b) => b.type === 'text').map((b) => b.text ?? '').join('');
    return { texto, chamadas };
  }
};
