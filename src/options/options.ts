import type { TipoGuarda } from '@shared/anonimizador/guarda';
import { AREAS, ORDEM_AREAS } from '@shared/areas/catalogo';
import type { AreaId, ReceitaPersonalizada } from '@shared/areas/tipos';
import { maxSaidaDoModelo, PROVEDOR_MODELOS } from '@shared/constantes';
import { FERRAMENTAS } from '@shared/ferramentas/definicoes';
import { enviar, type RespostaChaveStatus, type RespostaConfig, type RespostaModelosStatus } from '@shared/mensagens';
import { listarModelos } from '@shared/modelos-store';
import type { ConfigNexpra, EsforcoRaciocinio, ModoGuarda, ProvedorId } from '@shared/tipos';
import { escolherEIndexarPasta, reindexarPastaSalva } from './modelos/pasta-local';

const PROVEDORES: ProvedorId[] = ['gemini', 'anthropic', 'openai'];
let receitas: ReceitaPersonalizada[] = [];

function campo<T extends HTMLElement>(id: string): T {
  const e = document.getElementById(id);
  if (!e) throw new Error(`elemento #${id} ausente`);
  return e as T;
}

function linhas(texto: string): string[] {
  return texto.split('\n').map((l) => l.trim()).filter(Boolean);
}

function statusTexto(id: string, texto: string, erro = false): void {
  const e = campo<HTMLElement>(id);
  e.textContent = texto;
  e.classList.toggle('erro', erro);
  if (texto) setTimeout(() => (e.textContent === texto ? (e.textContent = '') : undefined), 6000);
}

function popularModelos(provedor: ProvedorId, selecionado: string): void {
  const select = campo<HTMLSelectElement>(`modelo-${provedor}`);
  select.textContent = '';
  const conhecidos = PROVEDOR_MODELOS[provedor];
  for (const m of conhecidos) select.append(new Option(m.rotulo + (m.recomendado ? ' — recomendado' : ''), m.id));
  if (selecionado && !conhecidos.some((m) => m.id === selecionado)) select.append(new Option(`${selecionado} (personalizado)`, selecionado));
  select.value = selecionado || conhecidos.find((m) => m.recomendado)?.id || conhecidos[0]?.id || '';
}

function atualizarTetoTokens(): void {
  const provedor = campo<HTMLSelectElement>('provedor').value as ProvedorId;
  const teto = maxSaidaDoModelo(provedor, campo<HTMLSelectElement>(`modelo-${provedor}`).value);
  const entrada = campo<HTMLInputElement>('max-tokens');
  entrada.max = String(teto);
  if (Number(entrada.value) > teto) entrada.value = String(teto);
  campo<HTMLElement>('teto-tokens').textContent = `(máx. ${teto})`;
}

function descreverArea(): void {
  const a = AREAS[campo<HTMLSelectElement>('area-ativa').value as AreaId];
  campo<HTMLElement>('area-descricao').textContent = a ? `${a.publico}. ${a.receitas.length} funcionalidades, ${a.ferramentas.length} consultas.` : '';
}

function pintarReceitas(): void {
  const lista = campo<HTMLUListElement>('lista-receitas');
  lista.textContent = '';
  if (receitas.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'Nenhuma funcionalidade própria ainda.';
    lista.append(li);
    return;
  }
  for (const r of receitas) {
    const li = document.createElement('li');
    const span = document.createElement('span');
    span.textContent = r.nome;
    const small = document.createElement('small');
    small.textContent = r.area === 'todas' ? 'todas as áreas' : AREAS[r.area].nome;
    const remover = document.createElement('button');
    remover.className = 'botao pequeno';
    remover.type = 'button';
    remover.textContent = 'Remover';
    remover.addEventListener('click', () => {
      receitas = receitas.filter((x) => x.id !== r.id);
      pintarReceitas();
    });
    li.append(span, small, remover);
    lista.append(li);
  }
}

function pintarFerramentas(desligadas: string[]): void {
  const caixa = campo<HTMLElement>('lista-ferramentas');
  caixa.textContent = '';
  for (const f of FERRAMENTAS) {
    const rotulo = document.createElement('label');
    rotulo.className = 'check';
    const c = document.createElement('input');
    c.type = 'checkbox';
    c.name = 'ferramenta';
    c.value = f.nome;
    c.checked = !desligadas.includes(f.nome);
    const texto = document.createElement('span');
    texto.textContent = `${f.titulo} `;
    const fonte = document.createElement('small');
    fonte.textContent = `— ${f.fonte}`;
    texto.append(fonte);
    rotulo.append(c, texto);
    caixa.append(rotulo);
  }
}

