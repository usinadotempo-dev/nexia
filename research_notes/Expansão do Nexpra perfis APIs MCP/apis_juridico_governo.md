# APIs públicas gratuitas no Brasil — jurídico, legislativo, compras públicas, finanças públicas e registro empresarial (estado em 22/11/2026)

> Nota de método (vale para todo o documento): os testes "ao vivo" foram feitos em 22/11/2026 com uma ferramenta de fetch HTTP simples (GET, sem cookies, sem cabeçalhos especiais, sem chave), cujo IP de saída **provavelmente não é brasileiro**. Onde o resultado foi 403, isso pode ser bloqueio geográfico/WAF e não necessariamente indisponibilidade para um usuário no Brasil — está marcado. "Verificado" = recebi a resposta nesta sessão. "Não verificado" = não consegui testar ou não achei fonte; nesses casos, o que eu disser vem de conhecimento prévio e precisa de teste antes de integrar. Limite de página do fetch: respostas muito grandes foram lidas só nos primeiros 100 mil caracteres.

## Quais dessas APIs funcionam sem login, hoje, a partir de uma requisição HTTPS simples? (fichas técnicas + o que voltou)

### Takeaway
Onze fontes responderam JSON sem chave nem login nos testes de 22/11/2026: PNCP (consulta e busca textual), Compras.gov.br dados abertos, Senado (legislação), normas.leg.br (texto integral de lei federal em JSON), TCU (acórdãos, inabilitados, certidão consolidada por CNPJ), SICONFI, CKAN do Tesouro Transparente, CVM, STJ e TSE, Querido Diário, Registro.br RDAP e três APIs abertas de CNPJ (Minha Receita, CNPJ.ws pública, OpenCNPJ). Falharam ou não puderam ser verificadas: Comunica/DJEN (403), SGT/CNJ (403), DivulgaCand (403), busca do DOU (conexão derrubada), JSON do Tesouro Direto (410 Gone), API do dados.gov.br (401).

### Cited Findings

#### A. Compras públicas

