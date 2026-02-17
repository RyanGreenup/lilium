import FileText from "lucide-solid/icons/file-text";
import { createAsync } from "@solidjs/router";
import { Show, Suspense } from "solid-js";
import type { NoteListItem } from "~/lib/db/types";
import { getNoteByIdQuery } from "~/lib/db/notes/read";
import NoteContentPreview from "~/components/note/NoteContentPreview";
import PreviewSkeleton from "./PreviewSkeleton";

export default function NotePreview(props: { item: NoteListItem }) {
  const note = createAsync(() => getNoteByIdQuery(props.item.id));

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div class="p-4 h-full flex flex-col gap-4 min-h-0">
      <div>
        <div class="flex items-center gap-2 mb-2">
          <FileText class="w-5 h-5 text-base-content/60" />
          <h3 class="font-semibold text-lg">{props.item.title}</h3>
        </div>
        <span class="badge badge-outline badge-sm">{props.item.syntax}</span>
      </div>

      <Show when={props.item.abstract}>
        <div>
          <h4 class="text-xs font-semibold text-base-content/50 uppercase mb-1">
            Abstract
          </h4>
          <p class="text-sm text-base-content/80 line-clamp-6">
            {props.item.abstract}
          </p>
        </div>
      </Show>

      <div class="text-xs text-base-content/50 space-y-1">
        <div>Created: {formatDate(props.item.created_at)}</div>
        <div>
          Updated: {formatDate(props.item.updated_at)}{" "}
          {formatTime(props.item.updated_at)}
        </div>
      </div>

      <div class="flex-1 min-h-0 flex flex-col">
        <h4 class="text-xs font-semibold text-base-content/50 uppercase mb-1">
          Content
        </h4>
        <div class="rounded border border-base-300 bg-base-200/30 flex-1 min-h-0 overflow-hidden">
          <Suspense
            fallback={<PreviewSkeleton mode="content" />}
          >
            <Show
              when={note()}
              fallback={
                <div class="h-full flex items-center justify-center text-center text-base-content/60 p-4 text-sm">
                  Note not found
                </div>
              }
            >
              {(resolvedNote) => (
                <NoteContentPreview
                  class="p-4 h-full overflow-auto"
                  content={resolvedNote().content}
                  syntax={resolvedNote().syntax}
                  emptyLabel="No content"
                />
              )}
            </Show>
          </Suspense>
        </div>
      </div>

      <a
        href={`/note/${props.item.id}`}
        class="btn btn-primary btn-sm btn-block"
      >
        Open Note
      </a>
    </div>
  );
}
