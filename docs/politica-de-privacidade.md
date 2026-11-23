# Política de Privacidade — Nexpra

**Vigência:** 22 de novembro de 2026 · **Versão da extensão:** 0.2.0
**Responsável:** Usina do Tempo (CNPJ 59.267.749/0001-42) · **Contato:** contato@nexpra.com.br
**Endereço desta página:** https://nexpra.com.br/privacidade

O Nexpra é uma extensão para o Google Chrome que ajuda profissionais a usar inteligência
artificial com documentos de trabalho, protegendo dados pessoais. Esta política explica,
de forma direta, o que acontece com as informações que você usa na extensão.

## 1. Resumo

- **O Nexpra não tem servidor.** Não coletamos, não recebemos e não armazenamos seus documentos, conversas, dados pessoais de terceiros nem chaves de API. Não há contas, rastreamento, analytics nem publicidade.
- O processamento (leitura de arquivos, reconhecimento de texto/OCR e anonimização) acontece **no seu navegador**.
- Só saem do seu navegador: (a) o texto que **você** decide enviar ao provedor de IA que **você** configurou, já pseudonimizado se a proteção estiver ligada; e (b) os parâmetros das consultas a fontes públicas que você ou a IA acionarem, sempre indicados na tela.

## 2. Dados tratados e onde ficam

| Dado | Onde fica | Por quanto tempo |
|---|---|---|
| Conteúdo de documentos, páginas, seleções e processos que você carrega | Memória do painel lateral, no seu computador | Até você fechar o painel |
| Conversas com a IA | Memória do painel lateral | Até você fechar o painel ou clicar em "Nova conversa" |
| Mapa de pseudônimos (ex.: [PESSOA_1] → nome real) | Memória do painel lateral | Até você fechar o painel. Nunca é transmitido |
| Chaves de API dos provedores de IA | Armazenamento local do Chrome, ofuscado | Até você apagá-las nas opções |
| Preferências (área, termos a mascarar, funcionalidades próprias, chaves públicas de integrações) | Armazenamento local do Chrome | Até você apagá-las |
| Biblioteca de modelos (texto de arquivos de uma pasta que você escolhe) | Banco local do navegador (IndexedDB) | Até você reindexar ou apagar os dados |
| Cabeçalhos de sessão do PJe (somente em sites *.jus.br) | Armazenamento de sessão do Chrome (memória) | Até fechar o navegador |

Os cabeçalhos de sessão do PJe são lidos apenas para baixar os documentos do processo que
você está visualizando, **do mesmo site do tribunal em que você já está autenticado**. Eles
nunca são enviados a nenhum outro destino.

## 3. Compartilhamento com terceiros

O Nexpra não vende nem compartilha dados. Há duas situações em que dados saem do seu
navegador, sempre por ação sua:

1. **Provedor de IA escolhido por você** (Google Gemini, Anthropic ou OpenAI), usando a **sua** chave de API. O conteúdo enviado é regido pelos termos e pela política de privacidade desse provedor. Com a proteção de dados ligada (padrão), nomes, documentos, contatos e outros dados pessoais são substituídos por pseudônimos **antes** do envio, e uma verificação final impede o envio de CPF, cartão SUS e cartão de pagamento válidos sem a sua confirmação.
2. **Fontes públicas de dados**, quando uma consulta é executada: BrasilAPI, ViaCEP, Banco Central do Brasil, IBGE, CNJ (DataJud), CGU (Portal da Transparência), TCU, PNCP, Senado Federal e normas.leg.br, Câmara dos Deputados, Receita Federal (calculadora da Reforma Tributária), Querido Diário, Tabela FIPE (via parallelum), NCBI/PubMed, Europe PMC, ClinicalTrials.gov, openFDA, NLM Clinical Tables, InfoDengue, api.bncc.dev, Crossref e Open-Meteo. Vão apenas os parâmetros da consulta (por exemplo, um CNPJ, um CEP, um número de processo, um termo de busca ou o nome de uma cidade), e a tela indica o que é enviado. Nenhuma consulta recebe CPF nem dados de saúde de pessoas.

## 4. Permissões do navegador

- **Painel lateral, armazenamento e menus de contexto:** funcionamento da interface e das preferências.
- **Leitura da aba ativa (activeTab/scripting):** apenas quando você pede para levar uma página ou seleção ao painel.
- **Acesso a sites *.jus.br:** conector com o PJe dos tribunais.
- **Acesso opcional à leitura de páginas:** pedido uma única vez, só se você autorizar ao usar "Página atual"; a página só é lida quando você clica no botão, e a permissão pode ser revogada em chrome://extensions. Sem ela, o menu do botão direito continua funcionando.
- **Documento offscreen:** executar o OCR localmente, fora da página.

## 5. Seus direitos (LGPD)

Como não coletamos dados em servidores, não há registros nossos a acessar, corrigir ou
excluir. Você controla tudo no próprio navegador: feche o painel para descartar a sessão; use
"Apagar todos os dados da extensão" nas opções; ou remova a extensão. Sobre dados enviados a
um provedor de IA, exerça seus direitos junto a esse provedor.

Se você usa o Nexpra para tratar dados pessoais de terceiros (clientes, pacientes, partes),
você é o controlador desse tratamento e deve observar a base legal aplicável. A
pseudonimização do Nexpra é uma medida de segurança que reduz riscos, mas é heurística e não
substitui a sua revisão.

## 6. Segurança

As chaves de API ficam apenas no seu navegador e só são lidas pelo processo em segundo plano
da extensão. O código é executado inteiramente a partir do pacote instalado, sem carregar
scripts de servidores externos.

## 7. Crianças

O Nexpra é uma ferramenta profissional e não se destina a menores de 18 anos.

## 8. Alterações

Mudanças nesta política serão publicadas nesta página, com nova data de vigência. Mudanças
relevantes (por exemplo, qualquer serviço próprio que passe a receber dados) serão
informadas na própria extensão antes de entrar em vigor.

## 9. Contato

Dúvidas e solicitações: **contato@nexpra.com.br**
