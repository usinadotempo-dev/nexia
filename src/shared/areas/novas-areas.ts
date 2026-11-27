/**
 * Perfis acrescentados na expansão de 11/2026 (ver reports/Expansão do Nexpra perfis APIs MCP.md):
 * psicologia, educação, imobiliário, seguros, finanças pessoais, contratações públicas,
 * serviço social e cartórios.
 */
import { BASE_PII, type Area } from './tipos.ts';

export const PSICOLOGIA: Area = {
  id: 'psicologia',
  nome: 'Psicologia',
  publico: 'Psicólogos clínicos, escolares, organizacionais e jurídicos',
  sigla: 'PSI',
  persona: `Atue como apoio técnico a psicólogos no Brasil, com atenção ao Código de Ética Profissional e às resoluções do CFP sobre documentos escritos (declaração, atestado, relatório, laudo, parecer) e registro documental.
- Você apoia a escrita e a organização do raciocínio clínico; nunca formule diagnóstico, hipótese diagnóstica definitiva ou conduta no lugar do profissional.
- Seja descritivo e fundamentado: separe o que foi observado/relatado do que é interpretação. Não patologize nem use rótulos sem base nas fontes.
- O sigilo é central: os dados podem estar pseudonimizados e devem permanecer assim. Em documentos para terceiros, inclua apenas o necessário à finalidade.
- Não indique nem interprete testes psicológicos sem que constem das fontes; lembre que só testes com parecer favorável no SATEPSI podem ser usados.
- Para afirmações baseadas em evidência, busque na literatura e cite a referência.`,
  aviso: 'Apoio à escrita e ao raciocínio. Não substitui a avaliação do psicólogo nem as normas do CFP.',
  detectoresPadrao: [...BASE_PII, 'PRONTUARIO', 'REGISTRO_PROFISSIONAL', 'PROCESSO', 'CNPJ'],
  ferramentas: ['buscar_pubmed', 'buscar_artigos_europepmc', 'buscar_cid', 'verificar_referencia', 'consultar_lei_federal', 'calcular_prazo'],
  receitas: [
    {
      id: 'evolucao',
      nome: 'Registro de sessão',
      descricao: 'Organiza anotações em registro documental objetivo',
      exigeFontes: true,
      prompt: 'Organize as anotações das fontes em um registro de sessão objetivo: demanda/tema trabalhado, relato do paciente (o que foi dito), observações do profissional (o que foi observado), intervenções realizadas, encaminhamentos e pontos para a próxima sessão. Não acrescente interpretações que não constem das anotações.'
    },
    {
      id: 'documento-psicologico',
      nome: 'Documento psicológico',
      descricao: 'Relatório, laudo, parecer, declaração ou atestado na estrutura do CFP',
      exigeFontes: true,
      usaBiblioteca: true,
      formato: 'documento',
      prompt: 'Redija um(a) {{tipo}} psicológico(a) para a finalidade "{{finalidade}}", com base nas fontes, na estrutura prevista pelas normas do CFP para esse documento (identificação, descrição da demanda, procedimento, análise e conclusão, quando couber). Restrinja-se ao necessário à finalidade, sem expor conteúdo íntimo irrelevante. Marque [COMPLETAR] onde faltar informação e não conclua além do que as fontes sustentam.',
      campos: [
        { id: 'tipo', rotulo: 'Documento', tipo: 'opcoes', opcoes: ['relatório', 'laudo', 'parecer', 'declaração', 'atestado'] },
        { id: 'finalidade', rotulo: 'Finalidade e destinatário', tipo: 'texto', placeholder: 'escola, Justiça, plano de saúde, o próprio paciente…', obrigatorio: true }
      ]
    },
    {
      id: 'formulacao',
      nome: 'Formulação de caso',
      descricao: 'Hipóteses de trabalho, fatores e plano, para discussão',
      exigeFontes: true,
      prompt: 'Com base nas fontes, proponha uma formulação de caso na abordagem {{abordagem}} para discussão do profissional: queixa e demanda, história relevante, fatores predisponentes, precipitantes, mantenedores e de proteção, hipóteses de trabalho (como hipóteses, não conclusões), objetivos terapêuticos e pontos a investigar. Sinalize riscos que exijam atenção imediata, se houver indícios nas fontes.',
      campos: [{ id: 'abordagem', rotulo: 'Abordagem', tipo: 'opcoes', opcoes: ['cognitivo-comportamental', 'psicanalítica/psicodinâmica', 'humanista', 'sistêmica', 'análise do comportamento', 'integrativa'] }]
    },
    {
      id: 'supervisao',
      nome: 'Preparar supervisão',
      descricao: 'Resumo do caso e perguntas para levar à supervisão',
      exigeFontes: true,
      prompt: 'Prepare um resumo do caso para supervisão: síntese em um parágrafo, evolução até aqui, impasses e dúvidas do profissional, questões éticas envolvidas e 5 perguntas objetivas para a supervisão.'
    },
    {
      id: 'evidencias-psi',
      nome: 'Revisão de evidências',
      descricao: 'O que a literatura diz sobre uma intervenção ou quadro',
      prompt: 'Pergunta: {{pergunta}}\nBusque na literatura (termos em inglês; priorize revisões sistemáticas e diretrizes) e sintetize o que a evidência sugere, sua qualidade e limitações, com referências (título, periódico, ano, PMID ou DOI). Não cite estudos que não vieram da busca.',
      campos: [{ id: 'pergunta', rotulo: 'Pergunta', tipo: 'texto-longo', obrigatorio: true }]
    },
    {
      id: 'devolutiva',
      nome: 'Devolutiva em linguagem simples',
      descricao: 'Explica resultados ou orientações ao paciente ou à família',
      prompt: 'Redija uma devolutiva em linguagem simples e acolhedora sobre: {{tema}}. Use as fontes como base, evite jargão e rótulos, destaque recursos e próximos passos, e não inclua nada além do necessário para quem vai receber.',
      campos: [{ id: 'tema', rotulo: 'O que será devolvido e para quem', tipo: 'texto-longo', obrigatorio: true }]
    }
  ]
};

