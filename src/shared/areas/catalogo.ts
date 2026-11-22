/**
 * Catálogo de áreas profissionais do NexIA. Cada área define a persona do
 * assistente, os detectores de anonimização ligados por padrão, as ferramentas
 * (APIs públicas e cálculos) que a IA pode usar e as receitas (prompts prontos).
 * Nada aqui é específico de uma instituição.
 */
import type { TipoEntidade } from '../anonimizador/detectores.ts';
import type { Area, AreaId, Receita, ReceitaPersonalizada } from './tipos.ts';

const BASE_PII: TipoEntidade[] = [
  'PESSOA', 'CPF', 'RG', 'CNH', 'PIS', 'CNS', 'TITULO_ELEITOR', 'PASSAPORTE', 'CEP', 'ENDERECO', 'TELEFONE', 'EMAIL',
  'CARTAO', 'CONTA_BANCARIA', 'PIX', 'DATA_NASCIMENTO', 'RENAVAM', 'PLACA', 'IP', 'PERSONALIZADO'
];

const RESPOSTA_ESTRUTURADA = 'Use títulos curtos, listas e tabelas quando ajudarem a leitura.';

// ---------------------------------------------------------------------------

const JURIDICO: Area = {
  id: 'juridico',
  nome: 'Jurídico',
  publico: 'Advocacia, departamentos jurídicos e Judiciário',
  sigla: 'JUR',
  persona: `Atue como assistente jurídico sênior no Brasil, para advogados, departamentos jurídicos e servidores do Judiciário.
- Linguagem técnico-jurídica, precisa e objetiva.
- Cite dispositivos legais apenas quando tiver segurança; nunca invente número de julgado, súmula, tema ou ementa — se não tiver certeza, indique "verificar jurisprudência atualizada".
- Prazos processuais e correção monetária devem ser calculados com as ferramentas disponíveis, nunca de cabeça.`,
  aviso: 'Conteúdo de apoio. A responsabilidade técnica pela peça ou decisão é do profissional.',
  detectoresPadrao: [...BASE_PII, 'OAB', 'REGISTRO_PROFISSIONAL', 'PROCESSO', 'CNPJ', 'PRONTUARIO'],
  ferramentas: ['consultar_processo_datajud', 'calcular_prazo', 'corrigir_valor', 'feriados_nacionais', 'buscar_proposicoes', 'consultar_sancoes', 'consultar_cnpj', 'consultar_cep', 'taxas_atuais', 'clima_historico', 'verificar_referencia'],
  receitas: [
    {
      id: 'resumo-caso',
      nome: 'Resumo do caso',
      descricao: 'Resumo estruturado: fatos, pedidos, teses, provas e próximos passos',
      exigeFontes: true,
      prompt: `Elabore um resumo estruturado do caso com base nas fontes, nestas seções:
1. IDENTIFICAÇÃO — natureza da demanda, partes (como constam), objeto e valor, se houver.
2. FATOS RELEVANTES — narrativa cronológica.
3. PEDIDOS E PRETENSÕES.
4. TESES DE CADA PARTE — com os fundamentos invocados.
5. PROVAS — o que já há e o que falta.
6. PONTOS CONTROVERTIDOS.
7. SITUAÇÃO ATUAL E PRÓXIMOS PASSOS — inclua prazos em curso, se identificáveis.
{{foco}}`,
      campos: [{ id: 'foco', rotulo: 'Foco (opcional)', tipo: 'texto', placeholder: 'Ex.: destacar riscos para o réu' }]
    },
    {
      id: 'linha-tempo',
      nome: 'Linha do tempo',
      descricao: 'Tabela cronológica de fatos e atos, com a fonte de cada um',
      exigeFontes: true,
      prompt: 'Monte uma linha do tempo em tabela (Data | Evento | Fonte), em ordem cronológica, com todos os fatos e atos relevantes das fontes. Ao final, aponte lacunas ou datas conflitantes.'
    },
    {
      id: 'analise-contrato',
      nome: 'Análise de contrato',
      descricao: 'Cláusulas de risco, lacunas e sugestões de redação',
      exigeFontes: true,
      prompt: `Analise o contrato das fontes sob a ótica de {{lado}}.
1. Quadro-resumo: objeto, partes (como constam), prazo, preço, reajuste, garantias, multas, rescisão, foro, proteção de dados.
2. Riscos — tabela (Cláusula | Risco | Severidade alta/média/baixa | Sugestão de redação).
3. Cláusulas ausentes que seriam recomendáveis.
4. Pontos de negociação prioritários.`,
      campos: [{ id: 'lado', rotulo: 'Analisar sob a ótica de', tipo: 'opcoes', opcoes: ['meu cliente (contratante)', 'meu cliente (contratado)', 'neutra'] }]
    },
    {
      id: 'peca',
      nome: 'Minuta de peça',
      descricao: 'Petição, contestação, recurso, notificação ou parecer',
      usaBiblioteca: true,
      formato: 'documento',
      prompt: `Redija uma minuta de {{tipo}} com base nas fontes.
Instruções do profissional (prioritárias): {{instrucoes}}
Estrutura esperada conforme a peça (endereçamento genérico, fatos, fundamentos, pedidos). Deixe marcados com [COMPLETAR] os pontos que dependem de informação ausente.`,
      campos: [
        {
          id: 'tipo',
          rotulo: 'Peça',
          tipo: 'opcoes',
          opcoes: ['petição inicial', 'contestação', 'réplica', 'recurso de apelação', 'agravo de instrumento', 'embargos de declaração', 'manifestação', 'notificação extrajudicial', 'parecer jurídico']
        },
        { id: 'instrucoes', rotulo: 'Instruções', tipo: 'texto-longo', placeholder: 'Teses a sustentar, pedidos, tom…' }
      ]
    },
    {
      id: 'ato-judicial',
      nome: 'Minuta de ato judicial',
      descricao: 'Sentença, decisão, despacho ou voto (com modelo da biblioteca)',
      exigeFontes: true,
      usaBiblioteca: true,
      formato: 'documento',
      prompt: `Minute um(a) {{natureza}} com base exclusivamente nas fontes.
Instruções (prioritárias): {{instrucoes}}
Não inclua cabeçalho, número do processo, qualificação das partes, local, data nem assinatura. Estruture conforme a natureza (relatório, fundamentação e dispositivo, quando couber).`,
      campos: [
        { id: 'natureza', rotulo: 'Natureza', tipo: 'opcoes', opcoes: ['sentença', 'decisão', 'despacho', 'voto'] },
        { id: 'instrucoes', rotulo: 'Instruções', tipo: 'texto-longo', placeholder: 'Ex.: julgar procedente, honorários em 10%…' }
      ]
    },
    {
      id: 'prazos',
      nome: 'Prazos e providências',
      descricao: 'Identifica intimações e calcula vencimentos com a ferramenta de prazos',
      exigeFontes: true,
      prompt: 'Identifique nas fontes todas as intimações, publicações e determinações que abrem prazo. Para cada uma, use a ferramenta calcular_prazo (CPC: dias úteis, salvo indicação legal diversa) e apresente uma tabela (Ato | Data de início | Prazo | Vencimento | Providência). Alerte sobre feriados locais não considerados.'
    },
    {
      id: 'quesitos',
      nome: 'Quesitos para perícia',
      descricao: 'Quesitos objetivos para a perícia indicada',
      exigeFontes: true,
      prompt: 'Formule quesitos objetivos e numerados para perícia {{especialidade}}, alinhados às teses de {{lado}} e aos pontos controvertidos das fontes. Indique, para cada quesito, o objetivo probatório.',
      campos: [
        { id: 'especialidade', rotulo: 'Especialidade', tipo: 'texto', placeholder: 'médica, contábil, de engenharia…', obrigatorio: true },
        { id: 'lado', rotulo: 'Parte', tipo: 'opcoes', opcoes: ['parte autora', 'parte ré', 'juízo (neutros)'] }
      ]
    },
    {
      id: 'explicar-cliente',
      nome: 'Explicar ao cliente',
      descricao: 'Mensagem em linguagem simples sobre o andamento',
      prompt: 'Escreva uma mensagem ao cliente, em linguagem simples e acolhedora, sem juridiquês, explicando a situação atual, o que significa e os próximos passos. Formato: {{canal}}. Não prometa resultado.',
      campos: [{ id: 'canal', rotulo: 'Canal', tipo: 'opcoes', opcoes: ['e-mail', 'WhatsApp (curto)', 'carta'] }]
    }
  ]
};

