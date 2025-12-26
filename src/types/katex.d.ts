declare module "katex/dist/contrib/auto-render.min.js" {
  interface RenderMathInElementOptions {
    delimiters?: Array<{
      left: string;
      right: string;
      display: boolean;
    }>;
    ignoredTags?: string[];
    ignoredClasses?: string[];
    errorCallback?: (msg: string, err: Error) => void;
    preProcess?: (math: string) => string;
    throwOnError?: boolean;
  }

  export default function renderMathInElement(
    element: HTMLElement,
    options?: RenderMathInElementOptions
  ): void;
}