export const EDUCACAO: Area = {
  id: 'educacao',
  nome: 'Educação',
  publico: 'Gestores, coordenadores pedagógicos e professores',
  sigla: 'EDU',
  persona: `Atue como coordenador pedagógico experiente na educação básica brasileira, conhecedor da BNCC, da LDB e do ECA.
- Alinhe planos e avaliações à BNCC, citando os códigos das habilidades (use a busca da BNCC para confirmar código e texto; não invente códigos).
- Dados de alunos são dados de crianças e adolescentes: trate com o máximo sigilo; em documentos, descreva comportamentos e aprendizagens observáveis, sem rótulos nem suposições diagnósticas.
- Linguagem clara e respeitosa com famílias; propostas inclusivas e exequíveis em sala.`,
  aviso: 'Apoio pedagógico. Decisões sobre alunos cabem à equipe escolar; proteja os dados de crianças e adolescentes.',
  detectoresPadrao: [...BASE_PII, 'REGISTRO_PROFISSIONAL', 'CNPJ', 'PRONTUARIO', 'PROCESSO'],
  ferramentas: ['buscar_bncc', 'consultar_lei_federal', 'feriados_nacionais', 'calcular_prazo', 'alerta_arboviroses', 'verificar_referencia', 'consultar_cnpj', 'consultar_cep'],
  receitas: [
    {
      id: 'plano-aula',
      nome: 'Plano de aula (BNCC)',
      descricao: 'Plano com habilidades da BNCC, etapas e avaliação',
      prompt: 'Elabore um plano de aula de {{componente}} para {{turma}} sobre "{{tema}}", com duração de {{duracao}}. Confirme na busca da BNCC as habilidades pertinentes (código e texto) e estruture: objetivos, habilidades da BNCC, materiais, etapas com tempo estimado (abertura, desenvolvimento, fechamento), estratégias de diferenciação e inclusão, e avaliação com critérios.',
      campos: [
        { id: 'componente', rotulo: 'Componente curricular', tipo: 'texto', placeholder: 'Matemática', obrigatorio: true },
        { id: 'turma', rotulo: 'Ano/turma', tipo: 'texto', placeholder: '5º ano do fundamental', obrigatorio: true },
        { id: 'tema', rotulo: 'Tema', tipo: 'texto', obrigatorio: true },
        { id: 'duracao', rotulo: 'Duração', tipo: 'texto', placeholder: '2 aulas de 50 min', obrigatorio: true }
      ]
    },
    {
      id: 'avaliacao',
      nome: 'Avaliação e gabarito',
      descricao: 'Questões por habilidade, com gabarito e critérios',
      prompt: 'Crie uma avaliação de {{componente}} para {{turma}} sobre {{conteudo}}: {{quantidade}} questões (mescle objetivas e discursivas), cada uma com a habilidade da BNCC avaliada, nível de dificuldade, gabarito comentado e critérios de correção das discursivas. Use as fontes como referência de conteúdo, se houver.',
      campos: [
        { id: 'componente', rotulo: 'Componente', tipo: 'texto', obrigatorio: true },
        { id: 'turma', rotulo: 'Ano/turma', tipo: 'texto', obrigatorio: true },
        { id: 'conteudo', rotulo: 'Conteúdo', tipo: 'texto', obrigatorio: true },
        { id: 'quantidade', rotulo: 'Nº de questões', tipo: 'texto', placeholder: '10', obrigatorio: true }
      ]
    },
    {
      id: 'parecer-descritivo',
      nome: 'Parecer descritivo do aluno',
      descricao: 'Relatório individual a partir de anotações do professor',
      exigeFontes: true,
      formato: 'documento',
      prompt: 'A partir das anotações das fontes, redija um parecer descritivo do aluno referente a {{periodo}}: avanços, aprendizagens consolidadas, pontos em desenvolvimento, aspectos socioemocionais observáveis e combinados para o próximo período. Tom respeitoso e construtivo, sem rótulos, comparações com colegas ou suposições diagnósticas.',
      campos: [{ id: 'periodo', rotulo: 'Período', tipo: 'texto', placeholder: '2º bimestre', obrigatorio: true }]
    },
    {
      id: 'comunicado-familias',
      nome: 'Comunicado às famílias',
      descricao: 'Mensagem clara para pais e responsáveis',
      prompt: 'Redija um comunicado às famílias sobre {{assunto}}: o que é, datas e horários, o que a família precisa fazer e contato para dúvidas. Linguagem simples, acolhedora e direta.',
      campos: [{ id: 'assunto', rotulo: 'Assunto', tipo: 'texto-longo', obrigatorio: true }]
    },
    {
      id: 'ata-reuniao',
      nome: 'Ata de reunião ou conselho',
      descricao: 'Ata objetiva com decisões e encaminhamentos',
      exigeFontes: true,
      formato: 'documento',
      prompt: 'Com base nas anotações das fontes, redija a ata de {{tipo}}: data e participantes (como constam), pauta, síntese das discussões, deliberações e encaminhamentos com responsáveis e prazos. Registre situações de alunos de forma objetiva e reservada.',
      campos: [{ id: 'tipo', rotulo: 'Reunião', tipo: 'opcoes', opcoes: ['conselho de classe', 'reunião pedagógica', 'reunião com responsáveis', 'reunião de equipe gestora'] }]
    },
    {
      id: 'adaptacao',
      nome: 'Adaptação de atividade',
      descricao: 'Adapta uma atividade para inclusão ou outro nível',
      exigeFontes: true,
      prompt: 'Adapte a atividade das fontes para {{necessidade}}, mantendo o objetivo de aprendizagem. Explique o que mudou e por quê, e sugira como avaliar.',
      campos: [{ id: 'necessidade', rotulo: 'Adaptar para', tipo: 'texto', placeholder: 'aluno com baixa visão; nível mais simples; desafio extra…', obrigatorio: true }]
    },
    {
      id: 'politica-ia',
      nome: 'Diretriz de uso de IA na escola',
      descricao: 'Minuta de regras para professores e alunos',
      formato: 'documento',
      prompt: 'Redija uma minuta de diretriz de uso de inteligência artificial para {{escola}}: princípios, usos permitidos e vedados para professores e para alunos (por etapa), proteção de dados de crianças e adolescentes (LGPD e ECA), integridade acadêmica, formação da equipe e revisão periódica. Deixe [DEFINIR] onde a escola precisa decidir.',
      campos: [{ id: 'escola', rotulo: 'Escola/rede e etapas atendidas', tipo: 'texto', obrigatorio: true }]
    }
  ]
};

export const IMOBILIARIO: Area = {
  id: 'imobiliario',
  nome: 'Imobiliário',
  publico: 'Corretores de imóveis, imobiliárias e avaliadores',
  sigla: 'IMO',
  persona: `Atue como especialista do mercado imobiliário brasileiro: intermediação, locação (Lei 8.245/1991), compra e venda, financiamento e avaliação.
- Para taxas de financiamento, custos de construção e reajustes, use as consultas (taxas por banco, SINAPI, correção por IGP-M/IPCA) em vez de estimar.
- Fichas cadastrais, comprovantes de renda e documentos de clientes são dados pessoais: mantenha os marcadores de pseudonimização.
- Não emita opinião de valor como laudo: avaliações formais exigem profissional habilitado e método normativo (ABNT NBR 14653).`,
  aviso: 'Apoio técnico. Contratos e avaliações formais exigem revisão do profissional responsável.',
  detectoresPadrao: [...BASE_PII, 'REGISTRO_PROFISSIONAL', 'PROCESSO'],
  ferramentas: [
    'taxas_juros_credito', 'corrigir_valor', 'custo_construcao_sinapi', 'expectativas_mercado', 'consultar_cep', 'consultar_cnpj',
    'consultar_lei_federal', 'calcular_prazo', 'feriados_nacionais', 'codigo_municipio_ibge', 'taxas_atuais'
  ],
  receitas: [
    {
      id: 'anuncio',
      nome: 'Anúncio do imóvel',
      descricao: 'Texto de anúncio a partir das características',
      prompt: 'Escreva um anúncio para {{canal}} do imóvel descrito a seguir e nas fontes: {{caracteristicas}}. Título atrativo, descrição fiel (sem promessas que os dados não sustentem), diferenciais, localização em termos gerais e chamada para contato. Não invente características.',
      campos: [
        { id: 'canal', rotulo: 'Canal', tipo: 'opcoes', opcoes: ['portal imobiliário', 'Instagram', 'WhatsApp', 'site da imobiliária'] },
        { id: 'caracteristicas', rotulo: 'Características', tipo: 'texto-longo', placeholder: 'tipo, área, quartos, vagas, bairro, valor…' }
      ]
    },
    {
      id: 'analise-contrato-imob',
      nome: 'Análise de contrato',
      descricao: 'Locação ou compra e venda: riscos e pontos de atenção',
      exigeFontes: true,
      prompt: 'Analise o contrato das fontes sob a ótica de {{lado}}: quadro-resumo (partes como constam, objeto, valor, prazo, reajuste, garantia, multas, rescisão), cláusulas de risco em tabela (Cláusula | Risco | Sugestão), itens ausentes recomendáveis e conferência com a lei aplicável (cite o artigo; use a consulta de lei quando precisar do texto).',
      campos: [{ id: 'lado', rotulo: 'Ótica', tipo: 'opcoes', opcoes: ['locador/vendedor', 'locatário/comprador', 'neutra'] }]
    },
    {
      id: 'simulacao-financiamento',
      nome: 'Comparar financiamento',
      descricao: 'Taxas por banco e simulação comparativa',
      prompt: 'Consulte as taxas de financiamento imobiliário por banco e compare, para um imóvel de {{valor}} com entrada de {{entrada}} em {{prazo}} meses: tabela com as menores taxas, parcela inicial estimada (SAC e Price), total de juros e observações. Deixe claro que são estimativas sem seguros e tarifas e que a taxa final depende da análise de crédito.',
      campos: [
        { id: 'valor', rotulo: 'Valor do imóvel', tipo: 'texto', obrigatorio: true },
        { id: 'entrada', rotulo: 'Entrada', tipo: 'texto', obrigatorio: true },
        { id: 'prazo', rotulo: 'Prazo (meses)', tipo: 'texto', placeholder: '360', obrigatorio: true }
      ]
    },
    {
      id: 'reajuste-aluguel',
      nome: 'Reajuste de aluguel',
      descricao: 'Calcula o reajuste e redige o comunicado',
      prompt: 'Calcule o reajuste do aluguel de {{valor}} pelo índice {{indice}} entre {{inicio}} e {{fim}}, usando a ferramenta de correção, mostre a memória de cálculo e redija o comunicado de reajuste ao locatário.',
      campos: [
        { id: 'valor', rotulo: 'Aluguel atual', tipo: 'texto', obrigatorio: true },
        { id: 'indice', rotulo: 'Índice', tipo: 'opcoes', opcoes: ['IGP-M', 'IPCA', 'INPC'] },
        { id: 'inicio', rotulo: 'Mês inicial (mm/aaaa)', tipo: 'texto', obrigatorio: true },
        { id: 'fim', rotulo: 'Mês final (mm/aaaa)', tipo: 'texto', obrigatorio: true }
      ]
    },
    {
      id: 'checklist-documentos',
      nome: 'Checklist de documentos',
      descricao: 'Documentos e certidões por tipo de operação',
      prompt: 'Monte o checklist de documentos e certidões para {{operacao}}, separando imóvel, vendedor/locador e comprador/locatário (pessoa física e jurídica), com a finalidade de cada item e onde obter.',
      campos: [{ id: 'operacao', rotulo: 'Operação', tipo: 'opcoes', opcoes: ['compra e venda à vista', 'compra e venda com financiamento', 'locação residencial', 'locação comercial', 'permuta'] }]
    },
    {
      id: 'parecer-mercado',
      nome: 'Opinião de mercado',
      descricao: 'Estrutura de parecer de preço a partir de comparativos',
      exigeFontes: true,
      formato: 'documento',
      prompt: 'Com base nos imóveis comparativos das fontes, estruture uma opinião de mercado: imóvel avaliando, amostra comparativa em tabela, homogeneização simples (explique os ajustes), faixa de valor sugerida e ressalvas. Deixe explícito que não é laudo de avaliação nos termos da NBR 14653.'
    }
  ]
};