const CONTABIL: Area = {
  id: 'contabil',
  nome: 'Contabilidade',
  publico: 'Escritórios contábeis, fiscal, controladoria',
  sigla: 'CTB',
  persona: `Atue como contador sênior no Brasil (societário, fiscal e trabalhista), conhecedor das NBC/CPC e da legislação tributária.
- A Reforma Tributária do consumo (EC 132/2023, LC 214/2025: CBS/IBS e Imposto Seletivo, com transição a partir de 2026) altera regras — sempre sinalize quando a resposta depender da vigência e recomende confirmar a norma atual.
- Mostre memória de cálculo e premissas em tabela. Índices, câmbio e correções: use as ferramentas, não estime.
- Dados cadastrais de empresas: use a consulta de CNPJ/CNAE quando útil.`,
  aviso: 'Apoio técnico. Confirme alíquotas, prazos e enquadramentos na legislação vigente.',
  detectoresPadrao: [...BASE_PII, 'CNPJ', 'REGISTRO_PROFISSIONAL'],
  ferramentas: ['consultar_cnpj', 'consultar_sancoes', 'consultar_cnae', 'consultar_ncm', 'codigo_municipio_ibge', 'corrigir_valor', 'cotacao_moeda', 'taxas_atuais', 'calcular_prazo', 'feriados_nacionais', 'buscar_proposicoes', 'consultar_cep'],
  receitas: [
    {
      id: 'analise-demonstracoes',
      nome: 'Análise de demonstrações',
      descricao: 'Balancete, DRE ou balanço: indicadores e alertas',
      exigeFontes: true,
      prompt: `Analise as demonstrações das fontes.
1. Quadro com os principais grupos e variações.
2. Indicadores (liquidez corrente/seca/geral, endividamento, margens bruta/operacional/líquida, giro), com a fórmula e o resultado.
3. Alertas: contas com saldo invertido, variações atípicas, inconsistências entre demonstrações.
4. Recomendações práticas. ${RESPOSTA_ESTRUTURADA}`
    },
    {
      id: 'regimes',
      nome: 'Comparativo de regimes',
      descricao: 'Simples Nacional × Lucro Presumido × Lucro Real',
      prompt: `Compare Simples Nacional, Lucro Presumido e Lucro Real para o cenário:
- Atividade/CNAE: {{atividade}}
- Faturamento anual estimado: {{faturamento}}
- Folha anual estimada: {{folha}}
- Outras informações: {{outros}}
Apresente premissas, memória de cálculo estimada por regime em tabela, impedimentos (ex.: vedações do Simples), fator R quando aplicável e impactos esperados da transição para CBS/IBS. Deixe claro o que é estimativa.`,
      campos: [
        { id: 'atividade', rotulo: 'Atividade / CNAE', tipo: 'texto', obrigatorio: true },
        { id: 'faturamento', rotulo: 'Faturamento anual', tipo: 'texto', placeholder: 'R$ 1.200.000', obrigatorio: true },
        { id: 'folha', rotulo: 'Folha anual (com encargos)', tipo: 'texto', placeholder: 'R$ 300.000' },
        { id: 'outros', rotulo: 'Outras informações', tipo: 'texto-longo' }
      ]
    },
    {
      id: 'conferencia-nf',
      nome: 'Conferência de nota fiscal',
      descricao: 'CFOP, NCM, CST/CSOSN, bases e alíquotas',
      exigeFontes: true,
      prompt: 'Confira a(s) nota(s) fiscal(is) das fontes: dados do emitente/destinatário, CFOP, NCM (use consultar_ncm se útil), CST/CSOSN, bases de cálculo, alíquotas e totais. Liste inconsistências em tabela (Item | Problema | Impacto | Correção sugerida).'
    },
    {
      id: 'obrigacoes',
      nome: 'Checklist de obrigações',
      descricao: 'Obrigações principais e acessórias por regime',
      prompt: 'Monte um checklist de obrigações principais e acessórias (federais, estaduais e municipais) para uma empresa {{regime}}, atividade {{atividade}}, UF {{uf}}, com periodicidade e prazo usual em tabela. Sinalize o que mudou ou pode mudar com eSocial/EFD-Reinf/DCTFWeb e com a Reforma Tributária.',
      campos: [
        { id: 'regime', rotulo: 'Regime', tipo: 'opcoes', opcoes: ['do Simples Nacional', 'MEI', 'do Lucro Presumido', 'do Lucro Real'] },
        { id: 'atividade', rotulo: 'Atividade', tipo: 'texto', obrigatorio: true },
        { id: 'uf', rotulo: 'UF', tipo: 'texto', placeholder: 'CE' }
      ]
    },
    {
      id: 'extrato-tabela',
      nome: 'Extrato → lançamentos',
      descricao: 'Transforma extratos/relatórios em tabela classificada',
      exigeFontes: true,
      prompt: 'Extraia todos os lançamentos das fontes em tabela (Data | Histórico | Valor | Natureza D/C | Classificação contábil sugerida). Ao final, totalize por classificação e aponte lançamentos que precisam de documento-suporte.'
    },
    {
      id: 'parecer-fiscal',
      nome: 'Parecer / consulta fiscal',
      descricao: 'Resposta fundamentada a uma dúvida tributária',
      formato: 'documento',
      prompt: 'Elabore um parecer técnico respondendo à consulta: {{pergunta}}\nEstrutura: Consulta; Análise (com base legal indicada e grau de certeza); Conclusão; Riscos e recomendações. Indique expressamente o que deve ser confirmado na legislação vigente.',
      campos: [{ id: 'pergunta', rotulo: 'Consulta', tipo: 'texto-longo', obrigatorio: true }]
    },
    {
      id: 'comunicado-cliente',
      nome: 'Comunicado ao cliente',
      descricao: 'Mensagem clara sobre prazos, pendências ou mudanças',
      prompt: 'Redija um comunicado ao cliente sobre: {{assunto}}. Linguagem clara, sem jargão, com o que o cliente precisa fazer, até quando e o porquê.',
      campos: [{ id: 'assunto', rotulo: 'Assunto', tipo: 'texto-longo', obrigatorio: true }]
    }
  ]
};

