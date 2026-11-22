/** Primeiro uso: área profissional → privacidade → provedor de IA (opcional). */
import { AREAS, ORDEM_AREAS } from '@shared/areas/catalogo';
import type { AreaId } from '@shared/areas/tipos';
import { enviar, type RespostaChaveStatus } from '@shared/mensagens';
import type { Contexto } from '../contexto';
import { botao, el, icone, logotipo } from '../dom';
import { espaco } from '../estado';

export function mostrarOnboarding(ctx: Contexto): Promise<void> {
  return new Promise((resolver) => {
    let passo = 0;
    let area: AreaId = espaco.area.id;
    const caixa = el('div', { class: 'dialogo', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'ob-titulo' });
    const veu = el('div', { class: 'veu' }, caixa);
    document.body.append(veu);

    const concluir = async () => {
      await ctx.salvarConfig({ areaAtiva: area, onboardingConcluido: true });
      espaco.trocarArea(AREAS[area]);
      veu.remove();
      resolver();
    };

    const passos = () => el('div', { class: 'passos', 'aria-hidden': 'true' }, ...[0, 1, 2].map((i) => el('span', { class: i <= passo ? 'feito' : '' })));

    const pintar = async () => {
      caixa.textContent = '';
      if (passo === 0) {
        const grade = el('div', { class: 'grade-areas', role: 'group', 'aria-label': 'Áreas' });
        for (const id of ORDEM_AREAS) {
          const a = AREAS[id];
          const b = el('button', { type: 'button', class: 'cartao-area', 'aria-pressed': String(id === area) }, el('b', {}, a.nome), el('span', {}, a.publico));
          b.addEventListener('click', () => {
            area = id;
            grade.querySelectorAll('.cartao-area').forEach((x) => x.setAttribute('aria-pressed', 'false'));
            b.setAttribute('aria-pressed', 'true');
          });
          grade.append(b);
        }
        const marca = el('div', { class: 'marca' }, logotipo(), 'NexIA');
        caixa.append(
          passos(),
          marca,
          el('h2', { id: 'ob-titulo' }, 'Qual é a sua área?'),
          el('p', {}, 'Ela define as receitas prontas, as consultas oferecidas e os dados protegidos por padrão. Dá para trocar a qualquer momento no topo do painel.'),
          grade,
          el('div', { class: 'linha-botoes', style: 'justify-content:flex-end' }, botao('Continuar', () => { passo = 1; void pintar(); }, { classe: 'primario' }))
        );
        grade.querySelector<HTMLElement>('[aria-pressed="true"]')?.focus();
      } else if (passo === 1) {
        const ponto = (ic: string, texto: string) => el('li', {}, icone(ic), el('span', {}, texto));
        caixa.append(
          passos(),
          el('h2', { id: 'ob-titulo' }, 'Seus dados ficam com você'),
          el(
            'ul',
            { class: 'lista-pontos' },
            ponto('escudoOk', 'Proteção ligada por padrão: nomes, CPF, CNPJ, processos, endereços e outros dados viram pseudônimos antes de qualquer envio — sem IA nessa etapa.'),
            ponto('olho', 'Você revisa o que foi mascarado na aba Proteção e vê "como a IA viu" cada resposta.'),
            ponto('arquivo', 'Documentos e conversas vivem só na memória do painel. Fechou, apagou.'),
            ponto('busca', 'Consultas a fontes públicas (CNPJ, índices, DataJud…) mostram sempre o que sai do navegador.')
          ),
          el('div', { class: 'linha-botoes', style: 'justify-content:space-between' }, botao('Voltar', () => { passo = 0; void pintar(); }, { classe: 'fantasma' }), botao('Continuar', () => { passo = 2; void pintar(); }, { classe: 'primario' }))
        );
      } else {
        let temChave = false;
        try {
          const { status } = await enviar<RespostaChaveStatus>('CHAVE_STATUS');
          temChave = Object.values(status).some(Boolean);
        } catch {
          /* segue */
        }
        caixa.append(
          passos(),
          el('h2', { id: 'ob-titulo' }, temChave ? 'Tudo pronto' : 'Conecte um provedor de IA (opcional)'),
          el(
            'p',
            {},
            temChave
              ? 'Há uma chave de IA configurada. Adicione fontes e use as receitas da sua área.'
              : 'Para o Assistente, informe sua chave de API (Google Gemini, Anthropic Claude ou OpenAI) nas opções — ela fica só neste navegador. Sem chave, o anonimizador e as consultas já funcionam.'
          ),
          el(
            'div',
            { class: 'linha-botoes', style: 'justify-content:space-between' },
            botao('Voltar', () => { passo = 1; void pintar(); }, { classe: 'fantasma' }),
            el(
              'div',
              { class: 'linha-botoes' },
              temChave ? null : botao('Abrir opções', () => { chrome.runtime.openOptionsPage(); void concluir(); }, { icone: 'chave' }),
              botao(temChave ? 'Começar' : 'Agora não', () => void concluir(), { classe: 'primario' })
            )
          )
        );
      }
      caixa.querySelector<HTMLElement>('.primario')?.focus();
    };
    void pintar();
  });
}
