import { createSignal, createEffect, type Accessor, Suspense, Switch, Match } from "solid-js";
import { createAsync } from "@solidjs/router";
import { renderOrgModeQuery, renderJupyterNotebookQuery } from "~/lib/pandoc";

const renderMarkdownClient = async (markdownContent: string): Promise<string> => {
  if (!markdownContent.trim()) return "No notes";

  try {
    const { marked } = await import("marked");
    return marked(markdownContent);
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

  // Server-side Pandoc rendering
  const pandocHtml = createAsync(async () => {
    const syntax = props.syntax?.() || "markdown";
    const content = props.content();
    
    if (!content.trim()) return "";
    
    try {
      if (syntax === "org") {
        return await renderOrgModeQuery(content);
      } else if (syntax === "ipynb") {
        return await renderJupyterNotebookQuery(content);
      }
    } catch (error) {
      console.error(`${syntax} rendering failed:`, error);
      return `<pre class="error">${syntax} rendering failed: ${error}</pre>`;
    }
    
    return "";
  });

  // Client-side markdown rendering
  createEffect(async () => {
    const content = props.content();
    const syntax = props.syntax?.() || "markdown";
    
    if (syntax === "markdown") {
      setIsLoadingMarkdown(true);
      try {
        const html = await renderMarkdownClient(content);
        setMarkdownHtml(html);
      } catch (error) {
        console.error("Markdown rendering error:", error);
        setMarkdownHtml(`<pre>${content}</pre>`);
      } finally {
        setIsLoadingMarkdown(false);
      }
    }
  });

  return (
    <div class="prose prose-sm max-w-none dark:prose-invert">
      <Switch>
        <Match when={props.syntax?.() === "org" || props.syntax?.() === "ipynb"}>
          <Suspense 
            fallback={
              <div class="flex items-center justify-center p-4">
                <div class="loading loading-spinner loading-sm"></div>
                <span class="ml-2 text-sm text-base-content/60">Rendering {props.syntax?.()}...</span>
              </div>
            }
          >
            <div innerHTML={pandocHtml()} />
          </Suspense>
        </Match>
        
        <Match when={props.syntax?.() === "markdown"}>
          {isLoadingMarkdown() ? (
            <div class="flex items-center justify-center p-4">
              <div class="loading loading-spinner loading-sm"></div>
              <span class="ml-2 text-sm text-base-content/60">Rendering Markdown...</span>
            </div>
          ) : (
            <div innerHTML={markdownHtml()} />
          )}
        </Match>
        
        <Match when={props.syntax?.() === "html"}>
          <div innerHTML={props.content() || "No content"} />
        </Match>
        
        <Match when={true}>
          <pre><code>{props.content() || "No content"}</code></pre>
        </Match>
      </Switch>
    </div>
  );
};