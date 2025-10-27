import {
  createSignal,
  createEffect,
  type Accessor,
  Suspense,
  Switch,
  Match,
} from "solid-js";
import { createAsync } from "@solidjs/router";
import {
  renderJupyterNotebookQuery,
  renderTypstQuery,
  convertOrgToMarkdownQuery,
  convertDokuWikiToMarkdownQuery,
  convertMediaWikiToMarkdownQuery,
  convertLatexToMarkdownQuery,
} from "~/lib/pandoc";
import { CodeBlockEnhancer } from "./CodeBlockCopy";
import {
  isPandocSyntax,
  isMarkdownConvertibleSyntax,
  isClientRenderedSyntax,
  isPassthroughSyntax,
} from "~/lib/db/types";
import markedFootnote from "marked-footnote";
import markedAlert from "marked-alert";

const renderMarkdownClient = async (
  markdownContent: string,
): Promise<string> => {
  if (!markdownContent.trim()) return "No notes";

  try {
    const { Marked } = await import("marked");
    const { markedHighlight } = await import("marked-highlight");
    const hljs = await import("highlight.js");

    const marked = new Marked(
      markedHighlight({
        emptyLangClass: "hljs",
        langPrefix: "hljs language-",
        highlight(code, lang, info) {
          const language = hljs.default.getLanguage(lang) ? lang : "plaintext";
          return hljs.default.highlight(code, { language }).value;
        },
      }),
    )
      .use(markedAlert())
      .use(markedFootnote());
    return marked.parse(markdownContent);
  } catch (error) {
    console.error("Failed to render markdown:", error);
    return markdownContent;
  }
};

export const MarkdownRenderer = (props: {
  content: Accessor<string>;
  syntax?: Accessor<string>;
}) => {
  const [markdownHtml, setMarkdownHtml] = createSignal<string>("");
  const [isLoadingMarkdown, setIsLoadingMarkdown] = createSignal(false);

  // Server-side Pandoc rendering (only for ipynb and typ)
  const pandocHtml = createAsync(async () => {
    const syntax = props.syntax?.() || "md";
    const content = props.content();

    if (!content.trim()) return "";

    try {
      if (syntax === "ipynb") {
        return await renderJupyterNotebookQuery(content);
      } else if (syntax === "typ") {
        return await renderTypstQuery(content);
      }
    } catch (error) {
      console.error(`${syntax} rendering failed:`, error);
      return `<pre class="error">${syntax} rendering failed: ${error}</pre>`;
    }

    return "";
  });

  // Server-side markdown conversion (for org, dw, mw, tex)
  const convertedMarkdown = createAsync(async () => {
    const syntax = props.syntax?.() || "md";
    const content = props.content();

    if (!content.trim()) return "";

    try {
      if (syntax === "org") {
        return await convertOrgToMarkdownQuery(content);
      } else if (syntax === "dw") {
        return await convertDokuWikiToMarkdownQuery(content);
      } else if (syntax === "mw") {
        return await convertMediaWikiToMarkdownQuery(content);
      } else if (syntax === "tex") {
        return await convertLatexToMarkdownQuery(content);
      }
    } catch (error) {
      console.error(`${syntax} to markdown conversion failed:`, error);
      return content;
    }

    return "";
  });

  // Client-side markdown rendering
  createEffect(async () => {
    const syntax = props.syntax?.() || "md";

    if (isClientRenderedSyntax(syntax)) {
      setIsLoadingMarkdown(true);
      try {
        let markdownContent: string;

        if (syntax === "md") {
          markdownContent = props.content();
        } else if (isMarkdownConvertibleSyntax(syntax)) {
          markdownContent = convertedMarkdown() || props.content();
        } else {
          markdownContent = props.content();
        }

        const html = await renderMarkdownClient(markdownContent);
        setMarkdownHtml(html);
      } catch (error) {
        console.error("Markdown rendering error:", error);
        setMarkdownHtml(`<pre>${props.content()}</pre>`);
      } finally {
        setIsLoadingMarkdown(false);
      }
    }
  });

  return (
    <CodeBlockEnhancer>
      <div class="prose prose-sm max-w-none dark:prose-invert">
        <Switch>
          <Match when={isPandocSyntax(props.syntax?.() || "")}>
            <Suspense
              fallback={
                <div class="flex items-center justify-center p-4">
                  <div class="loading loading-spinner loading-sm"></div>
                  <span class="ml-2 text-sm text-base-content/60">
                    Rendering {props.syntax?.()}...
                  </span>
                </div>
              }
            >
              <div innerHTML={pandocHtml()} />
            </Suspense>
          </Match>

          <Match when={isClientRenderedSyntax(props.syntax?.() || "")}>
            {isLoadingMarkdown() ? (
              <div class="flex items-center justify-center p-4">
                <div class="loading loading-spinner loading-sm"></div>
                <span class="ml-2 text-sm text-base-content/60">
                  {isMarkdownConvertibleSyntax(props.syntax?.() || "")
                    ? `Converting ${props.syntax?.()} to Markdown...`
                    : "Rendering Markdown..."}
                </span>
              </div>
            ) : (
              <div innerHTML={markdownHtml()} />
            )}
          </Match>

          <Match when={isPassthroughSyntax(props.syntax?.() || "")}>
            <div innerHTML={props.content() || "No content"} />
          </Match>

          <Match when={true}>
            <pre>
              <code>{props.content() || "No content"}</code>
            </pre>
          </Match>
        </Switch>
      </div>
    </CodeBlockEnhancer>
  );
};
