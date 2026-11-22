# NexIA multiárea — visão, decisões e roadmap

> Versão 0.2.0 (22/11/2026). O NexIA deixa de ser um assistente só do PJe e passa a ser
> **uma camada de IA com proteção de dados para qualquer profissional** — advocacia,
> contabilidade, saúde, engenharia/arquitetura, RH/DP e uso geral — mantendo o PJe como
> um conector especializado.

## A proposta de valor, em uma frase

**Use qualquer IA com documentos sensíveis sem expor dados pessoais**: o NexIA extrai o
conteúdo (inclusive de digitalizados, com OCR local), pseudonimiza localmente, entrega à IA
com receitas da sua área e com acesso a fontes públicas oficiais, e devolve a resposta com os
dados reais só na sua tela.

## O que existe na 0.2.0

| Pilar | O que faz | Onde |
|---|---|---|
| **Painel lateral** | Espaço de trabalho em qualquer site: Fontes → Assistente → Proteção → Consultas. Abre pelo ícone, pelo menu de contexto ("levar seleção/página para o painel") ou pelo botão no PJe. | `src/sidepanel/` |
| **Áreas profissionais** | 6 perfis com persona, aviso de responsabilidade, detectores padrão, consultas e 6–8 receitas cada (≈ 40 receitas). Receitas próprias nas opções. | `src/shared/areas/` |
| **Anonimizador universal** | 25 tipos de dado (CPF/CNPJ inclusive alfanumérico, CNS, PIS, título, CNJ, NF-e, placas, endereços, registros profissionais, prontuário…), com validação de dígito verificador; nomes por dicionário + âncoras ("Sr.", "paciente", "filho de") — **sem IA**. Pseudônimos estáveis e reversíveis; revisão entidade a entidade; termos "sempre/nunca mascarar"; prévia destacada; TXT protegido + relatório. Funciona **sem chave de IA**. | `src/shared/anonimizador/`, aba Proteção |
| **Guarda de saída** | Última barreira no service worker: CPF/CNS/cartão (com DV) no que vai sair → bloqueia ou pede confirmação. Independe da UI. | `background/index.ts`, `anonimizador/guarda.ts` |
| **Consultas (APIs públicas)** | 18 ferramentas usáveis manualmente e pela IA (function calling nos 3 provedores). Marcadores como `[CNPJ_1]` são resolvidos **localmente** só para a consulta; o retorno é pseudonimizado de novo antes de voltar à IA. Cada consulta mostra o que saiu do navegador. | `src/shared/ferramentas/`, `background/ferramentas/` |
| **Cálculos determinísticos** | Prazos (dias úteis/corridos, CPC 219/224, recesso 220), correção monetária por índice oficial, número CNJ → tribunal. A IA nunca faz conta de cabeça. | `src/shared/calculos/` |
| **Fontes** | PDF (nativo ou digitalizado com OCR PP-OCR local), Word, imagens, XML de NF-e (resumo estruturado), CSV/TXT/JSON/HTML, página atual, seleção, processo do PJe. | `src/sidepanel/extracao.ts` |
| **Saída** | Markdown renderizado com segurança, copiar como texto, **.docx** gerado localmente, "usar como fonte" (encadear tarefas), "ver como a IA viu". | `src/shared/docx.ts` |
| **Identidade P&B** | Preto e branco, minimalista, claro/escuro automático, foco visível, estados sempre com texto/ícone (nunca só cor), alvos ≥ 32 px, navegação por teclado nas abas. Ícone novo: N cuja última haste vira um "i". | `sidepanel.css`, `assets/icone-fonte.svg` |

## Curadoria das APIs públicas

Critérios: gratuita sem OAuth (no máximo chave gratuita), HTTPS, fonte oficial ou projeto
aberto reconhecido, **não exige enviar dado pessoal**, utilidade prática por profissão. O
catálogo `public-apis/public-apis` foi consultado como insumo; a maior parte das entradas
gerais (câmbio de terceiros, dicionários só em inglês, feriados de outros países) foi
descartada por já haver fonte oficial brasileira melhor ou por baixa utilidade.

| Ferramenta | Fonte | Áreas | Para quê |
|---|---|---|---|
| Consultar CNPJ | BrasilAPI (Receita) | todas | Cadastro, CNAE, Simples/MEI, QSA |
| Sanções CEIS/CNEP | CGU — Portal da Transparência (chave grátis) | jurídico, contábil, engenharia | Due diligence, licitações, compliance |
| CNAE / NCM / código IBGE | IBGE, BrasilAPI | contábil, RH, engenharia | Enquadramento, classificação fiscal, NF |
| CEP | BrasilAPI / ViaCEP | todas | Endereços |
| Correção monetária | BCB SGS (IPCA, IPCA-E, INPC, IGP-M, IGP-DI, SELIC, CDI, INCC, INCC-M) | jurídico, contábil, engenharia, RH | Atualização de débitos, reajustes de contrato/obra |
| Taxas atuais / PTAX | BrasilAPI, BCB Olinda | contábil, geral | Juros, câmbio oficial |
| Feriados / prazos | BrasilAPI + cálculo local | jurídico, contábil, RH, engenharia | Vencimentos, cronogramas |
| Processo no DataJud | CNJ — API Pública | jurídico | Classe, assuntos, órgão, movimentações |
| Proposições na Câmara | Câmara — Dados Abertos | jurídico, contábil | Acompanhamento legislativo (ex.: reforma tributária) |
| PubMed | NCBI E-utilities | saúde | Evidência científica com PMID |
| Bula (FDA) | openFDA | saúde | Interações, posologia, contraindicações (em inglês) |
| CID-10 | NLM Clinical Tables (ICD-10-CM) | saúde | Codificação (confirmar descrição em PT) |
| Verificar referência | Crossref | todas | Evitar citações inventadas (DOI) |
| Clima histórico | Open-Meteo (ERA5) | engenharia, jurídico, geral | Dias de chuva em obra, perícias de sinistro |

