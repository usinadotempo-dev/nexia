import { montarMensagemContexto, PROMPT_RESUMO, RESPOSTA_CONTEXTO_ACK, SYSTEM_PROMPT } from '@shared/prompts';
import type { DossieProcesso, RequisicaoLLM } from '@shared/tipos';

export function montarRequisicaoResumo(dossie: DossieProcesso): RequisicaoLLM {
  return {
    system: SYSTEM_PROMPT,
    mensagens: [
      montarMensagemContexto(dossie),
      { papel: 'assistant', conteudo: RESPOSTA_CONTEXTO_ACK },
      { papel: 'user', conteudo: PROMPT_RESUMO }
    ]
  };
}
