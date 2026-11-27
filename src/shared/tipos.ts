import type { TipoEntidade } from './anonimizador/detectores';
import type { TipoGuarda } from './anonimizador/guarda';
import type { AreaId, ReceitaPersonalizada } from './areas/tipos';

export type ProvedorId = 'anthropic' | 'openai' | 'gemini';

/** Snapshot dos cabeçalhos de autenticação capturados no page world do PJe. */
export interface SnapshotAuth {
  authorization?: string;
  xPjeCookies?: string;
  xPjeLegacyApp?: string;
  xPjeUsuarioLocalizacao?: string;
  xNoSso?: string;
  xPjeAuthorization?: string;
  url: string;
  capturadoEm: number;
}

export type ModoGuarda = 'bloquear' | 'confirmar' | 'desligada';
export type EsforcoRaciocinio = 'low' | 'medium' | 'high';

export interface ConfigNexpra {
  provedorAtivo: ProvedorId;
  modelos: Record<ProvedorId, string>;
  temperatura: number;
  maxTokens: number;
  /** Caracteres de cada fonte enviados à IA; o excedente é cortado. */
  fontesMaxCharsPorFonte: number;
  /** Caracteres de todas as fontes somadas enviados à IA; as fontes além disso são omitidas. */
  fontesMaxCharsTotal: number;
  /** Quanto o modelo raciocina antes de responder (mais = melhor e mais lento/caro). */
  esforcoRaciocinio: EsforcoRaciocinio;
  /** Conector PJe: hosts em que a extensão fica desligada. */
  hostsBloqueados: string[];
  ocrAutomatico: boolean;
  ocrMaxPaginasPorDoc: number;
  ocrMaxPaginasTotal: number;

  /** Área profissional ativa (persona, receitas, detectores, ferramentas). */
  areaAtiva: AreaId;
  onboardingConcluido: boolean;
  /** Novas sessões começam com a proteção de dados ligada. */
  anonimizarPorPadrao: boolean;
  /** Detecção de nomes de pessoas por dicionário local. */
  detectarNomes: boolean;
  /** Detectores escolhidos pelo usuário por área (sobrepõe o padrão da área). */
  detectoresPorArea: Partial<Record<AreaId, TipoEntidade[]>>;
  sempreMascarar: string[];
  nuncaMascarar: string[];
  /** Guarda de saída: varredura de dados pessoais antes de qualquer envio à IA. */
  guardaSaida: ModoGuarda;
  guardaTipos: TipoGuarda[];
  /** A IA pode chamar ferramentas (APIs públicas e cálculos) durante a conversa. */
  ferramentasAutomaticas: boolean;
  /** Ferramentas desligadas pelo usuário. */
  ferramentasDesligadas: string[];
  datajudChave: string;
  transparenciaChave: string;
  receitasPersonalizadas: ReceitaPersonalizada[];
}

export type PoloParte = 'ativo' | 'passivo' | 'outros';

export interface ParteProcesso {
  nome: string;
  papel: string;
  polo: PoloParte;
  documento?: string;
}

export interface MovimentacaoProcesso {
  data: string;
  descricao: string;
}

export type StatusExtracao = 'texto-nativo' | 'ocr' | 'pendente' | 'erro' | 'ia-multimodal';

export interface DocumentoProcesso {
  id: string;
  nome: string;
  tipo: string;
  data?: string;
  texto?: string;
  paginasImagem?: string[];
  statusExtracao?: StatusExtracao;
  motivoPendencia?: string;
  completadoPorIa?: boolean;
  transcritoPorOcr?: boolean;
  erro?: string;
}

export interface DossieProcesso {
  host: string;
  idProcesso: string;
  numeroProcesso?: string;
  classe?: string;
  orgaoJulgador?: string;
  partes: ParteProcesso[];
  movimentacoes: MovimentacaoProcesso[];
  documentos: DocumentoProcesso[];
  anonimizado: boolean;
}

// ---------------------------------------------------------------------------
// LLM — representação neutra (convertida por provedor no service worker)

export interface ParteTexto { tipo: 'texto'; texto: string }
export interface ParteImagem { tipo: 'imagem'; mediaType: string; dadosBase64: string }
export interface ParteChamada {
  tipo: 'chamada';
  id: string;
  nome: string;
  args: Record<string, unknown>;
  /** Parte original do provedor (ex.: Gemini com thoughtSignature), reenviada como veio. */
  bruto?: unknown;
}
export interface ParteResultado { tipo: 'resultado'; id: string; nome: string; conteudo: string; erro?: boolean }
export type ParteConteudo = ParteTexto | ParteImagem | ParteChamada | ParteResultado;
export type ConteudoMensagem = string | ParteConteudo[];

export interface MensagemLLM {
  papel: 'user' | 'assistant';
  conteudo: ConteudoMensagem;
}

export interface RequisicaoLLM {
  system?: string;
  mensagens: MensagemLLM[];
  temperatura?: number;
  maxTokens?: number;
  /** Profundidade de raciocínio (modelos que a aceitam). */
  esforco?: EsforcoRaciocinio;
  /** Nomes das ferramentas que o modelo pode chamar nesta requisição. */
  ferramentas?: string[];
  /** O usuário confirmou o envio apesar de achados da guarda de saída. */
  guardaConfirmada?: boolean;
}

/** Modelo da biblioteca local (pasta do usuário), indexado por BM25. */
export interface ModeloMinuta {
  id: string;
  nome: string;
  natureza: string;
  texto: string;
}

export type NaturezaMinuta = 'sentenca' | 'decisao' | 'despacho' | 'voto';

export interface ResultadoBuscaModelo {
  id: string;
  nome: string;
  natureza: string;
  pontuacao: number;
  texto: string;
}