async function atualizarStatusModelos(): Promise<void> {
  const info = await enviar<RespostaModelosStatus>('MODELOS_STATUS');
  campo<HTMLElement>('st-modelos').textContent =
    info.quantidade > 0
      ? `${info.quantidade} modelo(s) — pasta "${info.nomePasta ?? '?'}" — ${info.atualizadoEm ? new Date(info.atualizadoEm).toLocaleString('pt-BR') : ''}`
      : 'Nenhum modelo indexado.';
  const lista = campo<HTMLUListElement>('lista-modelos');
  lista.textContent = '';
  if (info.quantidade > 0) {
    for (const m of await listarModelos()) {
      const li = document.createElement('li');
      li.textContent = m.nome;
      lista.append(li);
    }
  }
}

async function carregar(): Promise<void> {
  const { config } = await enviar<RespostaConfig>('CONFIG_OBTER');
  campo<HTMLSelectElement>('provedor').value = config.provedorAtivo;
  for (const p of PROVEDORES) popularModelos(p, config.modelos[p]);
  campo<HTMLInputElement>('temperatura').value = String(config.temperatura);
  campo<HTMLInputElement>('max-tokens').value = String(config.maxTokens);
  campo<HTMLSelectElement>('esforco').value = config.esforcoRaciocinio;
  atualizarTetoTokens();

  const area = campo<HTMLSelectElement>('area-ativa');
  const areaReceita = campo<HTMLSelectElement>('rc-area');
  areaReceita.append(new Option('Todas as áreas', 'todas'));
  for (const id of ORDEM_AREAS) {
    area.append(new Option(AREAS[id].nome, id));
    areaReceita.append(new Option(AREAS[id].nome, id));
  }
  area.value = config.areaAtiva;
  descreverArea();

  campo<HTMLInputElement>('anonimizar-padrao').checked = config.anonimizarPorPadrao;
  campo<HTMLInputElement>('detectar-nomes').checked = config.detectarNomes;
  campo<HTMLSelectElement>('guarda-modo').value = config.guardaSaida;
  document.querySelectorAll<HTMLInputElement>('input[name="guarda-tipo"]').forEach((c) => (c.checked = config.guardaTipos.includes(c.value as TipoGuarda)));
  campo<HTMLTextAreaElement>('sempre-mascarar').value = config.sempreMascarar.join('\n');
  campo<HTMLTextAreaElement>('nunca-mascarar').value = config.nuncaMascarar.join('\n');

  campo<HTMLInputElement>('ferramentas-auto').checked = config.ferramentasAutomaticas;
  campo<HTMLInputElement>('chave-datajud').value = config.datajudChave;
  campo<HTMLInputElement>('chave-transparencia').value = config.transparenciaChave;
  pintarFerramentas(config.ferramentasDesligadas);

  receitas = [...config.receitasPersonalizadas];
  pintarReceitas();

  campo<HTMLTextAreaElement>('hosts-bloqueados').value = config.hostsBloqueados.join('\n');
  campo<HTMLInputElement>('ocr-doc').value = String(config.ocrMaxPaginasPorDoc);
  campo<HTMLInputElement>('ocr-total').value = String(config.ocrMaxPaginasTotal);

  const { status } = await enviar<RespostaChaveStatus>('CHAVE_STATUS');
  for (const p of PROVEDORES) campo<HTMLElement>(`ind-${p}`).classList.toggle('ok', status[p]);
  await atualizarStatusModelos();
}

