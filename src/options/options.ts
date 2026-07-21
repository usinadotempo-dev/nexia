import { enviar, type RespostaChaveStatus, type RespostaConfig, type RespostaModelosStatus } from '@shared/mensagens';
import type { ConfigNexia, ProvedorId } from '@shared/tipos';
import { listarModelos } from '@shared/modelos-store';
import { escolherEIndexarPasta, reindexarPastaSalva } from './modelos/pasta-local';

const PROVEDORES: ProvedorId[] = ['gemini', 'anthropic', 'openai'];

function campo<T extends HTMLElement>(id: string): T {
  const elemento = document.getElementById(id);
  if (!elemento) throw new Error(`elemento #${id} ausente`);
  return elemento as T;
}

function statusTexto(id: string, texto: string, erro = false): void {
  const elemento = campo<HTMLElement>(id);
  elemento.textContent = texto;
  elemento.classList.toggle('erro', erro);
  if (texto) setTimeout(() => (elemento.textContent === texto ? (elemento.textContent = '') : undefined), 6000);
}

async function carregar(): Promise<void> {
  const { config } = await enviar<RespostaConfig>('CONFIG_OBTER');
  campo<HTMLSelectElement>('provedor').value = config.provedorAtivo;
  for (const p of PROVEDORES) campo<HTMLInputElement>(`modelo-${p}`).value = config.modelos[p];
  campo<HTMLInputElement>('temperatura').value = String(config.temperatura);
  campo<HTMLInputElement>('max-tokens').value = String(config.maxTokens);
  campo<HTMLTextAreaElement>('hosts-bloqueados').value = config.hostsBloqueados.join('\n');

  const { status } = await enviar<RespostaChaveStatus>('CHAVE_STATUS');
  for (const p of PROVEDORES) campo<HTMLElement>(`ind-${p}`).classList.toggle('ok', status[p]);

  await atualizarStatusModelos();
}

async function atualizarStatusModelos(): Promise<void> {
  const info = await enviar<RespostaModelosStatus>('MODELOS_STATUS');
  const rotulo = info.quantidade > 0
    ? `${info.quantidade} modelo(s) — pasta "${info.nomePasta ?? '?'}" — atualizado em ${info.atualizadoEm ? new Date(info.atualizadoEm).toLocaleString('pt-BR') : '?'}`
    : 'Nenhum modelo indexado.';
  campo<HTMLElement>('st-modelos').textContent = rotulo;

  const lista = campo<HTMLUListElement>('lista-modelos');
  lista.textContent = '';
  if (info.quantidade > 0) {
    for (const modelo of await listarModelos()) {
      const item = document.createElement('li');
      item.textContent = `${modelo.nome} (${modelo.natureza})`;
      lista.append(item);
    }
  }
}

async function salvar(): Promise<void> {
  try {
    const config: ConfigNexia = {
      provedorAtivo: campo<HTMLSelectElement>('provedor').value as ProvedorId,
      modelos: {
        gemini: campo<HTMLInputElement>('modelo-gemini').value.trim(),
        anthropic: campo<HTMLInputElement>('modelo-anthropic').value.trim(),
        openai: campo<HTMLInputElement>('modelo-openai').value.trim()
      },
      temperatura: Math.min(1, Math.max(0, Number(campo<HTMLInputElement>('temperatura').value) || 0.3)),
      maxTokens: Math.max(1024, Number(campo<HTMLInputElement>('max-tokens').value) || 8192),
      hostsBloqueados: campo<HTMLTextAreaElement>('hosts-bloqueados')
        .value.split('\n')
        .map((h) => h.trim())
        .filter(Boolean)
    };
    await enviar('CONFIG_SALVAR', { config });

    for (const p of PROVEDORES) {
      const entrada = campo<HTMLInputElement>(`chave-${p}`);
      if (entrada.value.trim()) {
        await enviar('CHAVE_SALVAR', { provedor: p, chave: entrada.value.trim() });
        entrada.value = '';
        campo<HTMLElement>(`ind-${p}`).classList.add('ok');
      }
    }
    statusTexto('st-salvo', 'Configurações salvas.');
  } catch (erro) {
    statusTexto('st-salvo', erro instanceof Error ? erro.message : String(erro), true);
  }
}

function ligarEventos(): void {
  campo<HTMLButtonElement>('btn-salvar').addEventListener('click', () => void salvar());

  campo<HTMLButtonElement>('btn-pasta').addEventListener('click', () =>
    void (async () => {
      try {
        const resultado = await escolherEIndexarPasta();
        statusTexto('st-modelos', `${resultado.quantidade} modelo(s) indexado(s).${resultado.falhas.length ? ` Falhas: ${resultado.falhas.length}.` : ''}`);
        await atualizarStatusModelos();
      } catch (erro) {
        if ((erro as Error).name !== 'AbortError') statusTexto('st-modelos', String(erro), true);
      }
    })()
  );

  campo<HTMLButtonElement>('btn-reindexar').addEventListener('click', () =>
    void (async () => {
      try {
        const resultado = await reindexarPastaSalva();
        statusTexto('st-modelos', `Reindexado: ${resultado.quantidade} modelo(s).`);
        await atualizarStatusModelos();
      } catch (erro) {
        statusTexto('st-modelos', erro instanceof Error ? erro.message : String(erro), true);
      }
    })()
  );

  campo<HTMLButtonElement>('btn-limpar').addEventListener('click', () =>
    void (async () => {
      if (!confirm('Apagar TODAS as configurações, chaves de API e índice de modelos do NexIA?')) return;
      await enviar('DADOS_LIMPAR');
      location.reload();
    })()
  );
}

ligarEventos();
void carregar();
