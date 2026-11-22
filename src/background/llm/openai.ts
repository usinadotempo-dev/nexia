import { ENDPOINTS_PROVEDOR } from '@shared/constantes';
import type { MensagemLLM, ParteChamada, ParteConteudo, RequisicaoLLM } from '@shared/tipos';
import { extrairErroHttp, type FerramentaLLM, type OpcoesGeracao, type ProvedorLLM } from './provedor';
import { lerSse } from './sse';

/** Modelos de raciocínio (GPT-5, o1/o3/o4…) só aceitam a temperatura padrão. */
function aceitaTemperatura(modelo: string): boolean {
  return !/^(gpt-5|o\d)/i.test(modelo);
}

function partesComuns(partes: ParteConteudo[]): unknown[] {
  const saida: unknown[] = [];
  for (const p of partes) {
    if (p.tipo === 'texto') saida.push({ type: 'text', text: p.texto });
    else if (p.tipo === 'imagem') saida.push({ type: 'image_url', image_url: { url: `data:${p.mediaType};base64,${p.dadosBase64}` } });
  }
  return saida;
}

function converterMensagem(m: MensagemLLM): unknown[] {
  if (typeof m.conteudo === 'string') return [{ role: m.papel, content: m.conteudo }];
  const partes = m.conteudo;
  const chamadas = partes.filter((p): p is ParteChamada => p.tipo === 'chamada');
  const resultados = partes.filter((p) => p.tipo === 'resultado');
  const comuns = partesComuns(partes);

  if (m.papel === 'assistant' && chamadas.length > 0) {
    const texto = partes.filter((p) => p.tipo === 'texto').map((p) => (p as { texto: string }).texto).join('');
    return [
      {
        role: 'assistant',
        content: texto || null,
        tool_calls: chamadas.map((c) => ({ id: c.id, type: 'function', function: { name: c.nome, arguments: JSON.stringify(c.args) } }))
      }
    ];
  }
  const saida: unknown[] = [];
  for (const r of resultados) {
    if (r.tipo === 'resultado') saida.push({ role: 'tool', tool_call_id: r.id, content: r.conteudo });
  }
  if (comuns.length > 0) saida.push({ role: m.papel, content: comuns });
  return saida;
}

function montarCorpo(req: RequisicaoLLM, modelo: string, stream: boolean, ferramentas?: FerramentaLLM[]): object {
  const mensagens: unknown[] = [];
  if (req.system) mensagens.push({ role: 'system', content: req.system });
  for (const m of req.mensagens) mensagens.push(...converterMensagem(m));
  return {
    model: modelo,
    messages: mensagens,
    max_completion_tokens: req.maxTokens ?? 8192,
    ...(req.temperatura !== undefined && aceitaTemperatura(modelo) ? { temperature: req.temperatura } : {}),
    ...(ferramentas?.length
      ? { tools: ferramentas.map((f) => ({ type: 'function', function: { name: f.nome, description: f.descricao, parameters: f.esquema } })) }
      : {}),
    stream
  };
}

async function requisitar(corpo: object, opcoes: OpcoesGeracao): Promise<Response> {
  const resposta = await fetch(ENDPOINTS_PROVEDOR.openai, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${opcoes.chaveApi}` },
    body: JSON.stringify(corpo),
    signal: opcoes.sinal ?? null
  });
  if (!resposta.ok) throw await extrairErroHttp(resposta, 'OpenAI');
  return resposta;
}

interface MensagemOpenai {
  content?: string | null;
  tool_calls?: Array<{ id: string; function?: { name?: string; arguments?: string } }>;
}

export const provedorOpenai: ProvedorLLM = {
  async gerarStream(req, opcoes, aoTrecho) {
    const resposta = await requisitar(montarCorpo(req, opcoes.modelo, true), opcoes);
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
    const resposta = await requisitar(montarCorpo(req, opcoes.modelo, false), opcoes);
    const corpo = (await resposta.json()) as { choices?: Array<{ message?: MensagemOpenai }> };
    return corpo.choices?.[0]?.message?.content ?? '';
  },

  async gerarComFerramentas(req, opcoes, ferramentas) {
    const resposta = await requisitar(montarCorpo(req, opcoes.modelo, false, ferramentas), opcoes);
    const corpo = (await resposta.json()) as { choices?: Array<{ message?: MensagemOpenai }> };
    const msg = corpo.choices?.[0]?.message;
    const chamadas: ParteChamada[] = (msg?.tool_calls ?? []).map((tc) => {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(tc.function?.arguments || '{}') as Record<string, unknown>;
      } catch {
        /* argumentos malformados → objeto vazio; o executor reporta o erro */
      }
      return { tipo: 'chamada', id: tc.id, nome: tc.function?.name ?? '', args };
    });
    return { texto: msg?.content ?? '', chamadas };
  }
};