export const SEGUROS: Area = {
  id: 'seguros',
  nome: 'Seguros',
  publico: 'Corretores e corretoras de seguros',
  sigla: 'SEG',
  persona: `Atue como especialista em seguros no Brasil (auto, residencial, vida, saúde, empresarial), conhecedor das regras da SUSEP e, em saúde suplementar, da ANS.
- Ao analisar apólices e condições gerais, cite a cláusula; nunca afirme cobertura que o documento não traga.
- Dados de saúde e patrimoniais de segurados são sensíveis: mantenha os marcadores de pseudonimização.
- Para valor de veículos use a Tabela FIPE; para datas e prazos, a ferramenta de prazos.`,
  aviso: 'Apoio técnico. Coberturas e indenizações dependem das condições contratuais da seguradora.',
  detectoresPadrao: [...BASE_PII, 'REGISTRO_PROFISSIONAL', 'PRONTUARIO', 'PROCESSO'],
  ferramentas: ['consultar_fipe', 'consultar_cnpj', 'consultar_cep', 'clima_historico', 'calcular_prazo', 'corrigir_valor', 'consultar_lei_federal', 'feriados_nacionais'],
  receitas: [
    {
      id: 'comparar-propostas',
      nome: 'Comparar propostas',
      descricao: 'Quadro comparativo de cotações ou apólices',
      exigeFontes: true,
      prompt: 'Compare as propostas/apólices das fontes em tabela: seguradora, coberturas e limites, franquias, assistências, exclusões relevantes, prêmio e forma de pagamento. Aponte diferenças que mudam a decisão e uma recomendação para o perfil: {{perfil}}.',
      campos: [{ id: 'perfil', rotulo: 'Perfil e prioridades do cliente', tipo: 'texto', placeholder: 'usa o carro para trabalho; prioriza franquia baixa' }]
    },
    {
      id: 'explicar-apolice',
      nome: 'Explicar apólice ao cliente',
      descricao: 'Coberturas, exclusões e obrigações em linguagem simples',
      exigeFontes: true,
      prompt: 'Explique a apólice/condições das fontes em linguagem simples: o que está coberto, o que não está, franquias e carências, obrigações do segurado, como acionar o sinistro e prazos. Cite a cláusula de cada ponto.'
    },
    {
      id: 'aviso-sinistro',
      nome: 'Aviso de sinistro',
      descricao: 'Relato organizado e lista de documentos',
      formato: 'documento',
      prompt: 'Com base no relato ({{relato}}) e nas fontes, redija o aviso de sinistro: data, local, descrição objetiva dos fatos, danos, terceiros envolvidos e providências tomadas. Liste os documentos normalmente exigidos para o ramo {{ramo}}.',
      campos: [
        { id: 'ramo', rotulo: 'Ramo', tipo: 'opcoes', opcoes: ['automóvel', 'residencial', 'vida', 'empresarial', 'saúde', 'transporte'] },
        { id: 'relato', rotulo: 'Relato do ocorrido', tipo: 'texto-longo', obrigatorio: true }
      ]
    },
    {
      id: 'recurso-negativa',
      nome: 'Contestar negativa',
      descricao: 'Analisa a negativa e redige pedido de reconsideração',
      exigeFontes: true,
      formato: 'documento',
      prompt: 'Analise a negativa de cobertura das fontes frente às condições da apólice: fundamento usado pela seguradora, cláusulas aplicáveis, pontos contestáveis. Em seguida, redija um pedido de reconsideração objetivo e fundamentado. Se a negativa parecer correta, diga isso com clareza.'
    },
    {
      id: 'renovacao',
      nome: 'Mensagem de renovação',
      descricao: 'Comunicação de renovação com as mudanças',
      prompt: 'Redija a mensagem de renovação para o cliente, com base nas fontes: o que muda em preço e coberturas, opções disponíveis, prazo para resposta e próximos passos. Tom {{tom}}.',
      campos: [{ id: 'tom', rotulo: 'Tom', tipo: 'opcoes', opcoes: ['cordial e direto', 'consultivo', 'formal'] }]
    }
  ]
};

export const FINANCEIRO: Area = {
  id: 'financeiro',
  nome: 'Finanças e investimentos',
  publico: 'Assessores de investimento, consultores e planejadores financeiros',
  sigla: 'FIN',
  persona: `Atue como apoio técnico a assessores de investimento, consultores e planejadores financeiros no Brasil, atento às regras da CVM e aos códigos da ANBIMA.
- Não faça recomendação personalizada de investimento como se fosse o profissional: organize informações, cenários e alternativas para a decisão dele, respeitando suitability.
- Rentabilidade passada não garante resultado futuro; explicite premissas e riscos; não prometa retorno.
- Use as consultas para índices, expectativas de mercado, câmbio e taxas; faça as contas com memória de cálculo.
- Dados patrimoniais e de renda são sigilosos: mantenha os marcadores.`,
  aviso: 'Apoio técnico. Não constitui recomendação de investimento.',
  detectoresPadrao: [...BASE_PII, 'REGISTRO_PROFISSIONAL', 'PROCESSO'],
  ferramentas: [
    'expectativas_mercado', 'taxas_atuais', 'corrigir_valor', 'cotacao_moeda', 'taxas_juros_credito', 'consultar_cnpj', 'consultar_lei_federal',
    'buscar_proposicoes', 'consultar_fipe', 'calcular_prazo'
  ],
  receitas: [
    {
      id: 'diagnostico',
      nome: 'Diagnóstico financeiro',
      descricao: 'Organiza patrimônio, fluxo e objetivos do cliente',
      exigeFontes: true,
      prompt: 'Organize as informações do cliente nas fontes em um diagnóstico: balanço patrimonial (ativos e passivos), fluxo de caixa mensal, reserva de emergência, proteção (seguros/previdência), objetivos com prazo e lacunas de informação. Apresente em tabelas e aponte os pontos de atenção.'
    },
    {
      id: 'cenarios',
      nome: 'Cenário macro para o cliente',
      descricao: 'Resumo de juros, inflação e câmbio com as expectativas atuais',
      prompt: 'Consulte as taxas atuais e as expectativas de mercado (IPCA, Selic, câmbio, PIB) e redija um resumo de cenário para clientes com perfil {{perfil}}: o que os números indicam, o que observar e implicações gerais por classe de ativo, sem recomendar produtos específicos.',
      campos: [{ id: 'perfil', rotulo: 'Perfil', tipo: 'opcoes', opcoes: ['conservador', 'moderado', 'arrojado', 'geral'] }]
    },
    {
      id: 'relatorio-carteira',
      nome: 'Relatório ao cliente',
      descricao: 'Texto de acompanhamento a partir do extrato da carteira',
      exigeFontes: true,
      formato: 'documento',
      prompt: 'Com base no extrato/posição das fontes, redija o relatório de acompanhamento do período {{periodo}}: composição por classe, o que mudou, desempenho frente aos índices de referência (consulte-os), eventos relevantes e pontos para a próxima revisão. Linguagem clara, sem promessas.',
      campos: [{ id: 'periodo', rotulo: 'Período', tipo: 'texto', obrigatorio: true }]
    },
    {
      id: 'comparar-produtos',
      nome: 'Comparar produtos',
      descricao: 'Lâminas, regulamentos ou propostas lado a lado',
      exigeFontes: true,
      prompt: 'Compare os produtos das fontes em tabela: tipo, emissor/gestor, prazo e liquidez, remuneração, taxas, tributação, garantias (FGC ou não), riscos e público-alvo. Aponte o que não está claro nos documentos.'
    },
    {
      id: 'explicar',
      nome: 'Explicar em linguagem simples',
      descricao: 'Explica um conceito ou produto para o cliente',
      prompt: 'Explique para um cliente leigo: {{tema}}. Use analogia simples, um exemplo numérico, riscos e para quem costuma fazer sentido, sem recomendar.',
      campos: [{ id: 'tema', rotulo: 'Tema', tipo: 'texto', obrigatorio: true }]
    }
  ]
};

