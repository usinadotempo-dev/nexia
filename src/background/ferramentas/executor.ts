/**
 * Execução das ferramentas no service worker (host_permissions → sem CORS).
 * Cada ferramenta devolve TEXTO legível (para o modelo e para o usuário), sempre
 * com a fonte e o momento da consulta. Os argumentos chegam já "desanonimizados"
 * pelo cliente; o resultado volta ao cliente, que o reanonimiza antes de entregá-lo
 * ao modelo. Nada aqui é logado com conteúdo (LGPD).
 */
import { interpretarNumeroCnj } from '@shared/calculos/cnj';
import { INDICES, corrigir, formatarMoeda, lerValor, type PontoMensal } from '@shared/calculos/correcao';
import { formatarBr, isoDeBr, NOMES_DIA, normalizarData, diaDaSemana } from '@shared/calculos/datas';
import { contarPrazo } from '@shared/calculos/prazos';
import { LIMITES } from '@shared/constantes';
import { obterFerramenta } from '@shared/ferramentas/definicoes';
import type { ConfigNexpra } from '@shared/tipos';

class ErroFerramenta extends Error {}

const TIMEOUT_MS = 20_000;

/** Falha transitória (sobrecarga, 5xx, rede, tempo): vale tentar de novo. */
class ErroTransitorio extends ErroFerramenta {}

/** Serviço indisponível depois das tentativas: dispara a pausa de novas consultas. */
class ErroIndisponivel extends ErroFerramenta {}

interface OpcoesRequisicao {
  /** Tempo máximo de cada tentativa. */
  timeoutMs?: number;
  /** Total de tentativas para falhas transitórias (429, 5xx, rede, tempo). */
  tentativas?: number;
}

