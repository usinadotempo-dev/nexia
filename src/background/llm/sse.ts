/** Lê um corpo de resposta SSE e entrega o conteúdo de cada linha `data:`. */
export async function lerSse(resposta: Response, aoDado: (dado: string) => void): Promise<void> {
  const corpo = resposta.body;
  if (!corpo) return;
  const leitor = corpo.getReader();
  const decodificador = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await leitor.read();
    if (done) break;
    buffer += decodificador.decode(value, { stream: true });
    const linhas = buffer.split('\n');
    buffer = linhas.pop() ?? '';
    for (const linha of linhas) {
      const limpa = linha.trim();
      if (limpa.startsWith('data:')) aoDado(limpa.slice(5).trim());
    }
  }
  const resto = buffer.trim();
  if (resto.startsWith('data:')) aoDado(resto.slice(5).trim());
}
