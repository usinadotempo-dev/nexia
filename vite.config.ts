import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { crx } from '@crxjs/vite-plugin';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import manifest from './public/manifest.json';

// Build MV3 do app Nexpra. O @crxjs lê o manifest e cuida do que é chato no MV3:
// content scripts como IIFE (não módulos), scripts world:MAIN, service worker módulo,
// páginas (popup/options) e web_accessible_resources — reescrevendo os caminhos.
//
// publicDir: false de propósito — o Vite NÃO deve auto-copiar public/ (senão
// public/manifest.json sobrescreveria o manifest gerado pelo crxjs). Os assets de
// public/ referenciados nas páginas (css, ícones) são resolvidos por ./public/... no
// HTML; os demais binários (modelos, wasm, worker do pdf.js) vão via viteStaticCopy.
// Build de loja por padrão (minificado, sem sourcemap — a Chrome Web Store aceita
// minificação, não ofuscação). Para diagnosticar erros com nomes reais:
//   set NEXPRA_DEPURAR=1   e então   npm run build
const depurar = process.env['NEXPRA_DEPURAR'] === '1';

export default defineConfig({
  publicDir: false,
  resolve: {
    alias: { '@shared': resolve(__dirname, 'src/shared') }
  },
  build: {
    target: 'es2022',
    minify: !depurar,
    sourcemap: depurar ? 'inline' : false,
    rollupOptions: {
      // Offscreen não está no manifest (é criado via chrome.offscreen). Entra como
      // entrada HTML extra; conferir o caminho de saída em dist/ (ver OFFSCREEN_PATH
      // em src/background/index.ts).
      input: {
        offscreen: resolve(__dirname, 'src/offscreen/offscreen.html'),
        // Painel lateral (side_panel.default_path). Declarado também aqui para garantir
        // que o HTML seja emitido em dist/sidepanel.html mesmo que o crxjs não o processe.
        sidepanel: resolve(__dirname, 'sidepanel.html')
      }
    }
  },
  plugins: [crx({ manifest }), viteStaticCopy({
    targets: [
      // Modelos PP-OCR → dist/assets/models/ (offscreen os carrega por getURL).
      { src: 'public/assets/models/*', dest: 'assets/models' },
      // ONNX Runtime Web: binário .wasm + loader .mjs de cada backend.
      { src: 'node_modules/onnxruntime-web/dist/ort-wasm*.{wasm,mjs}', dest: 'assets' },
      // Worker do pdf.js (extrator-docs.ts o aponta em libs/pdf.worker.min.mjs).
      { src: 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs', dest: 'libs' }
    ]
  })]
});