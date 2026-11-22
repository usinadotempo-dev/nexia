declare module '*.css' {
  const conteudo: string;
  export default conteudo;
}

/** Vite: `?inline` entrega o CSS processado como string. */
declare module '*.css?inline' {
  const conteudo: string;
  export default conteudo;
}
