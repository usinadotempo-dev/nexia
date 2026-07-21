/**
 * Entry do content script (isolated world).
 * Em todos os frames: relay do snapshot de auth capturado no page world.
 * No frame principal (se a página parecer PJe e o host não estiver bloqueado):
 * monta a UI e orquestra coleta, anonimização, chat, resumo e minuta.
 */
import { log } from '@shared/log';
import { enviar, type RespostaConfig } from '@shared/mensagens';
import { montarMensagemContexto, RESPOSTA_CONTEXTO_ACK, SYSTEM_PROMPT } from '@shared/prompts';
import type { DossieProcesso, MensagemLLM, NaturezaMinuta, RequisicaoLLM } from '@shared/tipos';
import { desanonimizar } from './anonimizador/anonimizar';
import { anonimizarProcesso } from './anonimizador/fluxo';
import { baixarTxtProcesso } from './anonimizador/txt-processo';
import { montarRequisicaoResumo } from './acoes/resumir';
import { prepararMinuta, prepararRefinamento } from './acoes/minutar';
import { gerarStream } from './llm-cliente';
import { coletarProcesso } from './pje/contexto';
import { instalarRelayAuth } from './ponte-main';
import { hostBloqueado, pareceSerPje } from './sonda-pje';
import { copiarParaAreaDeTransferencia, criarRaizNexia, mostrarToast } from './ui';
import { criarFab, SidebarNexia } from './ui/sidebar';

interface Estado {
  dossie: DossieProcesso | null;
  mapaReverso: Map<string, string>;
  historicoChat: MensagemLLM[];
  ocupado: boolean;
  ultimaMinuta: string;
  ultimoPromptMinuta: string;
  ultimoResumo: string;
}

const estado: Estado = {
  dossie: null,
  mapaReverso: new Map(),
  historicoChat: [],
  ocupado: false,
  ultimaMinuta: '',
  ultimoPromptMinuta: '',
  ultimoResumo: ''
};

let ui: SidebarNexia;
let raiz: ShadowRoot;

function exibir(texto: string): string {
  return estado.mapaReverso.size > 0 ? desanonimizar(texto, estado.mapaReverso) : texto;
}

async function garantirDossie(): Promise<DossieProcesso> {
  if (estado.dossie) return estado.dossie;
  ui.definirStatus('Coletando o processo…');
  const dossie = await coletarProcesso((progresso) => {
    const contagem =
      progresso.total !== undefined ? ` ${progresso.feitos ?? 0}/${progresso.total} documentos` : '';
    ui.definirStatus(`${progresso.etapa}${contagem}`);
  });
  estado.dossie = dossie;
  const extraidos = dossie.documentos.filter((d) => d.texto || d.paginasImagem?.length).length;
  ui.definirStatus(
    `Processo carregado: ${dossie.partes.length} parte(s), ${dossie.movimentacoes.length} movimentação(ões), ${extraidos}/${dossie.documentos.length} documento(s) extraído(s).`
  );
  return dossie;
}

function executarStream(
  requisicao: RequisicaoLLM,
  aoAtualizar: (texto: string, gerando: boolean) => void,
  aoConcluir: (texto: string) => void
): void {
  estado.ocupado = true;
  ui.definirOcupado(true);
  let acumulado = '';
  gerarStream(requisicao, {
    aoTrecho: (trecho) => {
      acumulado += trecho;
      aoAtualizar(exibir(acumulado), true);
    },
    aoFim: (completo) => {
      estado.ocupado = false;
      ui.definirOcupado(false);
      aoAtualizar(exibir(completo), false);
      aoConcluir(completo);
    },
    aoErro: (mensagem) => {
      estado.ocupado = false;
      ui.definirOcupado(false);
      aoAtualizar(exibir(acumulado), false);
      ui.definirStatus(mensagem, true);
      mostrarToast(raiz, mensagem, 'erro');
    }
  });
}

// ---------------------------------------------------------------------------
// Ações da UI

async function aoEnviarChat(texto: string): Promise<void> {
  if (estado.ocupado) return;
  try {
    const dossie = await garantirDossie();
    ui.adicionarMensagemChat('usuario', texto);
    estado.historicoChat.push({ papel: 'user', conteudo: texto });

    const requisicao: RequisicaoLLM = {
      system: SYSTEM_PROMPT,
      mensagens: [
        montarMensagemContexto(dossie),
        { papel: 'assistant', conteudo: RESPOSTA_CONTEXTO_ACK },
        ...estado.historicoChat
      ]
    };
    const bolha = ui.adicionarMensagemChat('assistente', '');
    bolha.classList.add('gerando');
    executarStream(
      requisicao,
      (parcial, gerando) => ui.atualizarMensagemChat(bolha, parcial, gerando),
      (completo) => estado.historicoChat.push({ papel: 'assistant', conteudo: completo })
    );
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    ui.definirStatus(mensagem, true);
    mostrarToast(raiz, mensagem, 'erro');
  }
}

