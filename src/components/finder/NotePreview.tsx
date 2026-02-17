import FileText from "lucide-solid/icons/file-text";
import { createAsync } from "@solidjs/router";
import { For, Show, Suspense } from "solid-js";
import type { NoteListItem } from "~/lib/db/types";
import { getNoteByIdQuery } from "~/lib/db/notes/read";
import {
  getBacklinksForDisplay,
  getForwardLinksForDisplay,
} from "~/lib/sidebar";
import NoteContentPreview from "~/components/note/NoteContentPreview";
import PreviewSkeleton from "./PreviewSkeleton";

export default function NotePreview(props: {
  item: NoteListItem;
  onContentAreaRef?: (el: HTMLDivElement | undefined) => void;
}) {
  const note = createAsync(() => getNoteByIdQuery(props.item.id));
  const backlinks = createAsync(() => getBacklinksForDisplay(props.item.id));
  const forwardLinks = createAsync(() => getForwardLinksForDisplay(props.item.id));

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
          <Suspense fallback={<PreviewSkeleton mode="content" />}>
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
                contentRef={props.onContentAreaRef}
              />
              )}
            </Show>
          </Suspense>
        </div>
      </div>

      <div class="shrink-0 border-t border-base-300 pt-3">
        <h4 class="text-xs font-semibold text-base-content/50 uppercase mb-2">
          Links
        </h4>
        <div class="grid grid-cols-1 xl:grid-cols-2 gap-3">
          <LinkList
            title="Backlinks"
            items={backlinks()?.slice(0, 8) ?? []}
            total={backlinks()?.length ?? 0}
            emptyMessage="No backlinks"
          />
          <LinkList
            title="Forward Links"
            items={forwardLinks()?.slice(0, 8) ?? []}
            total={forwardLinks()?.length ?? 0}
            emptyMessage="No forward links"
          />
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

interface LinkListProps {
  title: string;
  items: Array<{ id: string; title: string; path?: string }>;
  total: number;
  emptyMessage: string;
}

function LinkList(props: LinkListProps) {
  return (
    <div class="rounded border border-base-300 bg-base-200/20 overflow-hidden">
      <div class="px-2.5 py-1.5 text-xs font-medium text-base-content/70 border-b border-base-300 flex items-center justify-between">
        <span>{props.title}</span>
        <span class="text-base-content/50">{props.total}</span>
      </div>
      <div class="max-h-36 overflow-y-auto">
        <Show
          when={props.items.length > 0}
          fallback={
            <div class="px-2.5 py-3 text-xs text-base-content/50 text-center">
              {props.emptyMessage}
            </div>
          }
        >
          <div class="divide-y divide-base-300">
            <For each={props.items}>
              {(item) => (
                <a
                  href={`/note/${item.id}`}
                  class="block px-2.5 py-2 hover:bg-base-300/50 transition-colors"
                >
                  <div class="text-sm text-base-content line-clamp-1">
                    {item.title}
                  </div>
                  <Show when={item.path}>
                    <div class="text-xs text-base-content/50 line-clamp-1 mt-0.5">
                      {item.path}
                    </div>
                  </Show>
                </a>
              )}
            </For>
          </div>
        </Show>
      </div>
    </div>
  );
}
