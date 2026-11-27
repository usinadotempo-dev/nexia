# Publicação na Chrome Web Store — Nexpra 0.2.0

Textos prontos para colar no painel do desenvolvedor (chrome.google.com/webstore/devconsole)
e o passo a passo. Campos entre colchetes devem ser preenchidos por você.

## Expansão de 22/11/2026 — o que muda no cadastro da loja

Com a fase 1 da expansão (15 perfis, com Síndico, e 32 consultas), atualize no painel, antes de enviar para revisão:

- **Justificativa da permissão de host:** acrescente à lista de fontes públicas os endereços novos (linha "Hosts das fontes públicas" da seção 3, já atualizada): Senado e normas.leg.br (texto de leis), TCU (certidão), PNCP (licitações), Querido Diário, Receita/Reforma Tributária, FIPE via parallelum, Europe PMC, ClinicalTrials.gov, InfoDengue e api.bncc.dev.
- **Descrição:** não listar perfis, formatos de arquivo, tipos de dado nem fontes. A 0.2.0 foi rejeitada em 24/11/2026 por "palavras-chave excessivas" (referência Yellow Argon) por causa das enumerações; a descrição da seção 2 foi reescrita em frases corridas e vale para qualquer versão.
- **Política de privacidade:** reenvie a pasta `site/` ao Cloudflare (a lista de fontes consultadas mudou).

## Área SST (26/11/2026)

A 16ª área, Segurança e saúde do trabalho, não acrescenta permissão de host nem fonte externa: os dimensionamentos de SESMT (NR-4) e CIPA (NR-5) são cálculo local. Nada muda no cadastro da loja. Antes de publicar a versão: conferir os dois quadros de `src/shared/calculos/sst.ts` contra o PDF oficial das NRs no site do MTE (foram transcritos de reproduções e conferidos entre duas fontes, não contra o PDF) e reenviar `site/` e o `site-worker` (lista de áreas do formulário de acesso).

## Decisões tomadas (22/11/2026)

- **Nome:** Nexpra. INPI: busca exata por "nexpra" nas classes 9 e 42 sem resultados. Domínio `nexpra.com.br` solicitado.
- **Visibilidade inicial:** Não listado; mudar para Público depois da validação (seção 4).
- **Open-Meteo (clima histórico):** fica ligado.
- **Política de privacidade:** `site/privacidade.html` → publicar em https://nexpra.com.br/privacidade (responsável: Usina do Tempo; contato: contato@nexpra.com.br).

## 0. Enquanto o domínio nexpra.com.br é liberado

Nada da publicação depende do domínio estar pronto:

1. **Política no ar já, sem domínio:** Cloudflare → Workers & Pages → Create → Pages → **Upload assets** → nome do projeto `nexpra` → arraste a pasta `site/`. Ela fica em `https://nexpra.pages.dev/privacidade` (se o nome `nexpra` estiver tomado, o Cloudflare sugere outro; use o que ele der). Use essa URL na loja agora. Quando o domínio liberar, em *Custom domains* do mesmo projeto adicione `nexpra.com.br`; o endereço `.pages.dev` continua funcionando, então nada quebra na loja — depois, se quiser, troque a URL no painel da loja para `https://nexpra.com.br/privacidade`.
2. **Conta de desenvolvedor da Chrome Web Store:** criar, pagar a taxa e ativar a verificação em duas etapas. Na declaração de comerciante: Usina do Tempo, CNPJ 59.267.749/0001-42, endereço e telefone comerciais. Como `contato@nexpra.com.br` ainda não existe, use provisoriamente um e-mail que você já recebe e troque depois (o e-mail de contato exige verificação).
3. **Rascunho completo na loja:** enviar `release/nexpra-0.2.0.zip`, preencher ficha (seção 2), privacidade (seção 3), distribuição como Não listado (seção 4) e imagens (seção 5). O rascunho fica salvo; envie para revisão assim que a URL da política responder.
4. **Capturas de tela:** use os textos fictícios de `docs/demo/` (contrato e anotações clínicas) — mostram nomes, CPF, RG, endereço, telefone, CNS, prontuário e CRM sendo pseudonimizados, e o CNPJ público do Banco do Brasil para a demonstração de consulta.

