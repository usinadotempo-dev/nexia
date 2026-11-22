/**
 * Estado do espaço de trabalho do painel. Vive só na memória da página (LGPD):
 * fechar o painel descarta fontes, conversa e o mapa de pseudônimos.
 */
import type { PessoaConhecida, TipoEntidade } from '@shared/anonimizador/detectores';
import { SessaoAnonimizacao } from '@shared/anonimizador/motor';
import { obterArea } from '@shared/areas/catalogo';
import type { Area } from '@shared/areas/tipos';
import { LIMITES } from '@shared/constantes';
import type { ConfigNexia, MensagemLLM } from '@shared/tipos';

export type OrigemFonte = 'arquivo' | 'colado' | 'pagina' | 'selecao' | 'pje' | 'consulta';

export interface Fonte {
  id: string;
  nome: string;
  origem: OrigemFonte;
  tipo: string;
  detalhe?: string;
  texto: string;
  incluida: boolean;
  status: 'extraindo' | 'pronta' | 'erro';
  erro?: string;
}

export interface MensagemExibida {
  papel: 'usuario' | 'assistente';
  /** Texto no "espaço do modelo" (pseudonimizado quando a proteção está ligada). */
  texto: string;
  receita?: string;
  consultas: Array<{ titulo: string; estado: 'andamento' | 'ok' | 'falha'; detalhe?: string }>;
  erro?: string;
  /** Pergunta (no espaço do modelo) retirada do histórico após erro — usada em "tentar de novo". */
  pendenteIa?: string;
}

class Espaco {
  config!: ConfigNexia;
  area!: Area;
  fontes: Fonte[] = [];
  protecao = true;
  sessao!: SessaoAnonimizacao;
  pessoasConhecidas: PessoaConhecida[] = [];
  sempreMascararSessao: string[] = [];
  historico: MensagemLLM[] = [];
  exibidas: MensagemExibida[] = [];
  ocupado = false;
  private protegidos = new Map<string, string>();
  private ouvintes = new Set<() => void>();

  iniciar(config: ConfigNexia): void {
    this.config = config;
    this.area = obterArea(config.areaAtiva);
    this.protecao = config.anonimizarPorPadrao;
    this.sessao = new SessaoAnonimizacao(this.opcoesSessao());
  }

  aoMudar(f: () => void): () => void {
    this.ouvintes.add(f);
    return () => this.ouvintes.delete(f);
  }

  notificar(): void {
    for (const f of this.ouvintes) f();
  }

  tiposAtivos(): TipoEntidade[] {
    return this.config.detectoresPorArea[this.area.id] ?? this.area.detectoresPadrao;
  }

  opcoesSessao() {
    return {
      tipos: this.tiposAtivos(),
      detectarNomes: this.config.detectarNomes,
      pessoasConhecidas: this.pessoasConhecidas,
      sempreMascarar: [...this.config.sempreMascarar, ...this.sempreMascararSessao],
      nuncaMascarar: this.config.nuncaMascarar
    };
  }

  /** Reprocessa todas as fontes com as opções atuais (pseudônimos continuam estáveis). */
  reprocessar(): void {
    this.sessao.definirOpcoes(this.opcoesSessao());
    this.sessao.zerarContagens();
    this.protegidos.clear();
    if (!this.protecao) return;
    for (const f of this.fontes) {
      if (f.status === 'pronta') this.protegidos.set(f.id, this.sessao.anonimizar(f.texto).texto);
    }
  }

  textoParaIa(f: Fonte): string {
    if (!this.protecao) return f.texto;
    let t = this.protegidos.get(f.id);
    if (t === undefined) {
      t = this.sessao.anonimizar(f.texto).texto;
      this.protegidos.set(f.id, t);
    }
    return t;
  }

  /** Converte texto do usuário para o espaço do modelo. */
  paraIa(texto: string): string {
    return this.protecao ? this.sessao.anonimizar(texto).texto : texto;
  }

  /** Converte texto do modelo para exibição (dados reais só na tela). */
  paraTela(texto: string): string {
    return this.protecao ? this.sessao.desanonimizar(texto) : texto;
  }

  adicionarFonte(f: Omit<Fonte, 'id' | 'incluida'> & { incluida?: boolean }): Fonte {
    const fonte: Fonte = { incluida: true, ...f, id: crypto.randomUUID() };
    this.fontes.push(fonte);
    this.notificar();
    return fonte;
  }

  atualizarFonte(id: string, mudancas: Partial<Fonte>): void {
    const f = this.fontes.find((x) => x.id === id);
    if (!f) return;
    Object.assign(f, mudancas);
    if (mudancas.texto !== undefined) this.protegidos.delete(id);
    this.notificar();
  }

  removerFonte(id: string): void {
    this.fontes = this.fontes.filter((f) => f.id !== id);
    this.protegidos.delete(id);
    this.notificar();
  }

  fontesIncluidas(): Fonte[] {
    return this.fontes.filter((f) => f.incluida && f.status === 'pronta');
  }

  caracteresContexto(): number {
    return this.fontesIncluidas().reduce((s, f) => s + Math.min(f.texto.length, LIMITES.POR_DOCUMENTO_CHARS), 0);
  }

  /** Mensagem inicial com as fontes (no espaço do modelo), respeitando os limites. */
  mensagemDeContexto(): MensagemLLM | null {
    const fontes = this.fontesIncluidas();
    if (fontes.length === 0) return null;
    const blocos: string[] = [`FONTES FORNECIDAS PELO USUÁRIO (${fontes.length})${this.protecao ? ' — conteúdo pseudonimizado localmente' : ''}`];
    let total = 0;
    for (const [i, f] of fontes.entries()) {
      let texto = this.textoParaIa(f);
      const restante = LIMITES.TOTAL_CHARS - total;
      if (restante <= 0) {
        blocos.push(`=== Fonte ${i + 1}: ${this.paraIa(f.nome)} — omitida (limite de contexto atingido) ===`);
        continue;
      }
      const teto = Math.min(LIMITES.POR_DOCUMENTO_CHARS, restante);
      if (texto.length > teto) texto = `${texto.slice(0, teto)}\n[… fonte truncada pelo limite de contexto]`;
      total += texto.length;
      blocos.push(`=== Fonte ${i + 1}: ${this.paraIa(f.nome)} (${f.tipo}) ===\n${texto}`);
    }
    return { papel: 'user', conteudo: blocos.join('\n\n') };
  }

  trocarArea(area: Area): void {
    this.area = area;
    this.config.areaAtiva = area.id;
    this.reprocessar();
    this.notificar();
  }

  reiniciarConversa(): void {
    this.historico = [];
    this.exibidas = [];
    this.notificar();
  }

  /** Liga/desliga a proteção. A conversa é reiniciada para não misturar espaços. */
  definirProtecao(ligada: boolean): void {
    this.protecao = ligada;
    this.historico = [];
    this.exibidas = [];
    this.reprocessar();
    this.notificar();
  }
}

export const espaco = new Espaco();
