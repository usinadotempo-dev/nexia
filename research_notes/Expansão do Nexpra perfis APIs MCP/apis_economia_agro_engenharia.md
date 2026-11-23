# APIs públicas gratuitas — economia/estatística, fiscal, agro, engenharia/ambiente/energia, imobiliário, veículos, comércio exterior, seguros e geodados (estado em 22/11/2026)

Convenções destas notas:
- **VERIFICADO** = a URL foi requisitada nesta pesquisa (22/11/2026), por HTTPS simples, sem chave nem login, e respondeu com dados.
- **não verificado** = não foi testado ou não foi encontrada fonte primária; tratar como hipótese.
- Os testes foram feitos por uma ferramenta de fetch que resume o corpo; o formato dos campos foi conferido, mas o corpo bruto nem sempre foi reproduzido na íntegra. Cabeçalhos HTTP (rate limit, CORS) não foram inspecionados.
- Nenhuma das APIs listadas como utilizáveis exige dado pessoal de pessoa física. As que exigem (ex.: SUSEP corretor por CPF) estão marcadas como descartadas.

## 1. Quais funcionam hoje por HTTPS simples, sem login? (fichas com URL de exemplo e formato retornado)

### Takeaway
Onze fontes responderam sem chave nem login nos testes: IBGE SIDRA, IBGE agregados v3 (inclui SINAPI por UF), IBGE malhas e nomes, BCB Olinda (Focus, taxas de juros, Pix), IPEA Data, Comex Stat, Classif/Portal Único (NCM), Calculadora da Reforma Tributária (dados abertos), ANEEL (CKAN datastore), CVM e Tesouro Transparente (CKAN), NASA POWER, Frankfurter, OpenTopoData, FIPE (parallelum e BrasilAPI). Exigem cadastro, token ou contrato: dados diários do INMET, ANA HidroWebService, Embrapa AgroAPI, MapBiomas Alerta, IBPT, UN Comtrade, SUSEP corretores; e só oferecem arquivos (sem API): ANP preços, SINAPI/Caixa, SICRO/DNIT, INPE queimadas (exportação por e-mail), CONAB.

### Cited Findings

#### A. Economia e estatística