### E-mail contato@nexpra.com.br (Cloudflare Email Routing)

Pré-requisito: o domínio precisa usar os servidores DNS do Cloudflare.

1. Cloudflare → **Add a domain** → `nexpra.com.br` → plano Free. O Cloudflare mostra **dois nameservers**.
2. No registro.br, em `nexpra.com.br` → **Alterar servidores DNS** → informe os dois nameservers do Cloudflare. A delegação costuma levar de minutos a algumas horas.
3. Quando o Cloudflare indicar o domínio como *Active*: **Email** → **Email Routing** → *Get started* → crie o endereço `contato` → destino: o seu e-mail atual (confirme pelo link que chega nele). O Cloudflare cria sozinho os registros MX e TXT.
4. Teste mandando um e-mail para `contato@nexpra.com.br`.

O Email Routing **recebe e encaminha**. Para **responder como** contato@nexpra.com.br, configure depois um serviço de envio (ex.: "Enviar e-mail como" no Gmail com SMTP de um provedor transacional) e publique o registro SPF correspondente.

## 1. Antes de enviar (checklist)

- [ ] Conta de desenvolvedor criada (taxa única de US$ 5), com verificação em duas etapas.
- [ ] Declaração de **comerciante (trader)** no painel: como o Nexpra é um produto comercial, a UE (DSA) exige expor nome, endereço, e-mail e telefone de contato na página da loja.
- [ ] Política de privacidade (`docs/politica-de-privacidade.md`) com responsável e e-mail preenchidos, publicada em **URL pública** (ver seção 6).
- [ ] Decisão sobre o Open-Meteo (seção 7).
- [ ] Testes manuais feitos no Chrome com o `dist/` (painel, proteção, consultas, assistente, menu de contexto, OCR, PJe).
- [ ] Pacote gerado: `npm run pacote` → `release/nexpra-0.2.0.zip`.
- [ ] Capturas de tela feitas (seção 5).

## 2. Ficha da loja

**Nome:** Nexpra

**Resumo (até 132 caracteres — já é a descrição do manifesto):**
IA com proteção de dados para profissionais: anonimização local, funcionalidades por área, fontes públicas e conectores jurídicos.

**Categoria:** Produtividade (Ferramentas também serve; Produtividade tem mais tráfego para o público profissional).

**Idioma:** Português (Brasil)

**Descrição detalhada:**

```
Use inteligência artificial com documentos de trabalho sem expor dados pessoais.

O Nexpra é um painel lateral do Chrome para profissionais que precisam usar IA com documentos que contêm dados de clientes, pacientes ou funcionários, respeitando a LGPD.

Proteção de dados no seu computador

Antes de qualquer envio à IA, o Nexpra troca os dados pessoais do documento por pseudônimos como [PESSOA_1]. Essa etapa é feita no seu computador, por regras e dicionário, sem participação de IA. Você revisa o que foi mascarado e vê exatamente o texto que a IA vai ler. As respostas voltam com os dados reais apenas na sua tela. Uma verificação final avisa se algum documento de identificação válido estiver prestes a sair. O anonimizador também funciona sozinho, sem IA: você protege um documento e copia o texto para usar onde quiser.

Funcionalidades para a sua área

Ao escolher a sua área profissional, o painel oferece tarefas prontas para o seu dia a dia, como resumir um caso, analisar um contrato ou redigir um relatório. Você também pode criar as suas próprias tarefas e usar uma pasta de modelos seus como referência de estilo.

Consultas a fontes públicas oficiais

O assistente consulta bases públicas brasileiras, como cadastro de empresas e índices econômicos, enquanto responde. Você sempre vê o que foi consultado. Cálculos de prazo e de correção monetária são feitos por código, e não estimados pela IA.

Seus documentos

Carregue arquivos do computador, inclusive digitalizados, ou leve ao painel a página aberta no navegador. O reconhecimento de texto de documentos digitalizados é feito localmente. As respostas podem ser exportadas para o Word.

Conector PJe

Em tribunais que usam o PJe, o processo aberto pode ser importado com um clique, e as partes são pseudonimizadas pelo papel que ocupam no processo.

Privacidade

O Nexpra não tem servidor próprio, conta, rastreamento nem anúncios. Você usa a sua própria chave de um provedor de IA. Documentos e conversas ficam apenas na memória do painel e são apagados quando ele é fechado.

O Nexpra é uma ferramenta de apoio. A responsabilidade técnica pelo uso do conteúdo gerado é do profissional.
```

