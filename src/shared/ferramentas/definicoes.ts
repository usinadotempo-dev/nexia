/**
 * Definições das ferramentas (APIs públicas + cálculos determinísticos).
 * A mesma definição alimenta: (1) o esquema de "function calling" enviado ao modelo;
 * (2) o formulário gerado automaticamente no painel "Consultas".
 * A execução fica no service worker (background/ferramentas/executor.ts).
 */

export interface ParametroFerramenta {
  nome: string;
  tipo: 'string' | 'number' | 'integer' | 'boolean';
  descricao: string;
  obrigatorio?: boolean;
  enum?: string[];
  exemplo?: string;
  padrao?: string | number | boolean;
}

export type CategoriaFerramenta = 'cadastros' | 'indices' | 'prazos' | 'judiciario' | 'saude' | 'legislativo' | 'ciencia' | 'clima' | 'compliance';

export interface DefinicaoFerramenta {
  nome: string;
  titulo: string;
  descricao: string;
  categoria: CategoriaFerramenta;
  parametros: ParametroFerramenta[];
  /** Origem do dado, exibida ao usuário. */
  fonte: string;
  /** O que sai da máquina ao executar (transparência LGPD). */
  envia: string;
  /** Exige configuração (chave) nas opções. */
  requerChave?: 'datajud' | 'transparencia';
}

