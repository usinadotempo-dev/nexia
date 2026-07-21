/**
 * Roda no world MAIN. Ponte de fallback para downloads que o isolated world
 * não consegue concluir (o PJe às vezes responde 0 bytes fora do page world).
 * Recebe pedidos por CustomEvent e devolve o resultado como Blob URL.
 */
(() => {
  const w = window as unknown as Record<string, unknown>;
  if (w['__nexiaPonteInstalada']) return;
  w['__nexiaPonteInstalada'] = true;

  document.addEventListener('nexia:fetch-pedido', (evento) => {
    let pedido: { id: string; url: string };
    try {
      pedido = JSON.parse((evento as CustomEvent<string>).detail);
    } catch {
      return;
    }
    void (async () => {
      const resposta: {
        id: string;
        ok: boolean;
        status?: number;
        tipo?: string;
        tamanho?: number;
        blobUrl?: string;
        erro?: string;
      } = { id: pedido.id, ok: false };
      try {
        const r = await fetch(pedido.url, { credentials: 'include' });
        const blob = await r.blob();
        resposta.ok = r.ok && blob.size > 0;
        resposta.status = r.status;
        resposta.tipo = blob.type;
        resposta.tamanho = blob.size;
        resposta.blobUrl = URL.createObjectURL(blob);
      } catch (erro) {
        resposta.erro = String(erro);
      }
      document.dispatchEvent(new CustomEvent('nexia:fetch-resposta', { detail: JSON.stringify(resposta) }));
    })();
  });
})();
