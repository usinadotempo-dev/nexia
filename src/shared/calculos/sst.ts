/**
 * Dimensionamentos determinísticos de segurança e saúde do trabalho.
 *
 * - SESMT: NR-4, Anexo II (redação da Portaria MTP 2.318/2022).
 * - CIPA: NR-5, Quadro I (redação da Portaria MTP 422/2021).
 *
 * Os quadros foram transcritos em 26/11/2026 de reproduções do texto das portarias e
 * conferidos entre duas fontes cada (o PDF oficial do MTE não pôde ser lido por máquina).
 * Ao atualizar uma NR, revise estas tabelas célula a célula contra o texto publicado.
 */

export type GrauRisco = 1 | 2 | 3 | 4;

export type ProfissionalSesmt = 'tecnico' | 'engenheiro' | 'enfermagem' | 'enfermeiro' | 'medico';

export const ROTULO_PROFISSIONAL: Record<ProfissionalSesmt, string> = {
  tecnico: 'Técnico de segurança do trabalho',
  engenheiro: 'Engenheiro de segurança do trabalho',
  enfermagem: 'Auxiliar ou técnico de enfermagem do trabalho',
  enfermeiro: 'Enfermeiro do trabalho',
  medico: 'Médico do trabalho'
};

const ORDEM_PROFISSIONAIS: ProfissionalSesmt[] = ['tecnico', 'engenheiro', 'enfermagem', 'enfermeiro', 'medico'];

/** Limite superior de cada faixa do Anexo II; a 8ª coluna é o acréscimo acima de 5.000. */
const FAIXAS_SESMT = [
  { min: 50, max: 100, rotulo: '50 a 100' },
  { min: 101, max: 250, rotulo: '101 a 250' },
  { min: 251, max: 500, rotulo: '251 a 500' },
  { min: 501, max: 1000, rotulo: '501 a 1.000' },
  { min: 1001, max: 2000, rotulo: '1.001 a 2.000' },
  { min: 2001, max: 3500, rotulo: '2.001 a 3.500' },
  { min: 3501, max: 5000, rotulo: '3.501 a 5.000' }
];
const COLUNA_ACRESCIMO_SESMT = 7;

/**
 * Células como no Anexo II: '' = vazio; '*' = tempo parcial (mínimo de três horas);
 * '***' = pode ser substituído por enfermeiro do trabalho em tempo parcial.
 */
const QUADRO_SESMT: Record<GrauRisco, Record<ProfissionalSesmt, string[]>> = {
  1: {
    tecnico: ['', '', '', '1', '1', '1', '2', '1'],
    engenheiro: ['', '', '', '', '', '1*', '1', '1*'],
    enfermagem: ['', '', '', '', '', '1***', '1', '1'],
    enfermeiro: ['', '', '', '', '', '', '1*', ''],
    medico: ['', '', '', '', '1*', '1*', '1', '1*']
  },
  2: {
    tecnico: ['', '', '', '1', '1', '2', '5', '1'],
    engenheiro: ['', '', '', '', '1*', '1', '1', '1*'],
    enfermagem: ['', '', '', '', '1***', '1***', '1', '1'],
    enfermeiro: ['', '', '', '', '', '', '1', ''],
    medico: ['', '', '', '', '1*', '1', '1', '1']
  },
  3: {
    tecnico: ['', '1', '2', '3', '4', '6', '8', '3'],
    engenheiro: ['', '', '', '1*', '1', '1', '2', '1'],
    enfermagem: ['', '', '', '', '1***', '1', '1', '1'],
    enfermeiro: ['', '', '', '', '', '1', '1', ''],
    medico: ['', '', '', '1*', '1', '1', '2', '1']
  },
  4: {
    tecnico: ['1', '2', '3', '4', '5', '8', '10', '3'],
    engenheiro: ['', '1*', '1*', '1', '1', '2', '3', '1'],
    enfermagem: ['', '', '', '1***', '1***', '1', '1', '1'],
    enfermeiro: ['', '', '', '', '', '1', '1', ''],
    medico: ['', '1*', '1*', '1', '1', '2', '3', '1']
  }
};

interface Celula {
  n: number;
  parcial: boolean;
  enfermeiroOpcional: boolean;
}

function lerCelula(bruta: string): Celula {
  const n = Number.parseInt(bruta, 10);
  return { n: Number.isFinite(n) ? n : 0, parcial: /^\d+\*$/.test(bruta), enfermeiroOpcional: bruta.endsWith('***') };
}

export interface ItemSesmt {
  profissional: ProfissionalSesmt;
  rotulo: string;
  quantidade: number;
  /** Todos os profissionais deste item podem atuar em tempo parcial. */
  tempoParcial: boolean;
  /** Pode ser substituído por um enfermeiro do trabalho em tempo parcial. */
  enfermeiroOpcional: boolean;
  /** Composição quando há acréscimo acima de 5.000 empregados. */
  detalhe?: string;
}

export interface ResultadoSesmt {
  grau: GrauRisco;
  empregados: number;
  faixa: string;
  /** false = o Anexo II não prevê nenhum profissional para o grau e a faixa. */
  obrigatorio: boolean;
  /** Grupos de 4.000 (ou fração acima de 2.000) além de 5.000 empregados. */
  gruposAdicionais: number;
  itens: ItemSesmt[];
}

function validar(grau: number, empregados: number): asserts grau is GrauRisco {
  if (![1, 2, 3, 4].includes(grau)) throw new Error('Grau de risco deve ser 1, 2, 3 ou 4.');
  if (!Number.isInteger(empregados) || empregados < 0) throw new Error('Número de empregados inválido.');
}