## 3. Aba "Privacidade" do painel

**Finalidade única (single purpose):**

```
Permitir que profissionais usem inteligência artificial com seus documentos de trabalho de forma segura: o Nexpra extrai o texto de documentos e páginas escolhidos pelo usuário, pseudonimiza localmente os dados pessoais e envia o conteúdo protegido ao provedor de IA configurado pelo próprio usuário, com apoio de consultas a fontes públicas oficiais.
```

**Justificativas das permissões:**

| Permissão | Texto para colar |
|---|---|
| `sidePanel` | A interface principal do Nexpra é um painel lateral, onde o usuário carrega documentos, revisa a anonimização e conversa com a IA. |
| `storage` | Guardar localmente as preferências do usuário (área profissional, termos a mascarar, funcionalidades próprias) e suas chaves de API. Nenhum dado é enviado a servidor do Nexpra. |
| `offscreen` | Executar o reconhecimento de texto (OCR) de documentos digitalizados localmente, com ONNX Runtime, fora do service worker. As imagens nunca saem do computador. |
| `contextMenus` | Oferecer no menu do botão direito as opções "levar seleção/página para o painel". |
| `activeTab` | Ler a seleção ou o texto da página atual somente quando o usuário clica no menu de contexto do Nexpra. |
| `scripting` | Extrair o texto selecionado ou visível da aba quando o usuário pede explicitamente para levá-lo ao painel. |
| Hosts `https://*.jus.br/*` | Conector com o PJe (sistema processual eletrônico usado por vários tribunais brasileiros, todos sob jus.br): detectar um processo aberto e baixar seus documentos usando a sessão que o usuário já tem no próprio tribunal. Os cabeçalhos de sessão são usados apenas para requisições ao mesmo site e nunca são enviados a outro destino. |
| Hosts dos provedores de IA (`api.anthropic.com`, `api.openai.com`, `generativelanguage.googleapis.com`) | Enviar ao provedor de IA escolhido pelo usuário, com a chave do próprio usuário, o conteúdo que ele decidiu submeter (pseudonimizado por padrão). |
| Hosts das fontes públicas (brasilapi.com.br, viacep.com.br, api.bcb.gov.br, olinda.bcb.gov.br, servicodados.ibge.gov.br, api.portaldatransparencia.gov.br, dadosabertos.camara.leg.br, legis.senado.leg.br, normas.leg.br, certidoes-apf.apps.tcu.gov.br, pncp.gov.br, api.queridodiario.org.br, consumo.tributos.gov.br, parallelum.com.br, eutils.ncbi.nlm.nih.gov, www.ebi.ac.uk, clinicaltrials.gov, api.fda.gov, clinicaltables.nlm.nih.gov, info.dengue.mat.br, api.bncc.dev, api.crossref.org, open-meteo.com) | Consultas a dados públicos oficiais (CNPJ, CEP, índices econômicos, processos públicos, legislação, literatura científica, bulas, clima), acionadas pelo usuário ou pela IA a pedido dele, com indicação na tela do que é enviado. |
| Hosts opcionais (`https://*/*`, `http://*/*`) | Permissão opcional, pedida em tempo de execução uma única vez e somente se o usuário a autorizar ao clicar em "Página atual"; a página só é lida quando o usuário clica no botão. Sem ela, o usuário pode levar a página pelo menu de contexto (activeTab). Revogável em chrome://extensions. |

**Código remoto:** "Não, não estou usando código remoto." Todo o JavaScript e o WebAssembly (ONNX Runtime, pdf.js, modelos de OCR) vão dentro do pacote.

**Uso de dados (formulário de divulgação):** marque as categorias abaixo. Nenhum desses dados vai para servidor do desenvolvedor; a loja considera "uso" também o processamento local e o envio a terceiros por ação do usuário, então é mais seguro declarar.

