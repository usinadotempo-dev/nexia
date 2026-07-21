# Segurança e proteção de dados (LGPD / CNJ)

## Anonimização 100% local — sem envio de dados pessoais à IA

Requisito das normas do CNJ sobre uso de IA no Judiciário: **dados pessoais não podem ser enviados ao modelo**. O NexIA garante isso sem depender do modelo para identificar nada.

O pipeline (`src/content/anonimizador/`) é inteiramente local e determinístico:

1. **Documentos digitalizados → OCR local** (`../pje/ocr-local.ts`, Tesseract/WASM). O reconhecimento de texto roda na própria máquina; a imagem nunca sai. O texto reconhecido segue para os passos de anonimização abaixo. Se o idioma do OCR não estiver instalado, o documento digitalizado é excluído do conteúdo (o restante continua funcionando).

2. **Nomes de pessoas → papel processual** (`partes-local.ts`). Usa os **dados estruturados de partes com qualificação que o próprio PJe fornece** (polos ativo/passivo/outros, com nome e papel). Cada nome de pessoa física é substituído por `[PARTE AUTORA]`, `[PARTE RÉ]`, `[ADVOGADO DO POLO ATIVO]`, `[PERITO]` etc. O casamento é acento- e caixa-insensível (`regexDeNome`). Pessoas jurídicas e entes públicos (INSS, União, municípios, empresas) são preservados por não constituírem dado pessoal.

3. **Dados sensíveis por regex** (`regex-local.ts`): CPF, CNPJ, RG, CEP, telefone, e-mail, OAB, dados bancários e número de processo → marcadores `[... OMITIDO]`. O RG não colide com referências de leis (`8.213/91`) nem números de processo.

Depois disso, **apenas o texto anônimo** permanece em memória. Um **mapa reverso** (substituto → nome original) fica só na memória da aba e serve para reexibir os nomes reais nas respostas — os nomes reais nunca saem da máquina.

**Função independente e auditável** (`fluxo.ts`, aba "Anonimizar"): o usuário extrai o processo (com OCR nos digitalizados), anonimiza e baixa um **TXT único** contendo apenas o texto anonimizado. A interface exibe um **relatório de auditoria** (quantos nomes e dados pessoais foram mascarados, por tipo e por documento) — o relatório fica na tela, não no arquivo.

Nenhuma chamada de rede ocorre durante a anonimização — inclusive o OCR é 100% local.

## Chaves de API

- Fornecidas pelo usuário; guardadas em `chrome.storage.local` com ofuscação AES-GCM (chave derivada por PBKDF2 de um segredo do build) — `src/background/cofre-chaves.ts`.
- **Isto não é criptografia forte**: o segredo está no pacote da extensão. Serve apenas para evitar leitura casual de dumps de storage.
- As chaves só são lidas no service worker e nunca trafegam para o content script.

## Dados de processo

- Conteúdo de autos e histórico de chat vivem **apenas em memória** — nunca em `chrome.storage.local` nem em disco.
- Logs passam por redação automática de PII (`src/shared/log.ts`); nenhum outro módulo deve chamar `console.*` diretamente.
- Snapshots de auth ficam em `chrome.storage.session` (limpos ao fechar o navegador).

## Rede

- `host_permissions` restritos a `*.jus.br` e aos três provedores de IA.
- Chamadas de IA saem apenas do service worker; chamadas ao PJe apenas do content (same-origin).