export const CONTRATACOES: Area = {
  id: 'contratacoes',
  nome: 'Contratações públicas',
  publico: 'Agentes de contratação, pregoeiros, gestores e fornecedores do setor público',
  sigla: 'GOV',
  persona: `Atue como especialista em licitações e contratos administrativos no Brasil, com domínio da Lei 14.133/2021 e da jurisprudência do TCU.
- Fundamente no texto legal: use a consulta de lei para citar artigos literalmente; não cite acórdãos de memória — indique "verificar jurisprudência do TCU".
- Para pesquisa de mercado e referências, busque contratações semelhantes no PNCP; para habilitação e sanções, use a certidão do TCU e a consulta de sanções.
- Prazos em dias úteis devem ser calculados com a ferramenta.
- Seja prático: entregue minutas estruturadas, com [COMPLETAR] onde depender de dado do órgão.`,
  aviso: 'Apoio técnico. Os atos do processo de contratação são de responsabilidade do agente público.',
  detectoresPadrao: [...BASE_PII, 'PROCESSO', 'REGISTRO_PROFISSIONAL'],
  ferramentas: [
    'consultar_lei_federal', 'buscar_licitacoes', 'certidao_tcu', 'consultar_sancoes', 'consultar_cnpj', 'buscar_diarios_municipais', 'calcular_prazo',
    'feriados_nacionais', 'corrigir_valor', 'custo_construcao_sinapi', 'consultar_cnae', 'buscar_proposicoes', 'codigo_municipio_ibge'
  ],
  receitas: [
    {
      id: 'etp',
      nome: 'Estudo técnico preliminar',
      descricao: 'Minuta de ETP nos elementos da Lei 14.133',
      formato: 'documento',
      usaBiblioteca: true,
      prompt: 'Elabore a minuta de Estudo Técnico Preliminar para a contratação de {{objeto}}, com os elementos do art. 18, § 1º, da Lei 14.133/2021 (necessidade, requisitos, estimativa de quantidades e de valor, levantamento de mercado, solução escolhida, parcelamento, resultados pretendidos, providências prévias, contratações correlatas, impactos ambientais e posicionamento conclusivo). Busque contratações semelhantes no PNCP para o levantamento de mercado e use as fontes, se houver.',
      campos: [{ id: 'objeto', rotulo: 'Objeto', tipo: 'texto-longo', obrigatorio: true }]
    },
    {
      id: 'tr',
      nome: 'Termo de referência',
      descricao: 'Minuta de TR a partir do objeto ou do ETP',
      formato: 'documento',
      usaBiblioteca: true,
      prompt: 'Elabore a minuta de Termo de Referência para {{objeto}}, com os elementos do art. 6º, XXIII, da Lei 14.133/2021 (definição do objeto, fundamentação, descrição da solução, requisitos, modelo de execução e de gestão, critérios de medição e pagamento, seleção do fornecedor, estimativa de valor e adequação orçamentária). Use as fontes (como o ETP) quando houver.',
      campos: [{ id: 'objeto', rotulo: 'Objeto', tipo: 'texto-longo', obrigatorio: true }]
    },
    {
      id: 'pesquisa-precos',
      nome: 'Pesquisa de mercado no PNCP',
      descricao: 'Contratações semelhantes como referência',
      prompt: 'Pesquise no PNCP contratações de "{{objeto}}"{{filtro}} e apresente em tabela (Órgão | UF | Modalidade | Objeto | Valor | Situação | Link). Comente a comparabilidade (quantidade, especificação, data) e o que falta para compor a pesquisa de preços nos termos da norma aplicável.',
      campos: [
        { id: 'objeto', rotulo: 'Objeto', tipo: 'texto', obrigatorio: true },
        { id: 'filtro', rotulo: 'Filtro (opcional)', tipo: 'texto', placeholder: ' na UF CE' }
      ]
    },
    {
      id: 'analise-edital',
      nome: 'Análise de edital',
      descricao: 'Resumo, exigências, prazos e riscos',
      exigeFontes: true,
      prompt: 'Analise o edital das fontes sob a ótica de {{lado}}: quadro-resumo (objeto, modalidade, critério de julgamento, valor, datas), exigências de habilitação, prazos (calcule vencimentos com a ferramenta), cláusulas restritivas ou de risco com o dispositivo legal correspondente, e pontos passíveis de esclarecimento ou impugnação.',
      campos: [{ id: 'lado', rotulo: 'Ótica', tipo: 'opcoes', opcoes: ['órgão (revisão interna)', 'fornecedor interessado', 'controle interno'] }]
    },
    {
      id: 'habilitacao',
      nome: 'Conferência de habilitação',
      descricao: 'Checklist dos documentos e consulta de impedimentos',
      exigeFontes: true,
      prompt: 'Confira os documentos de habilitação das fontes frente às exigências do edital/Lei 14.133 (jurídica, fiscal e trabalhista, econômico-financeira, técnica) em tabela (Exigência | Documento apresentado | Situação | Observação). Consulte a certidão consolidada do TCU para o CNPJ do licitante e registre o resultado.'
    },
    {
      id: 'resposta-recurso',
      nome: 'Recurso ou impugnação',
      descricao: 'Minuta de resposta (ou de peça) fundamentada',
      exigeFontes: true,
      formato: 'documento',
      prompt: 'Redija {{peca}} com base nas fontes: síntese do alegado, tempestividade (calcule o prazo), análise ponto a ponto com o texto legal aplicável e conclusão. Instruções: {{instrucoes}}',
      campos: [
        { id: 'peca', rotulo: 'Peça', tipo: 'opcoes', opcoes: ['a resposta à impugnação do edital', 'a decisão sobre o recurso administrativo', 'a impugnação ao edital (fornecedor)', 'o recurso administrativo (fornecedor)'] },
        { id: 'instrucoes', rotulo: 'Instruções', tipo: 'texto-longo' }
      ]
    },
    {
      id: 'fiscalizacao',
      nome: 'Relatório de fiscalização',
      descricao: 'Registro de ocorrências e providências do contrato',
      exigeFontes: true,
      formato: 'documento',
      prompt: 'Com base nas anotações das fontes, redija o relatório de fiscalização do contrato no período {{periodo}}: execução verificada, ocorrências, descumprimentos com a cláusula correspondente, providências e notificações, medição e recomendação ao gestor.',
      campos: [{ id: 'periodo', rotulo: 'Período', tipo: 'texto', obrigatorio: true }]
    }
  ]
};

export const SOCIAL: Area = {
  id: 'social',
  nome: 'Serviço social',
  publico: 'Assistentes sociais no SUAS, saúde, educação, Judiciário e terceiro setor',
  sigla: 'SSO',
  persona: `Atue como apoio técnico a assistentes sociais no Brasil, com base no Código de Ética do/a Assistente Social, na Lei 8.662/1993 e nas normativas do CFESS, do SUAS e do SUS.
- Estudos, relatórios, laudos e pareceres sociais são atribuição privativa: você organiza e redige a partir das anotações; a análise e a conclusão são do profissional.
- Linguagem técnica e respeitosa, centrada em direitos; descreva situações sem julgamento moral e sem culpabilizar usuários e famílias.
- As informações são extremamente sensíveis (violência, saúde, renda, crianças): mantenha os marcadores e inclua em cada documento apenas o necessário à finalidade.
- Ao indicar direitos e benefícios, cite a base legal e recomende confirmar critérios vigentes.`,
  aviso: 'Apoio à escrita técnica. A análise e o parecer social são privativos do assistente social.',
  detectoresPadrao: [...BASE_PII, 'PRONTUARIO', 'PROCESSO', 'REGISTRO_PROFISSIONAL', 'CNPJ'],
  ferramentas: ['consultar_lei_federal', 'calcular_prazo', 'feriados_nacionais', 'consultar_cep', 'codigo_municipio_ibge', 'alerta_arboviroses', 'buscar_proposicoes', 'verificar_referencia'],
  receitas: [
    {
      id: 'relatorio-social',
      nome: 'Relatório social',
      descricao: 'Estrutura as anotações de atendimento ou visita',
      exigeFontes: true,
      usaBiblioteca: true,
      formato: 'documento',
      prompt: 'A partir das anotações das fontes, redija um relatório social para a finalidade "{{finalidade}}": identificação (pseudonimizada), demanda, procedimentos utilizados (entrevista, visita, contatos com a rede), situação familiar, habitacional, de renda e de acesso a direitos, e encaminhamentos. Não formule o parecer conclusivo: deixe a seção "Parecer" com [A SER ELABORADO PELO/A ASSISTENTE SOCIAL] e, à parte, pontos que as fontes sugerem considerar.',
      campos: [{ id: 'finalidade', rotulo: 'Finalidade e destinatário', tipo: 'texto', obrigatorio: true }]
    },
    {
      id: 'estudo-socioeconomico',
      nome: 'Síntese socioeconômica',
      descricao: 'Composição familiar, renda e despesas em quadro',
      exigeFontes: true,
      prompt: 'Organize as informações das fontes em um quadro socioeconômico: composição familiar (como consta), renda por membro e per capita (mostre o cálculo), despesas, moradia, acesso a serviços e benefícios já recebidos. Aponte informações faltantes.'
    },
    {
      id: 'direitos',
      nome: 'Direitos e benefícios aplicáveis',
      descricao: 'Mapeia benefícios e serviços possíveis para a situação',
      prompt: 'Para a situação descrita ({{situacao}}) e nas fontes, liste benefícios, serviços e direitos possivelmente aplicáveis (BPC, Bolsa Família, benefícios eventuais, tarifa social, isenções, serviços do SUAS/SUS etc.), com base legal, critérios principais, onde solicitar e documentos. Sinalize o que deve ser confirmado na regra vigente.',
      campos: [{ id: 'situacao', rotulo: 'Situação (sem identificar a pessoa)', tipo: 'texto-longo', obrigatorio: true }]
    },
    {
      id: 'encaminhamento-rede',
      nome: 'Encaminhamento à rede',
      descricao: 'Ofício ou encaminhamento objetivo a outro serviço',
      formato: 'documento',
      prompt: 'Redija um encaminhamento para {{destino}}, com o motivo, a síntese estritamente necessária da situação, o que se solicita e o contato para retorno. Resguarde informações que não sejam indispensáveis ao serviço de destino.',
      campos: [{ id: 'destino', rotulo: 'Serviço de destino', tipo: 'texto', placeholder: 'CREAS, Conselho Tutelar, Defensoria, UBS…', obrigatorio: true }]
    },
    {
      id: 'plano-acompanhamento',
      nome: 'Plano de acompanhamento',
      descricao: 'Objetivos, ações, responsáveis e prazos',
      exigeFontes: true,
      prompt: 'Proponha um plano de acompanhamento a partir das fontes: objetivos pactuados, ações, responsáveis (família, serviço, rede), prazos e indicadores de acompanhamento, em tabela, para ajuste pelo profissional com a família.'
    }
  ]
};

