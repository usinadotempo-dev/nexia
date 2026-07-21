# NexIA

Assistente inteligente para sistemas processuais (foco: PJe), em formato de **extensão de navegador** (Chrome Manifest V3).

## Identidade do projeto

- **Natureza:** Produto — versão generalizada do pAIdegua para uso fora da JFCE (outros tribunais e instituições).
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
