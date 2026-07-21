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

export interface ConfigNexia {
  provedorAtivo: ProvedorId;
  modelos: Record<ProvedorId, string>;
  temperatura: number;
  maxTokens: number;
  hostsBloqueados: string[];
}

export type PoloParte = 'ativo' | 'passivo' | 'outros';

export interface ParteProcesso {
  nome: string;
  /** Papel como informado pelo PJe (AUTOR, REU, ADVOGADO, PERITO...). */
  papel: string;
  polo: PoloParte;
  documento?: string;
}

export interface MovimentacaoProcesso {
  data: string;
  descricao: string;
}

export interface DocumentoProcesso {
  id: string;
  nome: string;
  tipo: string;
  data?: string;
  texto?: string;
  /** Páginas renderizadas como data URLs (documentos digitalizados). */
  paginasImagem?: string[];
  /** true quando o texto veio de OCR local de um documento digitalizado. */
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

export interface ParteTexto { tipo: 'texto'; texto: string }
export interface ParteImagem { tipo: 'imagem'; mediaType: string; dadosBase64: string }
export type ConteudoMensagem = string | Array<ParteTexto | ParteImagem>;

export interface MensagemLLM {
  papel: 'user' | 'assistant';
  conteudo: ConteudoMensagem;
}

export interface RequisicaoLLM {
  system?: string;
  mensagens: MensagemLLM[];
  temperatura?: number;
  maxTokens?: number;
}

/** Modelo de minuta indexado localmente. */
export interface ModeloMinuta {
  id: string;
  nome: string;
  natureza: NaturezaMinuta | 'outro';
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
