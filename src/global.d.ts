/// <reference types="@solidjs/start/env" />

declare module "katex/dist/contrib/auto-render.min.js" {
  const renderMathInElement: (element: HTMLElement, options?: object) => void;
  export default renderMathInElement;
}

declare module "mime-types" {
  export function lookup(path: string): string | false;
  export function contentType(type: string): string | false;
  export function extension(type: string): string | false;
  export function charset(type: string): string | false;
}