export function dimensionarSesmt(grau: number, empregados: number): ResultadoSesmt {
  validar(grau, empregados);
  const quadro = QUADRO_SESMT[grau];

  if (empregados < 50) {
    return { grau, empregados, faixa: 'menos de 50', obrigatorio: false, gruposAdicionais: 0, itens: [] };
  }

  let coluna = FAIXAS_SESMT.findIndex((f) => empregados >= f.min && empregados <= f.max);
  let grupos = 0;
  let faixa: string;
  if (coluna === -1) {
    coluna = FAIXAS_SESMT.length - 1;
    const excedente = empregados - 5000;
    grupos = Math.floor(excedente / 4000) + (excedente % 4000 > 2000 ? 1 : 0);
    faixa = 'acima de 5.000';
  } else {
    faixa = FAIXAS_SESMT[coluna]!.rotulo;
  }

  const itens: ItemSesmt[] = [];
  for (const profissional of ORDEM_PROFISSIONAIS) {
    const base = lerCelula(quadro[profissional][coluna]!);
    const acrescimo = lerCelula(quadro[profissional][COLUNA_ACRESCIMO_SESMT]!);
    const extra = grupos * acrescimo.n;
    const quantidade = base.n + extra;
    if (quantidade === 0) continue;
    const item: ItemSesmt = {
      profissional,
      rotulo: ROTULO_PROFISSIONAL[profissional],
      quantidade,
      tempoParcial: extra > 0 ? base.parcial && acrescimo.parcial : base.parcial,
      enfermeiroOpcional: base.enfermeiroOpcional
    };
    if (extra > 0) {
      const sufixo = (c: Celula) => (c.parcial ? ' em tempo parcial' : '');
      item.detalhe =
        (base.n > 0 ? `${base.n}${sufixo(base)} pela faixa de 3.501 a 5.000 + ` : '') +
        `${grupos} × ${acrescimo.n}${sufixo(acrescimo)} pelos grupos adicionais`;
    }
    itens.push(item);
  }

  return { grau, empregados, faixa, obrigatorio: itens.length > 0, gruposAdicionais: grupos, itens };
}

const FAIXAS_CIPA = [
  { min: 0, max: 19, rotulo: '0 a 19' },
  { min: 20, max: 29, rotulo: '20 a 29' },
  { min: 30, max: 50, rotulo: '30 a 50' },
  { min: 51, max: 80, rotulo: '51 a 80' },
  { min: 81, max: 100, rotulo: '81 a 100' },
  { min: 101, max: 120, rotulo: '101 a 120' },
  { min: 121, max: 140, rotulo: '121 a 140' },
  { min: 141, max: 300, rotulo: '141 a 300' },
  { min: 301, max: 500, rotulo: '301 a 500' },
  { min: 501, max: 1000, rotulo: '501 a 1.000' },
  { min: 1001, max: 2500, rotulo: '1.001 a 2.500' },
  { min: 2501, max: 5000, rotulo: '2.501 a 5.000' },
  { min: 5001, max: 10000, rotulo: '5.001 a 10.000' }
];
const COLUNA_ACRESCIMO_CIPA = 13;

/** Quadro I da NR-5: 13 faixas + acréscimo por grupo de 2.500 acima de 10.000 (0 = vazio). */
const QUADRO_CIPA: Record<GrauRisco, { efetivos: number[]; suplentes: number[] }> = {
  1: { efetivos: [0, 0, 0, 0, 1, 1, 1, 1, 2, 4, 5, 6, 8, 1], suplentes: [0, 0, 0, 0, 1, 1, 1, 1, 2, 3, 4, 5, 6, 1] },
  2: { efetivos: [0, 0, 0, 1, 1, 2, 2, 3, 4, 5, 6, 8, 10, 1], suplentes: [0, 0, 0, 1, 1, 1, 1, 2, 3, 4, 5, 6, 8, 1] },
  3: { efetivos: [0, 1, 1, 2, 2, 2, 3, 4, 5, 6, 8, 10, 12, 2], suplentes: [0, 1, 1, 1, 1, 1, 2, 2, 4, 4, 6, 8, 8, 2] },
  4: { efetivos: [0, 1, 2, 3, 3, 4, 4, 4, 5, 6, 9, 11, 13, 2], suplentes: [0, 1, 1, 2, 2, 2, 2, 3, 4, 5, 7, 8, 10, 2] }
};

export interface ResultadoCipa {
  grau: GrauRisco;
  empregados: number;
  faixa: string;
  /** false = o estabelecimento não se enquadra no Quadro I (cabe o representante da NR-5). */
  obrigatoria: boolean;
  efetivos: number;
  suplentes: number;
  /** Grupos completos de 2.500 além de 10.000 empregados. */
  gruposAdicionais: number;
}

export function dimensionarCipa(grau: number, empregados: number): ResultadoCipa {
  validar(grau, empregados);
  const quadro = QUADRO_CIPA[grau];

  let coluna = FAIXAS_CIPA.findIndex((f) => empregados >= f.min && empregados <= f.max);
  let grupos = 0;
  let faixa: string;
  if (coluna === -1) {
    coluna = FAIXAS_CIPA.length - 1;
    grupos = Math.floor((empregados - 10000) / 2500);
    faixa = 'acima de 10.000';
  } else {
    faixa = FAIXAS_CIPA[coluna]!.rotulo;
  }

  const efetivos = quadro.efetivos[coluna]! + grupos * quadro.efetivos[COLUNA_ACRESCIMO_CIPA]!;
  const suplentes = quadro.suplentes[coluna]! + grupos * quadro.suplentes[COLUNA_ACRESCIMO_CIPA]!;
  return { grau, empregados, faixa, obrigatoria: efetivos > 0, efetivos, suplentes, gruposAdicionais: grupos };
}