async function aoAnonimizar(): Promise<void> {
  if (estado.ocupado) return;
  try {
    const dossie = await garantirDossie();
    if (dossie.anonimizado) {
      ui.ativarAba('anonimizar');
      return;
    }
    estado.ocupado = true;
    ui.definirOcupado(true);
    ui.ativarAba('anonimizar');
    const resultado = await anonimizarProcesso(dossie, {
      comOcr: true,
      aoProgresso: (texto) => ui.definirProgressoAnonimizacao(texto)
    });
    estado.mapaReverso = resultado.mapaReverso;
    ui.definirAnonimizado();
    ui.definirRelatorio(resultado.relatorio);
    ui.definirProgressoAnonimizacao('Anonimização concluída. Baixe o TXT ou continue no chat/resumo/minuta.');
    ui.definirStatus('Processo anonimizado localmente. Nenhum dado pessoal será enviado à IA.');
    mostrarToast(raiz, `Anonimização concluída: ${resultado.relatorio.nomesMascarados} nome(s) e ${resultado.relatorio.totalPii} dado(s) pessoal(is) mascarados localmente.`);
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    ui.definirProgressoAnonimizacao(mensagem);
    ui.definirStatus(mensagem, true);
    mostrarToast(raiz, mensagem, 'erro');
  } finally {
    estado.ocupado = false;
    ui.definirOcupado(false);
  }
}

async function aoBaixarTxt(): Promise<void> {
  try {
    baixarTxtProcesso(await garantirDossie());
  } catch (erro) {
    ui.definirStatus(erro instanceof Error ? erro.message : String(erro), true);
  }
}

async function aoRecarregarAutos(): Promise<void> {
  if (estado.ocupado) return;
  estado.dossie = null;
  estado.mapaReverso = new Map();
  estado.historicoChat = [];
  try {
    await garantirDossie();
  } catch (erro) {
    ui.definirStatus(erro instanceof Error ? erro.message : String(erro), true);
  }
}

async function aoGerarResumo(): Promise<void> {
  if (estado.ocupado) return;
  try {
    const dossie = await garantirDossie();
    executarStream(
      montarRequisicaoResumo(dossie),
      (parcial, gerando) => ui.atualizarSaidaResumo(parcial, gerando),
      (completo) => {
        estado.ultimoResumo = completo;
      }
    );
  } catch (erro) {
    ui.definirStatus(erro instanceof Error ? erro.message : String(erro), true);
  }
}

async function aoGerarMinuta(natureza: NaturezaMinuta, instrucoes: string): Promise<void> {
  if (estado.ocupado) return;
  try {
    const dossie = await garantirDossie();
    ui.definirStatus('Buscando modelo local pertinente…');
    const preparacao = await prepararMinuta(dossie, natureza, instrucoes);
    ui.definirModeloUsado(preparacao.modeloUsado);
    estado.ultimoPromptMinuta = preparacao.promptMinuta;
    executarStream(
      preparacao.requisicao,
      (parcial, gerando) => ui.atualizarSaidaMinuta(parcial, gerando),
      (completo) => {
        estado.ultimaMinuta = completo;
        ui.definirStatus('Minuta gerada. Revise antes de utilizar.');
      }
    );
  } catch (erro) {
    ui.definirStatus(erro instanceof Error ? erro.message : String(erro), true);
  }
}

async function aoRefinarMinuta(instrucoes: string): Promise<void> {
  if (estado.ocupado || !estado.ultimaMinuta) {
    if (!estado.ultimaMinuta) mostrarToast(raiz, 'Gere uma minuta antes de refinar.', 'erro');
    return;
  }
  try {
    const dossie = await garantirDossie();
    const requisicao = prepararRefinamento(dossie, estado.ultimoPromptMinuta, estado.ultimaMinuta, instrucoes);
    executarStream(
      requisicao,
      (parcial, gerando) => ui.atualizarSaidaMinuta(parcial, gerando),
      (completo) => {
        estado.ultimaMinuta = completo;
      }
    );
  } catch (erro) {
    ui.definirStatus(erro instanceof Error ? erro.message : String(erro), true);
  }
}

// ---------------------------------------------------------------------------
// Bootstrap

async function principal(): Promise<void> {
  if (!pareceSerPje()) return;
  instalarRelayAuth();
  if (window !== window.top) return;

  try {
    const { config } = await enviar<RespostaConfig>('CONFIG_OBTER');
    if (hostBloqueado(config.hostsBloqueados)) return;
  } catch (erro) {
    log.aviso('Config indisponível, prosseguindo com padrão', String(erro));
  }

  raiz = criarRaizNexia();
  ui = new SidebarNexia({
    aoEnviarChat: (texto) => void aoEnviarChat(texto),
    aoAnonimizar: () => void aoAnonimizar(),
    aoBaixarTxt: () => void aoBaixarTxt(),
    aoRecarregarAutos: () => void aoRecarregarAutos(),
    aoGerarResumo: () => void aoGerarResumo(),
    aoCopiarResumo: () => void copiarParaAreaDeTransferencia(raiz, exibir(estado.ultimoResumo)),
    aoGerarMinuta: (natureza, instrucoes) => void aoGerarMinuta(natureza, instrucoes),
    aoRefinarMinuta: (instrucoes) => void aoRefinarMinuta(instrucoes),
    aoCopiarMinuta: () => void copiarParaAreaDeTransferencia(raiz, exibir(estado.ultimaMinuta))
  });
  raiz.append(ui.elemento);
  raiz.append(criarFab(() => ui.alternar()));
  log.info('NexIA ativo neste frame');
}

void principal();