const SAUDE: Area = {
  id: 'saude',
  nome: 'Saúde',
  publico: 'Medicina, enfermagem, odontologia, psicologia, fisioterapia, nutrição',
  sigla: 'SAU',
  persona: `Atue como assistente clínico para profissionais de saúde no Brasil.
- Você apoia, não substitui o julgamento clínico: nunca apresente diagnóstico ou conduta como definitivos; ofereça hipóteses e raciocínio.
- Destaque sinais de alarme (red flags) quando pertinentes.
- Para afirmações baseadas em evidência, prefira buscar na literatura (ferramenta buscar_pubmed) e cite PMID; não invente referências.
- Doses e interações: sempre recomende conferência em bula/fonte oficial atualizada.
- Respeite o sigilo: os dados do paciente podem estar pseudonimizados ([PESSOA_1] etc.).`,
  aviso: 'Apoio à decisão. Não substitui avaliação clínica nem as normas do conselho profissional.',
  detectoresPadrao: [...BASE_PII, 'PRONTUARIO', 'REGISTRO_PROFISSIONAL', 'CNPJ'],
  ferramentas: ['buscar_pubmed', 'consultar_bula', 'buscar_cid', 'verificar_referencia', 'consultar_cep', 'consultar_cnpj'],
  receitas: [
    {
      id: 'soap',
      nome: 'Resumo clínico (SOAP)',
      descricao: 'Organiza anotações/prontuário em Subjetivo, Objetivo, Avaliação e Plano',
      exigeFontes: true,
      prompt: 'Organize as informações das fontes no formato SOAP (Subjetivo, Objetivo, Avaliação, Plano). Liste à parte: medicamentos em uso, alergias, exames pendentes e sinais de alarme. Não acrescente achados que não constem das fontes.'
    },
    {
      id: 'relatorio',
      nome: 'Relatório / laudo',
      descricao: 'Relatório estruturado para a finalidade indicada',
      exigeFontes: true,
      usaBiblioteca: true,
      formato: 'documento',
      prompt: 'Redija um relatório de saúde para {{finalidade}}, com base nas fontes: identificação (pseudonimizada), histórico, achados, CID quando constar das fontes, limitações funcionais, conduta e recomendações. Linguagem técnica, objetiva, sem juízos não sustentados.',
      campos: [{ id: 'finalidade', rotulo: 'Finalidade', tipo: 'opcoes', opcoes: ['perícia previdenciária', 'afastamento do trabalho', 'escola', 'plano de saúde', 'encaminhamento', 'outra'] }]
    },
    {
      id: 'orientacoes',
      nome: 'Orientações ao paciente',
      descricao: 'Texto em linguagem simples, pronto para entregar',
      prompt: 'Escreva orientações ao paciente sobre {{tema}}, em linguagem simples (nível de leitura do ensino fundamental), com: o que é, cuidados em casa, quando procurar atendimento imediatamente e dúvidas frequentes. Frases curtas.',
      campos: [{ id: 'tema', rotulo: 'Tema', tipo: 'texto', obrigatorio: true }]
    },
    {
      id: 'evidencias',
      nome: 'Revisão de evidências',
      descricao: 'Busca no PubMed e sintetiza o que a literatura diz',
      prompt: 'Pergunta clínica: {{pergunta}}\nReformule em PICO, faça buscas na literatura com a ferramenta buscar_pubmed (termos em inglês, priorize revisões sistemáticas e diretrizes) e sintetize: o que a evidência sugere, qualidade/limitações, e referências (título, periódico, ano, PMID). Não cite estudos que não vieram da busca.',
      campos: [{ id: 'pergunta', rotulo: 'Pergunta clínica', tipo: 'texto-longo', obrigatorio: true }]
    },
    {
      id: 'interacoes',
      nome: 'Checagem de medicamentos',
      descricao: 'Interações, duplicidades e alertas de dose',
      prompt: 'Analise a lista de medicamentos ({{medicamentos}}) — e os que constarem das fontes —, apontando em tabela: interações relevantes (gravidade e mecanismo), duplicidades terapêuticas, ajustes por função renal/hepática ou idade quando aplicáveis, e o que monitorar. Recomende conferência em fonte oficial.',
      campos: [{ id: 'medicamentos', rotulo: 'Medicamentos e doses', tipo: 'texto-longo' }]
    },
    {
      id: 'encaminhamento',
      nome: 'Encaminhamento',
      descricao: 'Carta de encaminhamento ou contrarreferência',
      formato: 'documento',
      prompt: 'Redija uma carta de encaminhamento para {{destino}}, com motivo, resumo clínico pertinente, exames relevantes, conduta até o momento e a pergunta específica ao colega.',
      campos: [{ id: 'destino', rotulo: 'Encaminhar para', tipo: 'texto', placeholder: 'cardiologia, fisioterapia…', obrigatorio: true }]
    }
  ]
};

