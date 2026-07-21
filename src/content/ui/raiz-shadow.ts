/** Cria o host da UI do NexIA isolado do CSS do PJe via Shadow DOM. */
import tokensCss from './tokens.css';

export function criarRaizNexia(): ShadowRoot {
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
