import { CHAVES_STORAGE, PORTA_CHAT } from '@shared/constantes';
import { IndiceBm25 } from '@shared/indice-bm25';
import { log } from '@shared/log';
import type {
  DadosAuthCapturada,
  DadosAuthObter,
  DadosChaveSalvar,
  DadosConfigSalvar,
  DadosLlmGerar,
  DadosModelosBuscar,
  MensagemPortaEntrada,
  MensagemPortaSaida,
  Pedido
} from '@shared/mensagens';
import { limparModelos, listarModelos, obterMeta } from '@shared/modelos-store';
import type { ModeloMinuta, RequisicaoLLM } from '@shared/tipos';
import { obterConfig, salvarConfig } from './config';
import { obterChaveApi, salvarChaveApi, statusChaves } from './cofre-chaves';
import { obterProvedor } from './llm/fabrica';
import { gravarSnapshot, listarHosts, obterSnapshot } from './sessao-auth';

// ---------------------------------------------------------------------------
// Geração LLM

async function prepararGeracao() {
  const config = await obterConfig();
  const chaveApi = await obterChaveApi(config.provedorAtivo);
  if (!chaveApi) {
    throw new Error('Chave de API não configurada. Abra as configurações do NexIA e informe a chave do provedor ativo.');
  }
  return {
    provedor: obterProvedor(config.provedorAtivo),
    opcoesBase: { modelo: config.modelos[config.provedorAtivo], chaveApi },
    config
  };
}

function completarRequisicao(req: RequisicaoLLM, temperaturaPadrao: number, maxTokensPadrao: number): RequisicaoLLM {
  return {
    ...req,
    temperatura: req.temperatura ?? temperaturaPadrao,
    maxTokens: req.maxTokens ?? maxTokensPadrao
  };
}

// ---------------------------------------------------------------------------
// Busca de modelos de minuta (BM25 em memória, cacheado por sessão do SW)

let cacheIndice: { indice: IndiceBm25; porId: Map<string, ModeloMinuta>; carregadoEm: number } | null = null;

async function obterIndiceModelos() {
  const meta = await obterMeta();
  if (!meta) return null;
  if (!cacheIndice || cacheIndice.carregadoEm < meta.atualizadoEm) {
    const modelos = await listarModelos();
    cacheIndice = {
      indice: new IndiceBm25(modelos.map((m) => ({ id: m.id, texto: `${m.nome} ${m.texto}` }))),
      porId: new Map(modelos.map((m) => [m.id, m])),
      carregadoEm: meta.atualizadoEm
    };
  }
  return cacheIndice;
}

async function buscarModelos(dados: DadosModelosBuscar) {
  const cache = await obterIndiceModelos();
  if (!cache) return { resultados: [] };
  const brutos = cache.indice.buscar(dados.consulta, (dados.limite ?? 3) * 3);
  const resultados = [];
  for (const { id, pontuacao } of brutos) {
    const modelo = cache.porId.get(id);
    if (!modelo) continue;
    // Reforço para modelos da mesma natureza do ato pedido.
    const ajuste = dados.natureza && modelo.natureza === dados.natureza ? 1.5 : 1;
    resultados.push({ id, nome: modelo.nome, natureza: modelo.natureza, pontuacao: pontuacao * ajuste, texto: modelo.texto });
  }
  resultados.sort((a, b) => b.pontuacao - a.pontuacao);
  return { resultados: resultados.slice(0, dados.limite ?? 3) };
}

// ---------------------------------------------------------------------------
// Roteador de mensagens

async function tratarPedido(pedido: Pedido): Promise<unknown> {
  switch (pedido.canal) {
    case 'AUTH_CAPTURADA': {
      const { host, snapshot } = pedido.dados as DadosAuthCapturada;
      await gravarSnapshot(host, snapshot);
      return { ok: true };
    }
    case 'AUTH_OBTER': {
      const { host } = pedido.dados as DadosAuthObter;
      return { snapshot: await obterSnapshot(host) };
    }
    case 'AUTH_LISTAR':
      return { hosts: await listarHosts() };
    case 'CONFIG_OBTER':
      return { config: await obterConfig() };
    case 'CONFIG_SALVAR': {
      await salvarConfig((pedido.dados as DadosConfigSalvar).config);
      return { ok: true };
    }
    case 'CHAVE_SALVAR': {
      const { provedor, chave } = pedido.dados as DadosChaveSalvar;
      await salvarChaveApi(provedor, chave);
      return { ok: true };
    }
    case 'CHAVE_STATUS':
      return { status: await statusChaves() };
    case 'LLM_GERAR': {
      const { requisicao } = pedido.dados as DadosLlmGerar;
      const { provedor, opcoesBase, config } = await prepararGeracao();
      const texto = await provedor.gerar(
        completarRequisicao(requisicao, config.temperatura, config.maxTokens),
        opcoesBase
      );
      return { texto };
    }
    case 'MODELOS_BUSCAR':
      return buscarModelos(pedido.dados as DadosModelosBuscar);
    case 'MODELOS_STATUS': {
      const meta = await obterMeta();
      const modelos = meta ? await listarModelos() : [];
      return { quantidade: modelos.length, atualizadoEm: meta?.atualizadoEm ?? null, nomePasta: meta?.nomePasta ?? null };
    }
    case 'DADOS_LIMPAR': {
      await chrome.storage.local.clear();
      await chrome.storage.session.clear();
      await limparModelos();
      cacheIndice = null;
      return { ok: true };
    }
    default:
      throw new Error(`Canal desconhecido: ${String(pedido.canal)}`);
  }
}

chrome.runtime.onMessage.addListener((mensagem: Pedido, remetente, responder) => {
  if (remetente.id !== chrome.runtime.id) return false;
  tratarPedido(mensagem)
    .then(responder)
    .catch((erro: unknown) => {
      log.aviso('Falha no canal', mensagem.canal, String(erro));
      responder({ erro: erro instanceof Error ? erro.message : String(erro) });
    });
  return true; // resposta assíncrona
});

// ---------------------------------------------------------------------------
// Porta de streaming de chat

chrome.runtime.onConnect.addListener((porta) => {
  if (porta.name !== PORTA_CHAT) return;
  const controlador = new AbortController();
  porta.onDisconnect.addListener(() => controlador.abort());

  porta.onMessage.addListener((mensagem: MensagemPortaEntrada) => {
    if (mensagem.tipo !== 'iniciar') return;
    void (async () => {
      const enviar = (m: MensagemPortaSaida) => {
        try {
          porta.postMessage(m);
        } catch {
          /* porta já fechada */
        }
      };
      try {
        const { provedor, opcoesBase, config } = await prepararGeracao();
        const requisicao = completarRequisicao(mensagem.requisicao, config.temperatura, config.maxTokens);
        const texto = await provedor.gerarStream(requisicao, { ...opcoesBase, sinal: controlador.signal }, (trecho) =>
          enviar({ tipo: 'trecho', texto: trecho })
        );
        enviar({ tipo: 'fim', texto });
      } catch (erro) {
        if (!controlador.signal.aborted) {
          log.aviso('Falha no streaming', String(erro));
          enviar({ tipo: 'erro', mensagem: erro instanceof Error ? erro.message : String(erro) });
        }
      }
    })();
  });
});

log.info('Service worker iniciado', { storagePrefixo: CHAVES_STORAGE.CONFIG });
