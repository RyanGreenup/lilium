import { Accessor, createEffect, createSignal, Suspense } from "solid-js";
import { Loading } from "~/solid-daisy-components/components/Loading";

export const renderMarkdown = async (
  markdownContent: string,
): Promise<string> => {
  if (!markdownContent.trim()) return "No notes";

  try {
    // Dynamically import the marked library to parse markdown to HTML
    const { marked } = await import("marked");
    // Convert the markdown content to HTML and return it
    return marked(markdownContent);
  } catch (error) {
    console.error("Failed to render markdown:", error);
    return markdownContent; // Fallback to plain text
  }
};

export const MarkdownRenderer = (props: { content: Accessor<string> }) => {
  const [renderedHtml, setRenderedHtml] = createSignal<string>("");

  createEffect(async () => {
    const html = await renderMarkdown(props.content());
    setRenderedHtml(html);
  });

  return (
    <Suspense fallback={<Loading />}>
      <div class="prose dark:prose-invert">
        <div innerHTML={renderedHtml()} />
      </div>
    </Suspense>
  );
};
