# APIs públicas gratuitas para Saúde, Farmácia, Ciência/Academia e Educação (Nexpra) — estado em 22/11/2026

Convenções destas notas:
- **"Testado ao vivo"** = requisição GET feita em 22/11/2026 pela ferramenta de fetch, sem chave e sem login; relato o que voltou.
- **"não verificado"** = não consegui confirmar em fonte primária nesta pesquisa (não usar como fato no relatório).
- Os testes foram feitos a partir de um fetcher de servidor (IP de datacenter, sem cookies). Um 403 aqui não prova que o service worker da extensão (IP residencial do usuário) também receberá 403, mas é um sinal forte de proteção anti-bot.
- Já integrados e NÃO pesquisados: PubMed E-utilities, openFDA drug label, NLM Clinical Tables ICD-10-CM, Crossref.

---

## 1. Quais funcionam hoje com uma requisição HTTPS simples, sem login? Quais têm dados em português? (fichas técnicas)

### Takeaway
Funcionam sem chave e foram testadas ao vivo com sucesso: API Dados Abertos do Ministério da Saúde (CNES, hospitais/leitos, arboviroses — em português), InfoDengue, IBGE, RxNorm/RxNav, RxTerms (Clinical Tables), DailyMed, openFDA eventos adversos, PubChem, Europe PMC, ClinicalTrials.gov v2, OpenAlex (com orçamento diário pequeno sem chave), Unpaywall, DOAJ, SciELO ArticleMeta, ORCID público, medRxiv/bioRxiv, CAPES dados abertos (CKAN), Open Food Facts (produto por código de barras), USDA FDC (DEMO_KEY), Wikipedia PT, Wikidata, Open Library, Dicionário Aberto, LanguageTool e a API comunitária da BNCC. Falharam ou exigem credencial: Bulário ANVISA (403), RxNav Interaction (404, descontinuada), Semantic Scholar sem chave (429), CID-11 OMS (OAuth2), BVS/LILACS e DeCS (chave/licença), Agrofit/Embrapa (cadastro), busca do SciELO Search (403).

### Cited Findings

#### 1.1 Saúde — fontes brasileiras

