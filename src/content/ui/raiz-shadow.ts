/** Cria o host da UI do Nexpra isolado do CSS do PJe via Shadow DOM. */
// ?inline: o Vite entrega o CSS processado como string (default export) sem injetá-lo
// no <head> — é o que precisamos para colar no <style> dentro do Shadow DOM.
import tokensCss from './tokens.css?inline';

export function criarRaizNexpra(): ShadowRoot {
  const host = document.createElement('div');
  host.id = 'nexia-raiz';
  host.style.all = 'initial';
  const raiz = host.attachShadow({ mode: 'open' });
  const estilo = document.createElement('style');
  estilo.textContent = tokensCss;
  raiz.append(estilo);
  document.documentElement.append(host);
  return raiz;
}
