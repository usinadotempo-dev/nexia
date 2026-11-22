import { descreverAchados, verificarGuarda } from '@shared/anonimizador/guarda';
import { CHAVES_STORAGE, LIMITES, maxSaidaDoModelo, PORTA_CHAT } from '@shared/constantes';
import { esquemaJson, obterFerramenta } from '@shared/ferramentas/definicoes';
import { IndiceBm25 } from '@shared/indice-bm25';
import { log } from '@shared/log';
import type {
  ConteudoPendente,
  DadosAuthCapturada,
  DadosAuthObter,
  DadosChaveSalvar,
  DadosConfigSalvar,
  DadosFerramentaExecutar,
  DadosLlmGerar,
  DadosModelosBuscar,
  DadosOcrPagina,
  MensagemPortaEntrada,
  MensagemPortaSaida,
  Pedido,
  RespostaOcrPagina
} from '@shared/mensagens';
import { limparModelos, listarModelos, obterMeta } from '@shared/modelos-store';
import type { MensagemLLM, ModeloMinuta, ParteResultado, RequisicaoLLM } from '@shared/tipos';
import { obterConfig, salvarConfig } from './config';
import { obterChaveApi, salvarChaveApi, statusChaves } from './cofre-chaves';
import { executarFerramenta } from './ferramentas/executor';
import { obterProvedor } from './llm/fabrica';
import type { FerramentaLLM } from './llm/provedor';
import { gravarSnapshot, listarHosts, obterSnapshot } from './sessao-auth';

// ---------------------------------------------------------------------------
// OCR local (PP-OCR via ONNX Runtime Web) — a inferência roda no Offscreen
// Document; este SW só garante o offscreen e faz o relay da imagem.

const OFFSCREEN_PATH = 'src/offscreen/offscreen.html';
let criandoOffscreen: Promise<void> | null = null;

async function garantirOffscreen(): Promise<void> {
  const contextos = await chrome.runtime.getContexts({ contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT] });
  if (contextos.length > 0) return;
  if (criandoOffscreen) return criandoOffscreen;
  criandoOffscreen = chrome.offscreen.createDocument({
    url: OFFSCREEN_PATH,
    reasons: ['WORKERS' as chrome.offscreen.Reason],
    justification: 'Inferência de OCR local (ONNX Runtime Web) fora do service worker.'
  });
  try {
    await criandoOffscreen;
  } finally {
    criandoOffscreen = null;
  }
}

async function ocrPagina(dados: DadosOcrPagina): Promise<RespostaOcrPagina> {
  try {
    await garantirOffscreen();
    const r = (await chrome.runtime.sendMessage({ type: 'ocr:run:offscreen', dataUrl: dados.imagem })) as {
      ok: boolean;
      text?: string;
      backend?: string;
      ms?: number;
      error?: string;
    };
    if (r?.ok) return { texto: r.text ?? '', backend: r.backend, ms: r.ms };
    return { texto: '', falha: r?.error ?? 'OCR falhou', ms: r?.ms };
  } catch (erro) {
    return { texto: '', falha: erro instanceof Error ? erro.message : String(erro) };
  }
}

// ---------------------------------------------------------------------------
// Geração LLM

async function prepararGeracao() {
  const config = await obterConfig();
  const chaveApi = await obterChaveApi(config.provedorAtivo);
  if (!chaveApi) {
    throw new Error('Chave de API não configurada. Abra as opções do NexIA e informe a chave do provedor ativo. (O anonimizador e as consultas funcionam sem chave.)');
  }
  const modelo = config.modelos[config.provedorAtivo];
  return {
    provedor: obterProvedor(config.provedorAtivo),
    opcoesBase: { modelo, chaveApi },
    tetoTokens: maxSaidaDoModelo(config.provedorAtivo, modelo),
    config
  };
}

function completarRequisicao(req: RequisicaoLLM, temperaturaPadrao: number, maxTokensPadrao: number, tetoTokens: number): RequisicaoLLM {
  const desejado = req.maxTokens ?? maxTokensPadrao;
  return { ...req, temperatura: req.temperatura ?? temperaturaPadrao, maxTokens: Math.min(desejado, tetoTokens) };
}

/** Todo o texto que sairia para o provedor (para a guarda de saída). */
function textoDaRequisicao(req: RequisicaoLLM): string {
  const partes: string[] = [req.system ?? ''];
  for (const m of req.mensagens) {
    if (typeof m.conteudo === 'string') {
      partes.push(m.conteudo);
      continue;
    }
    for (const p of m.conteudo) {
      if (p.tipo === 'texto') partes.push(p.texto);
      else if (p.tipo === 'resultado') partes.push(p.conteudo);
    }
  }
  return partes.join('\n');
}

function ferramentasDaRequisicao(req: RequisicaoLLM, desligadas: string[]): FerramentaLLM[] {
  const lista: FerramentaLLM[] = [];
  for (const nome of req.ferramentas ?? []) {
    if (desligadas.includes(nome)) continue;
    const def = obterFerramenta(nome);
    if (def) lista.push({ nome: def.nome, descricao: def.descricao, esquema: esquemaJson(def) });
  }
  return lista;
}

