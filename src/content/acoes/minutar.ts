import { enviar, type RespostaModelosBuscar } from '@shared/mensagens';
import { montarMensagemContexto, montarPromptMinuta, NATUREZAS, RESPOSTA_CONTEXTO_ACK, SYSTEM_PROMPT } from '@shared/prompts';
import type { DossieProcesso, NaturezaMinuta, RequisicaoLLM } from '@shared/tipos';

export interface PreparacaoMinuta {
  requisicao: RequisicaoLLM;
  modeloUsado: string | null;
  promptMinuta: string;
}

/** Busca o modelo local mais pertinente (BM25) e monta a requisição da minuta. */
export async function prepararMinuta(
  dossie: DossieProcesso,
  natureza: NaturezaMinuta,
  instrucoes: string
): Promise<PreparacaoMinuta> {
  const rotulo = NATUREZAS.find((n) => n.id === natureza)?.rotulo ?? natureza;
  const ultimasMovs = dossie.movimentacoes.slice(-5).map((m) => m.descricao);
  const consulta = [rotulo, dossie.classe ?? '', instrucoes, ...ultimasMovs].join(' ').trim();

  let modeloNome: string | undefined;
  let modeloTexto: string | undefined;
  try {
    const { resultados } = await enviar<RespostaModelosBuscar>('MODELOS_BUSCAR', { consulta, natureza, limite: 1 });
    if (resultados[0]) {
      modeloNome = resultados[0].nome;
      modeloTexto = resultados[0].texto;
    }
  } catch {
    /* sem índice de modelos — minuta sem gabarito */
  }

  const promptMinuta = montarPromptMinuta({ natureza, instrucoes, modeloNome, modeloTexto });
  return {
    requisicao: {
      system: SYSTEM_PROMPT,
      mensagens: [
        montarMensagemContexto(dossie),
        { papel: 'assistant', conteudo: RESPOSTA_CONTEXTO_ACK },
        { papel: 'user', conteudo: promptMinuta }
      ]
    },
    modeloUsado: modeloNome ?? null,
    promptMinuta
  };
}

/** Requisição de refinamento sobre uma minuta já gerada. */
export function prepararRefinamento(
  dossie: DossieProcesso,
  promptMinutaOriginal: string,
  minutaAtual: string,
  instrucoesRefino: string
): RequisicaoLLM {
  return {
    system: SYSTEM_PROMPT,
    mensagens: [
      montarMensagemContexto(dossie),
      { papel: 'assistant', conteudo: RESPOSTA_CONTEXTO_ACK },
      { papel: 'user', conteudo: promptMinutaOriginal },
      { papel: 'assistant', conteudo: minutaAtual },
      {
        papel: 'user',
        conteudo: `Refine a minuta acima conforme as instruções a seguir, alterando APENAS o necessário e mantendo todo o restante idêntico:\n${instrucoesRefino}`
      }
    ]
  };
}