**API de Dados Abertos do Ministério da Saúde (DEMAS)** — TESTADO AO VIVO, OK
- Base: `https://apidadosabertos.saude.gov.br`. Exemplo: `GET /cnes/estabelecimentos?limit=2` devolveu JSON com chave `estabelecimentos` e ~40 campos por registro em português (codigo_cnes, nome_fantasia, endereco, latitude/longitude, telefone, turno de atendimento, flags de centro cirúrgico/obstétrico, atende SUS etc.) — [CNES](https://apidadosabertos.saude.gov.br/cnes/estabelecimentos?limit=2)
- `GET /assistencia-a-saude/hospitais-e-leitos?limit=1&offset=0` devolveu JSON (`hospitais_leitos`) com 30 campos: nome, endereço, natureza jurídica, total de leitos, leitos SUS e ~14 campos de UTI (adulto, pediátrica, neonatal, queimados, coronariana) — [Hospitais e leitos](https://apidadosabertos.saude.gov.br/assistencia-a-saude/hospitais-e-leitos?limit=1&offset=0)
- `GET /arboviroses/dengue?limit=1&offset=0` devolveu JSON (`dengue`) com ~200 campos de notificação SINAN anonimizada (sem nome/CPF/endereço, mas com idade, sexo, datas, município, raça, escolaridade, ocupação) — [Dengue](https://apidadosabertos.saude.gov.br/arboviroses/dengue?limit=1&offset=0)
- Autenticação: nenhuma nos três testes. Paginação por `limit`/`offset`. Formato JSON. Dados em português.
- A página de documentação `https://apidadosabertos.saude.gov.br/v1/` é um Swagger renderizado por JavaScript (só o título "DEMAS - API de Dados Abertos" veio no fetch); `/v1/swagger.json` devolveu 404 — lista completa de endpoints, limites de taxa e termos: **não verificado** — [Swagger DEMAS](https://apidadosabertos.saude.gov.br/v1/)
- Uso profissional: localizar estabelecimentos/serviços do SUS por município e tipo (médicos, enfermeiros, gestores), leitos/UTI disponíveis por hospital, séries de arboviroses para pesquisa/ensino.

**ANVISA — Bulário Eletrônico (API interna do portal de consultas)** — TESTADO AO VIVO, FALHOU
- `GET https://consultas.anvisa.gov.br/api/consulta/bulario?count=3&filter[nomeProduto]=dipirona&page=1` devolveu **HTTP 403 Forbidden** — [Bulário ANVISA](https://consultas.anvisa.gov.br/api/consulta/bulario?count=3&filter%5BnomeProduto%5D=dipirona&page=1)
- Um ator da Apify relata que o portal de consultas da ANVISA está atrás de WAF (Cloudflare + Dynatrace) que bloqueia chamadas HTTP diretas sem cookies de sessão válidos, e que o contorno usado é navegador automatizado (Playwright) para capturar cookies — [Apify – ANVISA products lookup](https://apify.com/jgoia/anvisa-products-lookup.md) (fonte de terceiro, não oficial)
- Existe serviço comercial que revende a consulta ao Bulário como API JSON (Infosimples) — não é API oficial — [Infosimples](https://infosimples.com/consultas/anvisa-bulario-eletronico/)
- Não é uma API documentada/oficial; cabeçalho `Authorization: Guest` citado na tarefa: **não verificado** (não achei fonte que o documente).

**ANVISA — API oficial "Consultas Externas" (api.anvisa.gov.br)**
- Há um portal oficial de APIs que exige credenciais (Client ID/Secret obtidos com login Gov.br); o pacote PyPI `anvisa` (comunitário) documenta endpoints de filas, listas, UDI, nomes técnicos e tabaco — nenhum deles é o bulário — [PyPI anvisa](https://pypi.org/project/anvisa/)
- Detalhes de planos/limites/termos: **não verificado**.

**ANVISA — Dados Abertos (arquivos CSV, sem API)** — TESTADO AO VIVO, OK
- `https://dados.anvisa.gov.br/dados/` é uma listagem de diretório com ~150 arquivos e subpastas `CONSULTAS/`, `SNGPC/`, `tmp/`. Destaques: `DADOS_ABERTOS_MEDICAMENTOS.csv` (~46 MB, atualizado 20/11/2026), `TA_PRECOS_MEDICAMENTOS.csv` (~10,7 MB, 20/11/2026), `TA_PRECO_MEDICAMENTO.csv` (~17 MB, 09/10/2026), `TA_PRECO_MEDICAMENTO_GOV.csv` (~17,8 MB), `TA_RESTRICAO_MEDICAMENTO.csv`, `VigiMed_Medicamentos.csv` (~151 MB), `TA_PRODUTO_SAUDE_SITE.csv` (~28 MB), `TA_DA_PRODUTO_CANNABIS.CSV`, mais dicionários de dados em PDF. **Não há arquivo de bulas** — [dados.anvisa.gov.br](https://dados.anvisa.gov.br/dados/)
- A identificação dos arquivos `TA_PRECO*` como lista CMED (PF/PMC) é inferência pelo nome; conteúdo das colunas: **não verificado**.
- Formato CSV; sem autenticação; português. Não é consultável por requisição pontual (arquivos de dezenas de MB) — ver Inferências.

**InfoDengue (Fiocruz/FGV)** — TESTADO AO VIVO, OK
- `GET https://info.dengue.mat.br/api/alertcity?geocode=2304400&disease=dengue&format=json&ew_start=1&ew_end=3&ey_start=2026&ey_end=2026` devolveu JSON com 3 registros (semanas epidemiológicas 202601–202603, Fortaleza) e 30 campos: casos, casos_est, Rt, p_inc100k, nivel (alerta), temperatura/umidade, pop — [InfoDengue API](https://info.dengue.mat.br/api/alertcity?geocode=2304400&disease=dengue&format=json&ew_start=1&ew_end=3&ey_start=2026&ey_end=2026)
- Sem autenticação. Limites e termos: **não verificado**. Uso: alerta de dengue/chikungunya/zika por município (médicos, enfermeiros, vigilância, professores).

**ANS — TUSS (nova ferramenta de consulta com API, 2026)** — NÃO testado ao vivo
- Notícia citando a ANS (29/07/2026): plataforma de consulta às tabelas TUSS com exportação em Excel, CSV e JSON e serviço REST. URLs divulgadas: plataforma `https://consulta-ocl.apps.sa-1a.mendixcloud.com/p/ocl`; documentação `https://consulta-ocl.apps.sa-1a.mendixcloud.com/rest-doc/rest/oclservice#/`; conceitos `.../rest/oclservice/ANS/concepts/tuss-43?page=1&q=fem`; tabelas `.../rest/oclservice/ANS/source`. A página não menciona autenticação — [Legismap](https://legismap.com.br/conteudos/artigos-e-noticias/ans-lanca-ferramenta-para-consulta-a-codigos-de-procedimentos-e-medicamentos)
- TUSS 22 tem ~6 mil procedimentos; TUSS 19 (OPME) mais de 1,3 milhão de registros; TUSS não é o Rol (um item pode estar na TUSS sem ter cobertura obrigatória) — [Revista Apólice](https://revistaapolice.com.br/2026/08/ans-lanca-ferramenta-para-consulta-de-procedimentos/)
- Domínio é mendixcloud.com (não gov.br); autenticação, limites e estabilidade: **não verificado**.
- ANS mantém página de dados abertos (operadoras etc.) em arquivos — [ANS dados abertos](https://www.gov.br/ans/pt-br/acesso-a-informacao/perfil-do-setor/dados-abertos-1)

**SIGTAP (tabela de procedimentos do SUS)**
- Sem API REST pública encontrada. Distribuição por arquivo mensal (por competência) em `http://sigtap.datasus.gov.br/tabela-unificada/app/download.jsp`, conforme manual do AGHUx — [Manual AGHUx/EBSERH](https://www.gov.br/hubrasil/pt-br/governanca/plataformas-e-tecnologias/aghu/modulos/outras-funcionalidades-administrativas/outros/manual-usuario-carga-da-tabela-do-sigtap-no-aghux.pdf)
- Web service SOAP do SIGTAP (servicos.saude.gov.br): **não verificado**.

**Conitec/PCDT e RENAME**
- Busca não encontrou API nem CSV de dados abertos; PCDT são publicados como páginas/PDF em gov.br — [PCDT – Ministério da Saúde](https://www.gov.br/saude/pt-br/assuntos/pcdt)

**IBGE (apoio: localidades, população, SIDRA)** — TESTADO AO VIVO, OK
- `GET https://servicodados.ibge.gov.br/api/v1/localidades/estados/CE` devolveu `{"id":23,"sigla":"CE","nome":"Ceará","regiao":{...}}` — [IBGE API](https://servicodados.ibge.gov.br/api/v1/localidades/estados/CE)
- Sem autenticação; JSON; português. Útil para resolver código IBGE de município (exigido por InfoDengue e CNES).

#### 1.2 Classificações e terminologias

**OMS — ICD-11 API (CID-11)** — requer OAuth2 (não testado ao vivo)
- Base `https://id.who.int/`; OAuth2 client credentials; token em `https://icdaccessmanagement.who.int/connect/token`; cadastro em `https://icd.who.int/icdapi`; cabeçalhos `API-Version: v2`, `Accept: application/json`; idioma por `Accept-Language`; Swagger em `https://id.who.int/swagger/index.html` — [ICD-API v2 docs](https://icd.who.int/docs/icd-api/APIDoc-Version2/)
- **Português está disponível** para ICD-11 MMS nas releases 2024-01, 2025-01 e 2026-01 (a 2026-01 tem 15 idiomas, incluindo Portuguese). ICD-10 na API só em inglês (e francês na 2008) — **não há CID-10 em português na API da OMS** — [Supported Classifications](https://icd.who.int/docs/icd-api/SupportedClassifications)
- Implantação local: imagem Docker `whoicd/icd-api` (`docker run -p 80:80 -e acceptLicense=true whoicd/icd-api`), funciona offline após a primeira execução; pacote com português disponível como `2026-01_en-es-pt`; exige aceitar a licença; analytics desligado por padrão — [ICD-API Docker](https://icd.who.int/docs/icd-api/ICDAPI-DockerContainer)
- Tradução da CID-11 para português descrita na Rev. Bras. Epidemiol. 2023 — [SciELO SP](https://scielosp.org/article/rbepid/2023.v26/e230043/en)

**CID-10 em português (DATASUS)** — ver seção 3.

**RxNorm / RxNav (NLM)** — TESTADO AO VIVO, OK
- `GET https://rxnav.nlm.nih.gov/REST/rxcui.json?name=metamizole` devolveu `{"idGroup":{"rxnormId":["3523"]}}` — [RxNav rxcui](https://rxnav.nlm.nih.gov/REST/rxcui.json?name=metamizole)
- Termos: sem licença/chave; limite de 20 req/s por IP (100 req/s com chave UTS gratuita); recomenda cache de 12–24 h; exige declaração de que o produto usa dados públicos da NLM e que a NLM não o endossa; não pode usar nome/logo da NLM; conteúdo SNOMED CT no RxClass sujeito a licença de afiliado — [RxNav Terms of Service](https://lhncbc.nlm.nih.gov/RxNav/TermsofService.html)
- **API de interação medicamentosa: descontinuada em 02/01/2024** (confirmado: `GET https://rxnav.nlm.nih.gov/REST/interaction/interaction.json?rxcui=341248` devolveu HTTP 404 hoje) — [teste 404](https://rxnav.nlm.nih.gov/REST/interaction/interaction.json?rxcui=341248); [RxNav FAQ](https://lhncbc.nlm.nih.gov/RxNav/information/FAQs.html)
- Dados em inglês; nomes de princípios ativos (DCI) funcionam, marcas brasileiras não.

**RxTerms via NLM Clinical Tables** — TESTADO AO VIVO, OK
- `GET https://clinicaltables.nlm.nih.gov/api/rxterms/v3/search?terms=metform&ef=STRENGTHS_AND_FORMS` devolveu JSON com 20 resultados (metFORMIN Oral Pill, XR, combinações) e concentrações/formas (500 mg Tab, 850 mg Tab...) — [RxTerms](https://clinicaltables.nlm.nih.gov/api/rxterms/v3/search?terms=metform&ef=STRENGTHS_AND_FORMS)
- Mesmo host já integrado (ICD-10-CM); sem chave. Inglês/mercado EUA.

**DailyMed (NLM)** — TESTADO AO VIVO, OK
- `GET https://dailymed.nlm.nih.gov/dailymed/services/v2/spls.json?drug_name=metformin&pagesize=1` devolveu JSON (`data`, `metadata`), 560 SPLs, primeiro item publicado em 19/11/2026 — [DailyMed API](https://dailymed.nlm.nih.gov/dailymed/services/v2/spls.json?drug_name=metformin&pagesize=1)
- Sem chave; bulas dos EUA em inglês (sobrepõe-se ao openFDA label já integrado; acrescenta medicamentos veterinários e histórico de versões — este último ponto **não verificado**).

**openFDA — eventos adversos (FAERS)** — TESTADO AO VIVO, OK
- `GET https://api.fda.gov/drug/event.json?search=patient.drug.medicinalproduct:"METAMIZOLE"&count=patient.reaction.reactionmeddrapt.exact&limit=5` devolveu contagens de reações (NAUSEA 1451, DYSPNOEA 1171, VOMITING 1164, PYREXIA 1062...) com `last_updated: 2026-10-28` e aviso de que os dados não são validados e não devem embasar decisões clínicas — [openFDA event](https://api.fda.gov/drug/event.json?search=patient.drug.medicinalproduct:%22METAMIZOLE%22&count=patient.reaction.reactionmeddrapt.exact&limit=5)
- Mesma infraestrutura/chave do openFDA label já integrado. Inglês (termos MedDRA).

**PubChem PUG REST (NCBI)** — TESTADO AO VIVO, OK
- `GET https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/dipyrone/property/MolecularFormula,MolecularWeight,IUPACName/JSON` devolveu CID 522325, C13H16N3NaO4S, 333.34 — [PubChem](https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/dipyrone/property/MolecularFormula,MolecularWeight,IUPACName/JSON)
- Sem chave; limites/termos: **não verificado** nesta pesquisa.

**MedlinePlus Connect (NLM)** — TESTADO AO VIVO, OK
- `GET https://connect.medlineplus.gov/service?mainSearchCriteria.v.cs=2.16.840.1.113883.6.90&mainSearchCriteria.v.c=E11.9&knowledgeResponseType=application/json&informationRecipient.languageCode.c=es` devolveu JSON com entradas "Diabetes tipo 2" em espanhol — [MedlinePlus Connect](https://connect.medlineplus.gov/service?mainSearchCriteria.v.cs=2.16.840.1.113883.6.90&mainSearchCriteria.v.c=E11.9&knowledgeResponseType=application/json&informationRecipient.languageCode.c=es)
- Material educativo ao paciente por código ICD-10-CM/RxCUI; inglês e espanhol (sem português).

**WHO ATC/DDD**
- O índice ATC/DDD tem busca online gratuita, mas os arquivos eletrônicos (Excel/XML) são obtidos por formulário de pedido ao WHOCC; não há API pública oficial — [WHOCC ATC/DDD Index](https://atcddd.fhi.no/atc_ddd_index_and_guidelines)
- Termos de uso comercial: **não verificado**. (Alternativa: classes ATC via RxClass da NLM — [NLM ATC source docs](https://www.nlm.nih.gov/research/umls/rxnorm/sourcereleasedocs/atc.html).)

#### 1.3 Evidência científica e academia

**Europe PMC REST** — TESTADO AO VIVO, OK
- `GET https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=dengue AND LANG:por&format=json&pageSize=2` devolveu JSON com hitCount 260 e 30 campos por resultado (pmid, pmcid, doi, isOpenAccess, citedByCount, hasPDF...); primeiro resultado: posicionamento da Arq Bras Cardiol 2026 — [Europe PMC search](https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=dengue%20AND%20LANG%3Apor&format=json&pageSize=2)
- `LANG:por AND OPEN_ACCESS:y` devolveu apenas 3.419 registros — o filtro de idioma português é pouco populado — [Europe PMC LANG:por](https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=LANG%3Apor%20AND%20OPEN_ACCESS%3Ay&format=json&pageSize=1&resultType=lite)
- Sem chave. A página de documentação devolveu 403 ao fetcher; limites e termos: **não verificado**. Diferencial sobre PubMed: texto completo OA, preprints, contagem de citações.

**ClinicalTrials.gov API v2** — TESTADO AO VIVO, OK
- `GET https://clinicaltrials.gov/api/v2/studies?query.cond=dengue&filter.geo=distance(-15.78,-47.93,2000km)&pageSize=1` devolveu JSON (`studies`, `nextPageToken`); primeiro estudo NCT05466240 com locais incluindo Brasil — [ClinicalTrials.gov v2](https://clinicaltrials.gov/api/v2/studies?query.cond=dengue&filter.geo=distance(-15.78,-47.93,2000km)&pageSize=1)
- Sem chave; inglês. Limites: **não verificado**.

**OpenAlex** — TESTADO AO VIVO, OK (mudou de modelo em 2026)
- `GET https://api.openalex.org/works?search=dengue&per-page=1` devolveu JSON com `meta.count` 301.270 e campo novo `meta.cost_usd: 0.001`; o aviso da resposta diz que, sem chave, a requisição divide um orçamento diário gratuito de US$ 0,10 por IP — [OpenAlex works](https://api.openalex.org/works?search=dengue&per-page=1)
- Regras atuais: chave não é obrigatória; conta gratuita dá US$ 1/dia (10x o sem-chave); custos de exemplo: US$ 0 para registro único, US$ 0,0001 para listagem/filtro, US$ 0,001 para busca textual; taxa de 10 req/s sem chave e 30 req/s com chave grátis; cursor paging além da 1ª página exige chave; orçamento zera à meia-noite UTC; 429 por taxa não consome orçamento — [OpenAlex rate limits & auth](https://help.openalex.org/how-to-use-the-api/rate-limits-and-authentication)
- Filtro por idioma funciona: `filter=...,language:pt` devolveu obra em português com `cost_usd: 0.0001` — [OpenAlex filter pt](https://api.openalex.org/works?filter=primary_location.source.id:S4306400806,language:pt&per-page=1&select=id,title,language)
- Licença dos dados (CC0): **não verificado** nesta pesquisa (a página de limites não trata disso).

**Semantic Scholar Graph API** — TESTADO AO VIVO, FALHOU sem chave
- `GET https://api.semanticscholar.org/graph/v1/paper/search?query=dengue+vaccine&limit=1&fields=title,year,tldr,openAccessPdf` devolveu **HTTP 429** — [S2 search](https://api.semanticscholar.org/graph/v1/paper/search?query=dengue+vaccine&limit=1&fields=title,year,tldr,openAccessPdf)
- Sem chave, o limite é um pool de 1.000 req/s compartilhado entre todos os usuários não autenticados; com chave, limite introdutório de 1 req/s; chave solicitada por formulário; há um "API License Agreement" cujo teor não li — [Semantic Scholar API](https://www.semanticscholar.org/product/api)

**Unpaywall** — TESTADO AO VIVO, OK
- `GET https://api.unpaywall.org/v2/10.1038/nature12373?email=<email>` devolveu JSON com `is_oa: true` e `best_oa_location` (URL do PDF, versão publicada) — [Unpaywall v2](https://api.unpaywall.org/v2/10.1038/nature12373?email=unpaywall_01@example.com)
- Autenticação: apenas parâmetro `email`. Limites/termos atuais: **não verificado** (página do produto é renderizada por JS). Observação: o OpenAlex já expõe dados de acesso aberto nas obras, podendo dispensar esta chamada.

**DOAJ** — TESTADO AO VIVO, OK
- `GET https://doaj.org/api/search/articles/dengue?pageSize=1` devolveu JSON, 17.971 resultados; paginação aponta para `doaj.org/api/v4/...` — [DOAJ API](https://doaj.org/api/search/articles/dengue?pageSize=1)

**SciELO ArticleMeta** — TESTADO AO VIVO, OK (parcial)
- `GET https://articlemeta.scielo.org/api/v1/journal/identifiers/?collection=scl&limit=2` devolveu JSON (`meta.total: 428` periódicos na coleção Brasil; objetos com ISSN e `processing_date` de 2012) — [ArticleMeta](https://articlemeta.scielo.org/api/v1/journal/identifiers/?collection=scl&limit=2)
- A ArticleMeta é orientada a identificadores (ISSN/PID), não a busca textual. A busca `https://search.scielo.org/?q=dengue&output=json` devolveu **HTTP 403** — [SciELO Search](https://search.scielo.org/?q=dengue&lang=pt&count=1&output=json)

**BVS / LILACS / DeCS (BIREME)**
- API de busca da BVS: beta restrita a usuários cadastrados; cada usuário recebe chave enviada no cabeçalho (`apikey`); chave pedida por formulário — [BVS OpenMetadata](https://openmetadata.bvsalud.org/?p=318) (conteúdo obtido via resultado de busca; a página redirecionou no fetch direto)
- DeCS: consulta online livre; base completa por XML ou API (desde 2023) exige contrato de licença com a BIREME/OPAS, gratuito, mediante formulário e análise — [DeCS for developers](https://decs.bvsalud.org/en/for-developers/)

**ORCID Public API** — TESTADO AO VIVO, OK
- `GET https://pub.orcid.org/v3.0/expanded-search/?q=affiliation-org-name:"Fiocruz"&rows=1` devolveu XML com `num-found="3244"`, sem erro de autenticação — [ORCID pub API](https://pub.orcid.org/v3.0/expanded-search/?q=affiliation-org-name:%22Fiocruz%22&rows=1)
- Atenção: devolve dados pessoais de pesquisadores (públicos, por opção do titular) — não são dados de paciente.

**medRxiv/bioRxiv API** — TESTADO AO VIVO, OK
- `GET https://api.biorxiv.org/details/medrxiv/2026-11-01/2026-11-02/0/json` devolveu JSON com 133 preprints no intervalo — [bioRxiv API](https://api.biorxiv.org/details/medrxiv/2026-11-01/2026-11-02/0/json)

**CAPES — Dados Abertos (CKAN)** — TESTADO AO VIVO, OK
- `GET https://dadosabertos.capes.gov.br/api/3/action/package_search?q=teses&rows=2` devolveu JSON CKAN (`success: true`) com os conjuntos "[2017 a 2020]" e "[2021 a 2024] Catálogo de Teses e Dissertações – Brasil", em CSV/XLSX por ano — [CAPES CKAN](https://dadosabertos.capes.gov.br/api/3/action/package_search?q=teses&rows=2)
- É API de catálogo de arquivos (CSV grandes), não busca de teses por termo.

**Cochrane, Lattes/CNPq, Portal de Periódicos CAPES, DrugBank** — nenhuma API pública gratuita foi encontrada nesta pesquisa: **não verificado** (ver Gaps).

#### 1.4 Nutrição

**Open Food Facts** — TESTADO AO VIVO, OK (produto) / instável (busca)
- `GET https://world.openfoodfacts.org/api/v2/product/7894900011517.json?fields=...` devolveu `status: 1`, "Refrigerante Coca-Cola 2Lt", nutrientes por 100 g e Nutri-Score C — [OFF produto](https://world.openfoodfacts.org/api/v2/product/7894900011517.json?fields=code,product_name,brands,nutriments,nutriscore_grade,nova_group)
- O endpoint de busca `api/v2/search?countries_tags_en=brazil...` devolveu **HTTP 503** no teste — [OFF search](https://world.openfoodfacts.org/api/v2/search?countries_tags_en=brazil&fields=code,product_name,nutriments,nutriscore_grade&page_size=1)
- Sem chave; nomes de produtos brasileiros em português. Limites e licença (ODbL): **não verificado** nesta pesquisa.

**USDA FoodData Central** — TESTADO AO VIVO, OK
- `GET https://api.nal.usda.gov/fdc/v1/foods/search?query=banana&pageSize=1&api_key=DEMO_KEY` devolveu JSON com 4.996 hits; o primeiro foi um produto de marca ("BANANA", pasta de amendoim) — é preciso filtrar por `dataType` (Foundation/SR Legacy) para alimentos in natura — [FDC search](https://api.nal.usda.gov/fdc/v1/foods/search?query=banana&pageSize=1&api_key=DEMO_KEY)
- Exige chave gratuita (api.data.gov); limites e licença: **não verificado** (a página do guia redirecionou). Inglês.

**TACO / TBCA (tabelas brasileiras)**
- Não foi encontrada API oficial nem dataset aberto oficial em JSON. Há APIs comunitárias no GitHub (isaquetdiniz/taco-api em Go; raulfdm/taco-api em GraphQL, licença MIT, site em taco-api.netlify.app; não está claro se existe endpoint público hospedado) — [raulfdm/taco-api](https://github.com/raulfdm/taco-api)
- TACO: NEPA/UNICAMP, 4ª ed. 2011. TBCA (USP/FoRC): versão 7.3 com ~1.800 alimentos in natura e ingredientes, disponível online — [Agência FAPESP](https://agencia.fapesp.br/tabela-brasileira-de-composicao-de-alimentos-se-transforma-em-ecossistema-digital-de-pesquisa/59305)

#### 1.5 Veterinária / agro

**Agrofit (MAPA) via Embrapa AgroAPI**
- API Agrofit cobre produtos formulados e técnicos, pragas, plantas daninhas, ingredientes ativos, classes; plano gratuito de 100 mil requisições/mês; volumes maiores via agroapi@embrapa.br — [Ficha Agrofit (PDF)](https://www.agroapi.cnptia.embrapa.br/portal/assets/docs/agrofit.pdf) (texto obtido via trecho de busca; o PDF não pôde ser lido pelo fetch)
- Exige cadastro na plataforma AgroAPI e token (fluxo OAuth com consumer key/secret): **não verificado** em detalhe.
- Os dados do Agrofit também estão em dados abertos do MAPA (recurso "Produto Formulado") — [dados.agricultura.gov.br](https://dados.agricultura.gov.br/tl/dataset/sistema-de-agrotoxicos-fitossanitarios-agrofit/resource/d30b30d7-e256-484e-9ab8-cd40974e1238)
- Observação: Agrofit é de agrotóxicos/fitossanitários, não de medicamentos veterinários. Bulário veterinário (SINDAN) com API: **não verificado / nada encontrado**.

#### 1.6 Psicologia

**SATEPSI (CFP)**
- Nenhuma API ou dado aberto encontrado. A lista é navegável no site (testes favoráveis, desfavoráveis e instrumentos não privativos); a Resolução CFP nº 31/2022 trata como falta ética o uso de teste com parecer desfavorável — [Resolução CFP 31/2022](https://www.legisweb.com.br/legislacao/?id=473938)

#### 1.7 Educação e linguagem

**BNCC — api.bncc.dev (projeto comunitário bncc-dev)** — especificação lida ao vivo, OK
- `GET https://api.bncc.dev/v1/openapi.json` devolveu OpenAPI com rotas GET: `/v1/habilidades`, `/v1/objetivos`, `/v1/busca?q=`, `/v1/aprendizagens/{codigo}`, `/v1/decodificar/{codigo}`, `/v1/estrutura`, `/v1/estatisticas`; "Sem cadastro e sem API key"; limite por IP sem valor numérico; versão `1.0.0-beta` — [api.bncc.dev OpenAPI](https://api.bncc.dev/v1/openapi.json)
- Dataset: 1.721 aprendizagens (93 Ed. Infantil + 1.304 Fundamental + 183 Médio da BNCC 2018, mais 141 do complemento de Computação), em JSON/SQLite/CSV, cada registro com fonte e página do PDF oficial; dados CC BY 4.0, código MIT; release `dados-2026.08` — [bncc-dev/bncc-dados](https://github.com/bncc-dev/bncc-dados)
- Não é serviço oficial do MEC; projeto novo (primeira release em 07/2026).

**LanguageTool (API pública)** — TESTADO AO VIVO, OK
- `GET https://api.languagetool.org/v2/check?language=pt-BR&text=...` devolveu JSON (LanguageTool 6.9-SNAPSHOT) com 2 ocorrências e mensagens em português ("Possível erro de concordância verbal.") — [LanguageTool check](https://api.languagetool.org/v2/check?language=pt-BR&text=Eu%20vai%20na%20escola%20ontem%20e%20fazem%20dois%20anos.)
- Limites do endpoint gratuito: 20 req/min por IP, 75 KB de texto/min, 20 KB por requisição, sugestões só para as 30 primeiras palavras erradas. **Uso automatizado ou empresarial não é permitido no endpoint gratuito** (exige servidor próprio ou conta Enterprise); exige link visível para languagetool.org; sem garantia de disponibilidade; a documentação diz que só POST é permitido (embora o GET tenha respondido no teste) — [LanguageTool public HTTP API](https://dev.languagetool.org/public-http-api)

**Dicionário Aberto** — TESTADO AO VIVO, OK
- `GET https://api.dicionario-aberto.net/word/anamnese` devolveu array JSON com um verbete cujo conteúdo vem em XML embutido (definição: "O mesmo que anamnesia."); registro com timestamp de 2011 — [Dicionário Aberto](https://api.dicionario-aberto.net/word/anamnese)
- Sem chave. Base é dicionário antigo (definições arcaicas/remissivas); licença e limites: **não verificado**.

**Wikipedia PT (REST) e Wikidata** — TESTADO AO VIVO, OK
- `GET https://pt.wikipedia.org/api/rest_v1/page/summary/Dengue` devolveu JSON com `extract` em português, thumbnail, `wikibase_item` — [Wikipedia REST](https://pt.wikipedia.org/api/rest_v1/page/summary/Dengue)
- `GET https://www.wikidata.org/w/api.php?action=wbsearchentities&search=dipirona&language=pt&format=json&limit=1` devolveu Q422761 "metamizole sodium" casado pelo alias em português "Dipirona" — [Wikidata](https://www.wikidata.org/w/api.php?action=wbsearchentities&search=dipirona&language=pt&format=json&limit=1)

**Open Library** — TESTADO AO VIVO, OK
- `GET https://openlibrary.org/search.json?q=dom+casmurro&limit=1&fields=...` devolveu `numFound: 85`, "Dom Casmurro", Machado de Assis, 1899 — [Open Library](https://openlibrary.org/search.json?q=dom+casmurro&limit=1&fields=title,author_name,first_publish_year,language)

**e-MEC, INEP, QEdu, FNDE**
- e-MEC: sem API pública documentada; bases (IES, cursos de graduação, especialização) publicadas em CSV no dados.gov.br, com última atualização relatada em dezembro de 2022 — [Relatório PDA MEC](https://www.gov.br/mec/pt-br/acesso-a-informacao/dados-abertos/demanda_1804_RelatriodeacompanhamentodoPDA2024.pdf)
- INEP: dados abertos em arquivos (microdados, sinopses) — [INEP dados abertos](https://www.gov.br/inep/pt-br/acesso-a-informacao/dados-abertos)
- QEdu API: busca não encontrou documentação oficial nem informação sobre token — **não verificado**. FNDE: **não verificado**.

### Inferences
- **Padrão geral**: fontes brasileiras oficiais de saúde/educação publicam majoritariamente **arquivos** (CSV/ZIP); as únicas APIs REST brasileiras de saúde que responderam sem credencial foram a do Ministério da Saúde (DEMAS), o InfoDengue e o IBGE. As APIs "de consulta pontual" de qualidade são americanas/europeias e em inglês.
- **Dados em português, via requisição simples**: DEMAS/MS, InfoDengue, IBGE, Wikipedia PT, Wikidata (rótulos/aliases pt), LanguageTool pt-BR, Dicionário Aberto, api.bncc.dev, Open Food Facts (produtos BR), OpenAlex/Europe PMC/DOAJ (metadados de artigos em pt, quando existem), CID-11 OMS (com OAuth).
- Como o modelo de IA traduz bem, a barreira do inglês em RxNorm/DailyMed/openFDA/ClinicalTrials é contornável; a barreira real é a **cobertura do mercado brasileiro** (dipirona, por exemplo, não tem bula nos EUA; no RxNorm existe só como ingrediente).
- Arquivos CSV da ANVISA (46 MB de medicamentos, ~11–17 MB de preços) não cabem em chamada de ferramenta em tempo real; num produto sem backend, exigiriam pré-processamento e empacotamento/atualização periódica (ou um índice estático hospedado). Isso viola a premissa "sem backend" apenas se o índice for dinâmico; um JSON estático versionado seria compatível.
- O endpoint DEMAS de arboviroses devolve microdados de notificação com quase-identificadores (idade, sexo, datas, município). Não exige enviar dados de paciente (regra do Nexpra atendida), mas é prudente que a ferramenta agregue e não exiba registros individuais.
- OpenAlex sem chave (US$ 0,10/dia por IP = ~100 buscas textuais ou ~1.000 filtros) é suficiente para uso individual leve; para a extensão, o ideal é permitir que o usuário informe a própria chave gratuita (US$ 1/dia). Buscas textuais custam 10x mais que filtros — vale buscar por filtro quando possível.
- LanguageTool: a restrição a uso "automatizado/empresarial" no endpoint gratuito torna arriscado embuti-lo em produto comercial; correção gramatical pode ser feita pelo próprio modelo de IA.
- A API TUSS da ANS em mendixcloud.com parece ser o primeiro acesso programático oficial à TUSS; vale teste a partir do navegador antes de depender dela.

### Gaps
- Lista completa de endpoints, limites de taxa e termos da API DEMAS/MS (Swagger em JS não legível pelo fetch; vacinação/PNI, SIM, SINASC etc. não testados).
- Bulário ANVISA: não foi possível testar a partir de navegador real; não sei se o 403 ocorre também para o service worker da extensão.
- Termos de uso/limites formais não lidos: Europe PMC (403 na doc), ClinicalTrials.gov, Unpaywall, PubChem, Open Food Facts, USDA FDC, InfoDengue, Dicionário Aberto, Semantic Scholar License Agreement.
- Não pesquisados em profundidade por limite de tempo: CIAP-2, OpenDataSUS (CKAN), DATASUS TABNET, Cochrane, Lattes/CNPq, Portal de Periódicos CAPES, DrugBank, SINDAN, Wiktionary PT, FNDE, QEdu (documentação não localizada), Rol de Procedimentos da ANS como dataset, WHO GHO (um teste de filtro OData devolveu lista vazia — inconclusivo: [GHO](https://ghoapi.azureedge.net/api/Indicator?$filter=contains(IndicatorName,'Dengue'))).
- ANS/TUSS: endpoints divulgados não testados ao vivo; autenticação e limites desconhecidos.
- Agrofit/AgroAPI: fluxo de autenticação e termos não confirmados em fonte legível.

---

## 2. Existe fonte oficial brasileira confiável, acessível por programa, para bulas e interações medicamentosas? Se não, qual o melhor fallback legal?

### Takeaway
Não. O Bulário Eletrônico da ANVISA não tem API oficial documentada e o endpoint interno devolveu 403 (WAF); não existe base oficial brasileira de interações medicamentosas com API, e a API de interações da NLM (RxNav) foi encerrada em 02/01/2024. O fallback legal é combinar dados abertos da ANVISA (registro e preços, em CSV) com bulas americanas (openFDA label/DailyMed, seção "drug interactions") normalizadas por princípio ativo via RxNorm, mais farmacovigilância do openFDA — sempre sinalizando que a fonte não é a bula brasileira e oferecendo o link para o usuário abrir o Bulário no navegador.

### Cited Findings
- O endpoint `consultas.anvisa.gov.br/api/consulta/bulario` devolveu HTTP 403 em requisição direta — [teste](https://consultas.anvisa.gov.br/api/consulta/bulario?count=3&filter%5BnomeProduto%5D=dipirona&page=1)
- Terceiros relatam WAF (Cloudflare + Dynatrace) bloqueando chamadas diretas sem cookies de sessão; o contorno deles é navegador automatizado — [Apify](https://apify.com/jgoia/anvisa-products-lookup.md)
- Há revenda comercial da consulta ao Bulário (Infosimples), o que indica ausência de API oficial aberta — [Infosimples](https://infosimples.com/consultas/anvisa-bulario-eletronico/)
- A API oficial da ANVISA (api.anvisa.gov.br, credenciais via Gov.br) não lista o bulário entre os endpoints documentados pelo cliente comunitário — [PyPI anvisa](https://pypi.org/project/anvisa/)
- Os dados abertos da ANVISA não incluem bulas; incluem cadastro de medicamentos, restrições, preços e VigiMed em CSV — [dados.anvisa.gov.br](https://dados.anvisa.gov.br/dados/)
- A API de interações do RxNav foi descontinuada em 02/01/2024; as fontes que ela usava eram a lista de interações de alta prioridade da NLM/ONC, CredibleMeds e o dataset do DrugBank — [RxNav FAQ](https://lhncbc.nlm.nih.gov/RxNav/information/FAQs.html); 404 confirmado hoje — [teste](https://rxnav.nlm.nih.gov/REST/interaction/interaction.json?rxcui=341248)
- Os substitutos divulgados em posts de terceiros são autopromocionais (uma API paga e um projeto self-hosted marcado "Not for clinical use") — [dev.to](https://dev.to/ben_feeney_f0074083491ec6/the-nlm-drug-interaction-api-is-gone-heres-what-to-use-instead-2ac7)
- RxNorm continua ativo e resolve DCI para RxCUI (metamizole → 3523) — [RxNav](https://rxnav.nlm.nih.gov/REST/rxcui.json?name=metamizole)
- DailyMed e openFDA respondem sem chave e trazem bulas dos EUA e eventos adversos; o openFDA adverte que os dados não são validados e não devem embasar decisões clínicas — [DailyMed](https://dailymed.nlm.nih.gov/dailymed/services/v2/spls.json?drug_name=metformin&pagesize=1); [openFDA event](https://api.fda.gov/drug/event.json?search=patient.drug.medicinalproduct:%22METAMIZOLE%22&count=patient.reaction.reactionmeddrapt.exact&limit=5)
- Wikidata mapeia nomes brasileiros para entidades internacionais (alias pt "Dipirona" → metamizole sodium, Q422761) — [Wikidata](https://www.wikidata.org/w/api.php?action=wbsearchentities&search=dipirona&language=pt&format=json&limit=1)

### Inferences
- Cadeia de fallback sugerida (toda sem dado de paciente): (1) nome comercial/DCI brasileiro → princípio ativo em inglês via Wikidata (alias pt) ou RxNorm; (2) texto de interações/contraindicações da bula FDA (openFDA label, já integrado; DailyMed como complemento); (3) sinais de farmacovigilância via openFDA event; (4) literatura (PubMed/Europe PMC); (5) link profundo para o Bulário ANVISA aberto pelo usuário na própria aba. A extensão, por rodar no navegador do usuário, poderia ler a página do Bulário que o próprio usuário abriu (content script), o que é diferente de raspagem automatizada — mas isso é decisão de produto/jurídica, não fato verificado.
- Raspar o endpoint interno contornando o WAF (cookies de sessão automatizados) é frágil e juridicamente questionável; não recomendo como dependência do produto.
- Lacuna de cobertura: fármacos comuns no Brasil e ausentes nos EUA (dipirona, nimesulida etc.) não terão bula FDA; para esses, o fallback fica restrito a literatura e Wikidata/PubChem.
- Para preços (CMED) e situação de registro, o caminho viável é pré-processar os CSVs de dados.anvisa.gov.br em um índice estático.

### Gaps
- Não testei o Bulário a partir de navegador real nem verifiquei termos de uso do portal de consultas da ANVISA.
- Conteúdo exato dos CSVs `TA_PRECO*` (se equivalem à lista CMED com PF/PMC por ICMS) não foi aberto.
- Não verifiquei se o dataset de interações de alta prioridade (ONC) ou DDInter/outros conjuntos abertos têm licença compatível com uso comercial — ficaria como pesquisa adicional.
- DrugBank: condição de licença atual não verificada.

---

## 3. Melhor opção para CID-10/CID-11 em português sem enviar dados a terceiros

### Takeaway
Para CID-10 em português, o caminho prático é embutir localmente a tabela do DATASUS (CSV de capítulos, grupos, categorias e subcategorias) na extensão — porém não encontrei declaração de licença explícita para esses arquivos, então a redistribuição comercial fica como risco a validar. Para CID-11, a API oficial da OMS tem português (releases 2024-01 a 2026-01) via OAuth2 gratuito; a consulta envia apenas termos de busca (não dados de paciente), e existe opção de contêiner local, inviável dentro de uma extensão.

### Cited Findings
- A API da OMS não oferece CID-10 em português (ICD-10 só em inglês; francês na 2008); CID-11 MMS em português está nas releases 2024-01, 2025-01 e 2026-01 — [Supported Classifications](https://icd.who.int/docs/icd-api/SupportedClassifications)
- Autenticação da API em nuvem: OAuth2 client credentials (client id/secret obtidos após cadastro em icd.who.int/icdapi), token em icdaccessmanagement.who.int; idioma por `Accept-Language` — [ICD-API v2](https://icd.who.int/docs/icd-api/APIDoc-Version2/)
- Há implantação local por Docker (`whoicd/icd-api`), offline após a primeira execução, com pacote `2026-01_en-es-pt`; exige `acceptLicense=true`; com `saveAnalytics=true` envia dados de busca à OMS sem IDs/IP (desligado por padrão) — [ICD-API Docker](https://icd.who.int/docs/icd-api/ICDAPI-DockerContainer)
- Arquivos CID-10 do DATASUS: scripts de terceiros importam `http://www2.datasus.gov.br/cid10/V2008/downloads/CID10CSV.zip`, com tabelas CID-10-CAPITULOS.CSV, CID-10-GRUPOS.CSV, CID-10-CATEGORIAS.CSV e CID-10-SUBCATEGORIAS.CSV — [script R (sustools)](https://rdrr.io/github/ronaldoalves-ms/sustools/src/data-raw/DATASET.R); [pacote msrodrigues/cid10](https://rdrr.io/github/msrodrigues/cid10/f)
- A RNDS publica um CodeSystem FHIR "BRCID10" — [Simplifier RNDS](https://simplifier.net/redenacionaldedadosemsaude/codesystem-brcid10)
- Existe um servidor MCP comunitário de CID-10 brasileiro (cid10-br-mcp), sinal de que a tabela é redistribuída por terceiros — [Glama](https://glama.ai/mcp/servers/SidneyBissoli/cid10-br-mcp)
- Duas buscas dedicadas não encontraram declaração de licença/termos de uso para os CSVs de CID-10 do DATASUS — [busca: IBGE Concla CID-10](https://concla.ibge.gov.br/classificacoes/por-tema/saude/cid-10) (página de referência; sem licença localizada)

### Inferences
- Tabela local de CID-10 (ordem de 14 mil subcategorias, poucas centenas de KB compactada) cabe confortavelmente no pacote da extensão e elimina qualquer tráfego a terceiros — é a melhor opção técnica para CID-10, que continua sendo a classificação em uso operacional no SUS/saúde suplementar.
- Risco de licença: a CID-10 é obra da OMS e a tradução brasileira foi feita por centro colaborador; a ausência de licença explícita no DATASUS não equivale a domínio público. A ampla redistribuição por terceiros (pacotes R, FHIR da RNDS, MCP) sugere tolerância, mas não é autorização. Recomenda-se citar a fonte (DATASUS/OMS) e, para uso comercial, consultar a OMS/Ministério da Saúde.
- Para CID-11, a API da OMS recebe só o texto buscado; desde que o modelo envie termos clínicos e não narrativas com identificadores, a regra "sem dados de paciente" é atendida. O client secret embutido numa extensão é extraível — melhor que cada usuário cadastre a própria credencial gratuita, ou que se empacote um extrato local da linearização em português (sujeito à licença da CID-11).
- O contêiner Docker não é opção para extensão sem backend, mas serviria a instituições que queiram apontar o Nexpra para um servidor interno (URL configurável).

### Gaps
- Licença dos arquivos CID-10 do DATASUS: **não verificado** (nenhuma fonte primária localizada); URL de download atual do DATASUS não testada.
- Licença da CID-11 (acredito ser Creative Commons com restrição a derivados, mas **não verificado** nesta pesquisa) e limites de taxa da API em nuvem.
- CIAP-2 em português (SBMFC) — existência de dataset/licença: **não verificado**.
- NLM Clinical Tables (já integrado) tem ICD-10-CM e ICD-11 em inglês; não verifiquei se há tabela em português (provavelmente não).

---

## 4. Top 8–10 por valor, por profissão

### Takeaway
O núcleo de maior valor e menor risco para o Nexpra é: Europe PMC + ClinicalTrials.gov + OpenAlex (evidência), RxNorm + openFDA eventos + DailyMed (medicamentos), CID-10 local + CID-11 OMS (codificação), API do Ministério da Saúde + InfoDengue + IBGE (dados brasileiros), e api.bncc.dev + Wikipedia/Wikidata (educação). ANVISA (CSV), TACO/TBCA, SIGTAP e TUSS agregam muito valor local, mas exigem empacotar dados em vez de chamar API.

### Cited Findings

Ranking geral por valor x viabilidade (todas as evidências estão nas fichas da seção 1):

| # | Fonte | Por que | Estado |
|---|---|---|---|
| 1 | Europe PMC | Texto completo OA, preprints, citações; sem chave | OK ao vivo — [fonte](https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=dengue%20AND%20LANG%3Apor&format=json&pageSize=2) |
| 2 | ClinicalTrials.gov v2 | Ensaios por condição e raio geográfico (inclui centros no Brasil) | OK ao vivo — [fonte](https://clinicaltrials.gov/api/v2/studies?query.cond=dengue&filter.geo=distance(-15.78,-47.93,2000km)&pageSize=1) |
| 3 | CID-10 PT local + CID-11 OMS | Codificação diária de todo profissional de saúde | Arquivo local / OAuth — [fonte](https://icd.who.int/docs/icd-api/SupportedClassifications) |
| 4 | RxNorm/RxNav + RxTerms | Normalização de fármacos, classes, apresentações | OK ao vivo — [fonte](https://lhncbc.nlm.nih.gov/RxNav/TermsofService.html) |
| 5 | API Dados Abertos MS (CNES, leitos, arboviroses) | Única API oficial brasileira de saúde que respondeu sem login; português | OK ao vivo — [fonte](https://apidadosabertos.saude.gov.br/cnes/estabelecimentos?limit=2) |
| 6 | OpenAlex | Busca acadêmica ampla com filtro de idioma pt; orçamento diário | OK ao vivo — [fonte](https://help.openalex.org/how-to-use-the-api/rate-limits-and-authentication) |
| 7 | openFDA eventos adversos + DailyMed | Farmacovigilância e bulas completas (EUA) | OK ao vivo — [fonte](https://dailymed.nlm.nih.gov/dailymed/services/v2/spls.json?drug_name=metformin&pagesize=1) |
| 8 | ANVISA dados abertos (medicamentos, preços) | Registro e preço oficiais brasileiros | CSV, exige empacotar — [fonte](https://dados.anvisa.gov.br/dados/) |
| 9 | api.bncc.dev | BNCC estruturada, busca por habilidade; CC BY 4.0 | OpenAPI lida — [fonte](https://api.bncc.dev/v1/openapi.json) |
| 10 | InfoDengue + IBGE | Alerta epidemiológico municipal em português | OK ao vivo — [fonte](https://info.dengue.mat.br/api/alertcity?geocode=2304400&disease=dengue&format=json&ew_start=1&ew_end=3&ey_start=2026&ey_end=2026) |
| 11 | Wikipedia PT / Wikidata | Resumos em português; ponte de nomes pt → identificadores | OK ao vivo — [fonte](https://pt.wikipedia.org/api/rest_v1/page/summary/Dengue) |
| 12 | Open Food Facts + USDA FDC | Rótulos de industrializados BR; composição de referência | OK ao vivo — [fonte](https://world.openfoodfacts.org/api/v2/product/7894900011517.json?fields=code,product_name,brands,nutriments,nutriscore_grade,nova_group) |
| 13 | TUSS/ANS (nova API) | Códigos de procedimentos da saúde suplementar | Não testado — [fonte](https://legismap.com.br/conteudos/artigos-e-noticias/ans-lanca-ferramenta-para-consulta-a-codigos-de-procedimentos-e-medicamentos) |
| 14 | Unpaywall, DOAJ, ORCID, medRxiv, CAPES CKAN, SciELO ArticleMeta | Complementos acadêmicos | OK ao vivo — [fonte](https://doaj.org/api/search/articles/dengue?pageSize=1) |

### Inferences

Recomendação por profissão (síntese minha; "local" = dataset embutido na extensão):

- **Médicos**: (1) Europe PMC; (2) ClinicalTrials.gov; (3) CID-10 local + CID-11 OMS; (4) RxNorm + openFDA label/DailyMed (interações pela bula FDA); (5) openFDA eventos adversos; (6) CNES/leitos (MS); (7) InfoDengue; (8) TUSS/ANS e SIGTAP (local); (9) OpenAlex; (10) MedlinePlus Connect (material ao paciente, traduzido pelo modelo).
- **Enfermeiros**: (1) CNES/leitos (MS); (2) DailyMed/openFDA label (preparo/administração); (3) RxTerms (apresentações e concentrações); (4) Europe PMC; (5) InfoDengue; (6) CID-10 local; (7) SIGTAP local; (8) openFDA eventos; (9) BVS/LILACS se o usuário tiver chave; (10) Wikipedia PT.
- **Dentistas**: (1) Europe PMC; (2) openFDA label/DailyMed (anestésicos, antibióticos, interações); (3) RxNorm; (4) CID-10 local (capítulo K00–K14); (5) TUSS/ANS (odontologia); (6) SIGTAP local; (7) ClinicalTrials.gov; (8) OpenAlex; (9) CNES; (10) PubChem (materiais/compostos).
- **Psicólogos**: (1) Europe PMC; (2) OpenAlex (psicologia em português); (3) CID-11 OMS em português (capítulo 06) + CID-10 F local; (4) ClinicalTrials.gov; (5) SciELO via OpenAlex/DOAJ; (6) CNES (CAPS e rede de atenção psicossocial); (7) Unpaywall; (8) openFDA label (psicofármacos, para compreensão — não prescrição); (9) Wikipedia PT; (10) SATEPSI apenas por link (sem API).
- **Farmacêuticos**: (1) RxNorm/RxClass; (2) openFDA label + DailyMed; (3) openFDA eventos adversos; (4) ANVISA dados abertos (registro, restrições, preços) local; (5) PubChem; (6) Wikidata (ponte nome BR → DCI/ATC); (7) Europe PMC; (8) ClinicalTrials.gov; (9) VigiMed (CSV ANVISA) se pré-processado; (10) RxTerms.
- **Nutricionistas**: (1) TACO/TBCA local (verificar licença); (2) Open Food Facts (código de barras de industrializados BR); (3) USDA FDC (chave grátis; filtrar Foundation/SR Legacy); (4) Europe PMC; (5) OpenAlex; (6) ClinicalTrials.gov; (7) CID-10 local (E40–E68); (8) openFDA label (interação fármaco-nutriente); (9) IBGE (POF/SIDRA — não testado); (10) Wikipedia PT.
- **Veterinários**: (1) Europe PMC; (2) PubChem; (3) DailyMed (inclui rótulos veterinários dos EUA — não verificado); (4) openFDA (endpoint animal/veterinary de eventos — não testado); (5) Agrofit/AgroAPI (com cadastro; agrotóxicos, toxicologia); (6) OpenAlex; (7) InfoDengue/arboviroses (zoonoses, saúde única); (8) Wikidata; (9) CNES não se aplica; (10) SINDAN apenas por link.
- **Pesquisadores**: (1) OpenAlex (com chave própria); (2) Europe PMC; (3) Crossref (já integrado) + Unpaywall; (4) ClinicalTrials.gov; (5) ORCID; (6) DOAJ; (7) medRxiv/bioRxiv; (8) SciELO ArticleMeta; (9) CAPES dados abertos (teses, CSV); (10) Semantic Scholar (somente com chave; 429 sem chave); IBGE e API MS para dados secundários.
- **Professores**: (1) api.bncc.dev (habilidades, planos de aula alinhados); (2) Wikipedia PT REST; (3) Wikidata; (4) Open Library; (5) OpenAlex (artigos em pt); (6) IBGE; (7) Dicionário Aberto (limitado: verbetes antigos); (8) INEP/e-MEC/QEdu só por arquivo ou link; (9) InfoDengue/API MS como dados reais para aulas; (10) LanguageTool apenas se o usuário apontar servidor próprio (endpoint gratuito veda uso automatizado/empresarial).

Observações transversais:
- Vale priorizar, para a primeira leva, as fontes sem chave e testadas ao vivo (Europe PMC, ClinicalTrials.gov, RxNorm, DailyMed, openFDA eventos, API MS, InfoDengue, IBGE, Wikipedia/Wikidata, api.bncc.dev) e os datasets locais pequenos (CID-10, BNCC, TACO).
- Fontes com chave gratuita por usuário (OpenAlex, USDA FDC, CID-11 OMS, Semantic Scholar, BVS, AgroAPI) pedem uma tela de configuração de credenciais na extensão; não embutir segredos no pacote.
- Dependências de projetos comunitários (api.bncc.dev em beta desde 07/2026, taco-api) têm risco de continuidade; como os dados são CC BY/MIT, embutir o dataset é mais robusto que depender do endpoint.

### Gaps
- O ranking por profissão é julgamento meu a partir das fichas; não há fonte externa que o valide.
- Itens citados como "não testado/não verificado" no ranking (openFDA veterinário, rótulos veterinários no DailyMed, IBGE SIDRA/POF, licença TACO/TBCA para redistribuição comercial, API TUSS/ANS) precisam de verificação antes de entrar no roadmap.
- Não foi avaliada a qualidade/latência de cada API a partir de redes brasileiras nem o comportamento a partir de um service worker MV3 (cabeçalhos, origem `chrome-extension://`).