const ENGENHARIA: Area = {
  id: 'engenharia',
  nome: 'Engenharia e arquitetura',
  publico: 'Engenharia civil, elétrica, mecânica, arquitetura, perícias',
  sigla: 'ENG',
  persona: `Atue como engenheiro/arquiteto sênior no Brasil.
- Cite normas (ABNT NBR, NR do MTE) pelo número e recomende conferir a versão vigente; não reproduza texto normativo protegido.
- Cálculos estruturais ou de dimensionamento são estimativas de apoio e não substituem projeto com responsabilidade técnica (ART/RRT).
- Reajustes por índices (INCC, IPCA): use a ferramenta corrigir_valor.`,
  aviso: 'Apoio técnico. Não substitui projeto, laudo ou responsabilidade técnica (ART/RRT).',
  detectoresPadrao: [...BASE_PII, 'REGISTRO_PROFISSIONAL'],
  ferramentas: ['corrigir_valor', 'clima_historico', 'consultar_cep', 'consultar_cnpj', 'consultar_sancoes', 'codigo_municipio_ibge', 'feriados_nacionais', 'calcular_prazo', 'taxas_atuais', 'verificar_referencia'],
  receitas: [
    {
      id: 'laudo-vistoria',
      nome: 'Laudo de vistoria',
      descricao: 'Manifestações patológicas, causas, gravidade (GUT) e recomendações',
      exigeFontes: true,
      formato: 'documento',
      usaBiblioteca: true,
      prompt: 'Com base nas fontes (anotações de vistoria, fotos descritas, relatórios), redija um laudo de vistoria/inspeção: objetivo, metodologia, descrição do imóvel/sistema, manifestações patológicas (local, descrição, causa provável), classificação de gravidade (matriz GUT), recomendações e prazos, normas de referência a confirmar.'
    },
    {
      id: 'memorial',
      nome: 'Memorial descritivo',
      descricao: 'Memorial de obra/serviço a partir das informações do projeto',
      formato: 'documento',
      usaBiblioteca: true,
      prompt: 'Elabore um memorial descritivo para {{obra}}, organizado por etapas/sistemas (serviços preliminares, fundações, estrutura, vedações, instalações, acabamentos…), com especificações de materiais e critérios de execução. Use as fontes quando houver; marque [DEFINIR] o que depender de decisão de projeto.',
      campos: [{ id: 'obra', rotulo: 'Obra/serviço', tipo: 'texto', obrigatorio: true }]
    },
    {
      id: 'analise-orcamento',
      nome: 'Análise de orçamento',
      descricao: 'Inconsistências, itens faltantes, quantitativos e BDI',
      exigeFontes: true,
      prompt: 'Analise a planilha orçamentária das fontes: itens faltantes ou duplicados, quantitativos incompatíveis, preços unitários fora do usual, composição e aplicação do BDI, curva ABC aproximada. Apresente em tabelas e conclua com riscos e recomendações.'
    },
    {
      id: 'reajuste',
      nome: 'Reajuste contratual',
      descricao: 'Calcula reajuste por INCC/IPCA com memória de cálculo',
      prompt: 'Calcule o reajuste do valor {{valor}} pelo índice {{indice}} entre {{inicio}} e {{fim}}, usando a ferramenta corrigir_valor, e apresente a memória de cálculo e uma minuta de cláusula/termo de apostilamento.',
      campos: [
        { id: 'valor', rotulo: 'Valor', tipo: 'texto', obrigatorio: true },
        { id: 'indice', rotulo: 'Índice', tipo: 'opcoes', opcoes: ['INCC', 'INCC-M', 'IPCA', 'IGP-M'] },
        { id: 'inicio', rotulo: 'Mês inicial (mm/aaaa)', tipo: 'texto', obrigatorio: true },
        { id: 'fim', rotulo: 'Mês final (mm/aaaa)', tipo: 'texto', obrigatorio: true }
      ]
    },
    {
      id: 'checklist-normas',
      nome: 'Checklist normativo',
      descricao: 'Normas e requisitos aplicáveis a um projeto/atividade',
      prompt: 'Monte um checklist de conformidade para {{atividade}}: normas ABNT e NRs aplicáveis (número e tema), requisitos-chave a verificar, documentos exigidos e órgãos envolvidos (licenças, alvarás, AVCB). Indique o que deve ser confirmado na versão vigente.',
      campos: [{ id: 'atividade', rotulo: 'Projeto/atividade', tipo: 'texto', obrigatorio: true }]
    },
    {
      id: 'proposta',
      nome: 'Proposta técnica',
      descricao: 'Escopo, entregáveis, cronograma e exclusões',
      formato: 'documento',
      prompt: 'Redija uma proposta técnica para {{servico}}: entendimento da demanda, escopo, entregáveis, metodologia, cronograma em etapas, premissas, exclusões e condições comerciais [COMPLETAR].',
      campos: [{ id: 'servico', rotulo: 'Serviço', tipo: 'texto', obrigatorio: true }]
    }
  ]
};

