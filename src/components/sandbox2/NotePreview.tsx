import FileText from "lucide-solid/icons/file-text";
import { Show } from "solid-js";
import type { NoteListItem } from "~/lib/db/types";

export default function NotePreview(props: { item: NoteListItem }) {
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
    <div class="p-4 space-y-4">
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

      <a
        href={`/note/${props.item.id}`}
        class="btn btn-primary btn-sm btn-block"
      >
        Open Note
      </a>
    </div>
  );
}
