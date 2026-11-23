import { ENDPOINTS_PROVEDOR } from '@shared/constantes';
import type { ConteudoMensagem, ParteChamada, RequisicaoLLM } from '@shared/tipos';
import { extrairErroHttp, type FerramentaLLM, type OpcoesGeracao, type ProvedorLLM } from './provedor';
import { lerSse } from './sse';

/**
 * Parâmetros de amostragem (temperature/top_p/top_k): removidos nos modelos
 * Claude 4.7 em diante e na família 5. Só os enviamos aos modelos antigos.
 */
function aceitaAmostragem(modelo: string): boolean {
  return /^claude-(3|haiku-4|sonnet-4-[0-6]|opus-4-[0-6])/.test(modelo);
}

/** Modelos que aceitam `output_config.effort` (profundidade de raciocínio). */
function aceitaEsforco(modelo: string): boolean {
  return /^claude-(opus-(5|4-[5-8])|sonnet-(5|4-6)|haiku-5|fable|mythos)/.test(modelo);
}

/**
 * Fallback de recusa no servidor: se o classificador de segurança recusar (o que
 * pode acontecer por engano com laudos médicos ou processos criminais), a API
 * reexecuta a mesma requisição num modelo alternativo, dentro da mesma chamada.
 */
function usaFallbackDeRecusa(modelo: string): boolean {
  return /^claude-(opus-5|sonnet-5-5|fable-5|mythos-5)/.test(modelo);
}

const BETA_FALLBACK = 'server-side-fallback-2026-07-01';

/** Blocos originais da resposta (raciocínio, texto, tool_use) guardados na primeira chamada. */
interface BrutoAnthropic {
  anthropicContent: unknown[];
}

function ehBrutoAnthropic(v: unknown): v is BrutoAnthropic {
  return typeof v === 'object' && v !== null && Array.isArray((v as BrutoAnthropic).anthropicContent);
}

function converterConteudo(conteudo: ConteudoMensagem): unknown {
  if (typeof conteudo === 'string') return conteudo;
  // Turno do assistente com ferramentas: reenviar os blocos EXATAMENTE como vieram
  // (inclui os blocos de raciocínio, que a API exige de volta sem alteração).
  const bruto = conteudo.find((p): p is ParteChamada => p.tipo === 'chamada' && ehBrutoAnthropic(p.bruto));
  if (bruto && ehBrutoAnthropic(bruto.bruto)) return bruto.bruto.anthropicContent;

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
    max_tokens: req.maxTokens ?? 16000,
    ...(req.temperatura !== undefined && aceitaAmostragem(modelo) ? { temperature: req.temperatura } : {}),
    ...(req.esforco && aceitaEsforco(modelo) ? { output_config: { effort: req.esforco } } : {}),
    ...(req.system ? { system: req.system } : {}),
    messages: req.mensagens.map((m) => ({ role: m.papel, content: converterConteudo(m.conteudo) })),
    ...(ferramentas?.length
      ? { tools: ferramentas.map((f) => ({ name: f.nome, description: f.descricao, input_schema: f.esquema })) }
      : {}),
    ...(usaFallbackDeRecusa(modelo) ? { fallbacks: 'default' } : {}),
    stream
  };
}

