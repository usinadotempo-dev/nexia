import { enviar, type RespostaAuthListar, type RespostaChaveStatus, type RespostaConfig, type RespostaModelosStatus } from '@shared/mensagens';

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

async function iniciar(): Promise<void> {
  document.getElementById('btn-opcoes')?.addEventListener('click', () => chrome.runtime.openOptionsPage());

  try {
    const [{ config }, { status }, { hosts }, modelos] = await Promise.all([
      enviar<RespostaConfig>('CONFIG_OBTER'),
      enviar<RespostaChaveStatus>('CHAVE_STATUS'),
      enviar<RespostaAuthListar>('AUTH_LISTAR'),
      enviar<RespostaModelosStatus>('MODELOS_STATUS')
    ]);

    definir('st-provedor', `${NOMES_PROVEDOR[config.provedorAtivo] ?? config.provedorAtivo} · ${config.modelos[config.provedorAtivo]}`);
    const temChave = status[config.provedorAtivo];
    definir('st-chave', temChave ? 'configurada' : 'não configurada', temChave);
    definir(
      'st-auth',
      hosts.length > 0 ? `${hosts.length} host(s) com sessão capturada` : 'nenhuma sessão capturada ainda',
      hosts.length > 0
    );
    definir('st-modelos', modelos.quantidade > 0 ? `${modelos.quantidade} modelo(s) indexado(s)` : 'nenhum modelo indexado');
  } catch (erro) {
    definir('st-provedor', erro instanceof Error ? erro.message : String(erro), false);
  }
}

void iniciar();