/**
 * Síndico (11/2026). Não há API pública estável dedicada a condomínios; o perfil combina as
 * consultas já existentes (lei federal, correção, prazos, CNPJ, sanções, DataJud, diários
 * municipais, SINAPI, clima).
 */
export const SINDICO: Area = {
  id: 'sindico',
  nome: 'Síndico',
  publico: 'Síndicos moradores e profissionais, administradoras e conselhos de condomínio',
  sigla: 'SIN',
  persona: `Atue como assessor experiente de síndicos e administradoras de condomínios no Brasil, com base no Código Civil (arts. 1.331 a 1.358-A), na Lei 4.591/1964, na convenção e no regimento interno do condomínio.
- A convenção e o regimento valem primeiro: quando estiverem nas fontes, cite a cláusula; quando não estiverem, diga que a resposta depende deles e indique o que conferir.
- Quóruns, prazos de convocação, multas e encargos de mora mudaram por leis recentes: confirme o texto vigente com a consulta de lei (por exemplo, arts. 1.336, 1.337, 1.341, 1.350 a 1.354-A do Código Civil) em vez de citar de memória.
- Cálculos de débito, reajuste e prazo são feitos com as ferramentas, com memória de cálculo. Na cobrança, aplique os encargos da convenção; se ela for omissa, aponte a regra legal e recomende validação jurídica.
- Trate todos os condôminos com isonomia e linguagem respeitosa e neutra. Não exponha inadimplentes nem infratores: comunicados coletivos não trazem nome nem unidade (LGPD e risco de dano moral).
- Dados de moradores, visitantes, funcionários, placas e imagens de câmeras são dados pessoais: mantenha os marcadores de pseudonimização.
- Antes de contratar fornecedor, confira CNPJ e sanções. Obras e reformas exigem responsável técnico (ABNT NBR 16280 e NBR 5674): não dispense ART/RRT.
- Ações judiciais, demissões e questões trabalhistas ou tributárias do condomínio exigem advogado ou contador: prepare o material, não substitua o profissional.`,
  aviso: 'Apoio à gestão. Decisões cabem ao síndico e à assembleia; cobranças judiciais e obras exigem profissional habilitado.',
  detectoresPadrao: [...BASE_PII, 'CNPJ', 'PROCESSO', 'REGISTRO_PROFISSIONAL'],
  ferramentas: [
    'consultar_lei_federal', 'corrigir_valor', 'calcular_prazo', 'feriados_nacionais', 'consultar_cnpj', 'consultar_sancoes', 'certidao_tcu',
    'consultar_processo_datajud', 'buscar_diarios_municipais', 'custo_construcao_sinapi', 'clima_historico', 'consultar_cep', 'taxas_atuais'
  ],
  receitas: [
    {
      id: 'convocacao',
      nome: 'Edital de convocação',
      descricao: 'Convoca assembleia com pauta, quóruns e prazos conferidos',
      formato: 'documento',
      usaBiblioteca: true,
      prompt: 'Redija o edital de convocação de {{tipo}} para {{data}}, na modalidade {{modalidade}}, com a pauta: {{pauta}}. Inclua primeira e segunda chamadas, local ou link, regras de representação por procuração e de voto de inadimplentes conforme a convenção (use as fontes; se não houver, marque [CONFERIR NA CONVENÇÃO]). Para cada item da pauta, indique o quórum exigido, confirmando o artigo do Código Civil pela consulta de lei. Calcule com a ferramenta a data-limite para envio da convocação, considerando a antecedência de {{antecedencia}}.',
      campos: [
        { id: 'tipo', rotulo: 'Assembleia', tipo: 'opcoes', opcoes: ['assembleia geral ordinária', 'assembleia geral extraordinária'] },
        { id: 'data', rotulo: 'Data e horário', tipo: 'texto', placeholder: '15/03/2027 às 19h30', obrigatorio: true },
        { id: 'modalidade', rotulo: 'Modalidade', tipo: 'opcoes', opcoes: ['presencial', 'virtual', 'híbrida'] },
        { id: 'antecedencia', rotulo: 'Antecedência exigida pela convenção', tipo: 'texto', placeholder: '10 dias corridos', obrigatorio: true },
        { id: 'pauta', rotulo: 'Pauta', tipo: 'texto-longo', placeholder: 'prestação de contas; previsão orçamentária; eleição de síndico; obra da fachada…', obrigatorio: true }
      ]
    },
    {
      id: 'ata-assembleia',
      nome: 'Ata de assembleia',
      descricao: 'Ata objetiva a partir das anotações ou da transcrição',
      exigeFontes: true,
      formato: 'documento',
      prompt: 'Com base nas anotações ou na transcrição das fontes, redija a ata da assembleia: data, local/modalidade, chamada em que foi instalada, mesa (presidente e secretário, como constam), quórum presente, e, para cada item da pauta, síntese objetiva da discussão, proposta votada, resultado (votos a favor, contra e abstenções, se constarem) e deliberação. Registre apenas o que foi decidido, sem adjetivos nem falas ofensivas; não identifique inadimplentes. Marque [COMPLETAR] o que faltar e liste ao final as providências com responsável e prazo.'
    },
    {
      id: 'cobranca',
      nome: 'Cobrança de cotas em atraso',
      descricao: 'Calcula o débito e redige a notificação ao condômino',
      formato: 'documento',
      prompt: 'Calcule o débito condominial a seguir e redija a notificação de cobrança.\nCotas em atraso: {{cotas}}\nEncargos previstos na convenção: {{encargos}}\nData do cálculo: {{data}}\nPara cada cota: valor original, correção monetária (use a ferramenta de correção pelo índice indicado), multa e juros de mora, com memória de cálculo em tabela e total. Se a convenção for omissa quanto a algum encargo, confirme pela consulta de lei a regra do art. 1.336, § 1º, do Código Civil e sinalize que o critério deve ser validado. Em seguida, redija notificação individual, cordial e firme, com o demonstrativo, prazo para pagamento, canais para acordo e as consequências legais do não pagamento, sem tom ameaçador nem exposição a terceiros.',
      campos: [
        { id: 'cotas', rotulo: 'Cotas em atraso (vencimento e valor)', tipo: 'texto-longo', placeholder: '10/08/2026 — R$ 850,00; 10/09/2026 — R$ 850,00', obrigatorio: true },
        { id: 'encargos', rotulo: 'Encargos da convenção', tipo: 'texto', placeholder: 'multa de 2%, juros de 1% ao mês, correção pelo IPCA', obrigatorio: true },
        { id: 'data', rotulo: 'Data do cálculo', tipo: 'texto', placeholder: 'dd/mm/aaaa', obrigatorio: true }
      ]
    },
    {
      id: 'acordo',
      nome: 'Proposta de acordo',
      descricao: 'Parcelamento do débito com termo de confissão de dívida',
      formato: 'documento',
      prompt: 'Elabore uma proposta de acordo para o débito de {{debito}}, em {{parcelas}}, e a minuta do termo de confissão de dívida e parcelamento: partes (como constam nas fontes, se houver), origem e valor do débito, forma de pagamento, vencimentos, consequência do atraso de parcela (vencimento antecipado), manutenção do pagamento das cotas vincendas e foro. Marque [COMPLETAR] o que faltar e observe se a convenção ou a assembleia limitam descontos concedidos pelo síndico.',
      campos: [
        { id: 'debito', rotulo: 'Débito atualizado', tipo: 'texto', obrigatorio: true },
        { id: 'parcelas', rotulo: 'Condições', tipo: 'texto', placeholder: 'entrada de 20% e 6 parcelas mensais', obrigatorio: true }
      ]
    },
    {
      id: 'infracao',
      nome: 'Advertência ou multa',
      descricao: 'Notificação por infração à convenção ou ao regimento',
      formato: 'documento',
      prompt: 'Redija {{medida}} ao condômino/ocupante pela seguinte ocorrência: {{ocorrencia}}. Indique a cláusula da convenção ou do regimento violada (use as fontes; se não houver, marque [INDICAR CLÁUSULA]), descreva o fato de forma objetiva com data e hora, informe o valor da multa quando houver e o fundamento, e garanta prazo e forma para defesa. Confirme pela consulta de lei os limites dos arts. 1.336, § 2º, e 1.337 do Código Civil e alerte se a medida depende de deliberação da assembleia.',
      campos: [
        { id: 'medida', rotulo: 'Medida', tipo: 'opcoes', opcoes: ['uma advertência escrita', 'uma notificação de multa', 'uma notificação de multa por reincidência'] },
        { id: 'ocorrencia', rotulo: 'Ocorrência', tipo: 'texto-longo', placeholder: 'barulho após as 22h em 12/11, registrado pela portaria…', obrigatorio: true }
      ]
    },
    {
      id: 'convencao',
      nome: 'Consultar a convenção',
      descricao: 'Responde a uma dúvida citando cláusula e lei',
      exigeFontes: true,
      prompt: 'Responda com base na convenção e no regimento das fontes: {{pergunta}}\nCite a cláusula aplicável literalmente, confira se ela é compatível com o Código Civil (use a consulta de lei para o artigo pertinente), aponte lacunas ou conflitos entre convenção, regimento e lei e diga qual prevalece. Conclua com o que o síndico pode fazer por conta própria e o que depende de assembleia (e com qual quórum).',
      campos: [{ id: 'pergunta', rotulo: 'Dúvida', tipo: 'texto-longo', placeholder: 'Posso proibir locação por temporada? Quem paga o conserto da coluna de água?', obrigatorio: true }]
    },
    {
      id: 'prestacao-contas',
      nome: 'Análise da prestação de contas',
      descricao: 'Confere balancete, aponta desvios e prepara o resumo',
      exigeFontes: true,
      prompt: 'Analise o balancete/prestação de contas das fontes referente a {{periodo}}: receitas e despesas por grupo em tabela, comparação com a previsão orçamentária (se constar), inadimplência em valor e percentual (sem identificar unidades), saldo de caixa e do fundo de reserva, despesas atípicas ou sem documento, e inconsistências de soma. Termine com um resumo de uma página, em linguagem simples, para apresentar aos condôminos, e com as perguntas que o conselho fiscal deveria fazer.',
      campos: [{ id: 'periodo', rotulo: 'Período', tipo: 'texto', placeholder: 'outubro/2026 ou exercício de 2026', obrigatorio: true }]
    },
    {
      id: 'previsao',
      nome: 'Previsão orçamentária e rateio',
      descricao: 'Projeta as despesas do próximo período e a cota por unidade',
      exigeFontes: true,
      prompt: 'Com base nas despesas das fontes, monte a previsão orçamentária para {{periodo}}: despesas por grupo (pessoal e encargos, consumo, contratos, manutenção, seguros, administrativas), premissas de reajuste (consulte os índices e taxas atuais; informe o dissídio como [CONFERIR CONVENÇÃO COLETIVA]), fundo de reserva conforme a convenção e margem para inadimplência. Calcule a cota por unidade segundo o critério {{criterio}}, compare com a cota atual e apresente o texto de justificativa para a assembleia.',
      campos: [
        { id: 'periodo', rotulo: 'Período orçado', tipo: 'texto', placeholder: 'exercício de 2027', obrigatorio: true },
        { id: 'criterio', rotulo: 'Critério de rateio', tipo: 'opcoes', opcoes: ['fração ideal (informada nas fontes)', 'igualitário por unidade', 'outro previsto na convenção'] }
      ]
    },
    {
      id: 'orcamentos',
      nome: 'Comparar orçamentos',
      descricao: 'Propostas de fornecedores lado a lado, com checagem do CNPJ',
      exigeFontes: true,
      prompt: 'Compare as propostas das fontes para {{servico}} em tabela: fornecedor, escopo, materiais, prazo, garantia, preço, forma de pagamento e o que cada uma deixa de fora. Consulte o CNPJ de cada fornecedor (situação cadastral, atividade compatível, tempo de empresa) e, se disponível, sanções. Aponte diferenças de escopo que distorcem a comparação de preço, cláusulas a exigir no contrato (responsável técnico com ART/RRT, seguro, retenções, multa por atraso) e uma recomendação fundamentada para o conselho.',
      campos: [{ id: 'servico', rotulo: 'Serviço ou obra', tipo: 'texto', placeholder: 'impermeabilização da laje; manutenção de elevadores', obrigatorio: true }]
    },
    {
      id: 'reforma-unidade',
      nome: 'Pedido de reforma em unidade',
      descricao: 'Confere o plano de reforma e responde ao condômino',
      exigeFontes: true,
      prompt: 'Analise o pedido de reforma das fontes à luz da ABNT NBR 16280 e do regimento: escopo, se há intervenção em estrutura, vedações, instalações ou fachada, documentos apresentados e faltantes (plano de reforma, ART/RRT, cronograma, identificação dos prestadores), horários e regras de obra. Entregue um checklist (Item | Apresentado | Pendência) e a minuta de resposta ao condômino: autorização, autorização condicionada ou exigência de complementação. O síndico não aprova tecnicamente a obra: registre que a responsabilidade técnica é do profissional habilitado.'
    },
    {
      id: 'comunicado',
      nome: 'Comunicado aos moradores',
      descricao: 'Aviso claro para mural, e-mail ou aplicativo',
      prompt: 'Redija um comunicado aos moradores para {{canal}} sobre: {{assunto}}. Diga o que acontece, quando, o que cada morador precisa fazer e o contato para dúvidas. Linguagem simples, cordial e neutra; não cite nomes nem unidades.',
      campos: [
        { id: 'canal', rotulo: 'Canal', tipo: 'opcoes', opcoes: ['mural e elevadores', 'e-mail', 'aplicativo ou grupo de mensagens'] },
        { id: 'assunto', rotulo: 'Assunto', tipo: 'texto-longo', placeholder: 'interrupção de água para limpeza das caixas em 05/12, das 8h às 14h', obrigatorio: true }
      ]
    },
    {
      id: 'manutencao',
      nome: 'Plano de manutenção',
      descricao: 'Calendário de manutenções e vencimentos obrigatórios',
      prompt: 'Monte o plano anual de manutenção preventiva para um condomínio com: {{caracteristicas}}. Tabela (Sistema | Atividade | Periodicidade | Responsável | Documento a guardar), na lógica da ABNT NBR 5674, incluindo elevadores, bombas, caixas d\'água, para-raios (SPDA), extintores e sistema de incêndio, gás, gerador, portões, fachada e seguro obrigatório. Sinalize os itens cuja exigência e periodicidade dependem de norma estadual ou municipal (como AVCB e laudos de inspeção predial) com [CONFERIR NORMA LOCAL].',
      campos: [{ id: 'caracteristicas', rotulo: 'Características do condomínio', tipo: 'texto-longo', placeholder: '2 torres, 120 unidades, 4 elevadores, piscina, gerador, gás encanado…', obrigatorio: true }]
    },
    {
      id: 'lgpd-condominio',
      nome: 'LGPD no condomínio',
      descricao: 'Checklist de portaria, câmeras, biometria e cadastros',
      prompt: 'Monte um checklist de adequação do condomínio à LGPD: cadastro de moradores e funcionários, controle de acesso de visitantes e prestadores, biometria e reconhecimento facial (dado sensível), câmeras e prazo de guarda das imagens, pedidos de imagens por moradores e autoridades, divulgação de inadimplência, grupos de mensagens, contratos com administradora, portaria remota e aplicativos (operadores), incidentes e canal de atendimento ao titular. Para cada item: risco, medida recomendada e quem decide (síndico ou assembleia).'
    }
  ]
};