async function salvar(): Promise<void> {
  try {
    const parcial: Partial<ConfigNexpra> = {
      provedorAtivo: campo<HTMLSelectElement>('provedor').value as ProvedorId,
      modelos: {
        gemini: campo<HTMLSelectElement>('modelo-gemini').value,
        anthropic: campo<HTMLSelectElement>('modelo-anthropic').value,
        openai: campo<HTMLSelectElement>('modelo-openai').value
      },
      temperatura: Math.min(1, Math.max(0, Number(campo<HTMLInputElement>('temperatura').value) || 0.3)),
      maxTokens: Math.max(1024, Number(campo<HTMLInputElement>('max-tokens').value) || 16000),
      esforcoRaciocinio: campo<HTMLSelectElement>('esforco').value as EsforcoRaciocinio,
      areaAtiva: campo<HTMLSelectElement>('area-ativa').value as AreaId,
      anonimizarPorPadrao: campo<HTMLInputElement>('anonimizar-padrao').checked,
      detectarNomes: campo<HTMLInputElement>('detectar-nomes').checked,
      guardaSaida: campo<HTMLSelectElement>('guarda-modo').value as ModoGuarda,
      guardaTipos: [...document.querySelectorAll<HTMLInputElement>('input[name="guarda-tipo"]:checked')].map((c) => c.value as TipoGuarda),
      sempreMascarar: linhas(campo<HTMLTextAreaElement>('sempre-mascarar').value),
      nuncaMascarar: linhas(campo<HTMLTextAreaElement>('nunca-mascarar').value),
      ferramentasAutomaticas: campo<HTMLInputElement>('ferramentas-auto').checked,
      datajudChave: campo<HTMLInputElement>('chave-datajud').value.trim(),
      transparenciaChave: campo<HTMLInputElement>('chave-transparencia').value.trim(),
      ferramentasDesligadas: [...document.querySelectorAll<HTMLInputElement>('input[name="ferramenta"]:not(:checked)')].map((c) => c.value),
      receitasPersonalizadas: receitas,
      hostsBloqueados: linhas(campo<HTMLTextAreaElement>('hosts-bloqueados').value),
      ocrMaxPaginasPorDoc: Math.max(1, Number(campo<HTMLInputElement>('ocr-doc').value) || 20),
      ocrMaxPaginasTotal: Math.max(1, Number(campo<HTMLInputElement>('ocr-total').value) || 120)
    };
    await enviar('CONFIG_SALVAR', { config: parcial });
    for (const p of PROVEDORES) {
      const entrada = campo<HTMLInputElement>(`chave-${p}`);
      if (entrada.value.trim()) {
        await enviar('CHAVE_SALVAR', { provedor: p, chave: entrada.value.trim() });
        entrada.value = '';
        campo<HTMLElement>(`ind-${p}`).classList.add('ok');
      }
    }
    statusTexto('st-salvo', 'Opções salvas. O painel já usa os novos ajustes.');
  } catch (erro) {
    statusTexto('st-salvo', erro instanceof Error ? erro.message : String(erro), true);
  }
}

function ligarEventos(): void {
  campo<HTMLButtonElement>('btn-salvar').addEventListener('click', () => void salvar());
  campo<HTMLSelectElement>('provedor').addEventListener('change', atualizarTetoTokens);
  for (const p of PROVEDORES) campo<HTMLSelectElement>(`modelo-${p}`).addEventListener('change', atualizarTetoTokens);
  campo<HTMLSelectElement>('area-ativa').addEventListener('change', descreverArea);

  campo<HTMLButtonElement>('btn-receita').addEventListener('click', () => {
    const nome = campo<HTMLInputElement>('rc-nome').value.trim();
    const prompt = campo<HTMLTextAreaElement>('rc-prompt').value.trim();
    if (!nome || !prompt) {
      statusTexto('st-salvo', 'Informe o nome e a instrução da funcionalidade.', true);
      return;
    }
    receitas.push({
      id: crypto.randomUUID(),
      nome,
      area: campo<HTMLSelectElement>('rc-area').value as AreaId | 'todas',
      descricao: campo<HTMLInputElement>('rc-descricao').value.trim() || 'Funcionalidade personalizada',
      prompt,
      formato: campo<HTMLSelectElement>('rc-formato').value as 'markdown' | 'documento'
    });
    for (const id of ['rc-nome', 'rc-descricao', 'rc-prompt']) (campo<HTMLInputElement>(id)).value = '';
    pintarReceitas();
    statusTexto('st-salvo', 'Funcionalidade adicionada — clique em Salvar para gravar.');
  });

  campo<HTMLButtonElement>('btn-pasta').addEventListener('click', () =>
    void (async () => {
      try {
        const r = await escolherEIndexarPasta();
        statusTexto('st-modelos', `${r.quantidade} modelo(s) indexado(s).${r.falhas.length ? ` Falhas: ${r.falhas.length}.` : ''}`);
        await atualizarStatusModelos();
      } catch (erro) {
        if ((erro as Error).name !== 'AbortError') statusTexto('st-modelos', String(erro), true);
      }
    })()
  );
  campo<HTMLButtonElement>('btn-reindexar').addEventListener('click', () =>
    void (async () => {
      try {
        const r = await reindexarPastaSalva();
        statusTexto('st-modelos', `Reindexado: ${r.quantidade} modelo(s).`);
        await atualizarStatusModelos();
      } catch (erro) {
        statusTexto('st-modelos', erro instanceof Error ? erro.message : String(erro), true);
      }
    })()
  );
  campo<HTMLButtonElement>('btn-limpar').addEventListener('click', () =>
    void (async () => {
      if (!confirm('Apagar TODAS as configurações, chaves de API e o índice de modelos do Nexpra?')) return;
      await enviar('DADOS_LIMPAR');
      location.reload();
    })()
  );
}

ligarEventos();
void carregar();
