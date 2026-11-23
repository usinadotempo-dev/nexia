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

export type CategoriaFerramenta =
  | 'cadastros'
  | 'indices'
  | 'prazos'
  | 'judiciario'
  | 'saude'
  | 'legislativo'
  | 'ciencia'
  | 'clima'
  | 'compliance'
  | 'compras'
  | 'educacao';

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
    descricao:
      'Metadados públicos de um processo judicial pela numeração única CNJ: tribunal, classe, assuntos, órgão julgador, data de ajuizamento e últimas movimentações. Não traz nomes de partes nem o teor dos documentos. USE SOMENTE quando o processo NÃO estiver nas fontes ou quando o usuário pedir expressamente o andamento atualizado — se os autos já estão nas fontes, responda com base neles. O serviço do CNJ é lento e fica sobrecarregado com frequência; se a consulta falhar, prossiga com o que as fontes trazem e avise o usuário.',
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
  },
  {
    nome: 'consultar_lei_federal',
    titulo: 'Texto de lei federal',
    descricao:
      'Localiza uma norma federal (lei, lei complementar, decreto, decreto-lei, medida provisória, emenda constitucional) pelo número e ano e devolve a ementa e o texto dos artigos pedidos, ou dos artigos que contêm um termo. Use para citar o texto literal em vez de citar de memória. O texto pode não refletir alterações muito recentes: recomende conferir a redação vigente.',
    categoria: 'legislativo',
    parametros: [
      { nome: 'tipo', tipo: 'string', descricao: 'Tipo da norma', obrigatorio: true, enum: ['LEI', 'LCP', 'DEC', 'DEL', 'MPV', 'EMC'], padrao: 'LEI' },
      { nome: 'numero', tipo: 'integer', descricao: 'Número da norma (ex.: 14133)', obrigatorio: true },
      { nome: 'ano', tipo: 'integer', descricao: 'Ano da norma (ex.: 2021)', obrigatorio: true },
      { nome: 'artigos', tipo: 'string', descricao: 'Artigos desejados (ex.: 5, 6, 74-75). Sem isso, devolve os primeiros artigos.', exemplo: '74-75' },
      { nome: 'termo', tipo: 'string', descricao: 'Palavra ou expressão: devolve os artigos que a contêm', exemplo: 'dispensa de licitação' }
    ],
    fonte: 'Senado Federal (Dados Abertos) e normas.leg.br',
    envia: 'tipo, número e ano da norma para legis.senado.leg.br e normas.leg.br'
  },
  {
    nome: 'certidao_tcu',
    titulo: 'Certidão consolidada (TCU)',
    descricao:
      'Situação de uma empresa em quatro cadastros numa só consulta: inidôneos do TCU, improbidade administrativa (CNIA/CNJ), CEIS e CNEP. Devolve "consta" ou "nada consta" por cadastro. Útil em habilitação de licitantes, due diligence e compliance.',
    categoria: 'compliance',
    parametros: [{ nome: 'cnpj', tipo: 'string', descricao: 'CNPJ ou marcador como [CNPJ_1]', obrigatorio: true }],
    fonte: 'Tribunal de Contas da União — certidões',
    envia: 'o CNPJ para certidoes-apf.apps.tcu.gov.br'
  },
  {
    nome: 'buscar_licitacoes',
    titulo: 'Licitações (PNCP)',
    descricao:
      'Busca editais e contratações públicas de todo o país por palavra-chave no Portal Nacional de Contratações Públicas, com órgão, modalidade, valor, situação e link. Por padrão, só os que estão recebendo propostas.',
    categoria: 'compras',
    parametros: [
      { nome: 'termo', tipo: 'string', descricao: 'Objeto ou palavra-chave (ex.: notebook, merenda escolar)', obrigatorio: true },
      { nome: 'uf', tipo: 'string', descricao: 'Sigla da UF para filtrar', exemplo: 'CE' },
      { nome: 'apenas_abertas', tipo: 'boolean', descricao: 'Somente as que estão recebendo propostas', padrao: true }
    ],
    fonte: 'PNCP — Portal Nacional de Contratações Públicas',
    envia: 'o termo de busca para pncp.gov.br'
  },
  {
    nome: 'buscar_diarios_municipais',
    titulo: 'Diários oficiais municipais',
    descricao:
      'Busca um termo nos diários oficiais de municípios cobertos pelo projeto Querido Diário e devolve data, município, trecho e link. A cobertura é parcial: muitos municípios não estão incluídos.',
    categoria: 'legislativo',
    parametros: [
      { nome: 'termo', tipo: 'string', descricao: 'Termo de busca', obrigatorio: true },
      { nome: 'municipio', tipo: 'string', descricao: 'Nome do município (opcional; exige a UF)' },
      { nome: 'uf', tipo: 'string', descricao: 'Sigla da UF do município' }
    ],
    fonte: 'Querido Diário (Open Knowledge Brasil)',
    envia: 'o termo de busca para api.queridodiario.org.br'
  },
  {
    nome: 'custo_construcao_sinapi',
    titulo: 'Custo de construção (SINAPI)',
    descricao:
      'Custo médio de construção por metro quadrado em uma UF (total, material e mão de obra) e variações no mês, no ano e em 12 meses, dos dois últimos meses publicados. Serve a estimativas paramétricas, avaliações e reajuste de contratos de obra.',
    categoria: 'indices',
    parametros: [{ nome: 'uf', tipo: 'string', descricao: 'Sigla da UF', obrigatorio: true, exemplo: 'CE' }],
    fonte: 'IBGE — SINAPI (tabela 2296)',
    envia: 'apenas o código da UF para servicodados.ibge.gov.br'
  },
  {
    nome: 'expectativas_mercado',
    titulo: 'Expectativas de mercado (Focus)',
    descricao: 'Projeções mais recentes do mercado (Boletim Focus) para um indicador, por ano de referência: média, mediana, mínimo e máximo.',
    categoria: 'indices',
    parametros: [{ nome: 'indicador', tipo: 'string', descricao: 'Indicador', obrigatorio: true, enum: ['IPCA', 'Selic', 'PIB Total', 'Câmbio', 'IGP-M'] }],
    fonte: 'Banco Central — Expectativas de Mercado',
    envia: 'apenas o nome do indicador para olinda.bcb.gov.br'
  },
  {
    nome: 'taxas_juros_credito',
    titulo: 'Taxas de juros por banco',
    descricao:
      'Taxas de juros praticadas pelos bancos em uma modalidade de crédito (ex.: financiamento imobiliário, crédito pessoal, capital de giro, cheque especial), no mês mais recente, da menor para a maior. Útil para comparar financiamentos e para apurar a taxa média de mercado em revisionais.',
    categoria: 'indices',
    parametros: [{ nome: 'modalidade', tipo: 'string', descricao: 'Parte do nome da modalidade', obrigatorio: true, exemplo: 'financiamento imobiliário' }],
    fonte: 'Banco Central — Taxas de juros de operações de crédito',
    envia: 'nenhum dado do usuário (a filtragem é local)'
  },
  {
    nome: 'reforma_tributaria_ncm',
    titulo: 'Reforma Tributária por NCM',
    descricao:
      'Consulta, na base oficial da Calculadora da Reforma Tributária do consumo (CBS/IBS/Imposto Seletivo), a classificação de um NCM numa data e se ele é tributado pelo Imposto Seletivo.',
    categoria: 'indices',
    parametros: [
      { nome: 'ncm', tipo: 'string', descricao: 'Código NCM (8 dígitos)', obrigatorio: true, exemplo: '10063021' },
      { nome: 'data', tipo: 'string', descricao: 'Data de referência (dd/mm/aaaa); padrão: hoje' }
    ],
    fonte: 'Receita Federal — Calculadora de tributos do consumo (dados abertos)',
    envia: 'o código NCM para consumo.tributos.gov.br'
  },
  {
    nome: 'consultar_fipe',
    titulo: 'Tabela FIPE',
    descricao: 'Preço médio de um veículo na Tabela FIPE a partir de marca, modelo e ano. Se houver vários modelos parecidos, lista as opções para refinar.',
    categoria: 'cadastros',
    parametros: [
      { nome: 'tipo', tipo: 'string', descricao: 'Tipo de veículo', enum: ['carros', 'motos', 'caminhoes'], padrao: 'carros' },
      { nome: 'marca', tipo: 'string', descricao: 'Marca', obrigatorio: true, exemplo: 'Fiat' },
      { nome: 'modelo', tipo: 'string', descricao: 'Modelo e versão', obrigatorio: true, exemplo: 'Argo Drive 1.0' },
      { nome: 'ano', tipo: 'integer', descricao: 'Ano-modelo', exemplo: '2022' }
    ],
    fonte: 'Tabela FIPE, via API pública da comunidade (parallelum)',
    envia: 'marca, modelo e ano para parallelum.com.br'
  },
  {
    nome: 'buscar_artigos_europepmc',
    titulo: 'Artigos (Europe PMC)',
    descricao:
      'Busca literatura biomédica e de ciências da vida no Europe PMC (inclui preprints e indica acesso aberto e número de citações). Complementa o PubMed. Use termos em inglês.',
    categoria: 'saude',
    parametros: [
      { nome: 'termo', tipo: 'string', descricao: 'Consulta em inglês', obrigatorio: true },
      { nome: 'quantidade', tipo: 'integer', descricao: 'Máximo de artigos (1–15)', padrao: 8 }
    ],
    fonte: 'Europe PMC (EMBL-EBI)',
    envia: 'os termos de busca para ebi.ac.uk'
  },
  {
    nome: 'buscar_ensaios_clinicos',
    titulo: 'Ensaios clínicos',
    descricao: 'Busca estudos clínicos registrados no ClinicalTrials.gov por condição e intervenção, com situação, fase e patrocinador. Pode restringir a estudos com centros no Brasil. Use termos em inglês.',
    categoria: 'saude',
    parametros: [
      { nome: 'condicao', tipo: 'string', descricao: 'Condição ou doença, em inglês', obrigatorio: true },
      { nome: 'intervencao', tipo: 'string', descricao: 'Intervenção ou fármaco, em inglês' },
      { nome: 'apenas_brasil', tipo: 'boolean', descricao: 'Somente estudos com centros no Brasil', padrao: false }
    ],
    fonte: 'ClinicalTrials.gov (NIH/NLM)',
    envia: 'os termos de busca para clinicaltrials.gov'
  },
  {
    nome: 'eventos_adversos_fda',
    titulo: 'Eventos adversos (FDA)',
    descricao:
      'Reações adversas mais notificadas para um fármaco no sistema de farmacovigilância dos EUA (FAERS). São notificações espontâneas, não validadas: indicam sinais, não frequência nem causalidade. Informe o princípio ativo em inglês.',
    categoria: 'saude',
    parametros: [{ nome: 'principio_ativo', tipo: 'string', descricao: 'Nome genérico em inglês (ex.: metamizole)', obrigatorio: true }],
    fonte: 'openFDA — FAERS',
    envia: 'o nome do fármaco para api.fda.gov'
  },
  {
    nome: 'alerta_arboviroses',
    titulo: 'Alerta de dengue, zika e chikungunya',
    descricao: 'Situação epidemiológica recente de dengue, chikungunya ou zika em um município: casos por semana, nível de alerta e incidência.',
    categoria: 'saude',
    parametros: [
      { nome: 'municipio', tipo: 'string', descricao: 'Nome do município', obrigatorio: true },
      { nome: 'uf', tipo: 'string', descricao: 'Sigla da UF', obrigatorio: true },
      { nome: 'doenca', tipo: 'string', descricao: 'Doença', enum: ['dengue', 'chikungunya', 'zika'], padrao: 'dengue' }
    ],
    fonte: 'InfoDengue (Fiocruz/FGV)',
    envia: 'o código do município para info.dengue.mat.br'
  },
  {
    nome: 'buscar_bncc',
    titulo: 'BNCC',
    descricao:
      'Busca habilidades e objetivos de aprendizagem da Base Nacional Comum Curricular por palavra-chave ou código (ex.: EF05MA03), para planos de aula e avaliações alinhados à BNCC.',
    categoria: 'educacao',
    parametros: [{ nome: 'termo', tipo: 'string', descricao: 'Palavra-chave ou código da habilidade', obrigatorio: true, exemplo: 'frações 5º ano' }],
    fonte: 'api.bncc.dev (projeto comunitário, dados da BNCC sob CC BY 4.0; versão beta)',
    envia: 'o termo de busca para api.bncc.dev'
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
  legislativo: 'Legislação',
  compras: 'Compras públicas',
  educacao: 'Educação',
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
