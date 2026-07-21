import type { ProvedorId } from '@shared/tipos';
import { provedorAnthropic } from './anthropic';
import { provedorGemini } from './gemini';
import { provedorOpenai } from './openai';
import type { ProvedorLLM } from './provedor';

const PROVEDORES: Record<ProvedorId, ProvedorLLM> = {
  anthropic: provedorAnthropic,
  openai: provedorOpenai,
  gemini: provedorGemini
};

export function obterProvedor(id: ProvedorId): ProvedorLLM {
  return PROVEDORES[id];
}
