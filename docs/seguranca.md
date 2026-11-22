# Segurança e proteção de dados (LGPD)

## Princípios

1. **Nada passa por servidor do NexIA.** Não existe backend: documentos, conversas, mapa de pseudônimos e chaves ficam no navegador do usuário.
2. **Pseudonimização local e determinística, sem IA.** Nenhum trecho é enviado a modelo para "descobrir" dados pessoais (requisito das normas do CNJ sobre IA no Judiciário e boa prática LGPD em qualquer área).
3. **Defesa em profundidade.** Proteção na UI + guarda de saída no service worker + transparência em cada consulta externa.
4. **O usuário vê e decide.** Revisão entidade a entidade, prévia "como a IA vai ler", "ver como a IA viu" em cada resposta.

## Pipeline de proteção (`src/shared/anonimizador/`)

- **Detectores** (`detectores.ts`): CPF, CNPJ (numérico e alfanumérico), RG, CNH, PIS/PASEP/NIT, CNS, título de eleitor, passaporte, CEP, endereço, telefone, e-mail, OAB, registros profissionais (CRM, CRO, CRP, COREN, CREA, CAU, CRC, RQE, ART/RRT…), número de processo CNJ, chave de NF-e, placa, RENAVAM, cartão, dados bancários, PIX, data de nascimento, prontuário, IP e termos personalizados. Números "soltos" só contam se o dígito verificador fechar (`validadores.ts`); formatos pontuados e âncoras textuais ("RG nº") são sinais fortes.
- **Nomes** sem IA: dicionário local de prenomes + sobrenomes capitalizados, nomes após âncoras ("Sr.", "Dra.", "paciente", "filho de", "Nome:"), barreiras contra falsos positivos (instituições, logradouros, leis), e **pessoas conhecidas** fornecidas pelo sistema de origem (partes qualificadas do PJe → `[PARTE AUTORA]`, `[ADVOGADO DO POLO ATIVO]`…; pessoas jurídicas e entes públicos preservados).
- **Motor** (`motor.ts`): resolve sobreposições por prioridade, gera pseudônimos estáveis por sessão (`[CPF_1]` é sempre o mesmo CPF) e mantém o mapa reverso **apenas em memória**.
- **Guarda de saída** (`guarda.ts`, aplicada em `background/index.ts`): varre todo o texto de cada requisição; CPF/CNS/cartão válidos (e e-mail, se ativado) → bloqueia ou pede confirmação explícita.

## Consultas externas

- Executadas no service worker, apenas para os hosts listados em `host_permissions`.
- Cada definição declara **o que sai** do navegador (`envia`), exibido ao usuário antes e durante a consulta.
- Com a proteção ligada, o modelo só conhece marcadores; o painel resolve o marcador localmente para a consulta e pseudonimiza o retorno (ex.: nomes do quadro societário) antes de entregá-lo ao modelo.
- Nenhuma ferramenta recebe CPF ou dados de saúde de pessoas.

## Chaves de API

- Do usuário; em `chrome.storage.local` com ofuscação AES-GCM (`background/cofre-chaves.ts`). **Não é criptografia forte** (o segredo está no pacote): evita leitura casual de dumps.
- Lidas só no service worker; nunca vão ao painel nem ao content script.

## Dados em repouso

- Fontes, textos, conversas e mapa de pseudônimos: **somente memória** do painel; fechar o painel apaga.
- Conteúdo levado pelo menu de contexto passa brevemente por `chrome.storage.session` (memória, limpo ao fechar o navegador) e é removido ao ser importado.
- Configurações, receitas próprias e termos "sempre/nunca mascarar": `chrome.storage.local`. Biblioteca de modelos: IndexedDB local.
- Logs passam por redação automática (`shared/log.ts`); nenhum conteúdo de documento é logado.

## Permissões

- `host_permissions`: `*.jus.br` (conector PJe), provedores de IA e as APIs públicas curadas.
- `optional_host_permissions` (`https://*/*`): pedida **site a site**, só quando o usuário clica em "Página atual".
- `activeTab` + `scripting`: leitura da seleção/página via menu de contexto, por gesto do usuário.