/**
 * Segurança e Saúde do Trabalho (11/2026). Não há API oficial para o texto das NRs nem para o
 * CA de EPI (o MTE publica só páginas e um CSV); o perfil combina CNPJ/CNAE, lei federal, prazos
 * e os dimensionamentos determinísticos de SESMT (NR-4) e CIPA (NR-5).
 */
export const SST: Area = {
  id: 'sst',
  nome: 'Segurança e saúde do trabalho',
  publico: 'Técnicos e engenheiros de segurança, médicos e enfermeiros do trabalho, consultorias de SST e clínicas ocupacionais',
  sigla: 'SST',
  persona: `Atue como apoio técnico a profissionais de segurança e saúde do trabalho no Brasil, com base nas Normas Regulamentadoras do MTE (em especial NR-1, 4, 5, 6, 7, 9, 15, 16 e 17), na CLT (arts. 154 a 201), na Lei 8.213/1991 e nos eventos de SST do eSocial (S-2210, S-2220 e S-2240).
- As NRs mudam com frequência e você não tem consulta ao texto vigente delas: ao citar item, limite de tolerância, prazo ou periodicidade de NR, marque [CONFERIR NA NR VIGENTE] e nunca invente número de item. Para CLT e leis federais, use a consulta de lei.
- Dimensionamento de SESMT e de CIPA é feito com as ferramentas, a partir do grau de risco e do número de empregados; não estime de cabeça. O grau de risco vem do Anexo I da NR-4 pela CNAE da atividade: se o usuário não o informar, localize a CNAE (consultas de CNPJ e CNAE) e peça que ele confirme o grau na NR-4.
- PGR, PCMSO, LTCAT e laudos de insalubridade e periculosidade têm responsável técnico definido em norma: você organiza dados e redige minutas; a caracterização do risco, a conclusão e a assinatura são do profissional habilitado.
- Informações de saúde do trabalhador (exames, ASO, afastamentos, CAT, queixas) são dados sensíveis e, em parte, cobertas por sigilo médico: mantenha os marcadores de pseudonimização e não leve diagnóstico nem resultado de exame a documentos destinados ao empregador além do que a norma exige.
- Em riscos psicossociais, avalie fatores da organização do trabalho (demanda, autonomia, apoio, jornada, assédio), nunca a saúde mental de pessoas identificadas; resultados sempre agregados por setor ou função.
- Em análise de acidente, busque causas organizacionais e técnicas; não atribua culpa ao trabalhador.
- Medidas de prevenção seguem a hierarquia: eliminação, substituição, medidas de engenharia, medidas administrativas e, por último, EPI. A validade do CA de um EPI deve ser conferida na consulta oficial do MTE.`,
  aviso: 'Apoio técnico. Caracterização de riscos, laudos e programas são de responsabilidade do profissional habilitado; confira a NR vigente.',
  detectoresPadrao: [...BASE_PII, 'CNPJ', 'PRONTUARIO', 'REGISTRO_PROFISSIONAL', 'PROCESSO'],
  ferramentas: [
    'dimensionar_sesmt', 'dimensionar_cipa', 'consultar_cnpj', 'consultar_cnae', 'consultar_lei_federal', 'calcular_prazo', 'feriados_nacionais',
    'buscar_cid', 'buscar_pubmed', 'verificar_referencia', 'consultar_cep'
  ],
  receitas: [
    {
      id: 'inventario-riscos',
      nome: 'Inventário de riscos (PGR)',
      descricao: 'Perigos, riscos e medidas por setor ou função, em tabela',
      usaBiblioteca: true,
      prompt: 'Monte a minuta do inventário de riscos do PGR para: {{atividade}}\nUse também as fontes, se houver (descrição de processos, medições, PGR anterior). Tabela: Setor/função | Atividade | Perigo ou fator de risco | Tipo (físico, químico, biológico, ergonômico, acidente, psicossocial) | Fonte ou circunstância | Possíveis lesões ou agravos | Medidas de prevenção existentes | Medidas recomendadas (na hierarquia de controle). Deixe as colunas de probabilidade, severidade e nível de risco como [A AVALIAR PELO RESPONSÁVEL], indicando quais medições ou avaliações quantitativas seriam necessárias. Liste ao final as informações que faltam para concluir o inventário.',
      campos: [{ id: 'atividade', rotulo: 'Empresa, setores e atividades', tipo: 'texto-longo', placeholder: 'marcenaria com 35 empregados: corte, lixamento, pintura, expedição…', obrigatorio: true }]
    },
    {
      id: 'psicossociais',
      nome: 'Riscos psicossociais (NR-1)',
      descricao: 'Fatores da organização do trabalho e plano de prevenção',
      prompt: 'Estruture a avaliação dos fatores de risco psicossociais relacionados ao trabalho para: {{contexto}}\nSe as fontes trouxerem resultados de questionário, entrevistas, indicadores de absenteísmo ou rotatividade, use-os apenas de forma agregada por setor ou função, sem identificar pessoas e sem inferir diagnósticos. Entregue: (1) fatores identificados (sobrecarga, metas, jornada, autonomia, apoio da chefia, conflitos, assédio, trabalho isolado etc.) com a evidência de cada um; (2) grupos expostos; (3) medidas de prevenção voltadas à organização do trabalho, com responsável e prazo, em tabela; (4) indicadores de acompanhamento; (5) como registrar no inventário de riscos e no plano de ação do PGR. Marque [CONFERIR NA NR VIGENTE] nas exigências da NR-1 e aponte o que ainda precisa ser levantado.',
      campos: [{ id: 'contexto', rotulo: 'Empresa, setores e situação observada', tipo: 'texto-longo', placeholder: 'central de atendimento, 120 operadores em turnos, metas diárias, alta rotatividade…', obrigatorio: true }]
    },
    {
      id: 'plano-acao',
      nome: 'Plano de ação do PGR',
      descricao: 'Medidas, responsáveis, prazos e forma de verificação',
      exigeFontes: true,
      prompt: 'A partir do inventário de riscos das fontes, proponha o plano de ação do PGR em tabela: Risco | Medida de prevenção | Tipo (eliminação, substituição, engenharia, administrativa, EPI) | Responsável | Prazo | Como verificar a eficácia. Ordene pela prioridade indicada no inventário; quando ela não constar, explique o critério usado. Aponte riscos do inventário que ficaram sem medida e medidas que dependem de projeto, laudo ou investimento.'
    },
    {
      id: 'dimensionamento',
      nome: 'Dimensionar SESMT e CIPA',
      descricao: 'Quadro mínimo pela NR-4 e pela NR-5, com memória',
      prompt: 'Dimensione o SESMT (NR-4) e a CIPA (NR-5) do estabelecimento.\nAtividade, CNAE ou CNPJ: {{atividade}}\nGrau de risco: {{grau}}\nNúmero de empregados: {{empregados}}\nSe o grau de risco não foi informado, localize a CNAE principal (consulta de CNPJ ou de CNAE), diga qual é e peça ao usuário que confirme o grau no Anexo I da NR-4, sem supor um valor. Com o grau conhecido, use as ferramentas de dimensionamento de SESMT e de CIPA e apresente os dois resultados com as observações das notas dos quadros. Explique o que fazer quando o estabelecimento não se enquadra (SESMT não obrigatório; nomeação de representante da NR-5) e lembre as hipóteses que alteram o cálculo, marcadas com [CONFERIR NA NR VIGENTE].',
      campos: [
        { id: 'atividade', rotulo: 'Atividade, CNAE ou CNPJ', tipo: 'texto', placeholder: 'construção de edifícios — CNAE 4120-4/00', obrigatorio: true },
        { id: 'grau', rotulo: 'Grau de risco (Anexo I da NR-4)', tipo: 'opcoes', opcoes: ['não informado', '1', '2', '3', '4'] },
        { id: 'empregados', rotulo: 'Número de empregados do estabelecimento', tipo: 'texto', placeholder: '180', obrigatorio: true }
      ]
    },
    {
      id: 'analise-acidente',
      nome: 'Análise de acidente',
      descricao: 'Cronologia, causas e medidas, sem atribuir culpa',
      exigeFontes: true,
      formato: 'documento',
      prompt: 'Com base nos relatos e registros das fontes, redija o relatório de análise do acidente ou incidente: descrição objetiva do evento (data, hora, local, tarefa, como constam), cronologia, pessoas envolvidas pelos marcadores, lesão informada apenas no nível necessário, fatores causais imediatos e fatores organizacionais e técnicos subjacentes (método de árvore de causas), barreiras que falharam e medidas corretivas e preventivas com responsável e prazo. Não atribua culpa ao trabalhador nem use expressões como "ato inseguro". Calcule com a ferramenta de prazo a data-limite da comunicação do acidente (CAT), confirmando a regra do art. 22 da Lei 8.213/1991 pela consulta de lei, e liste os dados necessários ao evento S-2210 do eSocial. Marque [COMPLETAR] o que as fontes não trazem.'
    },
    {
      id: 'ltcat-ppp',
      nome: 'Apoio a LTCAT e PPP',
      descricao: 'Organiza medições e exposições para o responsável concluir',
      exigeFontes: true,
      prompt: 'Organize as informações das fontes (medições, descrição de atividades, laudos anteriores) para apoiar a elaboração do LTCAT e o preenchimento do PPP: por função ou grupo homogêneo de exposição, tabela com Agente | Intensidade ou concentração medida | Técnica e equipamento (como constam) | Limite de tolerância aplicável [CONFERIR NA NR-15 / NHO VIGENTE] | Habitualidade e permanência descritas | EPC e EPI informados (com CA). Aponte inconsistências entre documentos, medições vencidas ou sem metodologia e dados que faltam para o evento S-2240 do eSocial. Não conclua sobre enquadramento como atividade especial, insalubridade ou periculosidade: deixe a seção "Conclusão" com [A SER ELABORADA PELO ENGENHEIRO DE SEGURANÇA OU MÉDICO DO TRABALHO].'
    },
    {
      id: 'ordem-servico',
      nome: 'Ordem de serviço',
      descricao: 'Instruções de segurança por função, para ciência do trabalhador',
      formato: 'documento',
      usaBiblioteca: true,
      prompt: 'Redija a ordem de serviço de segurança e saúde no trabalho para a função {{funcao}}, com: descrição das atividades, riscos da função (use as fontes, se houver inventário), medidas de prevenção e procedimentos obrigatórios, EPIs exigidos e cuidados de uso e guarda, proibições, procedimentos em caso de acidente ou emergência, e campo de ciência do trabalhador com data. Linguagem direta, em frases curtas, compreensível para quem executa a tarefa.',
      campos: [{ id: 'funcao', rotulo: 'Função e atividades', tipo: 'texto-longo', placeholder: 'operador de empilhadeira em centro de distribuição', obrigatorio: true }]
    },
    {
      id: 'dds',
      nome: 'DDS ou treinamento',
      descricao: 'Roteiro curto de diálogo de segurança ou de aula',
      prompt: 'Prepare {{formato}} sobre {{tema}} para {{publico}}: objetivo, mensagem principal em uma frase, roteiro com tempos, um caso ou exemplo realista do dia a dia desse público, três perguntas para estimular a participação e o que registrar ao final (lista de presença, conteúdo, instrutor). Linguagem simples e respeitosa, sem tom de bronca.',
      campos: [
        { id: 'formato', rotulo: 'Formato', tipo: 'opcoes', opcoes: ['um DDS de 10 minutos', 'um treinamento de 1 hora', 'uma campanha de uma semana (5 DDS encadeados)'] },
        { id: 'tema', rotulo: 'Tema', tipo: 'texto', placeholder: 'trabalho em altura; proteção auditiva; ergonomia no escritório', obrigatorio: true },
        { id: 'publico', rotulo: 'Público', tipo: 'texto', placeholder: 'equipe de manutenção predial', obrigatorio: true }
      ]
    },
    {
      id: 'checklist-nr',
      nome: 'Checklist de conformidade',
      descricao: 'Itens a verificar em campo para uma NR e atividade',
      prompt: 'Monte um checklist de inspeção de conformidade com a {{nr}} para {{atividade}}: tabela Item a verificar | Evidência esperada (documento, registro ou condição de campo) | Conforme / Não conforme / Não se aplica | Observação. Agrupe por tema (documentação, capacitação, condições físicas, equipamentos, procedimentos, emergência). Não cite número de item da norma de memória: indique o tema e marque [CONFERIR NA NR VIGENTE]. Se as fontes trouxerem registros da empresa, preencha o que for possível verificar por eles e deixe o restante para a vistoria.',
      campos: [
        { id: 'nr', rotulo: 'Norma', tipo: 'texto', placeholder: 'NR-35 (trabalho em altura)', obrigatorio: true },
        { id: 'atividade', rotulo: 'Atividade ou local', tipo: 'texto', placeholder: 'montagem de andaimes em obra de 8 pavimentos', obrigatorio: true }
      ]
    },
    {
      id: 'esocial-sst',
      nome: 'Conferência de eventos do eSocial',
      descricao: 'Cruza S-2210, S-2220 e S-2240 com os documentos de SST',
      exigeFontes: true,
      prompt: 'Confira os dados de SST das fontes para envio ao eSocial: para cada trabalhador (pelos marcadores), verifique se há as informações necessárias aos eventos S-2220 (monitoramento da saúde: tipo e data do exame, resultado de aptidão, médico responsável) e S-2240 (condições ambientais: ambiente, atividades, agentes nocivos, EPC e EPI com CA, responsável pelos registros), e ao S-2210 quando houver acidente. Tabela Trabalhador | Evento | Dado faltante ou inconsistente | Documento de origem. Aponte divergências entre PGR, PCMSO, LTCAT e ASO (função, setor, agentes, datas) e exames periódicos vencidos ou a vencer. Não transcreva diagnósticos nem resultados de exames complementares.'
    },
    {
      id: 'epi',
      nome: 'Especificação de EPI',
      descricao: 'EPIs por função, com critérios de seleção e controle',
      prompt: 'Para a função ou atividade {{funcao}} e os riscos descritos (e nas fontes, se houver), proponha a especificação de EPIs em tabela: Risco | Parte do corpo | EPI e característica técnica exigida | Critério de seleção | Periodicidade de troca ou inspeção | Treinamento necessário. Antes dos EPIs, liste as medidas de proteção coletiva e administrativas que devem ser avaliadas primeiro. Lembre que só pode ser fornecido EPI com CA válido, a conferir na consulta oficial do MTE, e inclua um modelo de ficha de entrega com ciência do trabalhador.',
      campos: [{ id: 'funcao', rotulo: 'Função, atividade e riscos', tipo: 'texto-longo', placeholder: 'soldador em caldeiraria: fumos metálicos, radiação, ruído, projeção de partículas', obrigatorio: true }]
    }
  ]
};

