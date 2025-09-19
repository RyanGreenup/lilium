import { createSignal, createEffect, type Accessor } from "solid-js";

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

export const MarkdownRenderer = (props: { content: Accessor<string> }) => {
  const [renderedHtml, setRenderedHtml] = createSignal<string>("");
  const [isLoading, setIsLoading] = createSignal(false);

  createEffect(async () => {
    const content = props.content();
    setIsLoading(true);
    
    try {
      const html = await renderMarkdownClient(content);
      setRenderedHtml(html);
    } catch (error) {
      console.error("Markdown rendering error:", error);
      setRenderedHtml(content);
    } finally {
      setIsLoading(false);
    }
  });

  return (
    <div class="prose prose-sm max-w-none dark:prose-invert">
      {isLoading() ? (
        <div class="flex items-center justify-center p-4">
          <div class="loading loading-spinner loading-sm"></div>
          <span class="ml-2 text-sm text-base-content/60">Rendering...</span>
        </div>
      ) : (
        <div innerHTML={renderedHtml()} />
      )}
    </div>
  );
};