// ---------------------------------------------------------------------------
// Biblioteca de modelos (BM25 em memória, cacheado por sessão do SW)

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
    case 'AUTH_OBTER':
      return { snapshot: await obterSnapshot((pedido.dados as DadosAuthObter).host) };
    case 'AUTH_LISTAR':
      return { hosts: await listarHosts() };
    case 'CONFIG_OBTER':
      return { config: await obterConfig() };
    case 'CONFIG_SALVAR': {
      const atual = await obterConfig();
      await salvarConfig({ ...atual, ...(pedido.dados as DadosConfigSalvar).config });
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
      const { provedor, opcoesBase, config, tetoTokens } = await prepararGeracao();
      const texto = await provedor.gerar(completarRequisicao(requisicao, config.temperatura, config.maxTokens, tetoTokens), opcoesBase);
      return { texto };
    }
    case 'MODELOS_BUSCAR':
      return buscarModelos(pedido.dados as DadosModelosBuscar);
    case 'MODELOS_STATUS': {
      const meta = await obterMeta();
      const modelos = meta ? await listarModelos() : [];
      return { quantidade: modelos.length, atualizadoEm: meta?.atualizadoEm ?? null, nomePasta: meta?.nomePasta ?? null };
    }
    case 'OCR_PAGINA':
      return ocrPagina(pedido.dados as DadosOcrPagina);
    case 'FERRAMENTA_EXECUTAR': {
      const { nome, args } = pedido.dados as DadosFerramentaExecutar;
      return executarFerramenta(nome, args, await obterConfig());
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
  if (!mensagem || typeof (mensagem as { canal?: unknown }).canal !== 'string') return false;

  // Abrir o painel precisa acontecer de forma síncrona, ainda dentro do gesto do usuário.
  if (mensagem.canal === 'PAINEL_ABRIR') {
    const tabId = remetente.tab?.id;
    if (tabId === undefined) {
      responder({ erro: 'Aba de origem desconhecida.' });
      return false;
    }
    chrome.sidePanel
      .open({ tabId })
      .then(() => responder({ ok: true }))
      .catch((erro: unknown) => responder({ erro: erro instanceof Error ? erro.message : String(erro) }));
    return true;
  }

  tratarPedido(mensagem)
    .then(responder)
    .catch((erro: unknown) => {
      log.aviso('Falha no canal', mensagem.canal, String(erro));
      responder({ erro: erro instanceof Error ? erro.message : String(erro) });
    });
  return true;
});

// ---------------------------------------------------------------------------
// Porta de chat: guarda de saída + streaming ou laço de ferramentas

