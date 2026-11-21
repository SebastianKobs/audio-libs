// A module imported with Vite's `?worker&url`: bundled into a file of its own, its URL the default export.
declare module '*?worker&url' {
  const url: string;
  export default url;
}
