import { AccessorWithLatest } from "@solidjs/router";
import ChevronRight from "lucide-solid/icons/chevron-right";
import FileText from "lucide-solid/icons/file-text";
import Folder from "lucide-solid/icons/folder";
import { Accessor, For, Show, createMemo } from "solid-js";
import { Note } from "~/lib/db";
import { useCurrentNoteChildren } from "~/lib/hooks/useCurrentDirectory";
import { useCurrentNote } from "~/lib/hooks/useCurrentNote";
import {
  useNoteNavigation,
  type NavigationItem,
} from "~/lib/hooks/useNoteNavigation";
import { useNoteSiblings } from "~/lib/hooks/useNoteSiblings";

// TODO add up directory button
// TODO add breadcrumbs to Navbar

export default function NotesTab() {
  const { note, noteId } = useCurrentNote();
  const { children } = useCurrentNoteChildren();
  const { handleItemClick } = useNoteNavigation();

  const siblings = useNoteSiblings(
    noteId,
    createMemo(() => note()?.parent_id),
  );

  const isCurrentNoteFolder = createMemo(() => (children()?.length ?? 0) > 0);
  const displayItems = createMemo(() =>
    isCurrentNoteFolder() ? (children() ?? []) : (siblings() ?? []),
  );

  return (
    <div class="space-y-4">
      <div>
        <ul class="menu bg-base-200 rounded-box w-full">
          <Show
            when={displayItems().length > 0}
            fallback={
              <EmptyMessage note={note} isFolder={isCurrentNoteFolder} />
            }
          >
            <For each={displayItems()}>
              {(item: NavigationItem) => (
                <MenuItem
                  item={item}
                  isActive={noteId() === item.id}
                  handleItemClick={handleItemClick}
                />
              )}
            </For>
          </Show>
        </ul>
      </div>
    </div>
  );
}

const MenuItem = (props: {
  item: NavigationItem;
  isActive: boolean;
  handleItemClick: (item: NavigationItem) => void;
}) => (
  <li>
    <a
      class={props.isActive ? "menu-active" : ""}
      onClick={() => props.handleItemClick(props.item)}
    >
      <Show when={props.item.is_folder} fallback={<FileText size={16} />}>
        <Folder size={16} />
      </Show>
      <span class="flex-1">{props.item.title}</span>
      <Show when={props.item.is_folder}>
        <ChevronRight size={14} class="text-base-content/40" />
      </Show>
    </a>
  </li>
);

const EmptyMessage = (props: {
  note: AccessorWithLatest<Note | null | undefined>;
  isFolder: Accessor<boolean>;
}) => (
  <li class="text-center text-base-content/50 py-4">
    <span class="pointer-events-none">
      <Show when={props.note()} fallback="No notes found">
        {props.isFolder() ? "No child notes" : "No siblings"}
      </Show>
    </span>
  </li>
);