chrome.runtime.onConnect.addListener((porta) => {
  if (porta.name !== PORTA_CHAT) return;
  const controlador = new AbortController();
  const pendentes = new Map<string, (r: { conteudo: string; erro?: boolean }) => void>();
  porta.onDisconnect.addListener(() => {
    controlador.abort();
    for (const resolver of pendentes.values()) resolver({ conteudo: 'Conexão encerrada.', erro: true });
    pendentes.clear();
  });

  const enviar = (m: MensagemPortaSaida) => {
    try {
      porta.postMessage(m);
    } catch {
      /* porta já fechada */
    }
  };

  const aguardarResultado = (id: string) =>
    new Promise<{ conteudo: string; erro?: boolean }>((resolver) => {
      pendentes.set(id, resolver);
    });

  porta.onMessage.addListener((mensagem: MensagemPortaEntrada) => {
    if (mensagem.tipo === 'resultado-ferramenta') {
      const resolver = pendentes.get(mensagem.id);
      if (resolver) {
        pendentes.delete(mensagem.id);
        resolver({ conteudo: mensagem.conteudo, erro: mensagem.erro });
      }
      return;
    }
    if (mensagem.tipo !== 'iniciar') return;

    void (async () => {
      try {
        const { provedor, opcoesBase, config, tetoTokens } = await prepararGeracao();
        const requisicao = completarRequisicao(mensagem.requisicao, config.temperatura, config.maxTokens, tetoTokens);

        // Guarda de saída: última barreira, independente da UI.
        if (config.guardaSaida !== 'desligada') {
          const achados = verificarGuarda(textoDaRequisicao(requisicao), config.guardaTipos);
          if (achados.length > 0) {
            if (config.guardaSaida === 'bloquear') {
              enviar({
                tipo: 'erro',
                mensagem: `Envio bloqueado pela guarda de saída: o conteúdo contém ${descreverAchados(achados)}. Ative a proteção de dados (anonimização) ou ajuste a guarda nas opções.`
              });
              return;
            }
            if (!requisicao.guardaConfirmada) {
              enviar({ tipo: 'guarda', achados });
              return;
            }
          }
        }

        const ferramentas = config.ferramentasAutomaticas ? ferramentasDaRequisicao(requisicao, config.ferramentasDesligadas) : [];
        if (ferramentas.length === 0) {
          const texto = await provedor.gerarStream(requisicao, { ...opcoesBase, sinal: controlador.signal }, (trecho) =>
            enviar({ tipo: 'trecho', texto: trecho })
          );
          enviar({ tipo: 'fim', texto });
          return;
        }

        // Laço de ferramentas: o cliente executa cada chamada (resolvendo marcadores
        // localmente) e devolve o resultado já reanonimizado.
        const mensagens: MensagemLLM[] = [...requisicao.mensagens];
        let acumulado = '';
        for (let rodada = 0; rodada <= LIMITES.MAX_RODADAS_FERRAMENTAS; rodada++) {
          const ultima = rodada === LIMITES.MAX_RODADAS_FERRAMENTAS;
          // As ferramentas continuam declaradas mesmo na última rodada: alguns provedores
          // recusam histórico com chamadas de ferramenta sem a declaração correspondente.
          const resposta = await provedor.gerarComFerramentas(
            { ...requisicao, mensagens },
            { ...opcoesBase, sinal: controlador.signal },
            ferramentas
          );
          if (resposta.texto) {
            const trecho = (acumulado ? '\n\n' : '') + resposta.texto;
            acumulado += trecho;
            enviar({ tipo: 'trecho', texto: trecho });
          }
          if (resposta.chamadas.length === 0) break;
          if (ultima) {
            const aviso = `${acumulado ? '\n\n' : ''}_(Limite de ${LIMITES.MAX_RODADAS_FERRAMENTAS} rodadas de consultas atingido. Peça para continuar, se necessário.)_`;
            acumulado += aviso;
            enviar({ tipo: 'trecho', texto: aviso });
            break;
          }

          mensagens.push({
            papel: 'assistant',
            conteudo: [...(resposta.texto ? [{ tipo: 'texto' as const, texto: resposta.texto }] : []), ...resposta.chamadas]
          });
          const resultados: ParteResultado[] = [];
          for (const chamada of resposta.chamadas) {
            enviar({ tipo: 'ferramenta', id: chamada.id, nome: chamada.nome, args: chamada.args });
            const r = await aguardarResultado(chamada.id);
            if (controlador.signal.aborted) return;
            resultados.push({ tipo: 'resultado', id: chamada.id, nome: chamada.nome, conteudo: r.conteudo || '(sem conteúdo)', erro: r.erro });
          }
          mensagens.push({ papel: 'user', conteudo: resultados });
        }
        enviar({ tipo: 'fim', texto: acumulado });
      } catch (erro) {
        if (!controlador.signal.aborted) {
          log.aviso('Falha na geração', String(erro));
          enviar({ tipo: 'erro', mensagem: erro instanceof Error ? erro.message : String(erro) });
        }
      }
    })();
  });
});

// ---------------------------------------------------------------------------
// Painel lateral e menus de contexto

function configurarPainel(): void {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((erro: unknown) => log.aviso('sidePanel', String(erro)));
}

chrome.runtime.onInstalled.addListener(() => {
  configurarPainel();
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: 'nexia-selecao', title: 'NexIA: levar seleção para o painel', contexts: ['selection'] });
    chrome.contextMenus.create({ id: 'nexia-pagina', title: 'NexIA: levar esta página para o painel', contexts: ['page'] });
  });
});
chrome.runtime.onStartup.addListener(configurarPainel);

/** Lê seleção (preservando quebras de linha) ou o texto visível da página. activeTab é concedido pelo clique no menu. */
async function lerDaAba(tabId: number, modo: 'selecao' | 'pagina'): Promise<{ texto: string; titulo: string; url: string }> {
  const [resultado] = await chrome.scripting.executeScript({
    target: { tabId },
    func: (m: string) => ({
      texto: m === 'selecao' ? String(window.getSelection() ?? '') : document.body?.innerText ?? '',
      titulo: document.title,
      url: location.href
    }),
    args: [modo]
  });
  return (resultado?.result as { texto: string; titulo: string; url: string }) ?? { texto: '', titulo: '', url: '' };
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id || tab.windowId === undefined) return;
  // Abre o painel imediatamente (gesto do usuário), depois coleta o conteúdo.
  chrome.sidePanel.open({ windowId: tab.windowId }).catch((erro: unknown) => log.aviso('sidePanel.open', String(erro)));
  const modo = info.menuItemId === 'nexia-selecao' ? 'selecao' : 'pagina';
  void (async () => {
    let lido = { texto: info.selectionText ?? '', titulo: tab.title ?? '', url: tab.url ?? '' };
    try {
      const daAba = await lerDaAba(tab.id!, modo);
      if (daAba.texto.trim()) lido = daAba;
    } catch (erro) {
      log.aviso('Leitura da aba falhou; usando o texto do menu', String(erro));
    }
    if (!lido.texto.trim()) return;
    const pendente: ConteudoPendente = {
      origem: modo,
      titulo: modo === 'selecao' ? `Seleção — ${lido.titulo || 'página'}` : lido.titulo || 'Página',
      texto: lido.texto,
      url: lido.url,
      criadoEm: Date.now()
    };
    await chrome.storage.session.set({ [CHAVES_STORAGE.PENDENTE_PAINEL]: pendente });
  })();
});

log.info('Service worker iniciado');