export const FERRAMENTAS: DefinicaoFerramenta[] = [
  {
    nome: 'consultar_cnpj',
    titulo: 'Consultar CNPJ',
    descricao: 'Dados cadastrais públicos de uma empresa na Receita Federal: razão social, situação, CNAE, endereço, porte, opção pelo Simples/MEI e quadro societário.',
    categoria: 'cadastros',
    parametros: [{ nome: 'cnpj', tipo: 'string', descricao: 'CNPJ (com ou sem pontuação) ou marcador como [CNPJ_1]', obrigatorio: true, exemplo: '00.000.000/0001-91' }],
    fonte: 'BrasilAPI (dados da Receita Federal)',
    envia: 'o número do CNPJ para brasilapi.com.br'
  },
  {
    nome: 'consultar_cep',
    titulo: 'Consultar CEP',
    descricao: 'Logradouro, bairro, cidade e UF de um CEP.',
    categoria: 'cadastros',
    parametros: [{ nome: 'cep', tipo: 'string', descricao: 'CEP com 8 dígitos', obrigatorio: true, exemplo: '60060-170' }],
    fonte: 'BrasilAPI / ViaCEP',
    envia: 'o CEP para brasilapi.com.br (ou viacep.com.br)'
  },
  {
    nome: 'consultar_cnae',
    titulo: 'Consultar CNAE',
    descricao: 'Busca atividades econômicas (CNAE 2.3, subclasses) por código ou por palavras.',
    categoria: 'cadastros',
    parametros: [{ nome: 'termo', tipo: 'string', descricao: 'Código (ex.: 6920-6/01) ou descrição (ex.: contabilidade)', obrigatorio: true }],
    fonte: 'IBGE — API de CNAE',
    envia: 'o termo pesquisado para servicodados.ibge.gov.br'
  },
  {
    nome: 'consultar_ncm',
    titulo: 'Consultar NCM',
    descricao: 'Busca códigos NCM (Nomenclatura Comum do Mercosul) por código ou descrição.',
    categoria: 'cadastros',
    parametros: [{ nome: 'termo', tipo: 'string', descricao: 'Código ou descrição da mercadoria', obrigatorio: true, exemplo: 'café torrado' }],
    fonte: 'BrasilAPI (tabela NCM)',
    envia: 'o termo pesquisado para brasilapi.com.br'
  },
  {
    nome: 'codigo_municipio_ibge',
    titulo: 'Código IBGE de município',
    descricao: 'Código IBGE (7 dígitos) de um município, a partir do nome e da UF.',
    categoria: 'cadastros',
    parametros: [
      { nome: 'municipio', tipo: 'string', descricao: 'Nome do município', obrigatorio: true, exemplo: 'Fortaleza' },
      { nome: 'uf', tipo: 'string', descricao: 'Sigla da UF', obrigatorio: true, exemplo: 'CE' }
    ],
    fonte: 'IBGE — API de localidades',
    envia: 'a UF para servicodados.ibge.gov.br'
  },
  {
    nome: 'corrigir_valor',
    titulo: 'Correção monetária',
    descricao: 'Corrige um valor por índice oficial mensal (IPCA, IPCA-E, INPC, IGP-M, IGP-DI, SELIC, CDI, INCC, INCC-M) entre dois meses, com memória de cálculo. Não inclui juros de mora.',
    categoria: 'indices',
    parametros: [
      { nome: 'valor', tipo: 'string', descricao: 'Valor original (ex.: 10.000,00)', obrigatorio: true },
      { nome: 'indice', tipo: 'string', descricao: 'Índice', obrigatorio: true, enum: ['IPCA', 'IPCA-E', 'INPC', 'IGP-M', 'IGP-DI', 'SELIC', 'CDI', 'INCC', 'INCC-M'] },
      { nome: 'mes_inicial', tipo: 'string', descricao: 'Mês inicial (mm/aaaa)', obrigatorio: true, exemplo: '01/2024' },
      { nome: 'mes_final', tipo: 'string', descricao: 'Mês final (mm/aaaa), inclusive', obrigatorio: true, exemplo: '12/2024' }
    ],
    fonte: 'Banco Central — SGS',
    envia: 'apenas o código da série e o período para api.bcb.gov.br'
  },
  {
    nome: 'taxas_atuais',
    titulo: 'Taxas atuais (SELIC, CDI, IPCA)',
    descricao: 'Valores vigentes de SELIC, CDI e IPCA acumulado 12 meses.',
    categoria: 'indices',
    parametros: [],
    fonte: 'BrasilAPI (BCB/IBGE)',
    envia: 'nenhum dado do usuário'
  },
  {
    nome: 'cotacao_moeda',
    titulo: 'Cotação PTAX',
    descricao: 'Cotação oficial PTAX (compra e venda) de uma moeda em uma data.',
    categoria: 'indices',
    parametros: [
      { nome: 'moeda', tipo: 'string', descricao: 'Código da moeda', obrigatorio: true, enum: ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'DKK', 'NOK', 'SEK'] },
      { nome: 'data', tipo: 'string', descricao: 'Data (dd/mm/aaaa). Sem cotação no dia → busca os dias úteis anteriores.', obrigatorio: true }
    ],
    fonte: 'Banco Central — PTAX',
    envia: 'a moeda e a data para olinda.bcb.gov.br'
  },
  {
    nome: 'feriados_nacionais',
    titulo: 'Feriados nacionais',
    descricao: 'Lista os feriados nacionais de um ano.',
    categoria: 'prazos',
    parametros: [{ nome: 'ano', tipo: 'integer', descricao: 'Ano (4 dígitos)', obrigatorio: true }],
    fonte: 'BrasilAPI',
    envia: 'o ano para brasilapi.com.br'
  },
  {
    nome: 'calcular_prazo',
    titulo: 'Calcular prazo',
    descricao: 'Calcula o vencimento de um prazo em dias úteis ou corridos, excluindo o dia do início, considerando fins de semana e feriados nacionais (e, opcionalmente, o recesso forense de 20/12 a 20/01). Feriados locais não são considerados.',
    categoria: 'prazos',
    parametros: [
      { nome: 'data_inicio', tipo: 'string', descricao: 'Data da intimação/publicação/evento (dd/mm/aaaa)', obrigatorio: true },
      { nome: 'dias', tipo: 'integer', descricao: 'Quantidade de dias do prazo', obrigatorio: true },
      { nome: 'contagem', tipo: 'string', descricao: 'Tipo de contagem', enum: ['uteis', 'corridos'], padrao: 'uteis' },
      { nome: 'recesso_forense', tipo: 'boolean', descricao: 'Suspender de 20/12 a 20/01 (CPC art. 220)', padrao: false }
    ],
    fonte: 'Cálculo local + feriados da BrasilAPI',
    envia: 'apenas o(s) ano(s) para brasilapi.com.br'
  },
  {
    nome: 'consultar_processo_datajud',
    titulo: 'Processo no DataJud (CNJ)',
    descricao: 'Metadados públicos de um processo judicial pela numeração única CNJ: tribunal, classe, assuntos, órgão julgador, data de ajuizamento e últimas movimentações. Não traz nomes de partes.',
    categoria: 'judiciario',
    parametros: [{ nome: 'numero_processo', tipo: 'string', descricao: 'Número CNJ (20 dígitos) ou marcador como [PROCESSO_1]', obrigatorio: true }],
    fonte: 'CNJ — API Pública do DataJud',
    envia: 'o número do processo para api-publica.datajud.cnj.jus.br',
    requerChave: 'datajud'
  },
  {
    nome: 'consultar_sancoes',
    titulo: 'Sanções (CEIS/CNEP)',
    descricao: 'Verifica se uma empresa consta do Cadastro de Empresas Inidôneas e Suspensas (CEIS) ou do Cadastro Nacional de Empresas Punidas (CNEP). Útil em due diligence, licitações e compliance.',
    categoria: 'compliance',
    parametros: [{ nome: 'cnpj', tipo: 'string', descricao: 'CNPJ ou marcador como [CNPJ_1]', obrigatorio: true }],
    fonte: 'CGU — Portal da Transparência',
    envia: 'o CNPJ para api.portaldatransparencia.gov.br',
    requerChave: 'transparencia'
  },
  {
    nome: 'buscar_proposicoes',
    titulo: 'Proposições na Câmara',
    descricao: 'Busca projetos de lei e outras proposições na Câmara dos Deputados por palavras-chave ou por tipo/número/ano, com ementa e situação.',
    categoria: 'legislativo',
    parametros: [
      { nome: 'palavras_chave', tipo: 'string', descricao: 'Palavras-chave (ex.: reforma tributária)' },
      { nome: 'tipo', tipo: 'string', descricao: 'Sigla do tipo', enum: ['PL', 'PLP', 'PEC', 'MPV', 'PDL'] },
      { nome: 'numero', tipo: 'integer', descricao: 'Número da proposição' },
      { nome: 'ano', tipo: 'integer', descricao: 'Ano da proposição' }
    ],
    fonte: 'Câmara dos Deputados — Dados Abertos',
    envia: 'os termos de busca para dadosabertos.camara.leg.br'
  },
  {
    nome: 'buscar_pubmed',
    titulo: 'Literatura científica (PubMed)',
    descricao: 'Busca artigos no PubMed (NCBI) e devolve título, periódico, ano e PMID. Use termos em inglês.',
    categoria: 'saude',
    parametros: [
      { nome: 'termo', tipo: 'string', descricao: 'Consulta em inglês (aceita operadores AND/OR e filtros do PubMed)', obrigatorio: true, exemplo: 'metformin AND gestational diabetes AND systematic review[pt]' },
      { nome: 'quantidade', tipo: 'integer', descricao: 'Máximo de artigos (1–15)', padrao: 8 }
    ],
    fonte: 'NCBI — PubMed E-utilities',
    envia: 'os termos de busca para eutils.ncbi.nlm.nih.gov'
  },
  {
    nome: 'consultar_bula',
    titulo: 'Bula (FDA)',
    descricao: 'Trechos da bula norte-americana oficial de um fármaco (indicações, posologia, contraindicações, advertências, interações). Informe o princípio ativo em inglês.',
    categoria: 'saude',
    parametros: [
      { nome: 'principio_ativo', tipo: 'string', descricao: 'Nome genérico em inglês (ex.: metformin, warfarin)', obrigatorio: true },
      { nome: 'secao', tipo: 'string', descricao: 'Seção desejada', enum: ['interacoes', 'posologia', 'contraindicacoes', 'advertencias', 'indicacoes', 'todas'], padrao: 'interacoes' }
    ],
    fonte: 'openFDA (FDA/EUA) — rotulagem norte-americana, em inglês',
    envia: 'o nome do fármaco para api.fda.gov'
  },
  {
    nome: 'buscar_cid',
    titulo: 'Códigos CID-10',
    descricao: 'Busca códigos da CID-10 por termo (em inglês) ou código. Fonte: ICD-10-CM (modificação clínica dos EUA) — os códigos de 3–4 caracteres coincidem em geral com a CID-10 da OMS usada no Brasil; confira a descrição oficial em português.',
    categoria: 'saude',
    parametros: [{ nome: 'termo', tipo: 'string', descricao: 'Termo em inglês ou código (ex.: E11, asthma)', obrigatorio: true }],
    fonte: 'NLM Clinical Tables (ICD-10-CM)',
    envia: 'o termo para clinicaltables.nlm.nih.gov'
  },
  {
    nome: 'verificar_referencia',
    titulo: 'Verificar referência (DOI)',
    descricao: 'Confere se um artigo/livro citado existe, buscando no Crossref por título, autor ou DOI. Use para não citar referências inexistentes.',
    categoria: 'ciencia',
    parametros: [{ nome: 'consulta', tipo: 'string', descricao: 'Título, autor + ano, ou DOI', obrigatorio: true }],
    fonte: 'Crossref',
    envia: 'a consulta bibliográfica para api.crossref.org'
  },
  {
    nome: 'clima_historico',
    titulo: 'Clima histórico',
    descricao: 'Chuva diária (mm) e temperaturas máx./mín. de uma cidade em um período: dias de chuva para cronograma de obra, perícias de sinistro, justificativa de atraso.',
    categoria: 'clima',
    parametros: [
      { nome: 'cidade', tipo: 'string', descricao: 'Nome da cidade (Brasil)', obrigatorio: true, exemplo: 'Fortaleza' },
      { nome: 'data_inicial', tipo: 'string', descricao: 'dd/mm/aaaa', obrigatorio: true },
      { nome: 'data_final', tipo: 'string', descricao: 'dd/mm/aaaa (até 366 dias)', obrigatorio: true },
      { nome: 'limite_chuva_mm', tipo: 'number', descricao: 'Chuva diária mínima para contar "dia chuvoso"', padrao: 5 }
    ],
    fonte: 'Open-Meteo (reanálise ERA5)',
    envia: 'o nome da cidade e o período para open-meteo.com'
  }
];

export function obterFerramenta(nome: string): DefinicaoFerramenta | undefined {
  return FERRAMENTAS.find((f) => f.nome === nome);
}

export const ROTULOS_CATEGORIA: Record<CategoriaFerramenta, string> = {
  cadastros: 'Cadastros',
  indices: 'Índices e câmbio',
  prazos: 'Prazos e calendário',
  judiciario: 'Judiciário',
  compliance: 'Compliance',
  legislativo: 'Legislativo',
  saude: 'Saúde',
  ciencia: 'Referências',
  clima: 'Clima'
};

/** Esquema JSON (subconjunto OpenAPI) aceito pelos três provedores. */
export function esquemaJson(def: DefinicaoFerramenta): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  for (const p of def.parametros) {
    properties[p.nome] = { type: p.tipo, description: p.descricao, ...(p.enum ? { enum: p.enum } : {}) };
  }
  return {
    type: 'object',
    properties,
    required: def.parametros.filter((p) => p.obrigatorio).map((p) => p.nome)
  };
}
