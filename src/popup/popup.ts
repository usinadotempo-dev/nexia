import { enviar, type RespostaChaveStatus, type RespostaConfig, type RespostaModelosStatus } from '@shared/mensagens';

const NOMES_PROVEDOR: Record<string, string> = {
  anthropic: 'Anthropic (Claude)',
  openai: 'OpenAI',
  gemini: 'Google Gemini'
};

function definir(id: string, texto: string, ok?: boolean): void {
  const elemento = document.getElementById(id);
  if (!elemento) return;
  elemento.textContent = texto;
  elemento.classList.remove('ok', 'pendente');
  if (ok !== undefined) elemento.classList.add(ok ? 'ok' : 'pendente');
}

interface StatusAba {
  pje: boolean;
  processo: boolean;
  host: string;
}

async function statusAbaAtiva(): Promise<StatusAba | null> {
  try {
    const [aba] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!aba?.id) return null;
    return (await chrome.tabs.sendMessage(aba.id, { canal: 'STATUS_ABA' })) as StatusAba;
  } catch {
    // Sem content script na aba (não é PJe ou página não carregou a extensão).
    return null;
  }
}

async function iniciar(): Promise<void> {
  document.getElementById('btn-opcoes')?.addEventListener('click', () => chrome.runtime.openOptionsPage());

  try {
    const [{ config }, { status }, modelos, aba] = await Promise.all([
      enviar<RespostaConfig>('CONFIG_OBTER'),
      enviar<RespostaChaveStatus>('CHAVE_STATUS'),
      enviar<RespostaModelosStatus>('MODELOS_STATUS'),
      statusAbaAtiva()
    ]);

    definir('st-provedor', `${NOMES_PROVEDOR[config.provedorAtivo] ?? config.provedorAtivo} · ${config.modelos[config.provedorAtivo]}`);
    const temChave = status[config.provedorAtivo];
    definir('st-chave', temChave ? 'configurada' : 'não configurada', temChave);

    if (!aba || !aba.pje) definir('st-pagina', 'não é uma página do PJe', false);
    else if (aba.processo) definir('st-pagina', 'processo carregado', true);
    else definir('st-pagina', 'PJe sem processo aberto', false);

    definir('st-modelos', modelos.quantidade > 0 ? `${modelos.quantidade} modelo(s) indexado(s)` : 'nenhum modelo indexado');
  } catch (erro) {
    definir('st-provedor', erro instanceof Error ? erro.message : String(erro), false);
  }
}

void iniciar();
