/**
 * Motor de pseudonimização do Nexpra — 100% local, sem rede, sem IA.
 *
 * Uma SessaoAnonimizacao mantém um registro estável "valor original → pseudônimo"
 * válido para TODOS os documentos e mensagens da sessão: o mesmo CPF vira sempre
 * [CPF_1], a mesma pessoa sempre [PESSOA_2]. Isso permite:
 *  - o modelo de IA raciocinar sobre as entidades sem conhecê-las;
 *  - reexibir as respostas com os dados reais apenas na tela do usuário;
 *  - a IA pedir consultas (ex.: CNPJ [CNPJ_1]) que a extensão resolve localmente.
 *
 * O registro nunca é persistido (vive na memória da página).
 */
import {
  detectar,
  type PessoaConhecida,
  resolverSobreposicoes,
  type Span,
  TIPOS_ENTIDADE,
  type TipoEntidade
} from './detectores.ts';
import { normalizarToken } from './nomes-br.ts';

export interface OpcoesSessao {
  tipos: TipoEntidade[];
  detectarNomes: boolean;
  pessoasConhecidas?: PessoaConhecida[];
  sempreMascarar?: string[];
  nuncaMascarar?: string[];
}

export interface EntidadeRegistro {
  chave: string;
  token: string;
  tipo: TipoEntidade;
  original: string;
  ocorrencias: number;
  ignorada: boolean;
}

export interface ResultadoAnonimizacaoTexto {
  texto: string;
  substituicoes: number;
}

/** Pseudônimos gerados pelo Nexpra: [CPF_1], [PESSOA_12], [PARTE AUTORA], [PARTE AUTORA 2]. */
export const REGEX_TOKEN = /\[(?:[A-Z_]+_\d+|[A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-ZÁÉÍÓÚÂÊÔÃÕÇ ]+?(?: \d+)?)\]/g;

function chaveDe(tipo: TipoEntidade, valor: string): string {
  let norm: string;
  if (tipo === 'PESSOA' || tipo === 'ENDERECO' || tipo === 'PERSONALIZADO') {
    norm = normalizarToken(valor).replace(/\s+/g, ' ').trim();
  } else if (tipo === 'EMAIL' || tipo === 'PIX') {
    norm = valor.toLowerCase();
  } else {
    norm = valor.toUpperCase().replace(/[^0-9A-Z]/g, '');
    // CPF/CNPJ/telefone: compara só o que identifica (ignora +55 do telefone).
    if (tipo === 'TELEFONE' && norm.startsWith('55') && norm.length >= 12) norm = norm.slice(2);
  }
  return `${tipo}:${norm}`;
}

export class SessaoAnonimizacao {
  private registro = new Map<string, EntidadeRegistro>();
  private porToken = new Map<string, EntidadeRegistro>();
  private contadores = new Map<string, number>();
  private opcoes: OpcoesSessao;
  private tiposAtivos: Set<TipoEntidade>;
  private nunca: Set<string>;

  constructor(opcoes: OpcoesSessao) {
    this.opcoes = opcoes;
    this.tiposAtivos = new Set(opcoes.tipos);
    this.nunca = new Set((opcoes.nuncaMascarar ?? []).map((t) => normalizarToken(t).trim()));
  }

  obterOpcoes(): OpcoesSessao {
    return this.opcoes;
  }

  /** Troca as opções sem perder o registro (pseudônimos continuam estáveis). */
  definirOpcoes(opcoes: OpcoesSessao): void {
    this.opcoes = opcoes;
    this.tiposAtivos = new Set(opcoes.tipos);
    this.nunca = new Set((opcoes.nuncaMascarar ?? []).map((t) => normalizarToken(t).trim()));
  }

  /** Marca/desmarca uma entidade como "não mascarar" nesta sessão. */
  ignorar(chave: string, ignorada: boolean): void {
    const e = this.registro.get(chave);
    if (e) e.ignorada = ignorada;
  }