function esperar(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function umaTentativa<T>(url: string, init: RequestInit, rotulo: string, timeoutMs: number): Promise<T> {
  const controle = new AbortController();
  const cronometro = setTimeout(() => controle.abort(), timeoutMs);
  try {
    const resposta = await fetch(url, { ...init, signal: controle.signal, headers: { accept: 'application/json', ...(init.headers ?? {}) } });
    if (resposta.status === 404) throw new ErroFerramenta(`${rotulo}: não encontrado (HTTP 404).`);
    if (resposta.status === 401 || resposta.status === 403) throw new ErroFerramenta(`${rotulo}: acesso negado (HTTP ${resposta.status}) — verifique a chave nas opções.`);
    if (resposta.status === 429) {
      const corpo = await resposta.text().catch(() => '');
      const sobrecarga = /rejected_execution|es_rejected|too_many/i.test(corpo);
      throw new ErroTransitorio(
        sobrecarga
          ? `${rotulo}: o serviço está sobrecarregado no momento (HTTP 429) — não é problema da sua chave nem do Nexpra.`
          : `${rotulo}: serviço sobrecarregado ou limite de consultas atingido (HTTP 429).`
      );
    }
    if (resposta.status >= 500) throw new ErroTransitorio(`${rotulo}: o serviço está instável (HTTP ${resposta.status}).`);
    if (!resposta.ok) throw new ErroFerramenta(`${rotulo}: HTTP ${resposta.status}.`);
    const tipo = resposta.headers.get('content-type') ?? '';
    if (!tipo.includes('json')) throw new ErroFerramenta(`${rotulo}: resposta inesperada (não JSON) — o serviço pode estar com verificação anti-robô ou fora do ar.`);
    return (await resposta.json()) as T;
  } catch (erro) {
    if (erro instanceof ErroFerramenta) throw erro;
    if ((erro as Error).name === 'AbortError') throw new ErroTransitorio(`${rotulo}: tempo esgotado (${Math.round(timeoutMs / 1000)}s) — o serviço está lento.`);
    throw new ErroTransitorio(`${rotulo}: falha de rede (${(erro as Error).message}).`);
  } finally {
    clearTimeout(cronometro);
  }
}

/** GET/POST JSON com novas tentativas (espera crescente) em falhas transitórias. */
async function obterJson<T>(url: string, init: RequestInit = {}, rotulo = 'serviço', opcoes: OpcoesRequisicao = {}): Promise<T> {
  const tentativas = Math.max(1, opcoes.tentativas ?? 1);
  const timeoutMs = opcoes.timeoutMs ?? TIMEOUT_MS;
  let ultimo: ErroFerramenta | null = null;
  for (let i = 0; i < tentativas; i++) {
    try {
      return await umaTentativa<T>(url, init, rotulo, timeoutMs);
    } catch (erro) {
      if (!(erro instanceof ErroTransitorio)) throw erro;
      ultimo = erro;
      if (i < tentativas - 1) await esperar(2000 * 2 ** i + Math.random() * 1000); // ~2s, ~4s, ~8s
    }
  }
  const sufixo = tentativas > 1 ? ` Tentamos ${tentativas} vezes; tente de novo em alguns minutos.` : ' Tente de novo em instantes.';
  throw new ErroIndisponivel(`${ultimo?.message ?? `${rotulo}: falha.`}${sufixo}`);
}

function agora(): string {
  return new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function rodape(fonte: string): string {
  return `\n\nFonte: ${fonte} — consultado em ${agora()}.`;
}

function texto(args: Record<string, unknown>, nome: string, obrigatorio = true): string {
  const v = args[nome];
  const s = v === undefined || v === null ? '' : String(v).trim();
  if (!s && obrigatorio) throw new ErroFerramenta(`Parâmetro "${nome}" é obrigatório.`);
  return s;
}

function inteiro(args: Record<string, unknown>, nome: string, padrao?: number): number {
  const v = args[nome];
  if (v === undefined || v === null || v === '') {
    if (padrao !== undefined) return padrao;
    throw new ErroFerramenta(`Parâmetro "${nome}" é obrigatório.`);
  }
  const n = Number(String(v).replace(/\D/g, ''));
  if (!Number.isFinite(n)) throw new ErroFerramenta(`Parâmetro "${nome}" inválido.`);
  return n;
}

function booleano(args: Record<string, unknown>, nome: string, padrao: boolean): boolean {
  const v = args[nome];
  if (v === undefined || v === null || v === '') return padrao;
  if (typeof v === 'boolean') return v;
  return /^(true|sim|s|1|yes)$/i.test(String(v));
}

function normalizar(t: string): string {
  return t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** Lê caminho "a.b.c" de um objeto desconhecido. */
function campo(obj: unknown, caminho: string): unknown {
  let atual: unknown = obj;
  for (const parte of caminho.split('.')) {
    if (atual === null || typeof atual !== 'object') return undefined;
    atual = (atual as Record<string, unknown>)[parte];
  }
  return atual;
}

function str(obj: unknown, caminho: string): string {
  const v = campo(obj, caminho);
  return v === undefined || v === null ? '' : String(v);
}

function linhas(pares: Array<[string, string | undefined | null]>): string {
  return pares.filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== '').map(([k, v]) => `- ${k}: ${v}`).join('\n');
}

function cortar(t: string, max: number): string {
  return t.length > max ? `${t.slice(0, max)}… [truncado]` : t;
}

// ---------------------------------------------------------------------------
// Cadastros

async function consultarCnpj(args: Record<string, unknown>): Promise<string> {
  const cnpj = texto(args, 'cnpj').toUpperCase().replace(/[^0-9A-Z]/g, '');
  if (cnpj.length !== 14) throw new ErroFerramenta('CNPJ deve ter 14 caracteres.');
  const d = await obterJson<Record<string, unknown>>(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {}, 'BrasilAPI CNPJ');
  const secundarios = (campo(d, 'cnaes_secundarios') as Array<Record<string, unknown>> | undefined) ?? [];
  const qsa = (campo(d, 'qsa') as Array<Record<string, unknown>> | undefined) ?? [];
  const simples = campo(d, 'opcao_pelo_simples');
  const mei = campo(d, 'opcao_pelo_mei');
  const partes = [
    `CNPJ ${str(d, 'cnpj') || cnpj}`,
    linhas([
      ['Razão social', str(d, 'razao_social')],
      ['Nome fantasia', str(d, 'nome_fantasia')],
      ['Situação cadastral', `${str(d, 'descricao_situacao_cadastral')}${str(d, 'data_situacao_cadastral') ? ` desde ${str(d, 'data_situacao_cadastral')}` : ''}`],
      ['Início de atividade', str(d, 'data_inicio_atividade')],
      ['Natureza jurídica', str(d, 'natureza_juridica')],
      ['Porte', str(d, 'porte') || str(d, 'descricao_porte')],
      ['Capital social', campo(d, 'capital_social') !== undefined ? formatarMoeda(Number(campo(d, 'capital_social'))) : ''],
      ['CNAE principal', `${str(d, 'cnae_fiscal')} — ${str(d, 'cnae_fiscal_descricao')}`],
      ['Simples Nacional', simples === true ? `sim${str(d, 'data_opcao_pelo_simples') ? ` (desde ${str(d, 'data_opcao_pelo_simples')})` : ''}` : simples === false ? 'não' : ''],
      ['MEI', mei === true ? 'sim' : mei === false ? 'não' : ''],
      ['Endereço', [str(d, 'descricao_tipo_de_logradouro'), str(d, 'logradouro'), str(d, 'numero'), str(d, 'complemento'), str(d, 'bairro')].filter(Boolean).join(', ')],
      ['Município/UF', `${str(d, 'municipio')}/${str(d, 'uf')}`],
      ['CEP', str(d, 'cep')]
    ])
  ];
  if (secundarios.length) {
    partes.push('CNAEs secundários:\n' + secundarios.slice(0, 15).map((c) => `- ${str(c, 'codigo')} — ${str(c, 'descricao')}`).join('\n'));
  }
  if (qsa.length) {
    partes.push('Quadro societário:\n' + qsa.slice(0, 20).map((s) => `- ${str(s, 'nome_socio')} (${str(s, 'qualificacao_socio')}${str(s, 'data_entrada_sociedade') ? `, desde ${str(s, 'data_entrada_sociedade')}` : ''})`).join('\n'));
  }
  return partes.join('\n\n') + rodape('BrasilAPI (base pública da Receita Federal)');
}

async function consultarCep(args: Record<string, unknown>): Promise<string> {
  const cep = texto(args, 'cep').replace(/\D/g, '');
  if (cep.length !== 8) throw new ErroFerramenta('CEP deve ter 8 dígitos.');
  try {
    const d = await obterJson<Record<string, unknown>>(`https://brasilapi.com.br/api/cep/v2/${cep}`, {}, 'BrasilAPI CEP');
    return linhas([['CEP', str(d, 'cep')], ['Logradouro', str(d, 'street')], ['Bairro', str(d, 'neighborhood')], ['Cidade/UF', `${str(d, 'city')}/${str(d, 'state')}`]]) + rodape('BrasilAPI');
  } catch {
    const d = await obterJson<Record<string, unknown>>(`https://viacep.com.br/ws/${cep}/json/`, {}, 'ViaCEP');
    if (campo(d, 'erro')) throw new ErroFerramenta('CEP não encontrado.');
    return linhas([['CEP', str(d, 'cep')], ['Logradouro', str(d, 'logradouro')], ['Bairro', str(d, 'bairro')], ['Cidade/UF', `${str(d, 'localidade')}/${str(d, 'uf')}`], ['Código IBGE', str(d, 'ibge')]]) + rodape('ViaCEP');
  }
}

let cacheCnae: Array<{ id: string; descricao: string }> | null = null;

function formatarCnae(id: string): string {
  const d = id.replace(/\D/g, '').padEnd(7, '0');
  return `${d.slice(0, 4)}-${d.slice(4, 5)}/${d.slice(5, 7)}`;
}

async function consultarCnae(args: Record<string, unknown>): Promise<string> {
  const termo = texto(args, 'termo');
  if (!cacheCnae) {
    const lista = await obterJson<Array<Record<string, unknown>>>('https://servicodados.ibge.gov.br/api/v2/cnae/subclasses', {}, 'IBGE CNAE');
    cacheCnae = lista.map((s) => ({ id: str(s, 'id'), descricao: str(s, 'descricao') }));
  }
  const digitos = termo.replace(/\D/g, '');
  let achados: Array<{ id: string; descricao: string }>;
  if (digitos.length >= 4 && digitos.length === termo.replace(/[\s.\-/]/g, '').length) {
    achados = cacheCnae.filter((c) => c.id.startsWith(digitos));
  } else {
    const palavras = normalizar(termo).split(/\s+/).filter((p) => p.length > 2);
    achados = cacheCnae.filter((c) => palavras.every((p) => normalizar(c.descricao).includes(p)));
  }
  if (achados.length === 0) return `Nenhuma subclasse CNAE encontrada para "${termo}".` + rodape('IBGE (CNAE 2.3)');
  return (
    `Subclasses CNAE para "${termo}" (${achados.length} encontrada(s)${achados.length > 20 ? ', mostrando 20' : ''}):\n` +
    achados.slice(0, 20).map((c) => `- ${formatarCnae(c.id)} — ${c.descricao}`).join('\n') +
    rodape('IBGE — CNAE 2.3 subclasses')
  );
}

async function consultarNcm(args: Record<string, unknown>): Promise<string> {
  const termo = texto(args, 'termo');
  const lista = await obterJson<Array<Record<string, unknown>>>(`https://brasilapi.com.br/api/ncm/v1?search=${encodeURIComponent(termo)}`, {}, 'BrasilAPI NCM');
  if (!Array.isArray(lista) || lista.length === 0) return `Nenhum NCM encontrado para "${termo}".` + rodape('BrasilAPI (tabela NCM)');
  return (
    `NCM para "${termo}" (${lista.length}${lista.length > 25 ? ', mostrando 25' : ''}):\n` +
    lista.slice(0, 25).map((n) => `- ${str(n, 'codigo')} — ${str(n, 'descricao')}`).join('\n') +
    rodape('BrasilAPI (tabela NCM da Receita Federal)')
  );
}

async function codigoMunicipio(args: Record<string, unknown>): Promise<string> {
  const nome = texto(args, 'municipio');
  const uf = texto(args, 'uf').toUpperCase().slice(0, 2);
  const lista = await obterJson<Array<Record<string, unknown>>>(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`, {}, 'IBGE localidades');
  const alvo = normalizar(nome);
  const exatos = lista.filter((m) => normalizar(str(m, 'nome')) === alvo);
  const parecidos = exatos.length ? exatos : lista.filter((m) => normalizar(str(m, 'nome')).includes(alvo)).slice(0, 10);
  if (parecidos.length === 0) return `Município "${nome}" não encontrado em ${uf}.` + rodape('IBGE');
  return parecidos.map((m) => `- ${str(m, 'nome')}/${uf}: código IBGE ${str(m, 'id')}`).join('\n') + rodape('IBGE — API de localidades');
}

// ---------------------------------------------------------------------------
// Índices, câmbio, calendário

function ultimoDiaDoMes(iso: string): string {
  const [a, m] = iso.split('-').map(Number);
  const d = new Date(Date.UTC(a!, m!, 0));
  return d.toISOString().slice(0, 10);
}

async function corrigirValor(args: Record<string, unknown>): Promise<string> {
  const valor = lerValor(texto(args, 'valor'));
  const idIndice = texto(args, 'indice').toUpperCase();
  const indice = INDICES.find((i) => i.id === idIndice);
  if (!indice) throw new ErroFerramenta(`Índice desconhecido: ${idIndice}. Use: ${INDICES.map((i) => i.id).join(', ')}.`);
  const inicio = normalizarData(texto(args, 'mes_inicial'));
  const fim = normalizarData(texto(args, 'mes_final'));
  if (!inicio || !fim) throw new ErroFerramenta('Meses inválidos (use mm/aaaa).');
  const inicioMes = `${inicio.slice(0, 7)}-01`;
  const fimMes = `${fim.slice(0, 7)}-01`;
  if (fimMes < inicioMes) throw new ErroFerramenta('O mês final é anterior ao inicial.');

  const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${indice.sgs}/dados?formato=json&dataInicial=${formatarBr(inicioMes)}&dataFinal=${formatarBr(ultimoDiaDoMes(fimMes))}`;
  const dados = await obterJson<Array<{ data: string; valor: string }>>(url, {}, `BCB SGS ${indice.sgs}`);
  const pontos: PontoMensal[] = dados.map((p) => ({ mes: isoDeBr(p.data), variacao: Number(p.valor) })).filter((p) => Number.isFinite(p.variacao));

  const esperados: string[] = [];
  for (let [a, m] = inicioMes.split('-').map(Number) as [number, number]; `${a}-${String(m).padStart(2, '0')}` <= fimMes.slice(0, 7); ) {
    esperados.push(`${a}-${String(m).padStart(2, '0')}-01`);
    m++;
    if (m > 12) { m = 1; a++; }
    if (esperados.length > 1200) break;
  }
  const presentes = new Set(pontos.map((p) => p.mes));
  const faltantes = esperados.filter((m) => !presentes.has(m));
  const r = corrigir(valor, pontos);

  const tabela =
    pontos.length <= 36
      ? '\n\nVariações mensais (%):\n' + pontos.map((p) => `${formatarBr(p.mes).slice(3)}: ${p.variacao.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`).join(' | ')
      : '';

  return (
    `Correção monetária pelo ${indice.nome}\n` +
    linhas([
      ['Valor original', formatarMoeda(r.valorOriginal)],
      ['Período', `${formatarBr(inicioMes).slice(3)} a ${formatarBr(fimMes).slice(3)} (meses inicial e final inclusive)`],
      ['Meses com índice', String(r.meses)],
      ['Fator acumulado', r.fator.toFixed(8).replace('.', ',')],
      ['Variação acumulada', `${r.variacaoPercentual.toLocaleString('pt-BR', { maximumFractionDigits: 4 })}%`],
      ['Valor corrigido', formatarMoeda(r.valorCorrigido)]
    ]) +
    (faltantes.length ? `\n\nATENÇÃO: sem índice publicado para ${faltantes.map((m) => formatarBr(m).slice(3)).join(', ')} (ainda não divulgado ou fora da série); esses meses não entraram no cálculo.` : '') +
    tabela +
    '\n\nMétodo: fator = produto de (1 + variação mensal/100). Não inclui juros de mora, pro rata die nem regras específicas de tribunais/contratos.' +
    rodape(`Banco Central do Brasil — SGS, série ${indice.sgs}`)
  );
}

async function taxasAtuais(): Promise<string> {
  const lista = await obterJson<Array<{ nome: string; valor: number }>>('https://brasilapi.com.br/api/taxas/v1', {}, 'BrasilAPI taxas');
  return lista.map((t) => `- ${t.nome}: ${Number(t.valor).toLocaleString('pt-BR')}% a.a.`).join('\n') + '\n(IPCA: acumulado em 12 meses)' + rodape('BrasilAPI (BCB/IBGE)');
}

function mmddaaaa(iso: string): string {
  const [a, m, d] = iso.split('-');
  return `${m}-${d}-${a}`;
}

async function cotacaoMoeda(args: Record<string, unknown>): Promise<string> {
  const moeda = texto(args, 'moeda').toUpperCase().slice(0, 3);
  const data = normalizarData(texto(args, 'data'));
  if (!data) throw new ErroFerramenta('Data inválida (dd/mm/aaaa).');
  const inicio = new Date(Date.parse(`${data}T00:00:00Z`) - 10 * 86_400_000).toISOString().slice(0, 10);
  const url =
    `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoMoedaPeriodo(moeda=@moeda,dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)` +
    `?@moeda='${moeda}'&@dataInicial='${mmddaaaa(inicio)}'&@dataFinalCotacao='${mmddaaaa(data)}'&$format=json`;
  const d = await obterJson<{ value?: Array<Record<string, unknown>> }>(url, {}, 'BCB PTAX');
  const valores = d.value ?? [];
  const fechamentos = valores.filter((v) => /fechamento/i.test(str(v, 'tipoBoletim')));
  const escolhido = (fechamentos.length ? fechamentos : valores).at(-1);
  if (!escolhido) throw new ErroFerramenta(`Sem cotação PTAX de ${moeda} nos 10 dias até ${formatarBr(data)}.`);
  const dataCot = str(escolhido, 'dataHoraCotacao').slice(0, 10);
  return (
    `PTAX ${moeda} (${str(escolhido, 'tipoBoletim') || 'boletim'}) de ${formatarBr(dataCot)}${dataCot !== data ? ` — último dia útil disponível até ${formatarBr(data)}` : ''}:\n` +
    linhas([
      ['Compra', `R$ ${Number(campo(escolhido, 'cotacaoCompra')).toLocaleString('pt-BR', { minimumFractionDigits: 4 })}`],
      ['Venda', `R$ ${Number(campo(escolhido, 'cotacaoVenda')).toLocaleString('pt-BR', { minimumFractionDigits: 4 })}`]
    ]) +
    rodape('Banco Central do Brasil — PTAX')
  );
}

const cacheFeriados = new Map<number, Array<{ date: string; name: string }>>();

async function feriadosDoAno(ano: number): Promise<Array<{ date: string; name: string }>> {
  if (ano < 1900 || ano > 2199) throw new ErroFerramenta('Ano fora do intervalo suportado.');
  const cache = cacheFeriados.get(ano);
  if (cache) return cache;
  const lista = await obterJson<Array<{ date: string; name: string }>>(`https://brasilapi.com.br/api/feriados/v1/${ano}`, {}, 'BrasilAPI feriados');
  cacheFeriados.set(ano, lista);
  return lista;
}

async function feriadosNacionais(args: Record<string, unknown>): Promise<string> {
  const ano = inteiro(args, 'ano');
  const lista = await feriadosDoAno(ano);
  return (
    `Feriados nacionais de ${ano}:\n` +
    lista.map((f) => `- ${formatarBr(f.date)} (${NOMES_DIA[diaDaSemana(f.date)]}): ${f.name}`).join('\n') +
    '\n(Feriados estaduais, municipais e pontos facultativos não incluídos.)' +
    rodape('BrasilAPI')
  );
}

async function calcularPrazo(args: Record<string, unknown>): Promise<string> {
  const inicio = normalizarData(texto(args, 'data_inicio'));
  if (!inicio) throw new ErroFerramenta('Data de início inválida (dd/mm/aaaa).');
  const dias = inteiro(args, 'dias');
  const tipo = texto(args, 'contagem', false) === 'corridos' ? 'corridos' : 'uteis';
  const recesso = booleano(args, 'recesso_forense', false);
  const anoInicial = Number(inicio.slice(0, 4));
  const anos = Math.ceil(dias / (tipo === 'uteis' ? 200 : 300)) + 1;
  const feriados = new Set<string>();
  const nomes = new Map<string, string>();
  for (let a = anoInicial; a <= anoInicial + anos; a++) {
    for (const f of await feriadosDoAno(a)) {
      feriados.add(f.date);
      nomes.set(f.date, f.name);
    }
  }
  const r = contarPrazo({ inicio, dias, tipo, feriados, recessoForense: recesso });
  const relevantes = r.ignorados.filter((i) => i.motivo.startsWith('feriado') || i.motivo.includes('prorrogação'));
  return (
    `Prazo de ${dias} dia(s) ${tipo === 'uteis' ? 'úteis' : 'corridos'} a partir de ${formatarBr(inicio)}:\n` +
    linhas([
      ['Vencimento', `${formatarBr(r.vencimento)} (${NOMES_DIA[diaDaSemana(r.vencimento)]})`],
      ['Prorrogado por dia sem expediente', r.prorrogado ? 'sim' : 'não'],
      ['Recesso forense (20/12–20/01)', recesso ? 'considerado como suspensão' : 'não considerado']
    ]) +
    (relevantes.length
      ? '\nFeriados/prorrogações considerados:\n' + relevantes.slice(0, 30).map((i) => `- ${formatarBr(i.data)}: ${i.motivo === 'feriado' ? nomes.get(i.data) ?? 'feriado' : i.motivo}`).join('\n')
      : '') +
    '\n\nRegra: exclui o dia do início e inclui o do vencimento (CPC art. 224). ATENÇÃO: feriados estaduais/municipais, suspensões de expediente do tribunal e regras especiais (prazo em dobro, intimação eletrônica com 10 dias para ciência, etc.) NÃO foram considerados — confira antes de usar.' +
    rodape('cálculo local do Nexpra + feriados nacionais da BrasilAPI')
  );
}

// ---------------------------------------------------------------------------
// Judiciário, compliance, legislativo

async function consultarDatajud(args: Record<string, unknown>, config: ConfigNexpra): Promise<string> {
  const cnj = interpretarNumeroCnj(texto(args, 'numero_processo'));
  if (!cnj) throw new ErroFerramenta('Número de processo inválido: são necessários 20 dígitos (numeração única CNJ).');
  if (!cnj.aliasDatajud) throw new ErroFerramenta(`${cnj.nomeTribunal}: tribunal não disponível na API Pública do DataJud.`);
  const chave = config.datajudChave.trim();
  if (!chave) throw new ErroFerramenta('Chave pública do DataJud não configurada (Opções → Integrações).');
  type RespostaDatajud = {
    hits?: { hits?: Array<{ _source?: Record<string, unknown> }> };
    _shards?: { failed?: number };
  };
  // O DataJud do CNJ é lento em tribunais grandes (20–40 s) e fica sobrecarregado com
  // frequência: tempo maior por tentativa e até 3 tentativas com espera crescente.
  const consultar = () =>
    obterJson<RespostaDatajud>(
      `https://api-publica.datajud.cnj.jus.br/api_publica_${cnj.aliasDatajud}/_search`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `APIKey ${chave}` },
        body: JSON.stringify({ query: { match: { numeroProcesso: cnj.digitos } }, size: 5 })
      },
      'DataJud (CNJ)',
      { timeoutMs: 25_000, tentativas: 3 }
    );
  let d = await consultar();
  // Sob sobrecarga, a busca pode voltar "vazia" porque parte dos índices falhou: repetir uma vez.
  if ((d.hits?.hits ?? []).length === 0 && (d._shards?.failed ?? 0) > 0) {
    await esperar(3000);
    d = await consultar();
    if ((d.hits?.hits ?? []).length === 0 && (d._shards?.failed ?? 0) > 0) {
      throw new ErroIndisponivel('DataJud (CNJ): o serviço respondeu com falhas internas (sobrecarga) e não conseguiu concluir a busca. Tente de novo em alguns minutos.');
    }
  }
  const hits = d.hits?.hits ?? [];
  if (hits.length === 0) {
    return `Processo ${cnj.formatado} não encontrado no DataJud (${cnj.nomeTribunal}). Pode estar em segredo de justiça, ainda não indexado, ou o número estar incorreto${cnj.dvValido ? '' : ' (o dígito verificador NÃO confere)'}.` + rodape('CNJ — API Pública do DataJud');
  }
  const blocos = hits.map((h) => {
    const s = h._source ?? {};
    const assuntos = ((campo(s, 'assuntos') as Array<Record<string, unknown>> | undefined) ?? []).map((a) => str(a, 'nome')).filter(Boolean);
    const movs = ((campo(s, 'movimentos') as Array<Record<string, unknown>> | undefined) ?? [])
      .slice()
      .sort((a, b) => str(b, 'dataHora').localeCompare(str(a, 'dataHora')))
      .slice(0, 15)
      .map((m) => {
        const comp = ((campo(m, 'complementosTabelados') as Array<Record<string, unknown>> | undefined) ?? []).map((c) => str(c, 'nome')).filter(Boolean);
        return `- ${str(m, 'dataHora').slice(0, 10).split('-').reverse().join('/')}: ${str(m, 'nome')}${comp.length ? ` (${comp.join('; ')})` : ''}`;
      });
    const ajuizamento = str(s, 'dataAjuizamento');
    const dataAj = /^\d{8}/.test(ajuizamento) ? `${ajuizamento.slice(6, 8)}/${ajuizamento.slice(4, 6)}/${ajuizamento.slice(0, 4)}` : ajuizamento.slice(0, 10);
    return (
      linhas([
        ['Tribunal / grau', `${str(s, 'tribunal')} / ${str(s, 'grau')}`],
        ['Classe', str(s, 'classe.nome')],
        ['Assuntos', assuntos.join('; ')],
        ['Órgão julgador', str(s, 'orgaoJulgador.nome')],
        ['Sistema / formato', `${str(s, 'sistema.nome')} / ${str(s, 'formato.nome')}`],
        ['Ajuizamento', dataAj],
        ['Última atualização no DataJud', str(s, 'dataHoraUltimaAtualizacao').slice(0, 10).split('-').reverse().join('/')]
      ]) + (movs.length ? `\nÚltimas movimentações:\n${movs.join('\n')}` : '')
    );
  });
  return `Processo ${cnj.formatado} — ${cnj.nomeTribunal}\n\n${blocos.join('\n\n---\n\n')}` + '\n\n(Metadados públicos; não incluem nomes das partes nem o teor dos documentos. A base pode ter defasagem.)' + rodape('CNJ — API Pública do DataJud');
}

async function consultarSancoes(args: Record<string, unknown>, config: ConfigNexpra): Promise<string> {
  const cnpj = texto(args, 'cnpj').replace(/\D/g, '');
  if (cnpj.length !== 14) throw new ErroFerramenta('CNPJ deve ter 14 dígitos.');
  const chave = config.transparenciaChave.trim();
  if (!chave) {
    throw new ErroFerramenta('Chave da API do Portal da Transparência não configurada. Cadastre-se gratuitamente em portaldatransparencia.gov.br/api-de-dados e informe a chave em Opções → Integrações.');
  }
  const consultar = (cadastro: 'ceis' | 'cnep') =>
    obterJson<Array<Record<string, unknown>>>(
      `https://api.portaldatransparencia.gov.br/api-de-dados/${cadastro}?codigoSancionado=${cnpj}&pagina=1`,
      { headers: { 'chave-api-dados': chave } },
      `Portal da Transparência (${cadastro.toUpperCase()})`
    );
  const [ceis, cnep] = await Promise.all([consultar('ceis'), consultar('cnep')]);
  const formatar = (rotulo: string, lista: Array<Record<string, unknown>>) =>
    lista.length === 0
      ? `${rotulo}: nenhum registro.`
      : `${rotulo}: ${lista.length} registro(s)\n` +
        lista
          .slice(0, 10)
          .map(
            (s) =>
              `- ${str(s, 'tipoSancao.descricaoResumida') || str(s, 'tipoSancao.descricaoPortal') || 'sanção'} | órgão: ${str(s, 'orgaoSancionador.nome')} | início ${str(s, 'dataInicioSancao')}${str(s, 'dataFimSancao') ? ` | fim ${str(s, 'dataFimSancao')}` : ''}${str(s, 'numeroProcesso') ? ` | processo ${str(s, 'numeroProcesso')}` : ''}`
          )
          .join('\n');
  return (
    `Consulta de sanções para o CNPJ ${cnpj}\n` +
    `${formatar('CEIS (empresas inidôneas e suspensas)', ceis)}\n${formatar('CNEP (empresas punidas — Lei Anticorrupção)', cnep)}` +
    '\n(A ausência de registro não substitui certidões oficiais.)' +
    rodape('CGU — Portal da Transparência')
  );
}

async function buscarProposicoes(args: Record<string, unknown>): Promise<string> {
  const params = new URLSearchParams({ ordem: 'DESC', ordenarPor: 'id', itens: '10' });
  const chaves = texto(args, 'palavras_chave', false);
  const tipo = texto(args, 'tipo', false);
  const numero = texto(args, 'numero', false).replace(/\D/g, '');
  const ano = texto(args, 'ano', false).replace(/\D/g, '');
  if (!chaves && !numero) throw new ErroFerramenta('Informe palavras-chave ou o número da proposição.');
  if (chaves) params.set('keywords', chaves);
  if (tipo) params.set('siglaTipo', tipo.toUpperCase());
  if (numero) params.set('numero', numero);
  if (ano) params.set('ano', ano);
  // Sem filtro de tempo a API só devolve o que tramitou nos últimos 30 dias.
  if (!ano) params.set('dataApresentacaoInicio', `${new Date().getUTCFullYear() - 12}-01-01`);
  const d = await obterJson<{ dados?: Array<Record<string, unknown>> }>(`https://dadosabertos.camara.leg.br/api/v2/proposicoes?${params}`, {}, 'Câmara dos Deputados');
  const lista = d.dados ?? [];
  if (lista.length === 0) return 'Nenhuma proposição encontrada.' + rodape('Câmara dos Deputados — Dados Abertos');
  const detalhes = await Promise.all(
    lista.slice(0, 6).map((p) =>
      obterJson<{ dados?: Record<string, unknown> }>(`https://dadosabertos.camara.leg.br/api/v2/proposicoes/${str(p, 'id')}`, {}, 'Câmara').catch(() => ({ dados: undefined }))
    )
  );
  const blocos = lista.slice(0, 10).map((p, i) => {
    const det = detalhes[i]?.dados;
    const situacao = det ? `${str(det, 'statusProposicao.descricaoSituacao')}${str(det, 'statusProposicao.siglaOrgao') ? ` (${str(det, 'statusProposicao.siglaOrgao')})` : ''}` : '';
    return `- ${str(p, 'siglaTipo')} ${str(p, 'numero')}/${str(p, 'ano')}: ${cortar(str(p, 'ementa'), 400)}${situacao.trim() ? `\n  Situação: ${situacao}` : ''}\n  https://www.camara.leg.br/propostas-legislativas/${str(p, 'id')}`;
  });
  return `Proposições na Câmara dos Deputados:\n${blocos.join('\n')}` + rodape('Câmara dos Deputados — Dados Abertos');
}

// ---------------------------------------------------------------------------
// Saúde e ciência

async function buscarPubmed(args: Record<string, unknown>): Promise<string> {
  const termo = texto(args, 'termo');
  const qtd = Math.min(15, Math.max(1, inteiro(args, 'quantidade', 8)));
  const base = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
  const busca = await obterJson<{ esearchresult?: { idlist?: string[]; count?: string } }>(
    `${base}/esearch.fcgi?db=pubmed&retmode=json&sort=relevance&tool=nexia&retmax=${qtd}&term=${encodeURIComponent(termo)}`,
    {},
    'PubMed'
  );
  const ids = busca.esearchresult?.idlist ?? [];
  if (ids.length === 0) return `Nenhum artigo encontrado para: ${termo}` + rodape('NCBI PubMed');
  const resumo = await obterJson<{ result?: Record<string, unknown> }>(`${base}/esummary.fcgi?db=pubmed&retmode=json&tool=nexia&id=${ids.join(',')}`, {}, 'PubMed');
  const itens = ids.map((id) => {
    const r = resumo.result?.[id];
    const autores = ((campo(r, 'authors') as Array<Record<string, unknown>> | undefined) ?? []).map((a) => str(a, 'name'));
    const tipos = ((campo(r, 'pubtype') as string[] | undefined) ?? []).join(', ');
    return `- ${str(r, 'title')} ${autores[0] ? `— ${autores[0]}${autores.length > 1 ? ' et al.' : ''}` : ''} — ${str(r, 'source')}, ${str(r, 'pubdate').slice(0, 4)}${tipos ? ` [${tipos}]` : ''} — PMID ${id} (https://pubmed.ncbi.nlm.nih.gov/${id}/)`;
  });
  return `PubMed — ${busca.esearchresult?.count ?? ids.length} resultado(s) para "${termo}" (mais relevantes):\n${itens.join('\n')}` + rodape('NCBI PubMed (E-utilities)');
}

const SECOES_BULA: Record<string, Array<[string, string]>> = {
  interacoes: [['drug_interactions', 'Interações medicamentosas']],
  posologia: [['dosage_and_administration', 'Posologia e administração']],
  contraindicacoes: [['contraindications', 'Contraindicações']],
  advertencias: [['boxed_warning', 'Advertência em destaque'], ['warnings_and_cautions', 'Advertências e precauções'], ['warnings', 'Advertências']],
  indicacoes: [['indications_and_usage', 'Indicações']]
};

async function consultarBula(args: Record<string, unknown>): Promise<string> {
  const farmaco = texto(args, 'principio_ativo').toLowerCase().replace(/"/g, '');
  const secao = texto(args, 'secao', false) || 'interacoes';
  const buscar = (campoBusca: string) =>
    obterJson<{ results?: Array<Record<string, unknown>> }>(
      `https://api.fda.gov/drug/label.json?search=${encodeURIComponent(`${campoBusca}:"${farmaco}"`)}&limit=1`,
      {},
      'openFDA'
    );
  let d: { results?: Array<Record<string, unknown>> };
  try {
    d = await buscar('openfda.generic_name');
  } catch (erro) {
    if (!(erro instanceof ErroFerramenta) || !erro.message.includes('404')) throw erro;
    d = await buscar('openfda.substance_name');
  }
  const bula = d.results?.[0];
  if (!bula) throw new ErroFerramenta(`Bula não encontrada para "${farmaco}" (use o nome genérico em inglês).`);
  const alvo = secao === 'todas' ? Object.values(SECOES_BULA).flat() : SECOES_BULA[secao] ?? SECOES_BULA['interacoes']!;
  const max = secao === 'todas' ? 1800 : 5000;
  const partes = alvo
    .map(([chave, rotulo]) => {
      const v = campo(bula, chave);
      const t = Array.isArray(v) ? v.join('\n') : typeof v === 'string' ? v : '';
      return t ? `${rotulo}:\n${cortar(t.replace(/\s+/g, ' ').trim(), max)}` : '';
    })
    .filter(Boolean);
  const nomeComercial = ((campo(bula, 'openfda.brand_name') as string[] | undefined) ?? []).slice(0, 3).join(', ');
  return (
    `Bula FDA — ${farmaco}${nomeComercial ? ` (${nomeComercial})` : ''}\n\n` +
    (partes.length ? partes.join('\n\n') : 'A seção pedida não consta desta bula.') +
    '\n\n(Rotulagem norte-americana, em inglês. Confira a bula brasileira/ANVISA e fontes clínicas atualizadas.)' +
    rodape('openFDA — U.S. Food and Drug Administration')
  );
}

async function buscarCid(args: Record<string, unknown>): Promise<string> {
  const termo = texto(args, 'termo');
  const d = await obterJson<[number, string[], unknown, Array<[string, string]>]>(
    `https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search?sf=code,name&maxList=20&terms=${encodeURIComponent(termo)}`,
    {},
    'NLM Clinical Tables'
  );
  const itens = d[3] ?? [];
  if (itens.length === 0) return `Nenhum código encontrado para "${termo}" (busque em inglês).` + rodape('NLM Clinical Tables (ICD-10-CM)');
  return (
    `Códigos para "${termo}" (${d[0]} no total${d[0] > itens.length ? `, mostrando ${itens.length}` : ''}):\n` +
    itens.map(([codigo, nome]) => `- ${codigo}: ${nome}`).join('\n') +
    '\n\n(ICD-10-CM é a modificação clínica dos EUA: subcódigos com 5+ caracteres podem não existir na CID-10 da OMS usada no Brasil. Confirme a descrição oficial em português.)' +
    rodape('U.S. National Library of Medicine — Clinical Tables')
  );
}

function formatarObraCrossref(w: Record<string, unknown>): string {
  const titulo = ((campo(w, 'title') as string[] | undefined) ?? [])[0] ?? '(sem título)';
  const autores = ((campo(w, 'author') as Array<Record<string, unknown>> | undefined) ?? []).map((a) => `${str(a, 'family')}${str(a, 'given') ? `, ${str(a, 'given')}` : ''}`);
  const veiculo = ((campo(w, 'container-title') as string[] | undefined) ?? [])[0] ?? '';
  const ano = ((campo(w, 'issued.date-parts') as number[][] | undefined) ?? [])[0]?.[0] ?? '';
  return `- ${titulo}${autores.length ? ` — ${autores.slice(0, 3).join('; ')}${autores.length > 3 ? ' et al.' : ''}` : ''}${veiculo ? ` — ${veiculo}` : ''}${ano ? `, ${ano}` : ''} — ${str(w, 'type')} — DOI ${str(w, 'DOI')} (https://doi.org/${str(w, 'DOI')})`;
}

async function verificarReferencia(args: Record<string, unknown>): Promise<string> {
  const consulta = texto(args, 'consulta');
  const doi = consulta.match(/10\.\d{4,9}\/\S+/)?.[0]?.replace(/[.,;]+$/, '');
  if (doi) {
    const d = await obterJson<{ message?: Record<string, unknown> }>(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {}, 'Crossref');
    return `DOI encontrado (a referência existe):\n${formatarObraCrossref(d.message ?? {})}` + rodape('Crossref');
  }
  const d = await obterJson<{ message?: { items?: Array<Record<string, unknown>> } }>(
    `https://api.crossref.org/works?rows=5&select=DOI,title,author,container-title,issued,type&query.bibliographic=${encodeURIComponent(consulta)}`,
    {},
    'Crossref'
  );
  const itens = d.message?.items ?? [];
  if (itens.length === 0) return `Nenhuma obra encontrada no Crossref para "${consulta}". A referência pode não existir ou não ter DOI.` + rodape('Crossref');
  return (
    `Melhores correspondências no Crossref para "${consulta}" (confira se título, autores e ano batem — se nenhuma bater, trate a referência como NÃO verificada):\n` +
    itens.map(formatarObraCrossref).join('\n') +
    rodape('Crossref')
  );
}

// ---------------------------------------------------------------------------
// Clima

async function climaHistorico(args: Record<string, unknown>): Promise<string> {
  const cidade = texto(args, 'cidade').split(',')[0]!.trim();
  const ini = normalizarData(texto(args, 'data_inicial'));
  const fim = normalizarData(texto(args, 'data_final'));
  if (!ini || !fim || fim < ini) throw new ErroFerramenta('Período inválido (dd/mm/aaaa, final ≥ inicial).');
  if ((Date.parse(fim) - Date.parse(ini)) / 86_400_000 > 366) throw new ErroFerramenta('Período máximo: 366 dias por consulta.');
  const limite = Number(args['limite_chuva_mm'] ?? 5) || 5;

  const geo = await obterJson<{ results?: Array<Record<string, unknown>> }>(
    `https://geocoding-api.open-meteo.com/v1/search?count=1&language=pt&countryCode=BR&name=${encodeURIComponent(cidade)}`,
    {},
    'Open-Meteo geocodificação'
  );
  const local = geo.results?.[0];
  if (!local) throw new ErroFerramenta(`Cidade "${cidade}" não encontrada.`);
  const lat = Number(campo(local, 'latitude'));
  const lon = Number(campo(local, 'longitude'));
  const d = await obterJson<{ daily?: { time?: string[]; precipitation_sum?: Array<number | null>; temperature_2m_max?: Array<number | null>; temperature_2m_min?: Array<number | null> } }>(
    `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${ini}&end_date=${fim}&daily=precipitation_sum,temperature_2m_max,temperature_2m_min&timezone=America%2FSao_Paulo`,
    {},
    'Open-Meteo histórico'
  );
  const dias = d.daily?.time ?? [];
  const chuva = d.daily?.precipitation_sum ?? [];
  const tmax = d.daily?.temperature_2m_max ?? [];
  const tmin = d.daily?.temperature_2m_min ?? [];
  if (dias.length === 0) throw new ErroFerramenta('Sem dados para o período (o histórico tem defasagem de alguns dias).');

  let total = 0;
  let maior = { dia: '', mm: 0 };
  const chuvosos: string[] = [];
  const porMes = new Map<string, { mm: number; chuvosos: number }>();
  dias.forEach((dia, i) => {
    const mm = chuva[i] ?? 0;
    total += mm;
    if (mm > maior.mm) maior = { dia, mm };
    const mes = dia.slice(0, 7);
    const acc = porMes.get(mes) ?? { mm: 0, chuvosos: 0 };
    acc.mm += mm;
    if (mm >= limite) {
      chuvosos.push(`${formatarBr(dia)} (${mm.toFixed(1)} mm)`);
      acc.chuvosos++;
    }
    porMes.set(mes, acc);
  });
  const media = (v: Array<number | null>) => {
    const n = v.filter((x): x is number => typeof x === 'number');
    return n.length ? (n.reduce((a, b) => a + b, 0) / n.length).toFixed(1) : '—';
  };
  return (
    `Clima histórico — ${str(local, 'name')}/${str(local, 'admin1')} (${lat.toFixed(2)}, ${lon.toFixed(2)}), ${formatarBr(ini)} a ${formatarBr(fim)}\n` +
    linhas([
      ['Chuva acumulada', `${total.toFixed(1)} mm`],
      [`Dias com chuva ≥ ${limite} mm`, `${chuvosos.length} de ${dias.length}`],
      ['Maior chuva diária', maior.dia ? `${maior.mm.toFixed(1)} mm em ${formatarBr(maior.dia)}` : '—'],
      ['Temperatura máx. média', `${media(tmax)} °C`],
      ['Temperatura mín. média', `${media(tmin)} °C`]
    ]) +
    '\nPor mês: ' + [...porMes.entries()].map(([m, v]) => `${m.slice(5)}/${m.slice(0, 4)}: ${v.mm.toFixed(0)} mm, ${v.chuvosos} dia(s) chuvoso(s)`).join(' | ') +
    (chuvosos.length && chuvosos.length <= 60 ? `\nDias chuvosos: ${chuvosos.join(', ')}` : '') +
    '\n\n(Dados de reanálise em grade ~10 km — não substituem registros de estação meteorológica oficial do INMET para fins periciais.)' +
    rodape('Open-Meteo (ERA5 / Copernicus)')
  );
}

// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Fase 1 da expansão: fontes oficiais sem chave (pesquisa de 22/11/2026)

/** Campos primitivos de um objeto, em "chave: valor" (para respostas de formato pouco conhecido). */
function resumoObjeto(obj: unknown, max = 8): string {
  if (obj === null || typeof obj !== 'object') return String(obj ?? '');
  return Object.entries(obj as Record<string, unknown>)
    .filter(([, v]) => v !== null && v !== '' && typeof v !== 'object')
    .slice(0, max)
    .map(([k, v]) => `${k}: ${cortar(String(v), 300)}`)
    .join(' | ');
}

function comoLista(v: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(v)) return v as Array<Record<string, unknown>>;
  return v && typeof v === 'object' ? [v as Record<string, unknown>] : [];
}

const CODIGO_UF: Record<string, number> = {
  RO: 11, AC: 12, AM: 13, RR: 14, PA: 15, AP: 16, TO: 17, MA: 21, PI: 22, CE: 23, RN: 24, PB: 25, PE: 26, AL: 27,
  SE: 28, BA: 29, MG: 31, ES: 32, RJ: 33, SP: 35, PR: 41, SC: 42, RS: 43, MS: 50, MT: 51, GO: 52, DF: 53
};

function ufValida(args: Record<string, unknown>, nome = 'uf'): string {
  const uf = texto(args, nome).toUpperCase().slice(0, 2);
  if (!CODIGO_UF[uf]) throw new ErroFerramenta(`UF inválida: ${uf}.`);
  return uf;
}

async function resolverMunicipio(nome: string, uf: string): Promise<{ id: string; nome: string }> {
  const lista = await obterJson<Array<Record<string, unknown>>>(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`, {}, 'IBGE localidades');
  const alvo = normalizar(nome);
  const achado = lista.find((m) => normalizar(str(m, 'nome')) === alvo) ?? lista.find((m) => normalizar(str(m, 'nome')).includes(alvo));
  if (!achado) throw new ErroFerramenta(`Município "${nome}" não encontrado em ${uf}.`);
  return { id: str(achado, 'id'), nome: str(achado, 'nome') };
}

// --- Legislação federal (Senado + normas.leg.br)

const TIPOS_URN: Record<string, string> = {
  LEI: 'lei',
  LCP: 'lei.complementar',
  DEC: 'decreto',
  DEL: 'decreto.lei',
  MPV: 'medida.provisoria',
  EMC: 'emenda.constitucional'
};

function limparMarcacao(t: string): string {
  return t
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

/** Percorre o JSON da norma e junta, na ordem, todos os campos `text`. */
function coletarTextos(no: unknown, saida: string[], profundidade = 0): void {
  if (profundidade > 60 || no === null || no === undefined) return;
  if (Array.isArray(no)) {
    for (const x of no) coletarTextos(x, saida, profundidade + 1);
    return;
  }
  if (typeof no !== 'object') return;
  const o = no as Record<string, unknown>;
  if (typeof o['text'] === 'string') {
    const t = limparMarcacao(o['text']);
    if (t) saida.push(t);
  }
  for (const [k, v] of Object.entries(o)) {
    if (k !== 'text' && v && typeof v === 'object') coletarTextos(v, saida, profundidade + 1);
  }
}

function numerosDeArtigos(pedido: string): Set<string> {
  const numeros = new Set<string>();
  for (const parte of pedido.split(/[,;]/)) {
    const faixa = parte.match(/(\d+)\s*(?:-|a|até)\s*(\d+)/i);
    if (faixa) {
      const ini = Number(faixa[1]);
      const fim = Math.min(Number(faixa[2]), ini + 30);
      for (let n = ini; n <= fim; n++) numeros.add(String(n));
    } else {
      const unico = parte.match(/\d+/);
      if (unico) numeros.add(unico[0]);
    }
  }
  return numeros;
}

async function consultarLeiFederal(args: Record<string, unknown>): Promise<string> {
  const tipo = (texto(args, 'tipo', false) || 'LEI').toUpperCase();
  const numero = inteiro(args, 'numero');
  const ano = inteiro(args, 'ano');
  const lista = await obterJson<unknown>(
    `https://legis.senado.leg.br/dadosabertos/legislacao/lista.json?tipo=${encodeURIComponent(tipo)}&numero=${numero}&ano=${ano}`,
    {},
    'Senado (legislação)',
    { tentativas: 2 }
  );
  const doc = comoLista(campo(lista, 'ListaDocumento.documentos.documento'))[0];
  if (!doc) return `Norma ${tipo} ${numero}/${ano} não encontrada na base do Senado.` + rodape('Senado Federal — Dados Abertos');

  // URN LexML: do identificador "LEI-14133-2021-04-01"; se não der, do detalhe da norma.
  const norma = str(doc, 'norma');
  const partes = norma.match(/-(\d{4}-\d{2}-\d{2})$/);
  let urn = partes && TIPOS_URN[tipo] ? `urn:lex:br:federal:${TIPOS_URN[tipo]}:${partes[1]};${numero}` : '';
  if (!urn) {
    const detalhe = await obterJson<unknown>(`https://legis.senado.leg.br/dadosabertos/legislacao/${str(doc, 'id')}.json`, {}, 'Senado (legislação)').catch(() => null);
    urn = (detalhe ? JSON.stringify(detalhe).match(/"urlDocumento":"[^"]*?(urn:lex:br[^"\\&\s]+)/)?.[1] : '') ?? '';
  }
  const cabecalho =
    `${str(doc, 'normaNome') || `${tipo} ${numero}/${ano}`}\n` +
    linhas([['Ementa', cortar(str(doc, 'ementa'), 600)], ['Assinatura', str(doc, 'dataassinatura')], ['Texto oficial', urn ? `https://normas.leg.br/?urn=${urn}` : '']]);
  if (!urn) return `${cabecalho}\n\nNão foi possível localizar o texto articulado desta norma.` + rodape('Senado Federal — Dados Abertos');

  const json = await obterJson<unknown>(
    `https://normas.leg.br/api/public/normas?urn=${encodeURIComponent(urn)}&tipo_documento=maior-detalhe`,
    {},
    'normas.leg.br',
    { timeoutMs: 40_000, tentativas: 2 }
  );
  const textos: string[] = [];
  coletarTextos(json, textos);
  const artigos = new Map<string, string>();
  for (const bloco of textos.join('\n').split(/(?=^Art\.\s*\d)/m)) {
    const m = bloco.match(/^Art\.\s*(\d+)[º°o]?(-[A-Z])?/);
    if (!m) continue;
    const chave = `${m[1]}${m[2] ?? ''}`;
    if (!artigos.has(chave)) artigos.set(chave, bloco.replace(/\n{2,}/g, '\n').trim());
  }
  if (artigos.size === 0) return `${cabecalho}\n\nNão foi possível extrair os artigos automaticamente; consulte o texto oficial no link.` + rodape('Senado Federal e normas.leg.br');

  const pedido = texto(args, 'artigos', false);
  const termo = normalizar(texto(args, 'termo', false));
  let escolhidos: string[];
  let criterio: string;
  if (pedido) {
    const numeros = numerosDeArtigos(pedido);
    escolhidos = [...artigos.entries()].filter(([k]) => numeros.has(k.replace(/-.*/, ''))).map(([, v]) => v);
    criterio = `artigos pedidos (${pedido})`;
  } else if (termo) {
    escolhidos = [...artigos.values()].filter((a) => normalizar(a).includes(termo)).slice(0, 12);
    criterio = `artigos que contêm "${texto(args, 'termo', false)}"`;
  } else {
    escolhidos = [...artigos.values()].slice(0, 8);
    criterio = 'primeiros artigos';
  }
  if (escolhidos.length === 0) return `${cabecalho}\n\nNenhum artigo corresponde a ${criterio}. A norma tem ${artigos.size} artigos.` + rodape('Senado Federal e normas.leg.br');
  return (
    `${cabecalho}\n\nTexto (${criterio}; a norma tem ${artigos.size} artigos):\n\n` +
    escolhidos.map((a) => cortar(a, 2500)).join('\n\n') +
    '\n\n(Confira a redação vigente e eventuais alterações posteriores no texto oficial.)' +
    rodape('Senado Federal — Dados Abertos e normas.leg.br')
  );
}

// --- Compliance e compras públicas

async function certidaoTcu(args: Record<string, unknown>): Promise<string> {
  const cnpj = texto(args, 'cnpj').replace(/\D/g, '');
  if (cnpj.length !== 14) throw new ErroFerramenta('CNPJ deve ter 14 dígitos.');
  const d = await obterJson<Record<string, unknown>>(
    `https://certidoes-apf.apps.tcu.gov.br/api/rest/publico/certidoes/${cnpj}?seEmitirPDF=false`,
    {},
    'TCU certidões',
    { tentativas: 2 }
  );
  const certidoes = comoLista(campo(d, 'certidoes')).map((c) => {
    const rotulo = Object.entries(c)
      .filter(([k, v]) => typeof v === 'string' && !/situacao|link|url|data|observ/i.test(k))
      .map(([, v]) => String(v))
      .join(' — ');
    return `- ${rotulo || 'Cadastro'}: ${str(c, 'situacao').replace(/_/g, ' ') || 'sem informação'}`;
  });
  return (
    `Certidão consolidada de pessoa jurídica — CNPJ ${cnpj}\n` +
    linhas([['Razão social', str(d, 'razaoSocial')], ['Nome fantasia', str(d, 'nomeFantasia')]]) +
    `\n${certidoes.join('\n') || 'Nenhum cadastro retornado.'}` +
    '\n\n(Cobre inidôneos do TCU, improbidade/CNIA do CNJ, CEIS e CNEP. Resultado de triagem: para o detalhe de uma sanção, use a consulta de sanções ou a certidão oficial.)' +
    rodape('Tribunal de Contas da União — certidão consolidada')
  );
}

async function buscarLicitacoes(args: Record<string, unknown>): Promise<string> {
  const termo = texto(args, 'termo');
  const params = new URLSearchParams({ q: termo, tipos_documento: 'edital', ordenacao: '-data', pagina: '1', tam_pagina: '10' });
  if (booleano(args, 'apenas_abertas', true)) params.set('status', 'recebendo_proposta');
  const uf = texto(args, 'uf', false).toUpperCase().slice(0, 2);
  if (uf) params.set('ufs', uf);
  const d = await obterJson<{ items?: Array<Record<string, unknown>>; total?: number }>(`https://pncp.gov.br/api/search/?${params}`, {}, 'PNCP', { tentativas: 2 });
  const itens = d.items ?? [];
  if (itens.length === 0) return `Nenhuma contratação encontrada para "${termo}"${uf ? ` em ${uf}` : ''}.` + rodape('PNCP');
  const blocos = itens.map((i) => {
    const valor = campo(i, 'valor_global');
    const link = str(i, 'item_url') ? `https://pncp.gov.br${str(i, 'item_url').replace(/^\/compras\//, '/app/editais/')}` : '';
    return (
      `- ${cortar(str(i, 'title') || str(i, 'description'), 220)}\n` +
      `  ${str(i, 'orgao_nome')} — ${str(i, 'municipio_nome')}/${str(i, 'uf')} | ${str(i, 'modalidade_licitacao_nome')} | ${str(i, 'situacao_nome')}` +
      `${typeof valor === 'number' ? ` | ${formatarMoeda(valor)}` : ''}${str(i, 'data_fim_vigencia') ? ` | até ${str(i, 'data_fim_vigencia').slice(0, 10).split('-').reverse().join('/')}` : ''}` +
      `${str(i, 'numero_controle_pncp') ? `\n  Controle PNCP: ${str(i, 'numero_controle_pncp')}` : ''}${link ? `\n  ${link}` : ''}`
    );
  });
  return `Contratações no PNCP para "${termo}" — ${d.total ?? itens.length} no total, mostrando ${itens.length}:\n${blocos.join('\n')}` + rodape('PNCP — Portal Nacional de Contratações Públicas');
}

async function buscarDiariosMunicipais(args: Record<string, unknown>): Promise<string> {
  const termo = texto(args, 'termo');
  const params = new URLSearchParams({ querystring: termo, size: '6', excerpt_size: '400', number_of_excerpts: '1', sort_by: 'descending_date' });
  const municipio = texto(args, 'municipio', false);
  let local = '';
  if (municipio) {
    const m = await resolverMunicipio(municipio, ufValida(args));
    params.set('territory_ids', m.id);
    local = ` em ${m.nome}`;
  }
  const d = await obterJson<{ total_gazettes?: number; gazettes?: Array<Record<string, unknown>> }>(`https://api.queridodiario.org.br/gazettes?${params}`, {}, 'Querido Diário', { tentativas: 2 });
  const diarios = d.gazettes ?? [];
  if (diarios.length === 0) {
    return `Nenhuma publicação encontrada para "${termo}"${local}. A cobertura do Querido Diário é parcial — o município pode não estar incluído.` + rodape('Querido Diário');
  }
  const blocos = diarios.map((g) => {
    const trecho = ((campo(g, 'excerpts') as string[] | undefined) ?? [])[0] ?? '';
    return `- ${formatarBr(str(g, 'date').slice(0, 10))} — ${str(g, 'territory_name')}/${str(g, 'state_code')}${campo(g, 'is_extra_edition') ? ' (edição extra)' : ''}\n  "${cortar(trecho.replace(/\s+/g, ' ').trim(), 400)}"\n  ${str(g, 'url')}`;
  });
  return `Diários municipais com "${termo}"${local}:\n${blocos.join('\n')}` + '\n\n(Cobertura parcial de municípios; confira a publicação oficial no link.)' + rodape('Querido Diário (Open Knowledge Brasil)');
}

// --- Economia

async function custoConstrucaoSinapi(args: Record<string, unknown>): Promise<string> {
  const uf = ufValida(args);
  const d = await obterJson<Array<{ variavel?: string; unidade?: string; resultados?: Array<{ series?: Array<{ serie?: Record<string, string> }> }> }>>(
    `https://servicodados.ibge.gov.br/api/v3/agregados/2296/periodos/-2/variaveis/all?localidades=N3[${CODIGO_UF[uf]}]`,
    {},
    'IBGE SINAPI',
    { tentativas: 2 }
  );
  const itens = d
    .filter((v) => !/n[úu]mero-[íi]ndice/i.test(v.variavel ?? ''))
    .map((v) => {
      const serie = v.resultados?.[0]?.series?.[0]?.serie ?? {};
      const valores = Object.entries(serie).map(([p, val]) => `${p.slice(4)}/${p.slice(0, 4)}: ${Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
      return `- ${v.variavel} (${v.unidade}): ${valores.join(' | ')}`;
    });
  if (itens.length === 0) throw new ErroFerramenta('IBGE SINAPI: sem dados para a UF.');
  return (
    `SINAPI — custo de construção em ${uf}\n${itens.join('\n')}` +
    '\n\n(Custo médio por m² do projeto-padrão do SINAPI, sem BDI, terreno, projetos ou fundações especiais. Para orçamento de obra use as composições do SINAPI/Caixa.)' +
    rodape('IBGE — SINAPI, tabela 2296')
  );
}

async function expectativasMercado(args: Record<string, unknown>): Promise<string> {
  const indicador = texto(args, 'indicador');
  const url =
    'https://olinda.bcb.gov.br/olinda/servico/Expectativas/versao/v1/odata/ExpectativasMercadoAnuais' +
    `?$top=40&$format=json&$orderby=${encodeURIComponent('Data desc')}&$filter=${encodeURIComponent(`Indicador eq '${indicador.replace(/'/g, '')}'`)}`;
  const d = await obterJson<{ value?: Array<Record<string, unknown>> }>(url, {}, 'BCB Expectativas', { tentativas: 2 });
  const todas = d.value ?? [];
  if (todas.length === 0) return `Sem expectativas para "${indicador}". Indicadores: IPCA, Selic, PIB Total, Câmbio, IGP-M.` + rodape('Banco Central — Focus');
  const data = str(todas[0], 'Data');
  const doDia = todas.filter((v) => str(v, 'Data') === data && (campo(v, 'baseCalculo') === undefined || Number(campo(v, 'baseCalculo')) === 0));
  const n = (v: unknown) => Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  const itens = doDia
    .sort((a, b) => str(a, 'DataReferencia').localeCompare(str(b, 'DataReferencia')))
    .map((v) => `- ${str(v, 'DataReferencia')}: mediana ${n(campo(v, 'Mediana'))} | média ${n(campo(v, 'Media'))} | mín. ${n(campo(v, 'Minimo'))} | máx. ${n(campo(v, 'Maximo'))} (${str(v, 'numeroRespondentes')} respondentes)`);
  return `Expectativas de mercado — ${indicador} (pesquisa de ${formatarBr(data.slice(0, 10))}):\n${itens.join('\n')}` + rodape('Banco Central do Brasil — Expectativas de Mercado (Focus)');
}

async function taxasJurosCredito(args: Record<string, unknown>): Promise<string> {
  const termoBusca = texto(args, 'modalidade');
  const url =
    'https://olinda.bcb.gov.br/olinda/servico/taxaJuros/versao/v2/odata/TaxasJurosMensalPorMes' +
    `?$top=5000&$format=json&$orderby=${encodeURIComponent('anoMes desc')}`;
  const d = await obterJson<{ value?: Array<Record<string, unknown>> }>(url, {}, 'BCB taxas de juros', { timeoutMs: 40_000, tentativas: 2 });
  const todas = d.value ?? [];
  if (todas.length === 0) throw new ErroFerramenta('BCB taxas de juros: sem dados.');
  const mes = str(todas[0], 'anoMes');
  const doMes = todas.filter((v) => str(v, 'anoMes') === mes);
  const palavras = normalizar(termoBusca).split(/\s+/).filter((p) => p.length > 2);
  const achadas = doMes.filter((v) => palavras.every((p) => normalizar(str(v, 'Modalidade')).includes(p)));
  if (achadas.length === 0) {
    const modalidades = [...new Set(doMes.map((v) => str(v, 'Modalidade')))].sort();
    return `Nenhuma modalidade com "${termoBusca}". Modalidades disponíveis:\n${modalidades.map((m) => `- ${m}`).join('\n')}` + rodape('Banco Central');
  }
  const porModalidade = new Map<string, Array<Record<string, unknown>>>();
  for (const v of achadas) porModalidade.set(str(v, 'Modalidade'), [...(porModalidade.get(str(v, 'Modalidade')) ?? []), v]);
  const pct = (v: unknown) => `${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
  const blocos = [...porModalidade.entries()].slice(0, 4).map(([modalidade, linhasMod]) => {
    const ordenadas = linhasMod.sort((a, b) => Number(campo(a, 'TaxaJurosAoAno')) - Number(campo(b, 'TaxaJurosAoAno')));
    const media = ordenadas.reduce((s, v) => s + Number(campo(v, 'TaxaJurosAoAno')), 0) / ordenadas.length;
    return (
      `${modalidade} — ${ordenadas.length} instituições, média simples ${pct(media)} a.a.\n` +
      ordenadas.slice(0, 12).map((v) => `- ${str(v, 'InstituicaoFinanceira')}: ${pct(campo(v, 'TaxaJurosAoMes'))} a.m. | ${pct(campo(v, 'TaxaJurosAoAno'))} a.a.`).join('\n') +
      (ordenadas.length > 12 ? `\n  … maior taxa: ${str(ordenadas.at(-1), 'InstituicaoFinanceira')}, ${pct(campo(ordenadas.at(-1), 'TaxaJurosAoAno'))} a.a.` : '')
    );
  });
  return (
    `Taxas de juros — ${str(doMes[0], 'Mes') || mes} (da menor para a maior):\n\n${blocos.join('\n\n')}` +
    '\n\n(Taxas médias efetivamente praticadas e informadas pelas instituições; não incluem tarifas e seguros. A média simples não é a taxa média ponderada de mercado.)' +
    rodape('Banco Central do Brasil — taxas de juros de operações de crédito')
  );
}

async function reformaTributariaNcm(args: Record<string, unknown>): Promise<string> {
  const ncm = texto(args, 'ncm').replace(/\D/g, '');
  if (ncm.length !== 8) throw new ErroFerramenta('NCM deve ter 8 dígitos.');
  const data = normalizarData(texto(args, 'data', false) || new Date().toLocaleDateString('pt-BR')) ?? new Date().toISOString().slice(0, 10);
  const d = await obterJson<Record<string, unknown>>(
    `https://consumo.tributos.gov.br/servico/calcular-tributos-consumo/api/calculadora/dados-abertos/ncm?ncm=${ncm}&data=${data}`,
    {},
    'Calculadora da Reforma Tributária',
    { tentativas: 2 }
  );
  const simNao = (v: unknown) => (v === true ? 'sim' : v === false ? 'não' : '');
  return (
    `NCM ${ncm} na base da Reforma Tributária do consumo (referência ${formatarBr(data)}):\n` +
    linhas([
      ['Capítulo', str(d, 'capitulo')],
      ['Posição', str(d, 'posicao')],
      ['Subposição', str(d, 'subposicao')],
      ['Item', str(d, 'item')],
      ['Subitem', str(d, 'subitem')],
      ['Tributado pelo Imposto Seletivo', simNao(campo(d, 'tributadoPeloImpostoSeletivo'))],
      ['Alíquota ad valorem do IS', simNao(campo(d, 'temAliquotaAdValorem'))],
      ['Alíquota ad rem do IS', simNao(campo(d, 'temAliquotaAdRem'))]
    ]) +
    '\n\n(Dados da calculadora oficial em fase de transição; alíquotas de CBS/IBS dependem da classificação tributária da operação — confirme na legislação vigente.)' +
    rodape('Receita Federal — Calculadora de tributos do consumo')
  );
}

async function consultarFipe(args: Record<string, unknown>): Promise<string> {
  const tipo = ['carros', 'motos', 'caminhoes'].includes(texto(args, 'tipo', false)) ? texto(args, 'tipo', false) : 'carros';
  const base = `https://parallelum.com.br/fipe/api/v1/${tipo}`;
  const palavrasDe = (t: string) => normalizar(t).split(/[\s/-]+/).filter(Boolean);
  const marcas = await obterJson<Array<{ codigo: string; nome: string }>>(`${base}/marcas`, {}, 'FIPE');
  const marcaAlvo = normalizar(texto(args, 'marca'));
  const marca = marcas.find((m) => normalizar(m.nome) === marcaAlvo) ?? marcas.find((m) => normalizar(m.nome).includes(marcaAlvo) || marcaAlvo.includes(normalizar(m.nome)));
  if (!marca) throw new ErroFerramenta(`Marca "${texto(args, 'marca')}" não encontrada na FIPE.`);
  const { modelos = [] } = await obterJson<{ modelos?: Array<{ codigo: number; nome: string }> }>(`${base}/marcas/${marca.codigo}/modelos`, {}, 'FIPE');
  const pedido = palavrasDe(texto(args, 'modelo'));
  const candidatos = modelos.filter((m) => pedido.every((p) => normalizar(m.nome).includes(p)));
  if (candidatos.length === 0) throw new ErroFerramenta(`Nenhum modelo ${marca.nome} com "${texto(args, 'modelo')}". Tente só o nome principal (ex.: "Argo").`);
  const exato = candidatos.find((m) => normalizar(m.nome) === normalizar(texto(args, 'modelo')));
  if (!exato && candidatos.length > 1) {
    return (
      `Há ${candidatos.length} versões de ${marca.nome} com "${texto(args, 'modelo')}". Informe a versão exata:\n` +
      candidatos.slice(0, 25).map((m) => `- ${m.nome}`).join('\n') +
      rodape('Tabela FIPE (via parallelum)')
    );
  }
  const modelo = exato ?? candidatos[0]!;
  const anos = await obterJson<Array<{ codigo: string; nome: string }>>(`${base}/marcas/${marca.codigo}/modelos/${modelo.codigo}/anos`, {}, 'FIPE');
  const anoPedido = texto(args, 'ano', false).replace(/\D/g, '');
  const anoEscolhido = (anoPedido ? anos.find((a) => a.codigo.startsWith(anoPedido)) : undefined) ?? (anoPedido ? undefined : anos[0]);
  if (!anoEscolhido) return `${marca.nome} ${modelo.nome} não tem o ano ${anoPedido} na FIPE. Anos disponíveis: ${anos.map((a) => a.nome).join(', ')}.` + rodape('Tabela FIPE (via parallelum)');
  const p = await obterJson<Record<string, unknown>>(`${base}/marcas/${marca.codigo}/modelos/${modelo.codigo}/anos/${anoEscolhido.codigo}`, {}, 'FIPE');
  return (
    'Tabela FIPE\n' +
    linhas([
      ['Veículo', `${str(p, 'Marca')} ${str(p, 'Modelo')}`],
      ['Ano-modelo', `${str(p, 'AnoModelo') === '32000' ? 'zero km' : str(p, 'AnoModelo')} (${str(p, 'Combustivel')})`],
      ['Preço médio', str(p, 'Valor')],
      ['Código FIPE', str(p, 'CodigoFipe')],
      ['Mês de referência', str(p, 'MesReferencia')]
    ]) +
    (anoPedido ? '' : `\nOutros anos disponíveis: ${anos.slice(1, 12).map((a) => a.nome).join(', ')}.`) +
    rodape('Tabela FIPE, via API pública da comunidade (parallelum.com.br) — confira em fipe.org.br para uso formal')
  );
}

// --- Saúde e educação

async function buscarArtigosEuropePmc(args: Record<string, unknown>): Promise<string> {
  const termo = texto(args, 'termo');
  const qtd = Math.min(15, Math.max(1, inteiro(args, 'quantidade', 8)));
  const d = await obterJson<{ hitCount?: number; resultList?: { result?: Array<Record<string, unknown>> } }>(
    `https://www.ebi.ac.uk/europepmc/webservices/rest/search?format=json&resultType=lite&pageSize=${qtd}&query=${encodeURIComponent(termo)}`,
    {},
    'Europe PMC',
    { tentativas: 2 }
  );
  const itens = d.resultList?.result ?? [];
  if (itens.length === 0) return `Nenhum artigo encontrado para: ${termo}` + rodape('Europe PMC');
  const blocos = itens.map((r) => {
    const ids = [str(r, 'pmid') ? `PMID ${str(r, 'pmid')}` : '', str(r, 'doi') ? `DOI ${str(r, 'doi')}` : ''].filter(Boolean).join(' | ');
    const marcas = [str(r, 'isOpenAccess') === 'Y' ? 'acesso aberto' : '', str(r, 'source') === 'PPR' ? 'preprint' : '', campo(r, 'citedByCount') ? `${str(r, 'citedByCount')} citações` : ''].filter(Boolean).join(', ');
    return `- ${str(r, 'title')} — ${cortar(str(r, 'authorString'), 80)} — ${str(r, 'journalTitle') || str(r, 'bookOrReportDetails.publisher')}, ${str(r, 'pubYear')}${marcas ? ` [${marcas}]` : ''} — ${ids} (https://europepmc.org/article/${str(r, 'source')}/${str(r, 'id')})`;
  });
  return `Europe PMC — ${d.hitCount ?? itens.length} resultado(s) para "${termo}":\n${blocos.join('\n')}` + rodape('Europe PMC (EMBL-EBI)');
}

async function buscarEnsaiosClinicos(args: Record<string, unknown>): Promise<string> {
  const params = new URLSearchParams({ 'query.cond': texto(args, 'condicao'), pageSize: '8' });
  const intervencao = texto(args, 'intervencao', false);
  if (intervencao) params.set('query.intr', intervencao);
  if (booleano(args, 'apenas_brasil', false)) params.set('query.locn', 'Brazil');
  const d = await obterJson<{ studies?: Array<Record<string, unknown>> }>(`https://clinicaltrials.gov/api/v2/studies?${params}`, {}, 'ClinicalTrials.gov', { tentativas: 2 });
  const estudos = d.studies ?? [];
  if (estudos.length === 0) return 'Nenhum estudo encontrado.' + rodape('ClinicalTrials.gov');
  const blocos = estudos.map((e) => {
    const id = str(e, 'protocolSection.identificationModule.nctId');
    const fases = ((campo(e, 'protocolSection.designModule.phases') as string[] | undefined) ?? []).join('/');
    return (
      `- ${str(e, 'protocolSection.identificationModule.briefTitle')}\n` +
      `  ${id} | ${str(e, 'protocolSection.statusModule.overallStatus')}${fases ? ` | ${fases}` : ''} | ${str(e, 'protocolSection.designModule.studyType')} | patrocinador: ${str(e, 'protocolSection.sponsorCollaboratorsModule.leadSponsor.name')}` +
      `${str(e, 'protocolSection.statusModule.startDateStruct.date') ? ` | início ${str(e, 'protocolSection.statusModule.startDateStruct.date')}` : ''}\n  https://clinicaltrials.gov/study/${id}`
    );
  });
  return `Estudos clínicos registrados (mostrando ${estudos.length}):\n${blocos.join('\n')}` + rodape('ClinicalTrials.gov (NIH/NLM)');
}

async function eventosAdversosFda(args: Record<string, unknown>): Promise<string> {
  const farmaco = texto(args, 'principio_ativo').toUpperCase().replace(/"/g, '');
  const d = await obterJson<{ meta?: { last_updated?: string }; results?: Array<{ term: string; count: number }> }>(
    `https://api.fda.gov/drug/event.json?search=${encodeURIComponent(`patient.drug.medicinalproduct:"${farmaco}"`)}&count=patient.reaction.reactionmeddrapt.exact&limit=15`,
    {},
    'openFDA eventos adversos'
  );
  const itens = d.results ?? [];
  if (itens.length === 0) return `Nenhuma notificação encontrada para "${farmaco}" (use o nome genérico em inglês).` + rodape('openFDA — FAERS');
  return (
    `Reações mais notificadas para ${farmaco} (FAERS, termos MedDRA em inglês; base atualizada em ${d.meta?.last_updated ?? '?'}):\n` +
    itens.map((r) => `- ${r.term}: ${r.count.toLocaleString('pt-BR')} notificações`).join('\n') +
    '\n\n(Notificações espontâneas, não validadas: indicam sinais de farmacovigilância, não frequência nem relação causal. Não usar isoladamente para decisão clínica.)' +
    rodape('openFDA — FDA Adverse Event Reporting System')
  );
}

const NIVEL_ALERTA: Record<string, string> = { '1': 'verde', '2': 'amarelo', '3': 'laranja', '4': 'vermelho' };

async function alertaArboviroses(args: Record<string, unknown>): Promise<string> {
  const m = await resolverMunicipio(texto(args, 'municipio'), ufValida(args));
  const doenca = ['dengue', 'chikungunya', 'zika'].includes(texto(args, 'doenca', false)) ? texto(args, 'doenca', false) : 'dengue';
  const doAno = (ano: number) =>
    obterJson<Array<Record<string, unknown>>>(
      `https://info.dengue.mat.br/api/alertcity?geocode=${m.id}&disease=${doenca}&format=json&ew_start=1&ew_end=53&ey_start=${ano}&ey_end=${ano}`,
      {},
      'InfoDengue',
      { tentativas: 2 }
    );
  const ano = new Date().getFullYear();
  let semanas = await doAno(ano);
  if (semanas.length < 6) semanas = [...(await doAno(ano - 1).catch(() => [])), ...semanas];
  if (semanas.length === 0) return `Sem dados de ${doenca} para ${m.nome}.` + rodape('InfoDengue');
  const ultimas = semanas.sort((a, b) => Number(campo(a, 'SE')) - Number(campo(b, 'SE'))).slice(-6);
  const itens = ultimas.map((s) => {
    const se = str(s, 'SE');
    return `- Semana ${se.slice(4)}/${se.slice(0, 4)}: ${str(s, 'casos')} casos notificados (estimados: ${Number(campo(s, 'casos_est')).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}) | incidência ${Number(campo(s, 'p_inc100k')).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}/100 mil | alerta ${NIVEL_ALERTA[str(s, 'nivel')] ?? str(s, 'nivel')}`;
  });
  return (
    `${doenca[0]!.toUpperCase()}${doenca.slice(1)} em ${m.nome} — últimas semanas epidemiológicas:\n${itens.join('\n')}` +
    '\n\n(Níveis: verde, amarelo, laranja e vermelho. As semanas mais recentes são estimativas sujeitas a revisão por atraso de notificação.)' +
    rodape('InfoDengue (Fiocruz/FGV)')
  );
}

async function buscarBncc(args: Record<string, unknown>): Promise<string> {
  const termo = texto(args, 'termo');
  const d = await obterJson<unknown>(`https://api.bncc.dev/v1/busca?q=${encodeURIComponent(termo)}`, {}, 'BNCC (api.bncc.dev)', { tentativas: 2 });
  const lista: Array<Record<string, unknown>> = Array.isArray(d)
    ? (d as Array<Record<string, unknown>>)
    : (Object.values((d ?? {}) as Record<string, unknown>).find((v) => Array.isArray(v)) as Array<Record<string, unknown>> | undefined) ?? [];
  if (lista.length === 0) return `Nenhuma habilidade da BNCC encontrada para "${termo}".` + rodape('api.bncc.dev');
  const itens = lista.slice(0, 12).map((h) => {
    const codigo = str(h, 'codigo') || str(h, 'code') || str(h, 'id');
    const descricao = str(h, 'descricao') || str(h, 'texto') || str(h, 'habilidade') || str(h, 'description');
    const contexto = [str(h, 'etapa'), str(h, 'componente') || str(h, 'componente_curricular'), str(h, 'ano') || str(h, 'anos')].filter(Boolean).join(' · ');
    return codigo || descricao ? `- ${codigo}${contexto ? ` (${contexto})` : ''}: ${cortar(descricao, 500)}` : `- ${resumoObjeto(h)}`;
  });
  return (
    `BNCC — ${lista.length} resultado(s) para "${termo}"${lista.length > 12 ? ', mostrando 12' : ''}:\n${itens.join('\n')}` +
    '\n\n(Fonte comunitária, em versão beta; confira o texto no documento oficial da BNCC/MEC.)' +
    rodape('api.bncc.dev — dados da BNCC sob CC BY 4.0')
  );
}

type Executor = (args: Record<string, unknown>, config: ConfigNexpra) => Promise<string>;

const EXECUTORES: Record<string, Executor> = {
  consultar_cnpj: consultarCnpj,
  consultar_cep: consultarCep,
  consultar_cnae: consultarCnae,
  consultar_ncm: consultarNcm,
  codigo_municipio_ibge: codigoMunicipio,
  corrigir_valor: corrigirValor,
  taxas_atuais: taxasAtuais,
  cotacao_moeda: cotacaoMoeda,
  feriados_nacionais: feriadosNacionais,
  calcular_prazo: calcularPrazo,
  consultar_processo_datajud: consultarDatajud,
  consultar_sancoes: consultarSancoes,
  buscar_proposicoes: buscarProposicoes,
  buscar_pubmed: buscarPubmed,
  consultar_bula: consultarBula,
  buscar_cid: buscarCid,
  verificar_referencia: verificarReferencia,
  clima_historico: climaHistorico,
  consultar_lei_federal: consultarLeiFederal,
  certidao_tcu: certidaoTcu,
  buscar_licitacoes: buscarLicitacoes,
  buscar_diarios_municipais: buscarDiariosMunicipais,
  custo_construcao_sinapi: custoConstrucaoSinapi,
  expectativas_mercado: expectativasMercado,
  taxas_juros_credito: taxasJurosCredito,
  reforma_tributaria_ncm: reformaTributariaNcm,
  consultar_fipe: consultarFipe,
  buscar_artigos_europepmc: buscarArtigosEuropePmc,
  buscar_ensaios_clinicos: buscarEnsaiosClinicos,
  eventos_adversos_fda: eventosAdversosFda,
  alerta_arboviroses: alertaArboviroses,
  buscar_bncc: buscarBncc
};

/**
 * Depois que um serviço fica indisponível, novas consultas a ele falham na hora por
 * alguns minutos — em vez de travar outra resposta esperando o mesmo serviço saturado.
 */
const falhasRecentes = new Map<string, number>();
const PAUSA_APOS_FALHA_MS = 3 * 60_000;

/**
 * Executa uma ferramenta. Nunca lança: falha vira { falha } (para o modelo poder reagir).
 * `prazoMs` limita o tempo total (incluindo novas tentativas): quem chama decide quanto
 * pode esperar — a IA espera menos que uma consulta feita à mão.
 */
export async function executarFerramenta(
  nome: string,
  args: Record<string, unknown>,
  config: ConfigNexpra,
  prazoMs = 60_000
): Promise<{ texto: string; falha?: string }> {
  const def = obterFerramenta(nome);
  const executor = EXECUTORES[nome];
  if (!def || !executor) return { texto: '', falha: `Ferramenta desconhecida: ${nome}` };
  if (config.ferramentasDesligadas.includes(nome)) return { texto: '', falha: `A ferramenta "${def.titulo}" está desligada nas opções.` };

  const ultimaFalha = falhasRecentes.get(nome);
  if (ultimaFalha && Date.now() - ultimaFalha < PAUSA_APOS_FALHA_MS) {
    const minutos = Math.max(1, Math.ceil((PAUSA_APOS_FALHA_MS - (Date.now() - ultimaFalha)) / 60_000));
    return {
      texto: '',
      falha: `${def.titulo}: o serviço estava indisponível há instantes. Para não travar a resposta, não tentei de novo — tente em cerca de ${minutos} min.`
    };
  }

  let cronometro: ReturnType<typeof setTimeout> | undefined;
  const limite = new Promise<never>((_, rejeitar) => {
    cronometro = setTimeout(
      () => rejeitar(new ErroIndisponivel(`${def.titulo}: sem resposta em ${Math.round(prazoMs / 1000)} s — o serviço está lento ou sobrecarregado.`)),
      prazoMs
    );
  });
  try {
    const resultado = await Promise.race([executor(args ?? {}, config), limite]);
    falhasRecentes.delete(nome);
    return { texto: cortar(resultado, LIMITES.MAX_RESULTADO_FERRAMENTA) };
  } catch (erro) {
    if (erro instanceof ErroIndisponivel) falhasRecentes.set(nome, Date.now());
    return { texto: '', falha: erro instanceof Error ? erro.message : String(erro) };
  } finally {
    clearTimeout(cronometro);
  }
}
