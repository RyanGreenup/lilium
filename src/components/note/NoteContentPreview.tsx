import { Show } from "solid-js";
import { MarkdownRenderer } from "~/components/MarkdownRenderer";
import type { NoteSyntax } from "~/lib/db/types";

interface NoteContentPreviewProps {
  content?: string | null;
  syntax?: string | null;
  defaultSyntax?: NoteSyntax;
  emptyLabel?: string;
  class?: string;
  contentRef?: (el: HTMLDivElement | undefined) => void;
}

export default function NoteContentPreview(props: NoteContentPreviewProps) {
  const resolvedSyntax = () => props.syntax ?? props.defaultSyntax ?? "md";
  const hasContent = () => Boolean(props.content?.trim());

  return (
    <div ref={(el) => props.contentRef?.(el ?? undefined)} class={props.class}>
      <Show
        when={hasContent()}
        fallback={
          <div class="text-center text-base-content/60 p-8">
            {props.emptyLabel ?? "No content"}
          </div>
        }
      >
        <MarkdownRenderer
          content={() => props.content || ""}
          syntax={resolvedSyntax}
        />
      </Show>
    </div>
  );
}
