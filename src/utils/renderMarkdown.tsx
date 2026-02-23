import DOMPurify, { type Config as DOMPurifyConfig } from "dompurify";
import hljs from "highlight.js";
import { Marked } from "marked";
import markedAlert from "marked-alert";
import markedFootnote from "marked-footnote";
import { markedHighlight } from "marked-highlight";
import markedKatex from "marked-katex-extension";
import {
  createEffect,
  createSignal,
  onCleanup,
  onMount,
  splitProps,
  type JSX,
} from "solid-js";

// ---------------------------------------------------------------------------
// Marked instances (module-level singletons)
// ---------------------------------------------------------------------------

const sharedExtensions = [
  markedHighlight({
    emptyLangClass: "hljs",
    langPrefix: "hljs language-",
    highlight(code, lang) {
      const language = hljs.getLanguage(lang) ? lang : "plaintext";
      return hljs.highlight(code, { language }).value;
    },
  }),
];

const sharedPlugins = [
  markedAlert(),
  markedFootnote(),
  {
    renderer: {
      code({ text, lang }: { text: string; lang?: string }) {
        const id = crypto.randomUUID();
        const langClass = lang ? `hljs language-${lang}` : "hljs";
        return `<pre id="${id}"><code class="${langClass}">${text}</code></pre>\n`;
      },
    },
  },
];

const marked = new Marked(...sharedExtensions).use(...sharedPlugins);
const markedWithKatex = new Marked(...sharedExtensions).use(
  markedKatex({ throwOnError: false }),
  ...sharedPlugins,
);

export function parseMarkdown(markdown: string, useKatex: boolean): string {
  if (!markdown.trim()) return "";
  const parser = useKatex ? markedWithKatex : marked;
  return parser.parse(markdown, { async: false }) as string;
}

// ---------------------------------------------------------------------------
// Code-block middle-click copy
// ---------------------------------------------------------------------------

function useCodeBlockMiddleClick(container: HTMLDivElement) {
  const handler = (e: MouseEvent) => {
    if (e.button !== 1) return;
    const pre = (e.target as HTMLElement).closest("pre");
    if (!pre || !container.contains(pre)) return;
    const code = pre.querySelector("code");
    if (code) {
      e.preventDefault();
      navigator.clipboard.writeText(code.textContent ?? "").then(() => {
        pre.classList.remove("copied-flash");
        void pre.offsetWidth;
        pre.classList.add("copied-flash");
        pre.addEventListener(
          "animationend",
          () => pre.classList.remove("copied-flash"),
          { once: true },
        );
      });
    }
  };
  container.addEventListener("auxclick", handler);
  onCleanup(() => container.removeEventListener("auxclick", handler));
}

// ---------------------------------------------------------------------------
// Hljs theme singleton management
// ---------------------------------------------------------------------------

let refCount = 0;
let hljsStyle: HTMLStyleElement | null = null;

function ensureHljsElements() {
  if (refCount++ > 0) return;
  hljsStyle = document.createElement("style");
  hljsStyle.id = "hljs-overrides";
  hljsStyle.textContent = [
    ".hljs { background: transparent !important; }",
    "@keyframes code-copied-pop {",
    "  0%   { transform: scale(1); }",
    "  40%  { transform: scale(1.05); }",
    "  100% { transform: scale(1); }",
    "}",
    "pre.copied-flash { animation: code-copied-pop 0.35s ease-in-out; }",
  ].join("\n");
  document.head.appendChild(hljsStyle);
}

function releaseHljsElements() {
  if (--refCount > 0) return;
  hljsStyle?.remove();
  hljsStyle = null;
}

// ---------------------------------------------------------------------------
// MarkdownHtml component
// ---------------------------------------------------------------------------

export interface MarkdownHtmlProps extends JSX.HTMLAttributes<HTMLDivElement> {
  markdown: string;
  katex?: boolean;
  sanitize?: boolean;
  domPurifyConfig?: DOMPurifyConfig;
}

/**
 * Client-only markdown renderer. Parses markdown to HTML with highlight.js,
 * footnotes, alerts, and optional KaTeX support.
 *
 * When `sanitize` is true (default), output is cleaned through DOMPurify.
 * Set `sanitize={false}` to allow raw HTML passthrough for trusted content.
 */
export function MarkdownHtml(props: MarkdownHtmlProps) {
  const [local, divProps] = splitProps(props, [
    "markdown",
    "katex",
    "sanitize",
    "domPurifyConfig",
    "innerHTML",
  ]);
  const [html, setHtml] = createSignal("");
  let containerRef!: HTMLDivElement;

  onMount(() => {
    ensureHljsElements();
    onCleanup(releaseHljsElements);
    useCodeBlockMiddleClick(containerRef);

    createEffect(() => {
      const raw = parseMarkdown(local.markdown, !!local.katex);
      const shouldSanitize = local.sanitize !== false;
      setHtml(
        shouldSanitize
          ? DOMPurify.sanitize(raw, local.domPurifyConfig)
          : raw,
      );
    });
  });

  return <div {...divProps} ref={containerRef} innerHTML={html()} />;
}
