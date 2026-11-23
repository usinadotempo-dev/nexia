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
