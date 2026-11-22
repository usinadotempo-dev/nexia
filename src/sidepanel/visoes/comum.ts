import { dialogo } from '../dom';
import { espaco } from '../estado';

/** Ligar/desligar a proteção reinicia a conversa — pede confirmação se houver conversa. */
export async function confirmarTrocaProtecao(ligar: boolean): Promise<boolean> {
  if (espaco.exibidas.length === 0) return true;
  const escolha = await dialogo({
    titulo: ligar ? 'Ligar a proteção de dados?' : 'Desligar a proteção de dados?',
    corpo: ligar
      ? 'A conversa atual será reiniciada para que, daqui em diante, tudo seja enviado pseudonimizado. As fontes continuam carregadas.'
      : 'A conversa atual será reiniciada e as fontes passarão a ser enviadas à IA sem pseudonimização (dados pessoais incluídos). Use só quando não houver dados pessoais ou houver base legal para o envio.',
    botoes: [
      { id: 'cancelar', rotulo: 'Cancelar' },
      { id: 'ok', rotulo: ligar ? 'Ligar e reiniciar' : 'Desligar e reiniciar', primario: true }
    ]
  });
  return escolha === 'ok';
}

export function plural(n: number, singular: string, pluralForma = `${singular}s`): string {
  return `${n.toLocaleString('pt-BR')} ${n === 1 ? singular : pluralForma}`;
}
