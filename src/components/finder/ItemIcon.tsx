import FileText from "lucide-solid/icons/file-text";
import FolderIcon from "lucide-solid/icons/folder";
import { Show } from "solid-js";
import type { ListItem } from "~/lib/db/types";

export default function ItemIcon(props: { item: ListItem }) {
  return (
    <span class="mr-2 shrink-0">
      <Show
        when={props.item.type === "folder"}
        fallback={<FileText class="w-4 h-4 text-base-content/60" />}
      >
        <FolderIcon class="w-4 h-4 text-warning" />
      </Show>
    </span>
  );
}
