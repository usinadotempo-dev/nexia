# NexIA

**NexIA** — de *nexus* (conexão, elo) + **IA**: assistente inteligente para sistemas processuais do Poder Judiciário, com foco no **PJe** (Processo Judicial Eletrônico), no formato de **extensão de navegador** (Chrome Manifest V3).

A IA atua como apoio ao usuário dentro do próprio sistema processual, com três funções na v1:

- **Anonimizador (função independente)** — aba própria: extrai todo o conteúdo do processo (com **OCR local** nos documentos digitalizados), anonimiza **100% localmente** (sem enviar dados pessoais ao modelo, atendendo às normas do CNJ) e gera um **TXT único** anonimizado. Um relatório de auditoria (nomes/dados mascarados por tipo e por documento) é exibido na tela. Também disponível como botão dentro do chat.
- **Resumir** — resumo estruturado do processo (identificação, fatos, questões jurídicas, direito aplicável, análise e situação atual), com citação dos documentos.
- **Minutar** — minutas de sentença, decisão, despacho ou voto, usando opcionalmente uma pasta local de modelos do usuário (`.docx`/`.txt`) como gabarito/referência.

Três provedores de IA (Anthropic, OpenAI, Google Gemini), com a chave do próprio usuário.

## Como compilar e instalar (Windows, cmd.exe)

Pré-requisitos: Node.js portátil em `C:\Portatil`. No **Prompt de Comando** (cmd.exe), dentro da pasta do projeto.

Os scripts internos chamam `node`/`webpack`/`tsc` sem caminho, então é preciso colocar a pasta do Node no PATH **da sessão** do cmd antes de rodar os `npm`. Faça isso uma vez por janela do cmd:

```
set "PATH=C:\Portatil\node-v24.16.0-win-x64;%PATH%"
```

Depois, na mesma janela:

```
npm install
npm run icones
npm run build
```

Para habilitar o **OCR local** (leitura de documentos digitalizados no anonimizador), baixe uma vez o idioma português do Tesseract antes do build (arquivo grande, não versionado):

```
curl -L -o assets\tesseract\lang\por.traineddata https://github.com/tesseract-ocr/tessdata_fast/raw/main/por.traineddata
```

Sem esse arquivo, o restante funciona normalmente; apenas os documentos digitalizados ficam de fora do conteúdo anonimizado.

Em seguida, em `chrome://extensions`: ative o **Modo do desenvolvedor**, clique em **Carregar sem compactação** e selecione a pasta `dist`.

Outros comandos (também após o `set PATH` acima):

```
npm run typecheck
npm test
npm run dev
```

Observação: o `set PATH` vale apenas enquanto a janela do cmd estiver aberta; ao abrir uma nova, rode-o novamente.

## Configuração

Abra as **Configurações** da extensão (ícone → botão, ou `chrome://extensions` → Detalhes → Opções):

1. Escolha o provedor de IA, informe a chave de API e o modelo.
2. (Opcional) Escolha uma pasta local com seus modelos de minuta.
3. (Opcional) Liste hosts em que a extensão deve permanecer desligada.

## Documentação

- [docs/arquitetura.md](docs/arquitetura.md) — contextos MV3, coleta do PJe, build.
- [docs/seguranca.md](docs/seguranca.md) — anonimização local, chaves, dados de processo (LGPD/CNJ).

## Repositório

https://github.com/usinadotempo-dev/nexia

## Aviso

As minutas e resumos são gerados por IA e **devem ser revisados** pelo usuário antes de qualquer uso processual. O NexIA é um produto independente; não integra nem se confunde com sistemas internos de tribunais.