**IBGE SIDRA (apisidra) — VERIFICADO, sem autenticação**
- Exemplo: `https://apisidra.ibge.gov.br/values/t/1737/n1/all/v/63,2266/p/last%202` retornou um array JSON; o primeiro objeto é o cabeçalho (NC, NN, MC, MN, V, D1C, D1N, D2C, D2N, D3C, D3N) e os demais são registros. Veio IPCA variação mensal de 0,82% (set/2026) e 0,14% (out/2026) e número-índice 7695,82 e 7706,59 (base dez/1993 = 100). O valor `V` vem como string. — [apisidra.ibge.gov.br](https://apisidra.ibge.gov.br/values/t/1737/n1/all/v/63,2266/p/last%202)
- Uso: IPCA/INPC por grupo e região, PIB municipal, população, produção agrícola municipal (PAM), pecuária (PPM) para contadores, peritos, avaliadores, agrônomos.

**IBGE API de agregados v3 — VERIFICADO, sem autenticação; cobre o SINAPI**
- Exemplo: `https://servicodados.ibge.gov.br/api/v3/agregados/2296/periodos/-2/variaveis/all?localidades=N3[23]` retornou 9 variáveis do SINAPI para o Ceará nos períodos 202609 e 202610: custo médio m² em moeda corrente R$ 1.885,79 e R$ 1.890,17; componente material R$ 1.136,47 e R$ 1.140,85; componente mão de obra R$ 749,32 nos dois meses; números-índice; variação no mês 0,14% e 0,23%, no ano 5,42% e 5,66%, em 12 meses 6,43% e 6,15%. — [servicodados.ibge.gov.br](https://servicodados.ibge.gov.br/api/v3/agregados/2296/periodos/-2/variaveis/all?localidades=N3[23])
- IDs das variáveis da tabela 2296: 48 (custo médio m²), 2119 (material), 2120 (mão de obra), 49/1193/1232 (números-índice), 1196/1197/1198 (variações no mês, no ano e em 12 meses). — [servicodados.ibge.gov.br](https://servicodados.ibge.gov.br/api/v3/agregados/2296/periodos/-2/variaveis/all?localidades=N3[23])
- Uso: engenheiros, arquitetos e avaliadores — custo médio de construção por m² por UF e reajuste de contratos de obra.

**IBGE malhas v3 — VERIFICADO, sem autenticação**
- Exemplo: `https://servicodados.ibge.gov.br/api/v3/malhas/municipios/2304400/metadados` retornou, para Fortaleza, nível geográfico municipal, centroide (longitude -38,528; latitude -3,7858), caixa delimitadora e área de 312,353 km². — [servicodados.ibge.gov.br](https://servicodados.ibge.gov.br/api/v3/malhas/municipios/2304400/metadados)
- Uso: obter o centroide de um município pelo código IBGE (geocodificação "cidade → lat/long" sem dado pessoal), base para consultas de clima e elevação.

**IBGE nomes (Censo) v2 — VERIFICADO, sem autenticação**
- Exemplo: `https://servicodados.ibge.gov.br/api/v2/censos/nomes/ranking?localidade=23` retornou um array com um objeto (`localidade`, `sexo`, `res`), em que `res` tem 20 entradas com `nome`, `frequencia` e `ranking`; primeira posição MARIA com frequência 967.042. — [servicodados.ibge.gov.br](https://servicodados.ibge.gov.br/api/v2/censos/nomes/ranking?localidade=23)
- Valor profissional baixo (curiosidade/RH); são estatísticas agregadas, não dado pessoal.

**BCB Olinda — Expectativas de mercado (Focus) — VERIFICADO, sem autenticação**
- Exemplo: `https://olinda.bcb.gov.br/olinda/servico/Expectativas/versao/v1/odata/ExpectativasMercadoAnuais?$top=2&$format=json&$filter=Indicador%20eq%20'IPCA'&$orderby=Data%20desc` retornou expectativas de IPCA com data 13/11/2026 e 146 respondentes: 2026 com média e mediana de 5,11% (mín. 4,75%, máx. 5,80%); 2027 com média 4,96% e mediana 5,00%. — [olinda.bcb.gov.br](https://olinda.bcb.gov.br/olinda/servico/Expectativas/versao/v1/odata/ExpectativasMercadoAnuais?$top=2&$format=json&$filter=Indicador%20eq%20'IPCA'&$orderby=Data%20desc)
- Uso: contadores e consultores financeiros — projeções de IPCA, Selic, câmbio e PIB para orçamentos e laudos.

**BCB Olinda — Taxas de juros de operações de crédito — VERIFICADO, sem autenticação**
- Exemplo: `https://olinda.bcb.gov.br/olinda/servico/taxaJuros/versao/v2/odata/TaxasJurosMensalPorMes?$top=2&$format=json&$orderby=anoMes%20desc` retornou os campos Mes, Modalidade, Posicao, InstituicaoFinanceira, TaxaJurosAoMes, TaxaJurosAoAno, cnpj8, anoMes. Primeiro registro: out/2026, "Financiamento imobiliário com taxas de mercado, prefixado", Caixa Econômica Federal, 0,87% a.m. e 10,94% a.a. — [olinda.bcb.gov.br](https://olinda.bcb.gov.br/olinda/servico/taxaJuros/versao/v2/odata/TaxasJurosMensalPorMes?$top=2&$format=json&$orderby=anoMes%20desc)
- Uso: corretores de imóveis (comparar taxa de financiamento imobiliário por banco), contadores e peritos (taxa média de mercado em revisionais).

**BCB Olinda — Estatísticas do Pix por município — VERIFICADO, sem autenticação**
- Exemplo: `https://olinda.bcb.gov.br/olinda/servico/Pix_DadosAbertos/versao/v1/odata/TransacoesPixPorMunicipio(DataBase=@DataBase)?@DataBase='202610'&$top=1&$format=json` retornou 19 campos (AnoMes, Municipio_Ibge, Municipio, Estado, Regiao, VL_/QT_ por pagador e recebedor PF/PJ, QT_PES_*). — [olinda.bcb.gov.br](https://olinda.bcb.gov.br/olinda/servico/Pix_DadosAbertos/versao/v1/odata/TransacoesPixPorMunicipio(DataBase=@DataBase)?@DataBase='202610'&$top=1&$format=json)
- Dados agregados por município (sem dado pessoal). Valor médio: estudos de mercado local.

**IPEA Data (OData v4) — VERIFICADO, sem autenticação**
- Exemplo: `https://www.ipeadata.gov.br/api/odata4/ValoresSerie(SERCODIGO='PRECOS12_IPCA12')?$top=2` retornou JSON OData (`@odata.context` apontando para `Ipeadata.OData4.Models.Valor`) com campos SERCODIGO, VALDATA, VALVALOR, NIVNOME, TERCODIGO; a série mensal vai de dez/1979 a out/2026. — [ipeadata.gov.br](https://www.ipeadata.gov.br/api/odata4/ValoresSerie(SERCODIGO='PRECOS12_IPCA12')?$top=2)
- Observação: o parâmetro `$top=2` não limitou a resposta (veio a série inteira), então respostas podem ser grandes. — [ipeadata.gov.br](https://www.ipeadata.gov.br/api/odata4/ValoresSerie(SERCODIGO='PRECOS12_IPCA12')?$top=2)
- Uso: séries longas que agregam fontes de terceiros (FGV, ANP, etc.) num só formato.

#### B. Tributário e fiscal

**Calculadora de Tributos da Reforma Tributária (CBS/IBS/IS) — Receita Federal — VERIFICADO (dados abertos), sem autenticação**
- Exemplo 1: `https://piloto-cbs.tributos.gov.br/servico/calculadora-consumo/api/calculadora/dados-abertos/ufs` retornou JSON com 28 entradas (`codigo`, `nome`, `sigla`), 27 UFs mais "EXTERIOR". — [piloto-cbs.tributos.gov.br](https://piloto-cbs.tributos.gov.br/servico/calculadora-consumo/api/calculadora/dados-abertos/ufs)
- Exemplo 2: `https://consumo.tributos.gov.br/servico/calcular-tributos-consumo/api/calculadora/dados-abertos/ncm?ncm=10063021&data=2026-11-01` retornou `{"capitulo":"Cereais.","item":"Não parboilizado","posicao":"Arroz.","subitem":"Polido ou brunido","subposicao":"Arroz semibranqueado ou branqueado...","temAliquotaAdRem":false,"temAliquotaAdValorem":false,"tributadoPeloImpostoSeletivo":false}`. — [consumo.tributos.gov.br](https://consumo.tributos.gov.br/servico/calcular-tributos-consumo/api/calculadora/dados-abertos/ncm?ncm=10063021&data=2026-11-01)
- Um cliente Python não oficial (rfbcalc) documenta, na base `https://piloto-cbs.tributos.gov.br/servico/calculadora-consumo/api`, os endpoints `POST /calculadora/regime-geral`, `POST /calculadora/base-calculo/cbs-ibs-mercadorias`, `POST /calculadora/base-calculo/is-mercadorias` e `GET /calculadora/dados-abertos/versao`, e afirma que não era exigida chave de API em 09/2026; erros vêm em RFC 7807 `problem+json`. Exemplo de corpo do `regime-geral`: `{"id":"op-001","versao":"1.0.0","dhFatoGerador":"2026-01-15T10:00:00-03:00","municipio":3550308,"itens":[{"numero":1,"cst":"000","cClassTrib":"000001","baseCalculo":"1000.00"}]}`. — [PyPI rfbcalc](https://pypi.org/project/rfbcalc/)
- A Receita descreve a calculadora (beta desde 18/07/2025) como aberta, gratuita e de código aberto, e também distribuída para execução local/offline. — [Sefin-RO, reproduzindo a Receita](https://reformatributaria.sefin.ro.gov.br/noticias/receita-federal-libera-ferramenta-oficial-de-calculo-da-reforma-tributaria-sobre-o-consumo)
- Atenção: as APIs de **apuração** da CBS (Portal do Piloto, "Gerar credencial para API") exigem autenticação gov.br e credenciais; não confundir com a calculadora. — [Manual Plataforma CBS, maio/2026](https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes/manuais/reforma-tributaria-do-consumo/manual-plataforma-cbs-21-maio-2026-07h40.pdf/@@download/file)
- Uso: contadores — simular CBS/IBS/Imposto Seletivo por NCM, cClassTrib e município; é o motor de cálculo oficial.

**IBPT — De Olho no Imposto — exige cadastro e token vinculado a CNPJ; gratuidade não confirmada**
- A integração por API exige cadastro no IBPT e token de autenticação; um guia de integração diz que o token deve estar vinculado ao CNPJ da aplicação. — [nfe.io](https://nfe.io/blog/gestao-empresarial/ibpt-o-que-e-o-indice-e-como-ele-impacta-a-tributacao-das-empresas/); [Webmania](https://ajuda.webmania.com.br/pt-BR/articles/12680832-o-que-e-ibpt-de-olho-no-imposto)
- Há um projeto comunitário que publica a tabela IBPT em JSON via CDN (não oficial). — [github.com/nfe/ibpt](https://www.github.com/nfe/ibpt)

#### C. Clima

**NASA POWER — VERIFICADO, sem autenticação**
- Exemplo: `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=PRECTOTCORR,T2M_MAX&community=AG&longitude=-38.54&latitude=-3.72&start=20260101&end=20260105&format=JSON` retornou GeoJSON `Feature` com `properties.parameter.PRECTOTCORR` (mm/dia, chaveado por AAAAMMDD: 0,25; 0,13; 0,05; 0,15; 0,11) e `T2M_MAX` (°C); cabeçalho informa API v2.10.5, fontes MERRA2 e POWER, `fill_value` -999, padrão de tempo LST. — [power.larc.nasa.gov](https://power.larc.nasa.gov/api/temporal/daily/point?parameters=PRECTOTCORR,T2M_MAX&community=AG&longitude=-38.54&latitude=-3.72&start=20260101&end=20260105&format=JSON)
- A página de referência do POWER pede citação (serviço, versão e data de acesso) e não declara licença, restrição comercial nem limite de requisições. — [POWER Referencing](https://power.larc.nasa.gov/docs/referencing/)
- A documentação da API lista HTTP 429 (Too Many Requests) como erro possível, sem números. — [POWER API docs](https://power.larc.nasa.gov/docs/services/api/)

**INMET (apitempo) — catálogo de estações VERIFICADO sem token; dados diários NÃO responderam sem token**
- `https://apitempo.inmet.gov.br/estacoes/T` retornou JSON (cerca de 260 mil caracteres) com estações automáticas: nome, UF, operador, código, latitude/longitude, altitude, situação ("Operante"/"Pane"), datas de início e fim. — [apitempo.inmet.gov.br](https://apitempo.inmet.gov.br/estacoes/T)
- `https://apitempo.inmet.gov.br/estacao/diaria/2026-01-01/2026-01-05/A305` (rota antiga, sem token) retornou HTTP 404. — [apitempo.inmet.gov.br](https://apitempo.inmet.gov.br/estacao/diaria/2026-01-01/2026-01-05/A305)
- O README do pacote INMET.jl afirma que a API do INMET exige token, solicitado por e-mail a cadastro.act@inmet.gov.br. — [JuliaClimate/INMET.jl](https://github.com/JuliaClimate/INMET.jl)

**ANA HidroWebService — exige identificador e senha**
- O HidroWebService foi disponibilizado em março/2023 para substituir o Telemetria1WS, com Swagger em `ana.gov.br/hidrowebservice/swagger-ui/index.html`. — [ANA, manuais de sistemas](https://www.gov.br/ana/pt-br/assuntos/monitoramento-e-eventos-criticos/monitoramento-hidrologico/orientacoes-manuais/manuais-de-sistemas-e-servicos-de-disponibilizacao-de-dados-hidrologicos)
- Um adaptador R de terceiros usa a rota `EstacoesTelemetricas/OAUth/v1` com cabeçalhos de identificador e senha, seguidos de token bearer. — [hydrodownloadR](https://rdrr.io/cran/hydrodownloadR/src/R/adapter_BR_ANA.R)

**Open-Meteo (referência do que se quer substituir)**
- O plano gratuito é restrito a uso não comercial (menos de 10.000 chamadas/dia, 5.000/hora, 600/minuto); sites com assinatura ou anúncios e produtos comerciais contam como uso comercial; os dados são CC BY 4.0; há planos pagos Standard (1 milhão de chamadas/mês), Professional (5 milhões) e Enterprise. — [Open-Meteo Terms](https://open-meteo.com/en/terms)

#### D. Energia e combustíveis

**ANEEL dados abertos (CKAN + datastore) — VERIFICADO, sem autenticação**
- `https://dadosabertos.aneel.gov.br/api/3/action/package_search?q=bandeiras&rows=3` retornou `success: true` com o conjunto `bandeiras-tarifarias`, licença ODbL, e três recursos CSV com `datastore_active: true` (Adicional, Acionamento, Conta Bandeira). — [dadosabertos.aneel.gov.br](https://dadosabertos.aneel.gov.br/api/3/action/package_search?q=bandeiras&rows=3)
- `https://dadosabertos.aneel.gov.br/api/3/action/datastore_search?resource_id=0591b8f6-fe54-437b-b72b-1aa2efd46e42&limit=2&sort=DatCompetencia%20desc` retornou campos `DatGeracaoConjuntoDados`, `DatCompetencia`, `NomBandeiraAcionada`, `VlrAdicionalBandeira`; bandeira Verde em 2026-11-01 e 2026-10-01. Os valores vêm com vírgula decimal como string (",00"). — [dadosabertos.aneel.gov.br](https://dadosabertos.aneel.gov.br/api/3/action/datastore_search?resource_id=0591b8f6-fe54-437b-b72b-1aa2efd46e42&limit=2&sort=DatCompetencia%20desc)
- Uso: engenheiros eletricistas e contadores — bandeira tarifária vigente e, pelo mesmo mecanismo, tarifas homologadas por distribuidora (conjunto de tarifas: não verificado nesta sessão).

**ANP — preços de combustíveis — somente arquivos**
- A série histórica é distribuída em CSV/ZIP, sem API; exemplos: `.../arquivos/shpc/dsas/ca/ca-2026-01.zip` (combustíveis automotivos, 1º semestre de 2026) e `.../arquivos/shpc/dsan/2026/10-gasolina-etanol.csv` (outubro/2026); a pesquisa é semanal e a página foi atualizada em 13/11/2026. — [ANP série histórica](https://www.gov.br/anp/pt-br/centrais-de-conteudo/dados-abertos/serie-historica-de-precos-de-combustiveis)

#### E. Agronegócio e ambiente

**Embrapa AgroAPI — exige cadastro e token; planos gratuitos limitados**
- Agrofit e Agrotermos têm plano gratuito de 100 mil requisições por mês; acima disso, contato com agroapi@embrapa.br. — [AgroAPI Agrofit (PDF)](https://www.agroapi.cnptia.embrapa.br/portal/assets/docs/agrofit.pdf)
- Agritec e ClimAPI têm plano gratuito de 1.000 requisições válido por um mês (o acesso é interrompido ao fim do mês ou das 1.000 requisições); o plano pago do Agritec é de 10 mil requisições/mês por R$ 250,00, com R$ 1,50 a cada 100 excedentes. — [AgroAPI Agritec (PDF)](https://www.agroapi.cnptia.embrapa.br/portal/assets/docs/agritec.pdf); [AgroAPI ClimAPI (PDF)](https://www.agroapi.cnptia.embrapa.br/portal/assets/docs/climapi.pdf)
- Divergência: uma notícia descreve 20 mil requisições por R$ 250,00 no Agritec, contra 10 mil no PDF da plataforma. — [Convergência Digital](https://convergenciadigital.com.br/telecom/embrapa-abre-plataforma-de-apis-para-solues-tecnolgicas-no-campo/)
- O acesso é máquina a máquina mediante token individual. — [PwC AgTech, 2022](https://www.pwc.com.br/pt/consultoria/agtech-innovation/agtech-innovation-news/materias/2022/embrapa-lanca-a-climapi-plataforma-de-dados-agrometeorologicos-para-uso-em-solucoes-digitais.html)

**MapBiomas Alerta — GraphQL, exige conta e token Bearer**
- Endpoint `https://plataforma.alerta.mapbiomas.org/api/v2/graphql`; consultas protegidas exigem token Bearer obtido pela mutation SignIn com uma conta da plataforma validada por e-mail; não há acesso por conta de serviço. — [API MapBiomas Alerta](https://plataforma.alerta.mapbiomas.org/api/docs/index.html)
- O MapBiomas declara que os dados produzidos são públicos e gratuitos. — [MapBiomas Alerta, equipe](https://alerta.mapbiomas.org/en/team)
- Existe um GeoServer próprio com serviços WFS 1.0.0, 1.1.0 e 2.0.0. — [geoserver.alerta.mapbiomas.org](https://geoserver.alerta.mapbiomas.org/)

**INPE Queimadas (BDQueimadas) — sem API documentada**
- A página oferece exportação manual (CSV, GeoJSON, KML, Shapefile) condicionada a informar um e-mail para envio dos dados; não descreve API, licença nem limites. — [BDQueimadas](https://terrabrasilis.dpi.inpe.br/queimadas/bdqueimadas/)

**CONAB — sem API pública confirmada**
- A atualização do Portal de Informações da Conab previa "integração por APIs em uma próxima etapa", ou seja, a API não estava disponível na data da notícia. — [Canal Rural](https://www.canalrural.com.br/agricultura/conab-atualiza-portal-e-reune-dados-corporativos-e-paineis-em-um-so-ambiente/)
- A página de dados abertos da CONAB lista Preços Agropecuários, Safras, Quadro de Oferta e Demanda, Custos de Produção e PROHORT. — [CONAB dados abertos](https://www.gov.br/conab/pt-br/acesso-a-informacao/dados-abertos)

#### F. Veículos

**Tabela FIPE — parallelum — VERIFICADO, sem autenticação**
- `https://parallelum.com.br/fipe/api/v1/carros/marcas` retornou array JSON de objetos `{"codigo","nome"}` (ex.: `{"codigo":"4","nome":"AM Gen"}`). — [parallelum.com.br](https://parallelum.com.br/fipe/api/v1/carros/marcas)

**Tabela FIPE — BrasilAPI — VERIFICADO, sem autenticação**
- `https://brasilapi.com.br/api/fipe/marcas/v1/carros` retornou array JSON de objetos `{"nome","valor"}` (ex.: `{"nome":"Acura","valor":"1"}`). — [brasilapi.com.br](https://brasilapi.com.br/api/fipe/marcas/v1/carros)
- Uso: corretores de seguros e contadores — valor de referência de veículo por marca/modelo/ano (consulta por modelo, não por placa, portanto sem dado pessoal).

#### G. Comércio exterior

**Comex Stat (MDIC) — VERIFICADO, sem autenticação**
- A especificação OpenAPI lista `POST /general`, `POST /cities`, `POST /historical-data/`, endpoints GET de filtros/detalhes/métricas/datas e tabelas auxiliares (`/tables/ncm`, `/tables/countries`, `/tables/uf`, `/tables/urf`, `/tables/ways`, `/tables/hs`, entre outras); não declara autenticação nem limite numérico, apenas que a API "possui as mesmas limitações das telas de consulta do ComexStat" e que consultas muito grandes devem usar os arquivos de dados abertos. — [Comex Stat doc.yaml](https://api-comexstat.mdic.gov.br/docs/doc.yaml)
- Exemplo de corpo documentado para `POST /general`: `{"flow":"import","monthDetail":true,"period":{"from":"2023-01","to":"2023-10"},"filters":[{"filter":"country","values":[104,107]},{"filter":"state","values":[26]}],"details":["country","state","ncm"],"metrics":["metricFOB","metricKG","metricStatistic","metricFreight","metricInsurance","metricCIF"]}`. — [Comex Stat doc.yaml](https://api-comexstat.mdic.gov.br/docs/doc.yaml)
- Teste: um GET no formato antigo `https://api-comexstat.mdic.gov.br/general?filter={...}` (ano 2025, métrica FOB) retornou `{"data":{"list":[{"coAno":"2025","vlFob":"348278462500"}]},"success":true,"message":null,"processo_info":null,"language":"pt"}`. — [api-comexstat.mdic.gov.br](https://api-comexstat.mdic.gov.br/general?filter=%7B%22yearStart%22:%222025%22,%22yearEnd%22:%222025%22,%22typeForm%22:1,%22typeOrder%22:1,%22filterList%22:%5B%5D,%22filterArray%22:%5B%5D,%22rangeFilter%22:%5B%5D,%22detailDatabase%22:%5B%5D,%22monthDetail%22:false,%22metricFOB%22:true,%22metricKG%22:false,%22metricStatistic%22:false,%22monthStart%22:%2201%22,%22monthEnd%22:%2212%22,%22formQueue%22:%22general%22,%22langDefault%22:%22pt%22%7D)
- Uso: despachantes aduaneiros e consultores — exportação/importação por NCM, país, UF, município, via e URF.

**Portal Único Siscomex — Classif (NCM oficial) — VERIFICADO, sem autenticação**
- `https://portalunico.siscomex.gov.br/classif/api/publico/nomenclatura/download/json` retornou JSON (cerca de 3,1 milhões de caracteres) com `Data_Ultima_Atualizacao_NCM` ("Vigente em 22/11/2026"), `Ato` ("Resolução Gecex nº 926/2026") e o array `Nomenclaturas` (campos Codigo, Descricao, Data_Inicio, Data_Fim, Tipo_Ato_Ini, Numero_Ato_Ini, Ano_Ato_Ini). — [portalunico.siscomex.gov.br](https://portalunico.siscomex.gov.br/classif/api/publico/nomenclatura/download/json)
- A documentação do Portal Único agrupa sob o menu "API - Pública" os serviços Tratamento Administrativo e LPCO, Classificação Fiscal de Mercadoria, Cadastro de Atributos e Tabelas Comex, mas a página inicial não define o que o rótulo significa em termos de autenticação. — [docs.portalunico.siscomex.gov.br](https://docs.portalunico.siscomex.gov.br/)

**Frankfurter (câmbio de referência do BCE) — VERIFICADO, sem autenticação**
- `https://api.frankfurter.dev/v1/latest?base=USD&symbols=BRL,EUR` retornou `{"amount":1.0,"base":"USD","date":"2026-11-20","rates":{"BRL":5.938,"EUR":0.90992}}`. — [api.frankfurter.dev](https://api.frankfurter.dev/v1/latest?base=USD&symbols=BRL,EUR)

**UN Comtrade — exige chave de assinatura**
- O portal de desenvolvedor foi migrado para o site do UN Comtrade; as chaves de assinatura passam a ser geridas na página "My API portal", os endpoints não mudaram e as chaves existentes continuam válidas. — [comtradedeveloper.un.org](https://comtradedeveloper.un.org/)

#### H. Seguros e mercado de capitais

**CVM dados abertos (CKAN) — VERIFICADO, sem autenticação**
- `https://dados.cvm.gov.br/api/3/action/package_list` retornou `success: true` com 54 conjuntos (ex.: `cia_aberta-cad`, `cia_aberta-doc-dfp`, `adm_fii-cad`, `agente_auton-cad`, `auditor-cad`). — [dados.cvm.gov.br](https://dados.cvm.gov.br/api/3/action/package_list)

**Tesouro Transparente (CKAN) — VERIFICADO, sem autenticação; dados em CSV**
- `package_show?id=taxas-dos-titulos-ofertados-pelo-tesouro-direto` retornou `success: true`, licença ODbL e um recurso CSV em `.../download/precotaxatesourodireto.csv`. — [tesourotransparente.gov.br](https://www.tesourotransparente.gov.br/ckan/api/3/action/package_show?id=taxas-dos-titulos-ofertados-pelo-tesouro-direto)

**SUSEP — consulta de corretores — DESCARTAR (CPF + token)**
- A API de corretores da SUSEP oferece só duas consultas: uma por CPF do corretor e um download em massa (zip com todos os corretores), ambas com token Bearer obtido por autenticação, hospedadas em www2.susep.gov.br sob `safe/corretoresapig`. — [SUSEP, instruções da API de corretores](https://www.gov.br/susep/pt-br/arquivos/arquivos-licenciamento/corretor-de-seguros/empresa-consulta-api-corretores-instrucoes.pdf/@@download/file)

#### I. Geodados

**OpenTopoData (elevação) — VERIFICADO, sem autenticação**
- `https://api.opentopodata.org/v1/srtm90m?locations=-3.72,-38.54` retornou status "OK" com um resultado do conjunto `srtm90m` e elevação 19,0. — [api.opentopodata.org](https://api.opentopodata.org/v1/srtm90m?locations=-3.72,-38.54)
- A documentação descreve a API pública como disponível "for testing". — [opentopodata.org/api](https://www.opentopodata.org/api/)

**Nominatim (OSM) — política de uso restritiva**
- Máximo absoluto de 1 requisição por segundo, contado por aplicação (soma de todos os usuários); exige User-Agent ou Referer que identifique a aplicação; autocomplete é proibido; geocodificação em massa é desencorajada; o acesso pode ser retirado sem aviso; serviços cuja função principal é geocodificar devem ter instância própria; dados sob ODbL com atribuição. — [Nominatim Usage Policy](https://operations.osmfoundation.org/policies/nominatim/)
- A política diz que LLMs só podem sugerir o serviço se exibirem com destaque o link da política e explicarem as restrições, e que a API pública não deve ser embutida em plataformas no-code/low-code como serviço genérico de geocodificação. — [Nominatim Usage Policy](https://operations.osmfoundation.org/policies/nominatim/)

### Inferences
- As APIs governamentais brasileiras baseadas em plataformas padronizadas (Olinda/OData do BCB, CKAN da ANEEL/CVM/Tesouro, servicodados do IBGE) são as mais seguras para uma extensão sem backend: não pedem chave, devolvem JSON e têm licença de dados abertos declarada (ODbL nos casos ANEEL e Tesouro).
- A Calculadora da Reforma Tributária respondeu em dois hosts diferentes (`piloto-cbs.tributos.gov.br` e `consumo.tributos.gov.br`). O piloto tem data de término prevista para 31/12/2026, então o host `piloto-cbs` pode ser descontinuado; convém tornar a base URL configurável e preferir `consumo.tributos.gov.br`.
- O Nominatim é inadequado como ferramenta chamada por IA em produto comercial com muitos usuários: o limite de 1 req/s vale para a aplicação inteira e a política trata explicitamente de uso por LLMs. Para "cidade → coordenada", o centroide das malhas do IBGE resolve sem restrição.
- O OpenTopoData público, descrito como "para teste", não deve ser dependência crítica; serve como recurso opcional.
- Para FIPE, as duas rotas são wrappers não oficiais de terceiros; a FIPE não tem API oficial conhecida. Risco de estabilidade e de termos fica com o wrapper.
- O `$top` do IPEA Data aparentemente não é respeitado em `ValoresSerie(...)`; o service worker precisa cortar a resposta antes de entregá-la ao modelo.

### Gaps
- Limites de requisição do IBGE (SIDRA e servicodados), BCB Olinda, IPEA, Comex Stat, ANEEL e CVM: não encontrados em fonte primária — **não verificado**.
- Termos de uso/licença explícitos do IBGE, BCB Olinda, IPEA, Comex Stat e Portal Único para uso comercial: não localizados nesta sessão — **não verificado** (são dados públicos governamentais, mas a cláusula não foi lida).
- Portal Único: não foi possível ler as páginas "Autenticação", "Chaves de Acesso" e "Limites de Acesso" (o fetch só trouxe o menu). Se Tratamento Administrativo e Atributos funcionam sem certificado — **não verificado**; só o download de NCM do Classif foi confirmado.
- Endpoints `POST` da Calculadora RTC (`regime-geral`) e do Comex Stat (`POST /general`): não testados (a ferramenta só faz GET); a fonte do `regime-geral` é um cliente não oficial.
- IBPT: gratuidade do token e base URL atual — **não verificado**; um relato de fórum cita `https://apidoni.ibpt.org.br/api/v1/produtos` com erro de SSL.
- Embrapa AgroAPI: mecanismo exato de autenticação (OAuth2 client credentials) e cobertura do ZARC dentro do Agritec — **não verificado** (o PDF não pôde ser lido como texto).
- Meteostat: a página de documentação da API retornou 404; termos e acesso — **não verificado**.
- Não pesquisados por limite de tempo (todos **não verificado**): ANTT (RNTRC, piso mínimo de frete), SENATRAN, Correios, ANAC, ANATEL, ONS, ANM, IBAMA, ICMBio, SICAR, SIGEF/INCRA, CEMADEN, CPTEC, CEPEA, B3, FGV, FipeZap, SECOVI, ONR, ANBIMA, WITS/WTO, Overpass, Open-Elevation, CBO/MTE, tabelas eSocial, CFOP/CST/CEST, Simples Nacional, SEFAZ NF-e, tabelas de INSS/IRRF/salário mínimo, Calculadora do Cidadão, séries IVG-R/MVG-R no SGS.

## 2. Melhor substituto comercialmente seguro para o Open-Meteo (chuva diária histórica por cidade brasileira): INMET x NASA POWER x ANA

### Takeaway
O NASA POWER é o único dos três que respondeu com chuva diária por coordenada sem chave, sem cadastro e sem login; INMET (dados diários) e ANA exigem token/credencial obtidos por cadastro. A ressalva é dupla: a cláusula de licença/uso comercial do POWER não foi localizada em fonte primária nesta sessão, e o POWER é dado de reanálise em grade (não medição de estação), o que limita o uso em laudos.

### Cited Findings
- NASA POWER devolveu `PRECTOTCORR` em mm/dia e `T2M_MAX` para Fortaleza (lat -3,72; long -38,54) de 01 a 05/01/2026 sem qualquer credencial; fontes declaradas no cabeçalho: MERRA2 e POWER. — [power.larc.nasa.gov](https://power.larc.nasa.gov/api/temporal/daily/point?parameters=PRECTOTCORR,T2M_MAX&community=AG&longitude=-38.54&latitude=-3.72&start=20260101&end=20260105&format=JSON)
- O POWER exige apenas citação (serviço, versão, data de acesso) na página de referência, que não menciona licença, restrição comercial nem limites. — [POWER Referencing](https://power.larc.nasa.gov/docs/referencing/)
- A API do POWER pode devolver HTTP 429; os limites numéricos não estão na página. — [POWER API docs](https://power.larc.nasa.gov/docs/services/api/)
- INMET: a lista de estações é aberta, mas a rota de dados diários sem token retornou 404. — [apitempo estações](https://apitempo.inmet.gov.br/estacoes/T); [apitempo diária](https://apitempo.inmet.gov.br/estacao/diaria/2026-01-01/2026-01-05/A305)
- INMET: o token é solicitado por e-mail a cadastro.act@inmet.gov.br, segundo o README do INMET.jl. — [JuliaClimate/INMET.jl](https://github.com/JuliaClimate/INMET.jl)
- INMET: um scraper Python registra que, por volta de maio/2022, o INMET limitou o período de busca a no máximo 6 meses por requisição. — [Felipeandradee/INMET-API-REST](https://github.com/Felipeandradee/INMET-API-REST)
- INMET declara que os dados de estações são gratuitos e de acesso público. — [Portal INMET](https://portal.inmet.gov.br/noticias/saiba-como-acessar-os-dados-meteorol%C3%B3gicos-dispon%C3%ADveis-no-site-do-inmet)
- ANA: o HidroWebService (desde março/2023) usa autenticação por identificador e senha seguida de token bearer, conforme adaptador de terceiros. — [ANA manuais](https://www.gov.br/ana/pt-br/assuntos/monitoramento-e-eventos-criticos/monitoramento-hidrologico/orientacoes-manuais/manuais-de-sistemas-e-servicos-de-disponibilizacao-de-dados-hidrologicos); [hydrodownloadR](https://rdrr.io/cran/hydrodownloadR/src/R/adapter_BR_ANA.R)
- Open-Meteo: o plano gratuito é só não comercial e os dados são CC BY 4.0; existe plano pago a partir de 1 milhão de chamadas/mês. — [Open-Meteo Terms](https://open-meteo.com/en/terms)

### Inferences
- Recomendação: **NASA POWER como padrão**, com latitude/longitude obtidas do centroide do município nas malhas do IBGE (ambos sem chave e sem dado pessoal). Fluxo: nome da cidade → código IBGE (já integrado) → `/api/v3/malhas/municipios/{id}/metadados` → POWER.
- INMET como **fonte opcional de dado medido**: o usuário (ou o produto) pede o token por e-mail e o configura; a lista de estações aberta permite achar a estação mais próxima. Um token único embutido na extensão ficaria exposto, o que é um problema num produto sem backend.
- ANA é a fonte mais densa em pluviômetros, mas a exigência de identificador/senha a torna a opção de maior atrito.
- Os valores do POWER no teste (0,05 a 0,25 mm/dia em Fortaleza em janeiro) são suavizados por célula de grade; para perícia, seguro agrícola ou laudo de engenharia, o texto gerado pelo modelo deve dizer que é estimativa por reanálise/satélite e não medição local.
- Alternativa de menor risco jurídico se o POWER não bastar: contratar o plano pago do Open-Meteo, que já está integrado (custo não levantado).

### Gaps
- Política de dados do NASA POWER permitindo uso comercial sem restrição: é o entendimento corrente sobre dados da NASA, mas a cláusula **não foi localizada em fonte primária nesta sessão — não verificado**. Verificar as páginas "Data Services"/"Methodology" do POWER antes de afirmar no produto.
- Resolução espacial da precipitação do POWER e latência dos dados: **não verificado**.
- Formato atual da rota do INMET com token (`/token/estacao/diaria/...`) e termos de uso do token (uso comercial, redistribuição): **não verificado**.
- Swagger da ANA não pôde ser lido (página renderizada por JavaScript); nomes dos endpoints de chuva e processo de cadastro: **não verificado**.
- Meteostat e CEMADEN: **não verificado**.

## 3. Existe fonte oficial programática para custos de construção SINAPI / CUB / SICRO?

### Takeaway
Só parcialmente: o IBGE expõe por API (sem chave) os **índices e o custo médio por m² do SINAPI por UF**, mas as **tabelas de preços de insumos e composições** (Caixa) e o **SICRO** (DNIT) são publicados apenas como arquivos para download. Não foi encontrada API oficial de CUB/Sinduscon.

### Cited Findings
- A tabela 2296 do IBGE (agregados v3) devolve, por UF e mês, custo médio do m² total, componente material e componente mão de obra em reais, números-índice e variações no mês, no ano e em 12 meses; teste para o Ceará trouxe R$ 1.890,17/m² em out/2026. — [servicodados.ibge.gov.br](https://servicodados.ibge.gov.br/api/v3/agregados/2296/periodos/-2/variaveis/all?localidades=N3[23])
- O IBGE coleta e processa os dados do SINAPI; a Caixa responde pela base de engenharia e pela distribuição. — [IBGE, SINAPI](https://www.ibge.gov.br/estatisticas/economicas/precos-e-custos/9270-indice-nacional-da-construcao-civil.html)
- A Caixa publica os relatórios do SINAPI como planilhas: Relatório de Famílias e Coeficientes, de Manutenções, de Percentual de Mão de Obra em Composições e de Insumos e Composições (todas as UF); a partir de 2025 em novo formato mensal. — [Caixa SINAPI](https://www.caixa.gov.br/poder-publico/modernizacao-gestao/sinapi/Paginas/default.aspx)
- Uma apresentação da Caixa de junho/2025 descreve a publicação em apenas 2 arquivos (Pacote.XLSX e Pacote.ZIP), com volume mensal reduzido de cerca de 1 GB para cerca de 75 MB, e observa que preço em branco para um estado significa que não houve coleta mínima no mês. — [Transferegov, apresentação SINAPI](https://www.gov.br/transferegov/pt-br/noticias/eventos/fntu/x-fntu/apresentacoes/evento-016-sinapi-a-referencia-para-o-seu-orcamento-de-obra.pdf)
- O DNIT mantém uma página "Relatórios SICRO" em Custos Referenciais; o Informativo SICRO 01/2026 (03/07/2026) atualiza o sistema até a referência de abril/2026. — [DNIT Relatórios SICRO](https://www.gov.br/dnit/pt-br/assuntos/planejamento-e-pesquisa/custos-referenciais/sistemas-de-custos/sicro/relatorios/relatorios-sicro); [Informativo SICRO 01/2026](https://www.gov.br/dnit/pt-br/assuntos/planejamento-e-pesquisa/custos-referenciais/sistemas-de-custos/sicro/informativos/informativo-sicro-no-01-2026.pdf)

### Inferences
- Para o Nexpra, a ferramenta viável hoje é "custo médio SINAPI por m² e variação por UF" via IBGE; atende reajuste de contrato, estimativa paramétrica e laudos de avaliação, mas não orçamento analítico por composição.
- O pacote mensal de cerca de 75 MB da Caixa é grande demais para ser baixado e interpretado por um service worker a cada consulta; consultar composições/insumos exigiria um índice pré-processado (hospedado por terceiros ou pelo próprio produto), o que foge do modelo "sem backend".
- SICRO segue a mesma lógica (arquivos por UF e data-base), sem alternativa programática oficial identificada.

### Gaps
- CUB/Sinduscon (CBIC): não pesquisado nesta sessão; existência de API — **não verificado**. Não encontrei fonte confiável indicando API oficial.
- URLs estáveis dos pacotes mensais da Caixa e declaração de licença: **não verificado**.
- Conjunto SICRO no portal de dados abertos do DNIT: o resultado da busca não mostrou datasets nem endpoints — **não verificado**.
- INCC (FGV) já vem pelo SGS do BCB; não reavaliado.

## 4. Top 10 por valor (contadores, engenheiros/arquitetos, imobiliário, agro, comércio exterior)

### Takeaway
As dez integrações de maior valor e menor atrito são todas sem chave e verificadas nesta sessão, com exceção da Embrapa AgroAPI (cadastro e cota gratuita pequena). A ordem abaixo pondera valor profissional, ausência de autenticação e licença declarada.

### Cited Findings
1. **Calculadora da Reforma Tributária (CBS/IBS/IS)** — contadores. Dados abertos por NCM e UF responderam sem chave; motor de cálculo oficial, aberto e gratuito. — [consumo.tributos.gov.br](https://consumo.tributos.gov.br/servico/calcular-tributos-consumo/api/calculadora/dados-abertos/ncm?ncm=10063021&data=2026-11-01); [Sefin-RO](https://reformatributaria.sefin.ro.gov.br/noticias/receita-federal-libera-ferramenta-oficial-de-calculo-da-reforma-tributaria-sobre-o-consumo)
2. **IBGE SIDRA + agregados v3** — todos os perfis. IPCA/INPC e SINAPI por UF responderam sem chave. — [apisidra](https://apisidra.ibge.gov.br/values/t/1737/n1/all/v/63,2266/p/last%202); [agregados 2296](https://servicodados.ibge.gov.br/api/v3/agregados/2296/periodos/-2/variaveis/all?localidades=N3[23])
3. **Comex Stat** — comércio exterior. Consultas por NCM, país, UF, município e URF, sem autenticação declarada. — [doc.yaml](https://api-comexstat.mdic.gov.br/docs/doc.yaml)
4. **BCB Olinda — taxas de juros por instituição e modalidade** — imobiliário e contadores. Inclui financiamento imobiliário por banco. — [olinda taxaJuros](https://olinda.bcb.gov.br/olinda/servico/taxaJuros/versao/v2/odata/TaxasJurosMensalPorMes?$top=2&$format=json&$orderby=anoMes%20desc)
5. **NASA POWER** — agro e engenharia. Chuva e temperatura diárias por coordenada, sem chave. — [power.larc.nasa.gov](https://power.larc.nasa.gov/api/temporal/daily/point?parameters=PRECTOTCORR,T2M_MAX&community=AG&longitude=-38.54&latitude=-3.72&start=20260101&end=20260105&format=JSON)
6. **BCB Olinda — Expectativas Focus** — contadores e consultores. — [olinda Expectativas](https://olinda.bcb.gov.br/olinda/servico/Expectativas/versao/v1/odata/ExpectativasMercadoAnuais?$top=2&$format=json&$filter=Indicador%20eq%20'IPCA'&$orderby=Data%20desc)
7. **Portal Único — Classif (NCM vigente com ato legal)** — comércio exterior e fiscal. Arquivo JSON único de cerca de 3,1 MB. — [portalunico classif](https://portalunico.siscomex.gov.br/classif/api/publico/nomenclatura/download/json)
8. **ANEEL dados abertos** — engenharia elétrica e contadores. Bandeiras tarifárias por datastore, licença ODbL. — [ANEEL datastore](https://dadosabertos.aneel.gov.br/api/3/action/datastore_search?resource_id=0591b8f6-fe54-437b-b72b-1aa2efd46e42&limit=2&sort=DatCompetencia%20desc)
9. **Tabela FIPE (BrasilAPI / parallelum)** — seguros e contadores. — [BrasilAPI FIPE](https://brasilapi.com.br/api/fipe/marcas/v1/carros); [parallelum](https://parallelum.com.br/fipe/api/v1/carros/marcas)
10. **Embrapa AgroAPI (Agrofit, Agritec)** — agrônomos. Agrofit com 100 mil requisições/mês grátis; Agritec e ClimAPI com apenas 1.000 requisições em um mês de teste. — [Agrofit PDF](https://www.agroapi.cnptia.embrapa.br/portal/assets/docs/agrofit.pdf); [Agritec PDF](https://www.agroapi.cnptia.embrapa.br/portal/assets/docs/agritec.pdf)

Menções de apoio (úteis, valor menor ou uso auxiliar): IBGE malhas (centroide de município) — [IBGE malhas](https://servicodados.ibge.gov.br/api/v3/malhas/municipios/2304400/metadados); IPEA Data — [ipeadata](https://www.ipeadata.gov.br/api/odata4/ValoresSerie(SERCODIGO='PRECOS12_IPCA12')?$top=2); Frankfurter — [frankfurter](https://api.frankfurter.dev/v1/latest?base=USD&symbols=BRL,EUR); CVM — [dados.cvm.gov.br](https://dados.cvm.gov.br/api/3/action/package_list); OpenTopoData — [opentopodata](https://api.opentopodata.org/v1/srtm90m?locations=-3.72,-38.54).

### Inferences
- Por perfil:
  - **Contadores:** Calculadora RTC, SIDRA (IPCA/INPC), Focus, taxas de juros BCB, FIPE.
  - **Engenheiros/arquitetos:** SINAPI via IBGE, NASA POWER, ANEEL, OpenTopoData (opcional), malhas IBGE.
  - **Imobiliário/avaliadores:** taxas de financiamento imobiliário do BCB, SINAPI por m², IPCA/INPC; índices IVG-R/MVG-R já estariam no SGS integrado (não reverificado).
  - **Agronegócio:** NASA POWER, SIDRA (PAM/PPM), Agrofit (com cadastro), Comex Stat para exportação de commodities.
  - **Comércio exterior:** Comex Stat, Classif/NCM, Frankfurter, Calculadora RTC por NCM.
- O Agrofit é a única API com cadastro que entra no top 10 porque a cota gratuita de 100 mil/mês é viável; Agritec/ClimAPI, com 1.000 requisições em um mês, só servem para teste e não para produto.
- Descartar por violar a regra de dado pessoal ou por atrito: SUSEP corretores (consulta por CPF + token), Nominatim como geocodificador genérico, IBPT (token atrelado a CNPJ, gratuidade não confirmada).

### Gaps
- O ranking não considera as fontes não pesquisadas (ANTT piso de frete, CEPEA, CONAB, SICAR/SIGEF, IBAMA, ANBIMA, UN Comtrade/WITS, CBO, tabelas eSocial/INSS/IRRF). Algumas podem ter valor alto para RH, agro e despachantes; ficaram como **não verificado**.
- Cota e preço atuais da Embrapa AgroAPI têm fontes divergentes (10 mil x 20 mil requisições por R$ 250) e os PDFs não têm data clara.
- Nenhum limite de requisições das dez primeiras foi confirmado em fonte primária; recomenda-se cache local e uso parcimonioso.
