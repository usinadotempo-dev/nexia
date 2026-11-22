# NexIA

IA com proteção de dados para profissionais de qualquer área — advocacia, contabilidade,
saúde, engenharia/arquitetura, RH/DP e uso geral. Extensão Chrome (MV3), sem servidor.

- **Fontes**: PDF (inclusive digitalizado, com OCR local), Word, imagens, XML de NF-e, CSV, página atual, seleção, processo do PJe.
- **Proteção**: pseudonimização 100% local (sem IA) de nomes, documentos, contatos e mais 20 tipos de dado, com revisão e prévia. Funciona sem chave de IA.
- **Assistente**: receitas prontas por área, conversa com streaming, saída em Word.
- **Consultas**: 18 fontes públicas oficiais (CNPJ, DataJud, BCB, IBGE, Câmara, PubMed, openFDA, Crossref…) e cálculos determinísticos de prazo e correção.

Documentação: [visão e roadmap](docs/visao-multiarea.md) · [arquitetura](docs/arquitetura.md) · [segurança e LGPD](docs/seguranca.md) · [OCR local](HANDOFF.md).

## Rodar (ambiente portátil, terminal cmd.exe)

Os scripts do npm chamam `node` pelo PATH; por isso, em cada janela nova do cmd, rode
primeiro a linha `set` (vale só para aquela janela):

```cmd
set "PATH=C:\Portatil\node-v24.16.0-win-x64;%PATH%"
npm install
npm test
npm run typecheck
npm run icones
npm run build
```

Depois: `chrome://extensions` → Modo do desenvolvedor → **Carregar sem compactação** → pasta `dist/`.
Clique no ícone do NexIA para abrir o painel lateral. Os modelos do OCR ficam em
`public/assets/models/` (ver [HANDOFF.md](HANDOFF.md)).