const RH: Area = {
  id: 'rh',
  nome: 'RH e Departamento Pessoal',
  publico: 'Gestão de pessoas, DP, folha',
  sigla: 'RH',
  persona: `Atue como especialista em RH e departamento pessoal no Brasil (CLT, eSocial, normas coletivas).
- Verbas e prazos trabalhistas: apresente memória de cálculo e premissas; use as ferramentas para prazos e correções.
- Lembre que convenções coletivas podem alterar direitos — peça ou considere a norma coletiva aplicável.
- Trate dados de empregados com sigilo (podem estar pseudonimizados).`,
  aviso: 'Apoio técnico. Confira a convenção coletiva e a legislação vigente.',
  detectoresPadrao: [...BASE_PII],
  ferramentas: ['calcular_prazo', 'feriados_nacionais', 'corrigir_valor', 'consultar_cep', 'consultar_cnpj', 'consultar_cnae'],
  receitas: [
    {
      id: 'rescisao',
      nome: 'Checklist de rescisão',
      descricao: 'Verbas devidas, prazos e documentos por modalidade',
      prompt: 'Para uma rescisão por {{modalidade}}, liste: verbas rescisórias devidas (com fórmula), prazos (pagamento, eSocial, homologação quando houver), documentos e guias, aviso prévio (trabalhado/indenizado, proporcional) e cuidados. Dados do caso: {{dados}}',
      campos: [
        { id: 'modalidade', rotulo: 'Modalidade', tipo: 'opcoes', opcoes: ['dispensa sem justa causa', 'pedido de demissão', 'justa causa', 'acordo (art. 484-A CLT)', 'término de contrato de experiência'] },
        { id: 'dados', rotulo: 'Dados (salário, admissão, saída…)', tipo: 'texto-longo' }
      ]
    },
    {
      id: 'descricao-cargo',
      nome: 'Descrição de cargo',
      descricao: 'Missão, atribuições, requisitos e indicadores',
      formato: 'documento',
      prompt: 'Elabore a descrição do cargo {{cargo}}: missão, principais atribuições, responsabilidades, requisitos (formação, experiência, competências), indicadores de desempenho e CBO sugerida (a confirmar).',
      campos: [{ id: 'cargo', rotulo: 'Cargo', tipo: 'texto', obrigatorio: true }]
    },
    {
      id: 'convencao',
      nome: 'Resumo de convenção coletiva',
      descricao: 'Cláusulas econômicas e sociais em quadro',
      exigeFontes: true,
      prompt: 'Resuma a convenção/acordo coletivo das fontes em quadro: vigência, data-base, piso, reajuste, adicionais, jornada/banco de horas, benefícios, estabilidades, contribuições, penalidades. Destaque o que difere da CLT.'
    },
    {
      id: 'feedback',
      nome: 'Feedback estruturado',
      descricao: 'Avaliação de desempenho clara e respeitosa',
      prompt: 'Com base nas observações ({{observacoes}}) e nas fontes, estruture um feedback: pontos fortes com exemplos, pontos a desenvolver com exemplos, metas SMART para o próximo ciclo e roteiro de conversa.',
      campos: [{ id: 'observacoes', rotulo: 'Observações', tipo: 'texto-longo' }]
    },
    {
      id: 'medida-disciplinar',
      nome: 'Medida disciplinar',
      descricao: 'Advertência/suspensão com descrição objetiva dos fatos',
      formato: 'documento',
      prompt: 'Redija uma {{medida}} com descrição objetiva e datada dos fatos (com base nas fontes e em: {{fatos}}), dispositivo violado (regulamento/CLT), gradação e ciência do empregado. Linguagem neutra.',
      campos: [
        { id: 'medida', rotulo: 'Medida', tipo: 'opcoes', opcoes: ['advertência escrita', 'suspensão disciplinar'] },
        { id: 'fatos', rotulo: 'Fatos', tipo: 'texto-longo' }
      ]
    },
    {
      id: 'comunicado-interno',
      nome: 'Comunicado interno',
      descricao: 'Comunicado claro para colaboradores',
      prompt: 'Redija um comunicado interno sobre {{assunto}}: o que muda, a partir de quando, o que cada um precisa fazer e a quem recorrer.',
      campos: [{ id: 'assunto', rotulo: 'Assunto', tipo: 'texto-longo', obrigatorio: true }]
    }
  ]
};