Avaliadas e **não incluídas** (por ora): LexML (bloqueio anti-robô no acesso automatizado),
Frankfurter/AwesomeAPI/currency-api (o PTAX oficial do BCB já cobre o BRL), dicionários em
inglês, Nager.Date/Calendarific (BrasilAPI já cobre feriados nacionais), serviços que
receberiam dados de clientes (agendamento, geocodificação de endereço de pessoa).

**Atenção comercial:** o plano gratuito do Open-Meteo é para uso não comercial. Para vender o
NexIA com essa consulta ativa, contrate o plano comercial do Open-Meteo ou use os dados do
INMET (BDMEP) — ver roadmap.

## Extensão pura ou backend (Cloudflare D1/R2)?

**Decisão: continuar 100% extensão nesta fase.** O principal diferencial do produto é que
nada passa por servidor do NexIA — nem documentos, nem o mapa de pseudônimos, nem as chaves.
Um backend agora acrescentaria custo, superfície de ataque e obrigações de LGPD (o NexIA
passaria a ser operador) sem destravar nenhuma funcionalidade da 0.2.0: as APIs públicas são
chamadas direto do service worker (sem problema de CORS), o OCR é local e a IA é chamada com
a chave do próprio usuário.

**Gatilhos que justificam um backend Cloudflare** (e o desenho recomendado):

| Gatilho | Serviço | Dados que trafegariam |
|---|---|---|
| Vender licenças/assinaturas e controlar ativação | Worker + D1 (contas, licenças, assentos) | e-mail e status da licença — nada de conteúdo |
| Biblioteca de receitas e modelos **da equipe/escritório** | D1 (metadados, versões) + R2 (arquivos de modelo) | modelos do escritório, idealmente já sem dados pessoais |
| Oferecer IA "sem chave" (créditos pré-pagos) | Worker como proxy de LLM + D1 (uso/saldo) | **texto já pseudonimizado** (a anonimização continua no cliente) |
| Tabelas grandes de referência (CID-10 PT completa, CBO, SINAPI, TUSS) | R2 servindo arquivos estáticos versionados, cacheados localmente | nenhum dado do usuário |

Regra de ouro para qualquer backend futuro: **pseudonimização e mapa de reidentificação
permanecem sempre no cliente.** O servidor só vê texto protegido ou metadados.

## Roadmap sugerido

**Curto prazo (0.3)**
- CID-10 oficial em português (DATASUS) embarcada como tabela local (busca sem rede).
- Clima por estação do INMET (BDMEP) para uso pericial; plano comercial Open-Meteo como alternativa.
- Feriados estaduais/municipais e suspensões por tribunal (tabela configurável) no cálculo de prazos.
- Juros de mora e regras de atualização judicial (EC 113/2021: SELIC) no cálculo de correção.
- Leitura de planilhas .xlsx (sem dependência, via leitor de ZIP já existente).
- Histórico opcional de conversas **protegidas** (só texto pseudonimizado) em IndexedDB, com expiração.

**Médio prazo**
- Conectores de outros sistemas (eproc, SEI, sistemas de prontuário/ERP via página atual com extratores dedicados).
- Receitas compartilháveis por arquivo (importar/exportar JSON) — semente da biblioteca de equipe.
- Detector de nomes com dicionário de sobrenomes + lista de entidades públicas por UF.
- Modo "copiar para qualquer IA": prompt pronto + texto protegido, para quem usa ChatGPT/Gemini web.

**Se/quando houver backend** — ver gatilhos acima (licenças, equipe, créditos, tabelas grandes).

## Limites conhecidos (transparência)

- A detecção de nomes é heurística: nomes raros fora do dicionário e sem âncora podem passar,
  e algumas expressões com prenome (ruas, eventos) podem ser mascaradas. A aba Proteção existe
  para essa revisão humana; a guarda de saída cobre os identificadores numéricos críticos.
- A chave pública do DataJud é divulgada pelo CNJ e pode mudar; o campo é editável nas opções.
- Bula FDA e CID-10-CM são fontes norte-americanas (em inglês): úteis como apoio, não substituem bula ANVISA nem a CID-10 oficial.