export const CARTORIOS: Area = {
  id: 'cartorios',
  nome: 'Cartórios',
  publico: 'Tabeliães, registradores e escreventes',
  sigla: 'CRT',
  persona: `Atue como apoio técnico a serventias extrajudiciais no Brasil (notas, registro de imóveis, registro civil, títulos e documentos, protesto), com base na Lei 6.015/1973, na Lei 8.935/1994, no Código Civil, nas normas das corregedorias e nos provimentos do CNJ.
- Qualificação registral e lavratura são atos do delegatário: você organiza, confere e minuta; aponte exigências com o fundamento normativo.
- Cite o texto legal usando a consulta de lei; normas de corregedorias estaduais variam — indique "conferir o Código de Normas local".
- Os documentos trazem qualificação completa de pessoas: mantenha os marcadores de pseudonimização.`,
  aviso: 'Apoio técnico. A qualificação e os atos são de responsabilidade do delegatário.',
  detectoresPadrao: [...BASE_PII, 'PROCESSO', 'REGISTRO_PROFISSIONAL'],
  ferramentas: ['consultar_lei_federal', 'calcular_prazo', 'feriados_nacionais', 'consultar_cnpj', 'consultar_cep', 'corrigir_valor', 'certidao_tcu', 'codigo_municipio_ibge'],
  receitas: [
    {
      id: 'qualificacao',
      nome: 'Conferência de título',
      descricao: 'Checklist de qualificação e possíveis exigências',
      exigeFontes: true,
      prompt: 'Confira o título das fontes para {{ato}}: partes e qualificação (como constam), objeto, requisitos formais, documentos e certidões exigíveis, tributos e emolumentos a verificar, e possíveis exigências em tabela (Exigência | Fundamento | Como sanar). Indique o que depende do Código de Normas local.',
      campos: [{ id: 'ato', rotulo: 'Ato pretendido', tipo: 'texto', placeholder: 'registro de compra e venda; averbação de construção…', obrigatorio: true }]
    },
    {
      id: 'nota-devolutiva',
      nome: 'Nota devolutiva',
      descricao: 'Redige as exigências de forma clara e fundamentada',
      formato: 'documento',
      prompt: 'Redija a nota devolutiva com as seguintes exigências: {{exigencias}}. Para cada uma: descrição clara, fundamento legal/normativo e como cumprir. Linguagem objetiva e cordial; inclua o prazo de validade da prenotação [COMPLETAR].',
      campos: [{ id: 'exigencias', rotulo: 'Exigências', tipo: 'texto-longo', obrigatorio: true }]
    },
    {
      id: 'minuta-ato',
      nome: 'Minuta de ato notarial',
      descricao: 'Escritura, procuração ou ata a partir dos dados',
      exigeFontes: true,
      usaBiblioteca: true,
      formato: 'documento',
      prompt: 'Redija a minuta de {{ato}} com base nas fontes, na estrutura usual (comparecimento e qualificação, objeto, declarações, cláusulas, documentos apresentados e encerramento). Mantenha os marcadores de pessoas e documentos e marque [COMPLETAR] o que faltar.',
      campos: [{ id: 'ato', rotulo: 'Ato', tipo: 'opcoes', opcoes: ['escritura de compra e venda', 'procuração pública', 'ata notarial', 'escritura de inventário e partilha', 'escritura de divórcio', 'escritura de união estável'] }]
    },
    {
      id: 'explicar-usuario',
      nome: 'Orientação ao usuário',
      descricao: 'Explica um procedimento e os documentos necessários',
      prompt: 'Escreva uma orientação em linguagem simples para o usuário sobre {{procedimento}}: para que serve, documentos necessários, etapas, prazo estimado e custos a consultar na tabela de emolumentos.',
      campos: [{ id: 'procedimento', rotulo: 'Procedimento', tipo: 'texto', obrigatorio: true }]
    },
    {
      id: 'lgpd-serventia',
      nome: 'LGPD na serventia',
      descricao: 'Checklist e minutas de adequação aos provimentos do CNJ',
      prompt: 'Monte um checklist de adequação da serventia à LGPD e aos provimentos do CNJ sobre proteção de dados e segurança da informação: encarregado, inventário de dados, bases legais por ato, compartilhamentos, atendimento a titulares, incidentes, contratos com operadores e uso de inteligência artificial. Sinalize o que deve ser conferido no texto vigente dos provimentos.'
    }
  ]
};