async function requisitar(corpo: object, modelo: string, opcoes: OpcoesGeracao): Promise<Response> {
  const resposta = await fetch(ENDPOINTS_PROVEDOR.anthropic, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': opcoes.chaveApi,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
      ...(usaFallbackDeRecusa(modelo) ? { 'anthropic-beta': BETA_FALLBACK } : {})
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
  thinking?: string;
  signature?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  [chave: string]: unknown;
}

interface RespostaAnthropic {
  content?: BlocoAnthropic[];
  stop_reason?: string;
  stop_details?: { category?: string | null } | null;
}

function mensagemRecusa(categoria?: string | null): string {
  return `O provedor recusou esta solicitação pelo filtro de segurança${categoria ? ` (categoria: ${categoria})` : ''}. Reformule o pedido ou tente outro modelo nas opções.`;
}

interface EventoStream {
  type?: string;
  index?: number;
  content_block?: BlocoAnthropic;
  delta?: {
    type?: string;
    text?: string;
    partial_json?: string;
    thinking?: string;
    signature?: string;
    stop_reason?: string;
    stop_details?: { category?: string | null } | null;
  };
  error?: { message?: string };
}

/**
 * Faz a requisição em streaming e reconstrói os blocos de conteúdo (texto, raciocínio
 * com assinatura, tool_use com o JSON de entrada), emitindo o texto aos poucos.
 */
async function transmitir(
  req: RequisicaoLLM,
  opcoes: OpcoesGeracao,
  ferramentas: FerramentaLLM[] | undefined,
  aoTrecho: (texto: string) => void
): Promise<{ blocos: BlocoAnthropic[]; texto: string }> {
  const resposta = await requisitar(montarCorpo(req, opcoes.modelo, true, ferramentas), opcoes.modelo, opcoes);
  const blocos = new Map<number, BlocoAnthropic>();
  const jsons = new Map<number, string>();
  let texto = '';
  let motivoParada: string | undefined;
  let categoriaRecusa: string | null | undefined;

  await lerSse(resposta, (dado) => {
    if (!dado || dado === '[DONE]') return;
    let ev: EventoStream;
    try {
      ev = JSON.parse(dado) as EventoStream;
    } catch {
      return; // linha não-JSON
    }
    const i = ev.index ?? 0;
    switch (ev.type) {
      case 'content_block_start':
        if (ev.content_block) {
          blocos.set(i, { ...ev.content_block });
          if (ev.content_block.type === 'tool_use') jsons.set(i, '');
        }
        break;
      case 'content_block_delta': {
        const b = blocos.get(i);
        const d = ev.delta;
        if (!b || !d) break;
        if (d.type === 'text_delta' && d.text) {
          b.text = (b.text ?? '') + d.text;
          texto += d.text;
          aoTrecho(d.text);
        } else if (d.type === 'input_json_delta') {
          jsons.set(i, (jsons.get(i) ?? '') + (d.partial_json ?? ''));
        } else if (d.type === 'thinking_delta') {
          b.thinking = (b.thinking ?? '') + (d.thinking ?? '');
        } else if (d.type === 'signature_delta') {
          b.signature = d.signature;
        }
        break;
      }
      case 'content_block_stop': {
        const b = blocos.get(i);
        if (b?.type === 'tool_use') {
          try {
            b.input = JSON.parse(jsons.get(i) || '{}') as Record<string, unknown>;
          } catch {
            b.input = {};
          }
        }
        break;
      }
      case 'message_delta':
        if (ev.delta?.stop_reason) motivoParada = ev.delta.stop_reason;
        if (ev.delta?.stop_reason === 'refusal') categoriaRecusa = ev.delta.stop_details?.category ?? null;
        break;
      case 'error':
        throw new Error(`Anthropic: ${ev.error?.message ?? 'erro no streaming'}`);
    }
  });

  const aviso = (t: string) => {
    texto += t;
    aoTrecho(t);
  };
  if (motivoParada === 'refusal') {
    if (!texto) throw new Error(mensagemRecusa(categoriaRecusa));
    aviso(`\n\n_(Resposta interrompida pelo filtro de segurança do provedor${categoriaRecusa ? `: ${categoriaRecusa}` : ''}.)_`);
  } else if (motivoParada === 'max_tokens') {
    aviso('\n\n_(Resposta cortada no limite de tokens de saída. Peça "continue" ou aumente o limite em Opções.)_');
  }
  const ordenados = [...blocos.entries()].sort((a, b) => a[0] - b[0]).map(([, b]) => b);
  return { blocos: ordenados, texto };
}

export const provedorAnthropic: ProvedorLLM = {
  async gerarStream(req, opcoes, aoTrecho) {
    return (await transmitir(req, opcoes, undefined, aoTrecho)).texto;
  },

  async gerar(req, opcoes) {
    const resposta = await requisitar(montarCorpo(req, opcoes.modelo, false), opcoes.modelo, opcoes);
    const corpo = (await resposta.json()) as RespostaAnthropic;
    if (corpo.stop_reason === 'refusal') throw new Error(mensagemRecusa(corpo.stop_details?.category));
    return (corpo.content ?? []).filter((b) => b.type === 'text').map((b) => b.text ?? '').join('');
  },

  async gerarComFerramentas(req, opcoes, ferramentas, aoTrecho) {
    const { blocos, texto } = await transmitir(req, opcoes, ferramentas, aoTrecho ?? (() => undefined));
    const chamadas: ParteChamada[] = blocos
      .filter((b) => b.type === 'tool_use' && b.id && b.name)
      .map((b) => ({ tipo: 'chamada', id: b.id!, nome: b.name!, args: b.input ?? {} }));
    // Guarda os blocos originais na 1ª chamada para reenviá-los intactos na próxima rodada.
    if (chamadas[0]) chamadas[0].bruto = { anthropicContent: blocos } satisfies BrutoAnthropic;
    return { texto, chamadas };
  }
};
