const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = (env, argv) => ({
  entry: {
    background: './src/background/index.ts',
    content: './src/content/index.ts',
    'main-auth': './src/main/captura-auth.ts',
    'main-bridge': './src/main/ponte-fetch.ts',
    popup: './src/popup/popup.ts',
    options: './src/options/options.ts'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true
  },
  resolve: {
    extensions: ['.ts', '.js', '.mjs'],
    alias: { '@shared': path.resolve(__dirname, 'src/shared') },
    // tesseract.js referencia módulos de Node que não existem no browser.
    fallback: { fs: false, path: false, crypto: false, os: false, worker_threads: false, 'node:fs': false, 'node:path': false }
  },
  module: {
    rules: [
      { test: /\.ts$/, loader: 'ts-loader', exclude: /node_modules/, options: { compilerOptions: { noEmit: false } } },
      { test: /\.css$/, type: 'asset/source' },
      { test: /\.m?js$/, resolve: { fullySpecified: false } }
    ]
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'public' },
        { from: 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs', to: 'libs/pdf.worker.min.mjs' },
        // OCR local (Tesseract): worker, core WASM e idioma português.
        { from: 'node_modules/tesseract.js/dist/worker.min.js', to: 'libs/tesseract/worker.min.js' },
        { from: 'node_modules/tesseract.js-core', to: 'libs/tesseract', globOptions: { ignore: ['**/package.json', '**/README.md'] } },
        { from: 'assets/tesseract/lang', to: 'libs/tesseract/lang', noErrorOnMissing: true }
      ]
    })
  ],
  devtool: argv && argv.mode === 'development' ? 'inline-source-map' : false,
  performance: { hints: false }
});
