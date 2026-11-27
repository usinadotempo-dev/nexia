# Nexpra (antigo NexIA)

> O produto se chama **Nexpra** desde 22/11/2026. A pasta do projeto e o repositório ainda se chamam `NexIA`/`nexia`; identificadores internos (chaves de storage `nexia.*`, porta `nexia-chat`, eventos `nexia:*`, ids, arquivos `nexia-*.png`) foram mantidos de propósito por compatibilidade — não renomeá-los sem migração.

IA com proteção de dados para profissionais de **qualquer área** (jurídico, contabilidade, saúde, engenharia/arquitetura, RH/DP, geral), em formato de **extensão de navegador** (Chrome Manifest V3) com painel lateral. O PJe é um conector especializado, não mais o foco único.

## Identidade do projeto

- **Natureza:** Produto comercial multiárea. Nasceu como versão generalizada do pAIdegua para uso fora da JFCE.
- **Identidade visual:** preto e branco, minimalista, com UX cuidadosa (estados com texto/ícone, nunca só cor; foco visível; claro/escuro automático). Distinta do pAIdegua.
- **Backend:** nenhum por decisão (ver `docs/visao-multiarea.md` — gatilhos para Cloudflare D1/R2). Pseudonimização e mapa de reidentificação sempre no cliente.
- **Relação com o pAIdegua:** código novo e independente; herda o *conhecimento* (contratos do PJe, padrões de coleta, arquitetura MV3), não o código. O pAIdegua continua interno à JFCE.
- **Referência ao pAIdegua:** o repositório está em `C:\Users\vsousaesilva\OneDrive - Justica Federal no Ceara\Área de Trabalho\Claude JF\paidegua` — pode ser lido para consulta (contratos do PJe, padrões de coleta SSR, page world, etiquetas), mas nunca copiado literalmente nem referenciado como dependência.
- **Idioma:** Português (Brasil). Commits em português, descritivos, sem emojis.

## Decisões de arquitetura

- **Formato:** extensão Chrome MV3 (roda dentro do PJe, sem servidor obrigatório).
- **Generalização:** nada específico de um tribunal hardcoded — URLs, órgãos julgadores e particularidades de instância devem ser configuráveis.
- **Dados sensíveis:** CPF, números de processo e dados de partes nunca em logs ou saídas de debug (LGPD).
- **Integrações:** apenas APIs oficiais/documentadas do PJe, CNJ e tribunais.

## Ambiente de desenvolvimento (portáteis)

Máquina sem Node/Git/PowerShell no PATH. Executáveis em `C:\Portatil\` — invocar por caminho absoluto entre aspas:

- Node.js: `C:\Portatil\node-v24.16.0-win-x64\node.exe` (npm em `npm.cmd` na mesma pasta)
- Git: `C:\Portatil\PortableGit\cmd\git.exe`
- PowerShell 7: `C:\Portatil\PowerShell-7.6.1-win-x64\pwsh.exe`

## Histórico

- 21/07/2026 — projeto criado; definidos nome, escopo (produto multi-tribunal) e formato (extensão MV3).
- 22/11/2026 — v0.2.0: virada multiárea (painel lateral, 6 áreas com receitas, anonimizador universal sem IA com guarda de saída, 18 consultas a APIs públicas com function calling nos 3 provedores, cálculos determinísticos, saída .docx), identidade P&B e ícone novo. Testes: `npm test` (node --test, sem dependências).
- 22/11/2026 — renomeado de NexIA para **Nexpra** antes da 1ª publicação (domínios nexia ocupados; conflito com a marca Nexia International, do ramo contábil). Logo e identidade P&B mantidas. Preparado para a Chrome Web Store (`npm run pacote`, `docs/publicacao-cws.md`).
- 22/11/2026 — expansão fase 1 (pesquisa em `reports/Expansão do Nexpra perfis APIs MCP.md`): 14 perfis (novos: psicologia, educação, imobiliário, seguros, finanças, contratações públicas, serviço social, cartórios, em `src/shared/areas/novas-areas.ts`), 32 consultas (novas: lei federal via Senado/normas.leg.br, certidão TCU, PNCP, Querido Diário, SINAPI, Focus, taxas de juros BCB, Reforma Tributária, FIPE, Europe PMC, ClinicalTrials, FAERS, InfoDengue, BNCC), resposta em streaming também com consultas, esforço de raciocínio configurável. MCP adiado (fase 3); conectores MCP nativos dos provedores descartados por quebrarem a pseudonimização. Open-Meteo mantido enquanto o produto for gratuito.
- 26/11/2026 — 16ª área: Segurança e saúde do trabalho (`SST` em `novas-areas.ts`), com 11 receitas e dois cálculos locais, `dimensionar_sesmt` (NR-4, Anexo II) e `dimensionar_cipa` (NR-5, Quadro I), em `src/shared/calculos/sst.ts`. Pendentes: grau de risco por CNAE (Anexo I da NR-4) e CA de EPI, por falta de fonte oficial legível por máquina.
- Comandos npm exigem antes, no cmd: `set "PATH=C:\Portatil\node-v24.16.0-win-x64;%PATH%"`.