- [x] Informações de identificação pessoal: documentos carregados pelo usuário podem conter (pseudonimizados antes do envio à IA).
- [x] Informações de saúde: idem, quando o profissional de saúde carrega documentos clínicos.
- [x] Informações financeiras e de pagamento: idem (notas, extratos), com detecção e bloqueio de cartões.
- [x] Informações de autenticação: chaves de API (locais) e cabeçalhos de sessão do PJe (usados só no próprio tribunal).
- [x] Conteúdo do site: texto da página ou seleção, quando o usuário pede.
- [ ] Comunicações pessoais, local, histórico da web, atividade do usuário: **não**.

E marque as três certificações: não vender/transferir dados a terceiros fora dos casos de uso aprovados; não usar nem transferir para fins não relacionados à finalidade única; não usar para avaliar crédito ou conceder empréstimos.

**URL da política de privacidade:** https://nexpra.com.br/privacidade

## 4. Distribuição

- **Visibilidade:** começar como **Não listado** (só quem tem o link instala). Valide com 5–10 usuários reais de áreas diferentes; depois troque para **Público** em "Distribuição" → "Visibilidade" no painel — não é preciso enviar um novo pacote para isso.
- **Regiões:** Brasil (ou todas — a interface é em português).
- **Preço:** gratuito (a loja não processa mais pagamentos; licenciamento, se houver, será próprio — ver `visao-multiarea.md`).

## 5. Imagens

| Item | Formato | Sugestão |
|---|---|---|
| Ícone da loja | 128×128 PNG | `public/icons/nexia-128.png` (já gerado) |
| Capturas de tela (1 a 5, obrigatório ao menos 1) | 1280×800 ou 640×400, PNG/JPEG | 1) Proteção mostrando [PESSOA_1]/[CPF_1] e a prévia; 2) Assistente com uma funcionalidade e o chip "Consultou: CNPJ"; 3) Escolha de área; 4) Consultas (correção monetária); 5) Painel ao lado de um documento. **Use somente dados fictícios.** |
| Bloco promocional pequeno | 440×280 PNG | Fundo preto, ícone branco e a frase "IA com proteção de dados" |

Para capturar em 1280×800: abra uma janela do Chrome nesse tamanho, painel aberto, e use a captura de tela do Windows (Win+Shift+S).

## 6. Onde hospedar a política de privacidade

Opções, da mais simples à mais profissional:

1. **GitHub Pages** do repositório (se público) ou de um repositório só com a política.
2. **Cloudflare Pages** com um domínio próprio (ex.: nexia.[seu-domínio]/privacidade) — combina com a futura página do produto.
3. Google Sites.

Precisa ser uma página acessível sem login. Um link para arquivo no Google Drive costuma ser recusado.

## 7. Open-Meteo (decidido: fica ligado)

O plano gratuito do Open-Meteo é para uso **não comercial**. Enquanto o Nexpra for distribuído
gratuitamente e sem receita, o uso tende a ser aceitável. **Gatilho de revisão:** no dia em que
houver cobrança (licença, assinatura ou créditos), contratar o plano comercial do Open-Meteo ou
trocar a fonte pelo INMET antes de faturar.

## 8. O que costuma atrasar ou reprovar a revisão

- Permissões amplas sem justificativa clara → use os textos da seção 3.
- Descrição prometendo o que não faz, ou com listas de termos separados por vírgula (formatos, siglas, áreas, fontes) → a revisão trata como palavras-chave excessivas; escreva em frases.
- Política de privacidade ausente ou inacessível.
- Capturas com dados reais de pessoas.
- Primeira revisão com hosts amplos (`*.jus.br`) e scripts no "MAIN world" pode ir para análise detalhada: prazo de alguns dias a algumas semanas.

## 9. Atualizações

1. Suba a versão em `package.json` **e** em `public/manifest.json` (o empacotador confere se batem).
2. `npm run pacote` → envie o novo `.zip` em "Pacote" → "Enviar nova versão".
3. Se acrescentar permissões, os usuários terão de reaceitá-las — evite quando possível.
