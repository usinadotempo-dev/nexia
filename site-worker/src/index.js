/**
 * Site do Nexpra — Worker.
 * Serve as páginas estáticas e atende POST /api/acesso (formulário de acesso antecipado):
 * valida, grava o pedido no D1 e envia um aviso ao responsável, que libera o acesso respondendo
 * manualmente (a confirmação automática ao visitante é opcional — ver enviarEmails).
 *
 * Este servidor recebe SOMENTE o que o visitante digita no formulário do site. A extensão
 * Nexpra continua sem servidor: documentos e conversas nunca passam por aqui.
 * Dados pessoais não vão para os logs (LGPD).
 */

import { EmailMessage } from 'cloudflare:email';

const REMETENTE = { email: 'contato@nexpra.com.br', name: 'Nexpra' };

const base64Utf8 = (texto) => {
  let bin = '';
  for (const b of new TextEncoder().encode(texto)) bin += String.fromCharCode(b);
  return btoa(bin);
};

/** Cabeçalho com acentos (RFC 2047), em pedaços curtos para respeitar o limite de linha. */
const cabecalhoUtf8 = (texto) => {
  const letras = Array.from(texto);
  const partes = [];
  for (let i = 0; i < letras.length; i += 24) partes.push(`=?UTF-8?B?${base64Utf8(letras.slice(i, i + 24).join(''))}?=`);
  return partes.join('\r\n ');
};

/**
 * Aviso ao responsável pelo Email Routing (plano gratuito): só entrega a endereços de destino
 * verificados na conta. A mensagem é montada à mão (MIME simples, texto puro).
 */
function mensagemAviso(destino, pedido) {
  const corpo =
    'Novo pedido de acesso pelo formulário do site.\r\n\r\n' +
    `Nome: ${pedido.nome}\r\nE-mail: ${pedido.email}\r\nTelefone: ${pedido.telefone}\r\nÁrea: ${pedido.area}\r\n` +
    `Recebido em: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Fortaleza' })}\r\n\r\n` +
    'Para liberar o acesso, responda a esta mensagem: a resposta vai para o e-mail da pessoa.\r\n';
  const bruto =
    [
      `From: ${REMETENTE.name} <${REMETENTE.email}>`,
      `To: <${destino}>`,
      // Responder a esta mensagem escreve direto para quem pediu o acesso.
      `Reply-To: <${pedido.email}>`,
      `Subject: ${cabecalhoUtf8(`Pedido de acesso ao Nexpra — ${pedido.nome} (${pedido.area})`)}`,
      `Message-ID: <${crypto.randomUUID()}@nexpra.com.br>`,
      `Date: ${new Date().toUTCString().replace('GMT', '+0000')}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: base64'
    ].join('\r\n') +
    '\r\n\r\n' +
    base64Utf8(corpo).replace(/(.{76})/g, '$1\r\n') +
    '\r\n';
  return new EmailMessage(REMETENTE.email, destino, bruto);
}

const AREAS = new Set([
  'Jurídico', 'Contabilidade', 'Saúde', 'Psicologia', 'Engenharia e arquitetura', 'Imobiliário', 'Seguros',
  'Finanças e investimentos', 'Educação', 'Contratações públicas', 'Serviço social', 'Cartórios',
  'RH e departamento pessoal', 'Outra'
]);

const json = (corpo, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

const escapar = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function validar(d) {
  const nome = String(d.nome ?? '').replace(/\s+/g, ' ').trim();
  const email = String(d.email ?? '').trim().toLowerCase();
  const telefone = String(d.telefone ?? '').replace(/\D/g, '');
  const area = String(d.area ?? '').trim();
  if (nome.length < 2 || nome.length > 120) return { erro: 'Informe o seu nome.' };
  if (email.length > 160 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { erro: 'Informe um e-mail válido.' };
  if (telefone.length < 10 || telefone.length > 13) return { erro: 'Informe o telefone com DDD.' };
  if (!AREAS.has(area)) return { erro: 'Selecione a sua área profissional.' };
  if (d.aceite !== true) return { erro: 'É preciso concordar para registrar o pedido.' };
  return { nome, email, telefone, area };
}

async function garantirTabela(db) {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS pedidos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        criado_em TEXT NOT NULL,
        atualizado_em TEXT NOT NULL,
        nome TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        telefone TEXT NOT NULL,
        area TEXT NOT NULL,
        confirmacao TEXT NOT NULL DEFAULT 'pendente',
        acesso_liberado INTEGER NOT NULL DEFAULT 0
      )`
    )
    .run();
}