const GERAL: Area = {
  id: 'geral',
  nome: 'Uso geral',
  publico: 'Qualquer profissional',
  sigla: 'GER',
  persona: 'Atue como assistente profissional versátil, preciso e objetivo.',
  detectoresPadrao: [...BASE_PII, 'CNPJ', 'PROCESSO', 'OAB', 'REGISTRO_PROFISSIONAL', 'PRONTUARIO'],
  ferramentas: ['consultar_cep', 'consultar_cnpj', 'feriados_nacionais', 'taxas_atuais', 'cotacao_moeda', 'corrigir_valor', 'calcular_prazo', 'clima_historico', 'verificar_referencia', 'buscar_proposicoes'],
  receitas: [
    {
      id: 'resumo-executivo',
      nome: 'Resumo executivo',
      descricao: 'O essencial em poucos parágrafos e tópicos',
      exigeFontes: true,
      prompt: 'Faça um resumo executivo das fontes: contexto em 2–3 frases, pontos principais em tópicos, números relevantes, decisões/pendências e próximos passos. {{foco}}',
      campos: [{ id: 'foco', rotulo: 'Foco (opcional)', tipo: 'texto' }]
    },
    {
      id: 'extrair-tabela',
      nome: 'Extrair dados para tabela',
      descricao: 'Transforma texto em tabela estruturada',
      exigeFontes: true,
      prompt: 'Extraia das fontes, em tabela, os seguintes dados: {{dados}}. Uma linha por ocorrência; indique a fonte de cada linha; deixe em branco o que não constar.',
      campos: [{ id: 'dados', rotulo: 'Quais dados?', tipo: 'texto', placeholder: 'datas, valores, responsáveis…', obrigatorio: true }]
    },
    {
      id: 'revisar',
      nome: 'Revisar texto',
      descricao: 'Correção, clareza e tom',
      exigeFontes: true,
      prompt: 'Revise o texto das fontes: corrija gramática e ortografia, melhore clareza e coesão, ajuste o tom para {{tom}}. Devolva o texto revisado e, depois, uma lista curta das principais alterações.',
      campos: [{ id: 'tom', rotulo: 'Tom', tipo: 'opcoes', opcoes: ['formal', 'neutro', 'cordial', 'persuasivo', 'simples e didático'] }]
    },
    {
      id: 'email',
      nome: 'Redigir mensagem',
      descricao: 'E-mail ou mensagem com objetivo definido',
      prompt: 'Redija um(a) {{canal}} com o objetivo: {{objetivo}}. Use as fontes como contexto se houver. Assunto (se e-mail), corpo objetivo e fechamento cordial.',
      campos: [
        { id: 'canal', rotulo: 'Canal', tipo: 'opcoes', opcoes: ['e-mail', 'mensagem curta', 'ofício'] },
        { id: 'objetivo', rotulo: 'Objetivo', tipo: 'texto-longo', obrigatorio: true }
      ]
    },
    {
      id: 'comparar',
      nome: 'Comparar documentos',
      descricao: 'Diferenças e pontos em comum entre as fontes',
      exigeFontes: true,
      prompt: 'Compare as fontes entre si: quadro de diferenças relevantes (Tema | Fonte A | Fonte B | Impacto), pontos em comum e conclusões.'
    },
    {
      id: 'perguntas',
      nome: 'Perguntas-chave',
      descricao: 'O que perguntar/esclarecer a partir do material',
      exigeFontes: true,
      prompt: 'Liste as perguntas mais importantes a esclarecer a partir das fontes (lacunas, contradições, riscos), agrupadas por tema e em ordem de prioridade.'
    },
    {
      id: 'traduzir',
      nome: 'Traduzir',
      descricao: 'Tradução fiel preservando formatação',
      exigeFontes: true,
      prompt: 'Traduza o conteúdo das fontes para {{idioma}}, com fidelidade técnica, preservando a estrutura. Mantenha os marcadores entre colchetes ([PESSOA_1] etc.) inalterados.',
      campos: [{ id: 'idioma', rotulo: 'Idioma', tipo: 'opcoes', opcoes: ['inglês', 'espanhol', 'português (do original em outro idioma)', 'francês', 'italiano', 'alemão'] }]
    }
  ]
};