  /** Zera as contagens (antes de reprocessar todos os documentos). */
  zerarContagens(): void {
    for (const e of this.registro.values()) e.ocorrencias = 0;
  }

  /**
   * Apaga da memória as entidades sem nenhuma ocorrência (ex.: após remover uma fonte).
   * Só deve ser chamado quando nenhum texto já enviado depende desses pseudônimos.
   */
  descartarSemOcorrencias(): number {
    let removidas = 0;
    for (const [chave, e] of this.registro) {
      if (e.ocorrencias > 0) continue;
      this.registro.delete(chave);
      this.porToken.delete(e.token);
      removidas++;
    }
    return removidas;
  }

  private tokenPara(span: Span): EntidadeRegistro {
    const chave = chaveDe(span.tipo, span.valor);
    const existente = this.registro.get(chave);
    if (existente) return existente;

    let token: string;
    if (span.rotulo) {
      const base = span.rotulo.toUpperCase();
      const n = (this.contadores.get(`rotulo:${base}`) ?? 0) + 1;
      this.contadores.set(`rotulo:${base}`, n);
      token = n === 1 ? `[${base}]` : `[${base} ${n}]`;
    } else {
      const prefixo = TIPOS_ENTIDADE[span.tipo].prefixo;
      const n = (this.contadores.get(prefixo) ?? 0) + 1;
      this.contadores.set(prefixo, n);
      token = `[${prefixo}_${n}]`;
    }
    const entidade: EntidadeRegistro = { chave, token, tipo: span.tipo, original: span.valor, ocorrencias: 0, ignorada: false };
    this.registro.set(chave, entidade);
    this.porToken.set(token, entidade);
    return entidade;
  }

  /** Detecta e substitui os dados sensíveis de um texto. */
  anonimizar(texto: string): ResultadoAnonimizacaoTexto {
    if (!texto) return { texto, substituicoes: 0 };
    const spans = resolverSobreposicoes(
      detectar(texto, {
        tipos: this.tiposAtivos,
        detectarNomes: this.opcoes.detectarNomes,
        pessoasConhecidas: this.opcoes.pessoasConhecidas,
        sempreMascarar: this.opcoes.sempreMascarar
      })
    ).filter((s) => !this.nunca.has(normalizarToken(s.valor).trim()) && !this.ehToken(texto.slice(s.inicio, s.fim)));

    let saida = '';
    let cursor = 0;
    let substituicoes = 0;
    for (const s of spans) {
      const entidade = this.tokenPara(s);
      entidade.ocorrencias++;
      if (entidade.ignorada) continue;
      saida += texto.slice(cursor, s.inicio) + entidade.token;
      cursor = s.fim;
      substituicoes++;
    }
    saida += texto.slice(cursor);
    return { texto: saida, substituicoes };
  }

  private ehToken(trecho: string): boolean {
    return this.porToken.has(trecho);
  }

  /** Reinsere os dados reais (somente para exibição local ou para uma consulta local). */
  desanonimizar(texto: string): string {
    if (!texto || this.porToken.size === 0) return texto;
    return texto.replace(REGEX_TOKEN, (token) => {
      const e = this.porToken.get(token);
      return e ? e.original : token;
    });
  }

  /** Entidades conhecidas, ordenadas por tipo e token. */
  entidades(): EntidadeRegistro[] {
    return [...this.registro.values()].sort((a, b) => a.tipo.localeCompare(b.tipo) || a.token.localeCompare(b.token, 'pt-BR', { numeric: true }));
  }

  /** Quantidade de entidades efetivamente mascaradas, por tipo. */
  resumoPorTipo(): Partial<Record<TipoEntidade, number>> {
    const r: Partial<Record<TipoEntidade, number>> = {};
    for (const e of this.registro.values()) {
      if (e.ignorada || e.ocorrencias === 0) continue;
      r[e.tipo] = (r[e.tipo] ?? 0) + 1;
    }
    return r;
  }

  tamanho(): number {
    return this.registro.size;
  }
}