function emailConfirmacao(pedido) {
  const primeiroNome = pedido.nome.split(' ')[0];
  const text =
    `Olá, ${primeiroNome}.\n\n` +
    'Recebemos o seu pedido de acesso antecipado ao Nexpra.\n\n' +
    'Assim que o acesso for liberado, você receberá neste e-mail os dados e as instruções para instalar e começar a usar.\n\n' +
    `Área informada: ${pedido.area}\n\n` +
    'Se não foi você quem fez este pedido, basta ignorar esta mensagem ou responder pedindo a exclusão dos seus dados.\n\n' +
    'Nexpra — IA no trabalho, sem expor ninguém.\nhttps://nexpra.com.br';
  const html =
    '<div style="margin:0;padding:32px 16px;background:#f4f4f4;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#0a0a0a">' +
    '<div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e4e4e4">' +
    '<div style="background:#000000;color:#ffffff;padding:22px 28px;font-size:18px;font-weight:700;letter-spacing:-0.01em">Nexpra</div>' +
    '<div style="padding:30px 28px;font-size:16px;line-height:1.6">' +
    `<p style="margin:0 0 14px;font-size:22px;font-weight:700;letter-spacing:-0.02em">Recebemos o seu pedido, ${escapar(primeiroNome)}.</p>` +
    '<p style="margin:0 0 14px;color:#4a4a4a">Assim que o acesso antecipado for liberado, você receberá <strong style="color:#0a0a0a">neste e-mail</strong> os dados e as instruções para instalar e começar a usar o Nexpra.</p>' +
    `<p style="margin:0 0 22px;color:#4a4a4a">Área informada: <strong style="color:#0a0a0a">${escapar(pedido.area)}</strong></p>` +
    '<p style="margin:0;color:#6b6b6b;font-size:13.5px">Se não foi você quem fez este pedido, ignore esta mensagem ou responda pedindo a exclusão dos seus dados.</p>' +
    '</div>' +
    '<div style="padding:18px 28px;border-top:1px solid #e4e4e4;color:#6b6b6b;font-size:12.5px">Nexpra — IA no trabalho, sem expor ninguém. · <a href="https://nexpra.com.br" style="color:#0a0a0a">nexpra.com.br</a><br>Usina do Tempo · CNPJ 59.267.749/0001-42</div>' +
    '</div></div>';
  return { to: pedido.email, from: REMETENTE, replyTo: REMETENTE.email, subject: 'Recebemos o seu pedido de acesso ao Nexpra', text, html };
}

/**
 * Envia os e-mails depois de responder ao visitante e registra o resultado.
 *
 * Plano gratuito do Cloudflare: só é possível enviar para endereços verificados da própria
 * conta. Por isso o fluxo padrão é: o responsável recebe um aviso com "responder para" o
 * visitante e libera o acesso respondendo manualmente a essa mensagem.
 * A confirmação automática ao visitante só é tentada com ENVIAR_CONFIRMACAO = "sim"
 * (exige o plano Workers Paid).
 */
async function enviarEmails(env, pedido) {
  let confirmacao = 'manual';
  if (env.ENVIAR_CONFIRMACAO === 'sim') {
    try {
      await env.EMAIL.send(emailConfirmacao(pedido));
      confirmacao = 'enviada';
    } catch (e) {
      confirmacao = `falhou:${e && e.code ? e.code : 'erro'}`;
      console.log('confirmação não enviada', e && e.code ? e.code : String(e && e.message));
    }
  }
  let aviso = 'sem-destino';
  if (env.NOTIFICAR_EMAIL) {
    try {
      await env.EMAIL.send(mensagemAviso(String(env.NOTIFICAR_EMAIL).trim(), pedido));
      aviso = 'enviado';
    } catch (e) {
      aviso = `falhou:${e && e.code ? e.code : String((e && e.message) || 'erro').slice(0, 80)}`;
      console.log('aviso interno não enviado', e && e.code ? e.code : String(e && e.message));
    }
  }
  try {
    await env.DB.prepare('UPDATE pedidos SET confirmacao = ?, atualizado_em = ? WHERE email = ?')
      .bind(`${confirmacao}; aviso ${aviso}`, new Date().toISOString(), pedido.email)
      .run();
  } catch (e) {
    console.log('falha ao registrar o envio', String(e && e.message));
  }
}

async function tratarPedido(request, env, ctx) {
  if (request.method !== 'POST') return json({ erro: 'Método não permitido.' }, 405);
  // Só aceita envios vindos das próprias páginas do site.
  const origem = request.headers.get('origin');
  if (origem && new URL(origem).host !== new URL(request.url).host) return json({ erro: 'Origem não permitida.' }, 403);
  if (Number(request.headers.get('content-length') ?? 0) > 4000) return json({ erro: 'Pedido grande demais.' }, 413);

  let dados;
  try {
    dados = await request.json();
  } catch {
    return json({ erro: 'Dados inválidos.' }, 400);
  }
  // Armadilha contra robôs: campo oculto preenchido ou envio rápido demais → finge sucesso.
  if (dados.site || (typeof dados.tempo === 'number' && dados.tempo < 2500)) return json({ ok: true });

  const pedido = validar(dados);
  if (pedido.erro) return json({ erro: pedido.erro }, 400);

  try {
    await garantirTabela(env.DB);
    const agora = new Date().toISOString();
    await env.DB.prepare(
      `INSERT INTO pedidos (criado_em, atualizado_em, nome, email, telefone, area) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(email) DO UPDATE SET nome = excluded.nome, telefone = excluded.telefone, area = excluded.area, atualizado_em = excluded.atualizado_em`
    )
      .bind(agora, agora, pedido.nome, pedido.email, pedido.telefone, pedido.area)
      .run();
  } catch (e) {
    console.log('falha ao gravar pedido', String(e && e.message));
    return json({ erro: 'Não foi possível registrar o pedido agora.' }, 500);
  }

  ctx.waitUntil(enviarEmails(env, pedido));
  return json({ ok: true });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/api/acesso') return tratarPedido(request, env, ctx);
    if (url.pathname.startsWith('/api/')) return json({ erro: 'Não encontrado.' }, 404);
    return env.ASSETS.fetch(request);
  }
};