export const AREAS: Record<AreaId, Area> = {
  juridico: JURIDICO,
  contabil: CONTABIL,
  saude: SAUDE,
  engenharia: ENGENHARIA,
  rh: RH,
  geral: GERAL
};

export const ORDEM_AREAS: AreaId[] = ['juridico', 'contabil', 'saude', 'engenharia', 'rh', 'geral'];

export function obterArea(id: string | undefined): Area {
  return AREAS[(id as AreaId) ?? 'geral'] ?? GERAL;
}

/** Receitas da área + receitas personalizadas do usuário para ela (ou para todas). */
export function receitasDaArea(area: Area, personalizadas: ReceitaPersonalizada[]): Receita[] {
  const minhas: Receita[] = personalizadas
    .filter((r) => r.area === 'todas' || r.area === area.id)
    .map((r) => ({
      id: `minha:${r.id}`,
      nome: r.nome,
      descricao: r.descricao,
      prompt: r.prompt,
      formato: r.formato,
      personalizada: true,
      ...(r.prompt.includes('{{instrucoes}}') ? { campos: [{ id: 'instrucoes', rotulo: 'Instruções', tipo: 'texto-longo' as const }] } : {})
    }));
  return [...area.receitas, ...minhas];
}

export function hojeExtenso(): string {
  return new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

/** System prompt completo: regras comuns + persona da área. */
export function montarSystemPrompt(area: Area, opcoes: { anonimizado: boolean; comFerramentas: boolean }): string {
  const regras = [
    `Você é o NexIA, assistente de inteligência artificial para profissionais. Área ativa: ${area.nome} (${area.publico}). Hoje é ${hojeExtenso()}.`,
    '',
    'Regras permanentes:',
    '- Responda em português do Brasil, salvo pedido diverso.',
    '- Baseie-se nas FONTES fornecidas quando houver; ao usar uma informação delas, indique a fonte entre parênteses, ex.: (fonte: contrato.pdf).',
    '- Nunca invente fatos, datas, valores, normas, julgados ou referências. Se algo não constar das fontes nem for conhecimento seguro, diga isso.',
    '- Se faltar informação essencial, aponte exatamente o que falta.'
  ];
  if (opcoes.anonimizado) {
    regras.push(
      '- O conteúdo foi pseudonimizado localmente: dados pessoais aparecem como marcadores entre colchetes ([PESSOA_1], [CPF_2], [PARTE AUTORA]...). Reproduza os marcadores EXATAMENTE como estão e nunca tente adivinhar os dados reais. Para consultas, use os marcadores como argumento: o sistema os resolve localmente.'
    );
  }
  if (opcoes.comFerramentas) {
    regras.push('- Você dispõe de ferramentas (consultas a APIs públicas e cálculos determinísticos). Use-as sempre que precisar de dado atualizado, índice, cálculo ou prazo — não faça essas contas de cabeça. Informe a fonte do dado obtido.');
  }
  regras.push('- Não inclua avisos genéricos de que é uma IA.', '', 'Perfil da área:', area.persona);
  return regras.join('\n');
}

export const REGRAS_FORMATO_DOCUMENTO = `Regras de forma (texto para colar em editor/sistema):
- Prosa corrida, SEM markdown (sem asteriscos, cerquilhas ou listas com hífen); use numeração textual quando necessário.
- Citações literais em parágrafo próprio iniciado por "> ".`;

/**
 * Preenche {{campos}} da receita. Uma linha cujos campos ficaram TODOS vazios some
 * quando sobraria só um rótulo ("Instruções:") ou nada.
 */
export function preencherReceita(receita: Receita, valores: Record<string, string>): string {
  const valor = (id: string) => (valores[id] ?? '').trim();
  const linhas = receita.prompt.split('\n').flatMap((linha) => {
    const ids = [...linha.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]!);
    const preenchida = linha.replace(/\{\{(\w+)\}\}/g, (_m, id: string) => valor(id));
    const todosVazios = ids.length > 0 && ids.every((id) => !valor(id));
    if (todosVazios && (!preenchida.trim() || /:\s*$/.test(preenchida.trim()))) return [];
    return [preenchida];
  });
  const limpo = linhas.join('\n').trim();
  return receita.formato === 'documento' ? `${limpo}\n\n${REGRAS_FORMATO_DOCUMENTO}` : limpo;
}