**A1. PNCP — API de Consulta (verificado, funcionando)**
- Base: `https://pncp.gov.br/api/consulta` — OpenAPI em `/v3/api-docs`. Descrita como "API REST de serviços do Portal Nacional de Contratações Públicas (PNCP)", provida pelo Serpro — [PNCP api-docs](https://pncp.gov.br/api/consulta/v3/api-docs)
- Exemplo testado: `GET https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao?dataInicial=20261101&dataFinal=20261105&codigoModalidadeContratacao=6&pagina=1&tamanhoPagina=10` → JSON com `data`, `totalRegistros` (4990), `totalPaginas`, `numeroPagina`, `paginasRestantes`, `empty`; cada item traz `orgaoEntidade`, `objetoCompra`, `modalidadeNome`, `valorTotalEstimado`, `valorTotalHomologado`, `dataAberturaProposta`, `dataEncerramentoProposta`, `numeroControlePNCP`, `linkSistemaOrigem`, `amparoLegal`, `situacaoCompraNome`, `srp` etc. — [requisição testada](https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao?dataInicial=20261101&dataFinal=20261105&codigoModalidadeContratacao=6&pagina=1&tamanhoPagina=10)
- Endpoints (todos GET, `pagina` obrigatório, datas em `yyyyMMdd`): `/v1/contratacoes/publicacao` (exige `dataInicial`, `dataFinal`, `codigoModalidadeContratacao`; filtros opcionais `uf`, `codigoMunicipioIbge`, `cnpj`, `codigoModoDisputa`), `/v1/contratacoes/proposta` (propostas em aberto; exige `dataFinal`), `/v1/contratacoes/atualizacao`, `/v1/contratos`, `/v1/contratos/atualizacao`, `/v1/atas`, `/v1/atas/atualizacao`, `/v1/pca/`, `/v1/pca/usuario`, `/v1/pca/atualizacao`, `/v1/instrumentoscobranca/inclusao`, `/v1/orgaos/{cnpj}/compras/{ano}/{sequencial}` — [PNCP api-docs](https://pncp.gov.br/api/consulta/v3/api-docs)
- Tamanho de página: mínimo 10; máximo 50 nas contratações, 100 em instrumentos de cobrança, 500 em contratos/atas/PCA — [PNCP api-docs](https://pncp.gov.br/api/consulta/v3/api-docs)
- Autenticação: a especificação define esquema bearer JWT e lista resposta 401, mas nenhuma operação declara requisito de segurança; o GET sem token funcionou no teste — [PNCP api-docs](https://pncp.gov.br/api/consulta/v3/api-docs)
- Limites e termos de uso: a especificação não traz texto sobre rate limit nem termos — [PNCP api-docs](https://pncp.gov.br/api/consulta/v3/api-docs)

**A2. PNCP — busca textual do portal (verificado, funcionando; endpoint não documentado no swagger de consulta)**
- Exemplo testado: `GET https://pncp.gov.br/api/search/?q=notebook&tipos_documento=edital&ordenacao=-data&pagina=1&tam_pagina=5&status=recebendo_proposta` → JSON `{items:[...], total:564}`; itens com `title`, `description`, `item_url`, `orgao_nome`, `orgao_cnpj`, `uf`, `municipio_nome`, `modalidade_licitacao_nome`, `situacao_nome`, `data_fim_vigencia`, `valor_global`, `numero_controle_pncp` etc. — [requisição testada](https://pncp.gov.br/api/search/?q=notebook&tipos_documento=edital&ordenacao=-data&pagina=1&tam_pagina=5&status=recebendo_proposta)
- É o único caminho encontrado para busca por **palavra-chave** em editais abertos (a API de consulta só filtra por data/modalidade/órgão).

**A3. Compras.gov.br — API de Dados Abertos (verificado, funcionando)**
- Base: `https://dadosabertos.compras.gov.br` — OpenAPI em `/v3/api-docs` — [Compras api-docs](https://dadosabertos.compras.gov.br/v3/api-docs)
- Exemplo testado: `GET https://dadosabertos.compras.gov.br/modulo-legado/1_consultarLicitacao?pagina=1&tamanhoPagina=10&data_publicacao_inicial=2026-01-05&data_publicacao_final=2026-01-10` → JSON válido `{resultado:[], totalRegistros:0, totalPaginas:0, paginasRestantes:0}` (vazio: o módulo legado cobre a Lei 8.666; em 2026 não há registros — o endpoint respondeu, mas o exemplo não demonstra dados) — [requisição testada](https://dadosabertos.compras.gov.br/modulo-legado/1_consultarLicitacao?pagina=1&tamanhoPagina=10&data_publicacao_inicial=2026-01-05&data_publicacao_final=2026-01-10)
- Módulos: catálogo de materiais (CATMAT) e serviços (CATSER); **pesquisa de preço** (`/modulo-pesquisa-preco/1_consultarMaterial` com `tipo`+`codigo`, `/3_consultarServico` com `codigoItemCatalogo`); PGC; UASG/órgãos; legado (licitações, pregões, dispensas, RDC); contratações Lei 14.133 (`/modulo-contratacoes/1_consultarContratacoes_PNCP_14133` exige `dataPublicacaoPncpInicial`, `dataPublicacaoPncpFinal`, `codigoModalidade`); ARP (atas, itens, adesões, saldo de empenhos); contratos (exige `codigoOrgao` + janela de vigência); fornecedor (`/modulo-fornecedor/1_consultarFornecedor`, exige `ativo`); OCDS; indicadores. Datas em `YYYY-MM-DD`; `tamanhoPagina` até 500; há variantes CSV — [Compras api-docs](https://dadosabertos.compras.gov.br/v3/api-docs)
- Autenticação: só os módulos USUARIOS e ALICE declaram `bearerAuth`; os demais não declaram segurança — [Compras api-docs](https://dadosabertos.compras.gov.br/v3/api-docs)

#### B. Legislação

**B1. Senado Federal — Dados Abertos Legislativos (verificado, funcionando)**
- Base: `https://legis.senado.leg.br/dadosabertos` — OpenAPI em `/v3/api-docs`. "Acesso público, sem necessidade de autenticação" — [Senado api-docs](https://legis.senado.leg.br/dadosabertos/v3/api-docs)
- Exemplo testado (busca de norma): `GET https://legis.senado.leg.br/dadosabertos/legislacao/lista.json?tipo=LEI&numero=14133&ano=2021` → JSON `ListaDocumento.documentos.documento[]` com `id` (33382036), `norma` ("LEI-14133-2021-04-01"), `normaNome`, `ementa`, `dataassinatura` — [requisição testada](https://legis.senado.leg.br/dadosabertos/legislacao/lista.json?tipo=LEI&numero=14133&ano=2021)
- Exemplo testado (detalhe): `GET https://legis.senado.leg.br/dadosabertos/legislacao/33382036.json` → `DetalheDocumento` com metadados, publicações no DOU, **normas posteriores que alteram/regulamentam** ("vides"), normas anteriores afetadas (ex.: Lei 8.666 revogada), dispositivos e remissões, indexação, e `urlDocumento` apontando para o texto em normas.leg.br. **Não traz o texto integral** — [requisição testada](https://legis.senado.leg.br/dadosabertos/legislacao/33382036.json)
- Rate limit documentado: "Mais de 10 requisições por segundo estão sujeitas a receber o erro HTTP 429"; recomenda evitar rotinas em horários cheios (01:00:00); alta demanda pode gerar 503 — [Senado api-docs](https://legis.senado.leg.br/dadosabertos/v3/api-docs)
- Estabilidade: vários endpoints estão marcados DEPRECATED (ex.: `/senador/{codigo}/votacoes` → `/votacao`; `/senador/{codigo}/autorias` → `/processo`); serviços descontinuados devolvem cabeçalhos `Deprecation`, `Sunset` e `Link`. Grupos atuais: Parlamentar, Legislação, Plenário, Discurso, Processo (matérias), Votação, Comissão, Composição — [Senado api-docs](https://legis.senado.leg.br/dadosabertos/v3/api-docs)
- Formato: JSON (sufixo `.json`) ou XML.

**B2. normas.leg.br — texto integral de legislação federal em JSON (verificado, funcionando)**
- Exemplo testado: `GET https://normas.leg.br/api/public/normas?urn=urn:lex:br:federal:lei:2021-04-01;14133&tipo_documento=maior-detalhe` → JSON no estilo JSON-LD/schema.org (`@type`, `@id`, `headline`, `legislationDate`, `keywords`, `hasPart`) com o **texto articulado** (epígrafe, preâmbulo, artigos em `hasPart`). A resposta tem ~1,5 MB para a Lei 14.133; só os primeiros 100 mil caracteres foram lidos (até o art. 6º), então a presença do texto completo até o último artigo é inferida pelo tamanho, não lida — [requisição testada](https://normas.leg.br/api/public/normas?urn=urn:lex:br:federal:lei:2021-04-01;14133&tipo_documento=maior-detalhe)
- Problemas observados: sem bloco `@context`; alguns campos `text` trazem fragmentos XML/HTML (`<lx:p>`, `<span>`) que precisam ser limpos; palavras-chave duplicadas — [requisição testada](https://normas.leg.br/api/public/normas?urn=urn:lex:br:federal:lei:2021-04-01;14133&tipo_documento=maior-detalhe)
- A URN LexML necessária vem do campo `norma`/`urlDocumento` do Senado (B1): fluxo em dois passos lista → normas.leg.br.

**B3. Diário Oficial da União (não verificado — falha no teste)**
- `GET https://www.in.gov.br/consulta/-/buscar/dou?q=...` → "socket hang up" (conexão derrubada), sem resposta — [requisição testada](https://www.in.gov.br/consulta/-/buscar/dou?q=%22nova+lei+de+licita%C3%A7%C3%B5es%22&s=todos&exactDate=mes&sortType=0)
- A Imprensa Nacional mantém no GitHub o repositório "inlabs", descrito como acesso às edições completas do DOU em PDF e XML, gratuito desde 2020 — [GitHub Imprensa-Nacional](https://github.com/Imprensa-Nacional)
- A página oficial de serviço do DOU não menciona API — [gov.br — acessar o DOU](https://www.gov.br/pt-br/servicos/acessar-o-diario-oficial-da-uniao)

**B4. Querido Diário — diários oficiais municipais (verificado, funcionando)**
- Base atual: `https://api.queridodiario.org.br` (o endereço antigo `queridodiario.ok.org.br/api/...` devolve 302 para ela — uma extensão deve chamar direto o novo host) — [redirect observado](https://queridodiario.ok.org.br/api/gazettes?territory_ids=2304400&querystring=licita%C3%A7%C3%A3o&size=2)
- Exemplo testado: `GET https://api.queridodiario.org.br/gazettes?querystring=pregao&size=1&excerpt_size=200&number_of_excerpts=1` → JSON `{total_gazettes:10000, gazettes:[{territory_id, territory_name, state_code, date, edition, is_extra_edition, url, txt_url, excerpts, scraped_at}]}` — [requisição testada](https://api.queridodiario.org.br/gazettes?querystring=pregao&size=1&excerpt_size=200&number_of_excerpts=1)
- Cobertura é parcial: a mesma busca filtrada por Fortaleza (`territory_ids=2304400`, termo "licitação") devolveu `total_gazettes: 0` — [requisição testada](https://api.queridodiario.org.br/gazettes?territory_ids=2304400&querystring=licita%C3%A7%C3%A3o&size=2)

#### C. Controle, sanções e transparência

**C1. TCU — certidão consolidada de pessoa jurídica (verificado, funcionando, sem chave)**
- Exemplo testado: `GET https://certidoes-apf.apps.tcu.gov.br/api/rest/publico/certidoes/33000167000101?seEmitirPDF=false` → JSON com `razaoSocial`, `nomeFantasia`, `cnpj`, `seCnpjEncontradoNaBaseTcu`, `dataHoraGeracaoInMillis`, `certidaoPDF` e `certidoes[]` com quatro consultas em uma chamada: **TCU/Inidôneos, CNJ/CNIA (improbidade), Portal da Transparência/CEIS e CNEP**, cada uma com `situacao` (ex.: `NADA_CONSTA`) e `linkConsultaManual` — [requisição testada](https://certidoes-apf.apps.tcu.gov.br/api/rest/publico/certidoes/33000167000101?seEmitirPDF=false)

**C2. TCU — acórdãos (verificado, funcionando)**
- Exemplo testado: `GET https://dados-abertos.apps.tcu.gov.br/api/acordao/recupera-acordaos?inicio=0&quantidade=2` → array JSON; campos `key`, `tipo`, `anoAcordao`, `titulo`, `numeroAcordao`, `numeroAta`, `colegiado`, `dataSessao`, `relator`, `situacao`, `sumario`, `urlArquivo`, `urlArquivoPdf`, `urlAcordao` — [requisição testada](https://dados-abertos.apps.tcu.gov.br/api/acordao/recupera-acordaos?inicio=0&quantidade=2)
- Só foram observados os parâmetros `inicio` e `quantidade` (paginação pelos mais recentes); não verifiquei filtro por palavra-chave.

**C3. TCU — inabilitados para função pública (verificado, funcionando)**
- Exemplo testado: `GET https://contas.tcu.gov.br/ords/condenacao/consulta/inabilitados` → JSON Oracle ORDS `{items, hasMore, limit:25, offset, count, links}`; campos `nome`, `cpf`, `processo`, `deliberacao`, `data_transito_julgado`, `data_final`, `data_acordao`, `uf`, `municipio`; paginação por `?offset=25` — [requisição testada](https://contas.tcu.gov.br/ords/condenacao/consulta/inabilitados)
- Sinal de instabilidade: a página-índice de web services do TCU em `contas.tcu.gov.br/ords/f?p=1660:2` responde "Aplicativo Não Disponível", desativada em 22/05/2026 com base na Portaria-TCU 230/2017 (art. 16) por não constar do portfólio de serviços de TI — [página testada](https://contas.tcu.gov.br/ords/f?p=1660:2)

**C4. Portal da Transparência (CGU) — demais endpoints (exige chave gratuita; catálogo verificado, chamadas não testadas)**
- Base: `https://api.portaldatransparencia.gov.br/api-de-dados/...` — OpenAPI em `/v3/api-docs` — [api-docs CGU](https://api.portaldatransparencia.gov.br/v3/api-docs)
- Grupos além de CEIS/CNEP: Sanções (`cepim`, `ceaf`), Servidores (`servidores`, `servidores/remuneracao`, `peps`), Contratos (`contratos`, `contratos/cpf-cnpj`, `contratos/termo-aditivo`, `contratos/itens-contratados`), Licitações (`licitacoes`, `licitacoes/participantes`, `licitacoes/itens-licitados`), Convênios, Emendas parlamentares, Despesas (`despesas/documentos-por-favorecido`, `despesas/por-orgao`...), Pessoas (`pessoa-juridica`, `pessoa-fisica`), Notas Fiscais, Renúncias Fiscais, Viagens, Benefícios, Imóveis Funcionais, Órgãos SIAPE/SIAFI — [api-docs CGU](https://api.portaldatransparencia.gov.br/v3/api-docs)
- O trecho lido da especificação termina em `ceaf/{id}`; não confirmei se existe endpoint de **acordos de leniência** (os 70 mil caracteres finais não foram lidos) — [api-docs CGU](https://api.portaldatransparencia.gov.br/v3/api-docs)
- A página de documentação `portaldatransparencia.gov.br/api-de-dados` devolveu 405 ao fetch simples — [página testada](https://portaldatransparencia.gov.br/api-de-dados)
- Chave e limites: ver a segunda pergunta.

**C5. PGFN — devedores da dívida ativa (só arquivos; sem API)**
- Entrega apenas por download: CSV em ZIP, atualização trimestral, três arquivos por trimestre (não previdenciário/SIDA, FGTS, previdenciário). Ex.: `https://dadosabertos.pgfn.gov.br/2026_trimestre_01/Dados_abertos_Nao_Previdenciario.zip`. Nenhuma API é mencionada — [PGFN dados abertos](https://www.gov.br/pgfn/pt-br/assuntos/divida-ativa-da-uniao/transparencia-fiscal-1/dados-abertos)
- Nomes de arquivo variam entre trimestres (3º tri/2026 usa `Dados_abertos_Sistema_SIDA.zip`) e há links antigos malformados na página — [PGFN dados abertos](https://www.gov.br/pgfn/pt-br/assuntos/divida-ativa-da-uniao/transparencia-fiscal-1/dados-abertos)

#### D. Finanças públicas e mercado

**D1. SICONFI / Tesouro Nacional (verificado, funcionando)**
- Base: `https://apidatalake.tesouro.gov.br/ords/siconfi/tt/`
- Exemplo testado: `GET .../tt/entes` → JSON `{items:[{cod_ibge, ente, capital, regiao, uf, esfera, exercicio, populacao, cnpj}]}`; resposta com ~860 KB — [requisição testada](https://apidatalake.tesouro.gov.br/ords/siconfi/tt/entes)
- Exemplo testado: `GET .../tt/rreo?an_exercicio=2025&nr_periodo=6&co_tipo_demonstrativo=RREO&no_anexo=RREO-Anexo%2001&co_esfera=M&id_ente=2304400` → linhas do RREO de Fortaleza com `exercicio`, `periodo`, `instituicao`, `anexo`, `rotulo`, `coluna`, `cod_conta`, `conta`, `valor`; resposta com ~190 KB — [requisição testada](https://apidatalake.tesouro.gov.br/ords/siconfi/tt/rreo?an_exercicio=2025&nr_periodo=6&co_tipo_demonstrativo=RREO&no_anexo=RREO-Anexo%2001&co_esfera=M&id_ente=2304400)

**D2. Tesouro Transparente — CKAN (verificado, funcionando) e Tesouro Direto**
- Exemplo testado: `GET https://www.tesourotransparente.gov.br/ckan/api/3/action/package_search?q=tesouro+direto&rows=3` → `success:true`, `count:6`; datasets `operacoes-do-tesouro-direto`, `estoque-do-tesouro-direto`, `taxas-dos-titulos-ofertados-pelo-tesouro-direto` (CSV `precotaxatesourodireto.csv`), com recursos modificados em 20/11/2026 — [requisição testada](https://www.tesourotransparente.gov.br/ckan/api/3/action/package_search?q=tesouro+direto&rows=3)
- Preços/taxas do Tesouro Direto existem só como **CSV histórico completo** (`https://www.tesourotransparente.gov.br/ckan/dataset/df56aa42-484a-4a59-8184-7676580c81e3/resource/796d2059-14e9-44e3-80c9-2d9e30b405c1/download/precotaxatesourodireto.csv`), não como endpoint JSON por título — [requisição testada](https://www.tesourotransparente.gov.br/ckan/api/3/action/package_search?q=tesouro+direto&rows=3)
- O JSON não oficial que muitos clientes usavam (`tesourodireto.com.br/json/.../treasurybondsinfo.json`) devolveu **HTTP 410 Gone** — [requisição testada](https://www.tesourodireto.com.br/json/br/com/b3/tesourodireto/service/api/treasurybondsinfo.json)

**D3. CVM — dados abertos (verificado, CKAN funcionando)**
- Exemplo testado: `GET https://dados.cvm.gov.br/api/3/action/package_list` → `success:true`, 54 datasets (ex.: `cia_aberta-cad`, `fi-doc-inf_diario`) — [requisição testada](https://dados.cvm.gov.br/api/3/action/package_list)
- É catálogo de arquivos (CSV/ZIP), não API de consulta por registro; não verifiquei o nome do dataset de sanções/processos sancionadores.

#### E. Registro empresarial e domínios

**E1. Minha Receita (verificado, funcionando)**
- Exemplo testado: `GET https://minhareceita.org/33000167000101` → JSON com `razao_social`, `qsa[]`, `cnaes_secundarios[]`, `regime_tributario[]`, `opcao_pelo_simples`, `opcao_pelo_mei`, `situacao_cadastral`, endereço etc. — [requisição testada](https://minhareceita.org/33000167000101)
- Diferencial: busca paginada `GET /?uf=&cnae_fiscal=&cnae=&cnpf=&municipio=&natureza_juridica=` com `limit` (1–1024) e `cursor`; busca por CPF/CNPJ de sócio pode dar timeout; há API de grafo societário (`/<id>`, `/<id1>/<id2>`, limite de 90 s). A busca paginada está "em teste" e pode mudar — [docs Minha Receita](https://docs.minhareceita.org/como-usar/)
- Limites: sem números; limitação por instância do servidor, resposta 429. A página não declara termos de uso nem licença. `/updated` informa a data de extração da base da Receita — [docs Minha Receita](https://docs.minhareceita.org/como-usar/)
- Qualidade: no teste, `cnae_fiscal` veio como 600001 (zero à esquerda perdido) e `ddd_fax` incompleto — [requisição testada](https://minhareceita.org/33000167000101)

**E2. CNPJ.ws — API pública (verificado, funcionando)**
- Exemplo testado: `GET https://publica.cnpj.ws/cnpj/33000167000101` → JSON com `cnpj_raiz`, `razao_social`, `capital_social`, `porte`, `natureza_juridica`, `socios`, `simples`, `estabelecimento`, `atualizado_em` — [requisição testada](https://publica.cnpj.ws/cnpj/33000167000101)
- Limite: **3 requisições por minuto por IP**; excedeu → 429 e espera de 60 s; mais de 360 erros 429 em uma hora bloqueia o IP por 1 hora. A API pública omite dados pessoais que a API comercial (paga) não omite. A página não traz termos explícitos sobre uso comercial — [docs CNPJ.ws](https://docs.cnpj.ws/referencia-de-api/api-publica/limitacoes)

**E3. OpenCNPJ (verificado, funcionando)**
- Exemplo testado: `GET https://api.opencnpj.org/33000167000101` → JSON com 42 campos, incluindo `QSA`, `opcao_simples`, `opcao_mei`, `telefones`, `cnaes`, `lgpd_anonimizado`, `updated_at` — [requisição testada](https://api.opencnpj.org/33000167000101)
- Limites e licença: não verificado (a página de documentação `opencnpj.org` é renderizada por JavaScript e só devolveu o título) — [opencnpj.org](https://opencnpj.org/)

**E4. Registro.br RDAP (verificado, funcionando)**
- Exemplo testado: `GET https://rdap.registro.br/domain/nexpra.com.br` → JSON RDAP com `status:["active"]`, `nameservers`, `entities`, `events`, `secureDNS` — ou seja, **o domínio nexpra.com.br já está registrado** — [requisição testada](https://rdap.registro.br/domain/nexpra.com.br)

#### F. Judiciário e eleitoral

**F1. Comunica/DJEN — comunicaapi.pje.jus.br (NÃO verificado — 403)**
- `GET https://comunicaapi.pje.jus.br/api/v1/comunicacao?numeroOab=12345&ufOab=CE&itensPorPagina=5&pagina=1` → **HTTP 403 Forbidden** — [requisição testada](https://comunicaapi.pje.jus.br/api/v1/comunicacao?numeroOab=12345&ufOab=CE&itensPorPagina=5&pagina=1)
- O portal público do DJEN é `https://comunica.pje.jus.br/` e a consulta aceita nome do advogado, número e UF da OAB como filtros — [Protocolo DJEN/TJMG ago/2025](https://tjmg.jus.br/data/files/D4/44/4E/4A/FB82B91042A101B99128CCA8/Protocolo%20DJEN%20e%20Domicilio%20Judicial%20Eletronico%20_externos_%20-%20Ago%2025.pdf)
- O PJe tem histórico documentado de bloqueio de acesso a partir do exterior, com procedimento formal de desbloqueio (caso TSE) — [TSE — acesso ao PJe no exterior](https://www.tse.jus.br/servicos-judiciais/processos/acesso-ao-pje-no-exterior-solicitar-desbloqueio)
- Duas buscas não acharam documentação oficial do endpoint, de limites ou de termos.

**F2. STJ — Portal de Dados Abertos (CKAN verificado, funcionando)**
- Exemplo testado: `GET https://dadosabertos.web.stj.jus.br/api/3/action/package_list` → `success:true`, 22 datasets, entre eles `precedentes-qualificados`, `acervo-em-tramitacao`, `api-publica-datajud` — [requisição testada](https://dadosabertos.web.stj.jus.br/api/3/action/package_list)
- O portal traz íntegras de decisões e acórdãos do DJ, movimentação, precedentes qualificados e espelhos de acórdãos — [CNJ — portal de dados abertos do STJ](https://www.cnj.jus.br/portal-de-dados-abertos-do-stj-oferece-informacoes-em-formato-legivel-por-maquina/)
- Não há API de pesquisa de jurisprudência: trabalho acadêmico de 2025 registra que "a ausência de uma API pública força o download de data dumps massivos" (.csv/.json) — [resultado de busca: dissertação UnB](https://www.repositorio.unb.br/bitstream/10482/49110/1/2023_EricaBarbosaSousaMoreira_DISSERT.pdf) (atribuição da citação a este documento específico não conferida; veio de resumo de busca)
- Existe Termo de Uso próprio do portal (conteúdo não lido) — [Termo de Uso — Dados Abertos STJ](https://bdjur.stj.jus.br/jspui/bitstream/2011/179190/Termo%20de%20Uso%20-%20Dados%20Abertos.pdf)

**F3. CNJ — BNP/Pangea (sem API pública documentada)**
- Endereços divergentes nas fontes do CNJ: manual aponta `https://pangeabnp.pdpj.jus.br/`; a página do BNP aponta `https://bnp.pdpj.jus.br/` — [manual Pangea/BNP](https://www.cnj.jus.br/wp-content/uploads/2023/11/manual-de-usuario-pangea-bnp.pdf); [CNJ — BNP](https://www.cnj.jus.br/tecnologia-da-informacao-e-comunicacao/justica-4-0/banco-nacional-de-precedentes-bnp/)
- A busca não encontrou API REST pública documentada para BNP/Pangea; o material antigo do BNPR cita web service SOAP desatualizado — [manual BNPR 2021](https://www.cnj.jus.br/wp-content/uploads/2021/04/manual_bnpr_09042021.pdf)

**F4. CNJ — SGT (NÃO verificado — 403)**
- `GET https://www.cnj.jus.br/sgt/sgt_ws.php?wsdl` → HTTP 403 — [requisição testada](https://www.cnj.jus.br/sgt/sgt_ws.php?wsdl)

**F5. TSE (CKAN verificado; DivulgaCand 403)**
- `GET https://dadosabertos.tse.jus.br/api/3/action/package_search?q=candidatos&rows=2` → `success:true`, `count:44` (ex.: `prestacao-de-contas-eleitorais-2026`) — catálogo de arquivos — [requisição testada](https://dadosabertos.tse.jus.br/api/3/action/package_search?q=candidatos&rows=2)
- `GET https://divulgacandcontas.tse.jus.br/divulga/rest/v1/eleicao/ordinarias` → **HTTP 403** — [requisição testada](https://divulgacandcontas.tse.jus.br/divulga/rest/v1/eleicao/ordinarias)

**F6. dados.gov.br**
- `GET https://dados.gov.br/api/publico/conjuntos-dados?...` → **HTTP 401** (a API do catálogo exige credencial) — [requisição testada](https://dados.gov.br/api/publico/conjuntos-dados?isPrivado=false&nomeConjuntoDados=tcu)

### Inferences
- Os três 403 (Comunica/DJEN, SGT/CNJ, DivulgaCand/TSE) vieram todos de hosts do Judiciário e o fetch saiu, ao que tudo indica, de IP fora do Brasil; como há bloqueio geográfico documentado no PJe, a hipótese mais provável é geo-bloqueio/WAF, não exigência de login. **Isso não foi testado**: precisa de uma chamada a partir do service worker da extensão em máquina no Brasil antes de qualquer decisão. Se confirmar, vale também para usuários do Nexpra em VPN ou no exterior.
- Para o Nexpra, o achado mais valioso é o par Senado + normas.leg.br: resolve "texto integral de lei federal" sem Planalto e sem LexML. O custo é o tamanho (≈1,5 MB por lei grande): a ferramenta precisa extrair só os artigos pedidos antes de entregar ao modelo.
- A certidão consolidada do TCU cobre em uma chamada, sem chave, o que hoje o Nexpra faz com CEIS/CNEP via chave da CGU, e ainda soma inidôneos TCU e improbidade CNJ — pode substituir ou servir de reserva para a integração atual.
- PNCP `/api/search/` não aparece no swagger de consulta; é a API interna do front do portal. Funciona, mas pode mudar sem aviso — tratar como dependência frágil.
- Respostas grandes (SICONFI `entes` 860 KB, RREO 190 KB, normas.leg.br 1,5 MB) exigem filtragem/recorte no service worker; passar bruto ao modelo é inviável em custo de tokens.
- CVM, STJ, TSE, PGFN e Tesouro Direto são **catálogos de arquivos**, não APIs de consulta por registro. Numa extensão sem backend, só servem se o arquivo for pequeno; "consultar CNPJ na dívida ativa" não é viável sem baixar e indexar ZIPs trimestrais.
- O `total_gazettes: 10000` do Querido Diário parece teto do mecanismo de busca (limite típico de janela do Elasticsearch), não a contagem real.
- O desligamento do índice de web services do TCU em 05/2026 sugere que os endpoints ORDS antigos (`contas.tcu.gov.br/ords/...`) estão em risco de descontinuação, embora `inabilitados` ainda responda.

### Gaps
- **Não pesquisados nesta sessão (nenhuma chamada feita)**: STF (jurisprudência, súmulas, repercussão geral), TST, CJF, Codex/PDPJ (requisitos de autenticação), INPI (marcas/patentes), CENPROT (protestos), SUSEP, B3, ReceitaWS, APIs oficiais da Receita Federal / Conecta gov.br, REDESIM/Juntas Comerciais, emissão de CND, CNJ Justiça Aberta (cartórios). Não há achado positivo nem negativo sobre eles aqui; qualquer afirmação sobre esses serviços no relatório final precisaria de pesquisa própria.
- TCU inidôneos como lista (provável `contas.tcu.gov.br/ords/condenacao/consulta/inidoneos`) e contas julgadas irregulares: não testados.
- DOU: nenhum endpoint de busca verificado (conexão derrubada); requisitos de cadastro do INLABS não lidos.
- Comunica/DJEN: parâmetros exatos, necessidade de autenticação, limites e termos não confirmados por fonte oficial.
- Compras.gov.br: não obtive um exemplo com dados (o teste usou o módulo legado numa janela sem registros); os módulos 14.133, ARP e pesquisa de preço não foram chamados.
- normas.leg.br: não li documentação oficial da API (parâmetros, outros valores de `tipo_documento`, versão compilada/vigente numa data, limites, termos).
- Rate limits de PNCP, Compras.gov.br, TCU, SICONFI, Querido Diário, OpenCNPJ e Registro.br RDAP: não encontrados.

## Quais exigem chave gratuita e como obtê-la? Quais proíbem uso automatizado/comercial?

### Takeaway
Entre as fontes examinadas, só o Portal da Transparência (CGU) exige chave gratuita, vinculada a conta gov.br; o catálogo dados.gov.br também pede credencial (401). Nenhuma das fontes verificadas declara proibição de uso comercial, mas em quase todas eu **não encontrei termos de uso** — ausência de texto, não permissão expressa.

### Cited Findings
- **Portal da Transparência — obtenção da chave**: token pessoal gerado após cadastro com conta gov.br pelo link do portal; a conta precisa ter verificação em duas etapas (2FA) configurada — fonte é README de biblioteca de terceiros, não a página oficial (que devolveu 405) — [GitHub guizsantos/portaldatransparencia](https://github.com/guizsantos/portaldatransparencia)
- **Portal da Transparência — limites** (mesma fonte de terceiros): 700 requisições/minuto entre 00h e 06h; 400/minuto no restante do dia; 180/minuto nas "APIs restritas"; exceder o limite das restritas suspende o token por 8 horas. Restritas listadas: `despesas/documentos-por-favorecido`, `bolsa-familia-*`, `auxilio-emergencial-*`, `seguro-defeso-codigo` — [GitHub guizsantos/portaldatransparencia](https://github.com/guizsantos/portaldatransparencia)
- **Portal da Transparência — esquema de segurança**: a especificação referencia um requisito chamado `Authorization`; a definição do cabeçalho não estava no trecho lido — [api-docs CGU](https://api.portaldatransparencia.gov.br/v3/api-docs)
- **dados.gov.br**: a API do catálogo devolveu 401 sem credencial — [requisição testada](https://dados.gov.br/api/publico/conjuntos-dados?isPrivado=false&nomeConjuntoDados=tcu)
- **Senado**: acesso público sem autenticação; limite de 10 req/s (429 acima disso); o trecho lido não traz licença ou termos separados — [Senado api-docs](https://legis.senado.leg.br/dadosabertos/v3/api-docs)
- **PNCP**: sem texto de termos ou limites na especificação; esquema JWT definido mas não exigido nas consultas — [PNCP api-docs](https://pncp.gov.br/api/consulta/v3/api-docs)
- **Compras.gov.br**: login só para os módulos de usuários e ALICE — [Compras api-docs](https://dadosabertos.compras.gov.br/v3/api-docs)
- **CNPJ.ws pública**: 3 req/min por IP, bloqueio de 1 h após 360 erros 429/hora; plano comercial pago à parte; sem cláusula explícita sobre uso comercial da API pública na página de limites — [docs CNPJ.ws](https://docs.cnpj.ws/referencia-de-api/api-publica/limitacoes)
- **Minha Receita**: sem seção de termos de uso nem licença declarada na página de uso; limitação por instância com 429 — [docs Minha Receita](https://docs.minhareceita.org/como-usar/)
- **PGFN**: conteúdo do site sob Creative Commons Atribuição-SemDerivações 3.0 (CC BY-ND 3.0) — [PGFN dados abertos](https://www.gov.br/pgfn/pt-br/assuntos/divida-ativa-da-uniao/transparencia-fiscal-1/dados-abertos)
- **STJ**: há Termo de Uso específico do portal de dados abertos (não lido) — [Termo de Uso STJ](https://bdjur.stj.jus.br/jspui/bitstream/2011/179190/Termo%20de%20Uso%20-%20Dados%20Abertos.pdf)
- **CNJ DataJud** (já integrado) tem termos de uso próprios da API pública, v1.2 — [Termos de uso API pública CNJ](https://formularios.cnj.jus.br/wp-content/uploads/2023/11/Termos-de-uso-api-publica-V1.2.pdf)

### Inferences
- Numa extensão sem backend, a chave do Portal da Transparência é **por usuário** (cada profissional gera a sua no gov.br). Os limites de 400–700/min são folgados para uso interativo; o risco é o modelo disparar em laço um endpoint restrito e suspender o token do usuário por 8 h — vale um limitador local.
- O limite de 3 req/min do CNPJ.ws público é por IP do usuário final (a extensão chama direto), o que é tolerável para consulta pontual, mas quebra em enriquecimento em lote. Minha Receita e OpenCNPJ não mostraram limite nos testes, o que os torna melhores como reserva do BrasilAPI.
- A licença CC BY-ND da PGFN ("sem derivações") é, em tese, incômoda para um produto que reprocessa os dados; como a base nem é consultável por API, o ponto é secundário.
- Como PNCP, Compras.gov.br, TCU, SICONFI e normas.leg.br são serviços oficiais de dados abertos sem termos restritivos localizados, o enquadramento provável é o da política federal de dados abertos (uso livre, inclusive comercial) — mas isso é inferência minha; nenhum termo foi lido que diga isso expressamente.

### Gaps
- Texto oficial atual da CGU sobre cadastro da chave, nome do cabeçalho e limites: não obtido (página devolveu 405; números vêm de README de terceiros, sem data conferida).
- Termos de uso/licença de PNCP, Compras.gov.br, TCU, SICONFI, normas.leg.br, Querido Diário, OpenCNPJ, Minha Receita e Registro.br RDAP: não localizados.
- Conteúdo do Termo de Uso do STJ e dos termos do DataJud quanto a uso comercial: não lido.
- Nenhuma fonte examinada foi identificada como proibindo expressamente uso automatizado; para os serviços não pesquisados (ver Gaps da pergunta anterior) a questão segue aberta.

## Top 8–10 por valor para advogados, gestores públicos/pregoeiros, contadores e analistas de compliance

### Takeaway
O maior ganho imediato e de menor risco está em quatro integrações sem chave que responderam nos testes: PNCP (consulta + busca), Senado + normas.leg.br (lei federal com texto integral), certidão consolidada do TCU e Compras.gov.br. O Comunica/DJEN seria o primeiro da lista para advogados, mas não pôde ser verificado (403) e entra condicionado a teste a partir do Brasil.

### Cited Findings
Ranking proposto (a ordem é julgamento meu; os fatos de cada linha estão citados):

1. **PNCP — consulta e busca textual** (pregoeiros, gestores, fornecedores, advogados de licitações). Sem chave; editais, contratos, atas e PCA de todas as esferas; busca por palavra-chave com filtro de "recebendo proposta" devolveu 564 itens para "notebook" — [PNCP api-docs](https://pncp.gov.br/api/consulta/v3/api-docs); [busca testada](https://pncp.gov.br/api/search/?q=notebook&tipos_documento=edital&ordenacao=-data&pagina=1&tam_pagina=5&status=recebendo_proposta)
2. **Senado legislação + normas.leg.br** (todos os perfis). Localiza a norma, lista alterações/revogações posteriores e entrega o texto articulado em JSON, sem chave, com limite de 10 req/s — [detalhe testado](https://legis.senado.leg.br/dadosabertos/legislacao/33382036.json); [texto testado](https://normas.leg.br/api/public/normas?urn=urn:lex:br:federal:lei:2021-04-01;14133&tipo_documento=maior-detalhe)
3. **TCU — certidão consolidada por CNPJ** (compliance, pregoeiros na habilitação). Uma chamada sem chave cobre inidôneos TCU, CNIA/CNJ, CEIS e CNEP — [requisição testada](https://certidoes-apf.apps.tcu.gov.br/api/rest/publico/certidoes/33000167000101?seEmitirPDF=false)
4. **Compras.gov.br dados abertos** (pregoeiros/gestores). Pesquisa de preços por item de catálogo, atas de registro de preço com saldo e adesões, contratos por órgão, fornecedores — [Compras api-docs](https://dadosabertos.compras.gov.br/v3/api-docs)
5. **Portal da Transparência — demais endpoints** (compliance, advogados, gestores). PEP, CEPIM, CEAF, contratos por CPF/CNPJ, licitações e participantes, convênios, emendas, servidores e remuneração; exige chave gratuita do usuário — [api-docs CGU](https://api.portaldatransparencia.gov.br/v3/api-docs)
6. **Comunica/DJEN** (advogados: intimações por OAB) — **condicional**: devolveu 403 no teste; valor alto se funcionar a partir do Brasil — [requisição testada](https://comunicaapi.pje.jus.br/api/v1/comunicacao?numeroOab=12345&ufOab=CE&itensPorPagina=5&pagina=1)
7. **SICONFI** (contadores públicos, gestores, controle). RREO/RGF e cadastro de entes, sem chave — [RREO testado](https://apidatalake.tesouro.gov.br/ords/siconfi/tt/rreo?an_exercicio=2025&nr_periodo=6&co_tipo_demonstrativo=RREO&no_anexo=RREO-Anexo%2001&co_esfera=M&id_ente=2304400)
8. **TCU — acórdãos e inabilitados** (advogados de direito administrativo, controle interno) — [acórdãos testado](https://dados-abertos.apps.tcu.gov.br/api/acordao/recupera-acordaos?inicio=0&quantidade=2); [inabilitados testado](https://contas.tcu.gov.br/ords/condenacao/consulta/inabilitados)
9. **Querido Diário** (advogados municipalistas, compliance, fornecedores). Busca textual em diários municipais com trechos e link do texto; cobertura parcial (zero resultados para Fortaleza no teste) — [requisição testada](https://api.queridodiario.org.br/gazettes?querystring=pregao&size=1&excerpt_size=200&number_of_excerpts=1)
10. **CNPJ redundante: Minha Receita / OpenCNPJ / CNPJ.ws** (contadores, compliance). Reserva para o BrasilAPI; Minha Receita acrescenta busca por sócio, CNAE, município e grafo societário — [docs Minha Receita](https://docs.minhareceita.org/como-usar/); [OpenCNPJ testado](https://api.opencnpj.org/33000167000101); [limites CNPJ.ws](https://docs.cnpj.ws/referencia-de-api/api-publica/limitacoes)

Menções fora do top 10: Registro.br RDAP (simples e estável, mas nicho) — [testado](https://rdap.registro.br/domain/nexpra.com.br); CKANs de CVM, STJ, TSE e Tesouro (catálogos de arquivos) — [CVM testado](https://dados.cvm.gov.br/api/3/action/package_list).

### Inferences
- Esforço × valor: os itens 1, 2, 3 e 7 são GET sem chave com JSON previsível — candidatos a primeira leva. O item 5 reaproveita a chave que o usuário já configura para CEIS/CNEP, então o custo marginal é só definir novas ferramentas.
- O item 3 se sobrepõe à integração CEIS/CNEP existente; a diferença é devolver só "consta / nada consta", sem o detalhe da sanção. Uso natural: triagem pelo TCU, detalhe pelo Portal da Transparência.
- Jurisprudência continua sendo a lacuna: nada do que foi verificado oferece busca de julgados de tribunais superiores por API. STJ só tem dumps; BNP/Pangea não tem API documentada; STF/TST/CJF não foram pesquisados. O DataJud (já integrado) cobre metadados processuais, não inteiro teor.
- Para o acórdão do TCU, sem filtro textual confirmado o endpoint serve mais para "últimos acórdãos" do que para pesquisa — rebaixa o item 8.

### Gaps
- O ranking não considera STF, TST, CJF, INPI, CENPROT, SUSEP, B3, ReceitaWS, Receita/Conecta, REDESIM e Justiça Aberta porque não foram pesquisados; algum deles poderia entrar na lista.
- Posição real do Comunica/DJEN depende de teste a partir de IP brasileiro.
- Não medi latência nem disponibilidade ao longo do tempo: cada endpoint foi chamado uma ou duas vezes, num único dia.
