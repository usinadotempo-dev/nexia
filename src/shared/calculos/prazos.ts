/**
 * Contagem de prazos — determinística (nunca delegada à IA).
 * Regras gerais (CPC art. 219 e 224): exclui o dia do começo e inclui o do
 * vencimento; em dias úteis, conta só dias com expediente; em dias corridos, se o
 * vencimento cair em dia sem expediente, prorroga para o primeiro dia útil.
 * Opcional: suspensão de 20/12 a 20/01 (CPC art. 220 — "recesso forense").
 * Feriados locais/estaduais e suspensões de expediente NÃO são conhecidos — o
 * resultado sempre traz esse alerta.
 */
import { dataDeIso, diaDaSemana, isoDeData, somarDias } from './datas.ts';

export interface OpcoesPrazo {
  /** Data do evento que dispara o prazo (intimação/publicação), ISO. */
  inicio: string;
  dias: number;
  tipo: 'uteis' | 'corridos';
  /** Feriados (ISO) a considerar como dias sem expediente. */
  feriados: ReadonlySet<string>;
  recessoForense: boolean;
}

export interface DiaIgnorado {
  data: string;
  motivo: string;
}

export interface ResultadoPrazo {
  vencimento: string;
  diasContados: number;
  ignorados: DiaIgnorado[];
  prorrogado: boolean;
}

function emRecesso(iso: string): boolean {
  const md = iso.slice(5);
  return md >= '12-20' || md <= '01-20';
}

function motivoSemExpediente(iso: string, opcoes: OpcoesPrazo): string | null {
  const dow = diaDaSemana(iso);
  if (dow === 0) return 'domingo';
  if (dow === 6) return 'sábado';
  if (opcoes.feriados.has(iso)) return 'feriado';
  return null;
}

export function contarPrazo(opcoes: OpcoesPrazo): ResultadoPrazo {
  if (!Number.isFinite(opcoes.dias) || opcoes.dias < 1 || opcoes.dias > 3650) {
    throw new Error('Quantidade de dias inválida (1 a 3650).');
  }
  const ignorados: DiaIgnorado[] = [];
  let atual = dataDeIso(opcoes.inicio);
  let contados = 0;
  let guarda = 0;

  while (contados < opcoes.dias) {
    if (++guarda > 20_000) throw new Error('Contagem não convergiu.');
    atual = somarDias(atual, 1);
    const iso = isoDeData(atual);
    if (opcoes.recessoForense && emRecesso(iso)) {
      ignorados.push({ data: iso, motivo: 'recesso forense (suspensão, CPC art. 220)' });
      continue;
    }
    if (opcoes.tipo === 'uteis') {
      const motivo = motivoSemExpediente(iso, opcoes);
      if (motivo) {
        ignorados.push({ data: iso, motivo });
        continue;
      }
    }
    contados++;
  }

  // Vencimento em dia sem expediente → prorroga para o primeiro dia útil.
  let prorrogado = false;
  let iso = isoDeData(atual);
  while (motivoSemExpediente(iso, opcoes) || (opcoes.recessoForense && emRecesso(iso))) {
    if (++guarda > 20_000) throw new Error('Contagem não convergiu.');
    prorrogado = true;
    ignorados.push({ data: iso, motivo: `${motivoSemExpediente(iso, opcoes) ?? 'recesso forense'} (prorrogação do vencimento)` });
    atual = somarDias(atual, 1);
    iso = isoDeData(atual);
  }

  return { vencimento: iso, diasContados: contados, ignorados, prorrogado };
}
