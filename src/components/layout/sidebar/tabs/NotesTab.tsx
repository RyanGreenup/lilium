import ChevronRight from "lucide-solid/icons/chevron-right";
import FileText from "lucide-solid/icons/file-text";
import Folder from "lucide-solid/icons/folder";
import { Accessor, For, Show, createMemo } from "solid-js";
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

  // Get parent ID for siblings
  const parentId = createMemo(() => note()?.parent_id);

  // Get siblings of the current note
  const siblings = useNoteSiblings(noteId, parentId);

  // Check if current note is a folder (has children)
  const isCurrentNoteFolder = createMemo(() => {
    const childrenData = children();
    return childrenData && childrenData.length > 0;
  });

  // Get the title for the section
  const sectionTitle = createMemo(() => {
    const currentNote = note();
    if (!currentNote) return "Root Directory";
    return isCurrentNoteFolder()
      ? `Contents of "${currentNote.title}"`
      : `Siblings of "${currentNote.title}"`;
  });

  // Get items to display - children if folder, siblings if note
  const displayItems = createMemo(() => {
    return isCurrentNoteFolder() ? children() || [] : siblings() || [];
  });

  // Check if item is currently active - make it reactive
  const isItemActive = createMemo(() => (itemId: string) => noteId() === itemId);

  return (
    <div class="space-y-4">
      <div>
        <ul class="menu bg-base-200 rounded-box w-full">
          <Show
            when={displayItems().length > 0}
            fallback={
              <li class="text-center text-base-content/50 py-4">
                <span class="pointer-events-none">
                  <Show when={note()} fallback="No notes found">
                    {isCurrentNoteFolder() ? "No child notes" : "No siblings"}
                  </Show>
                </span>
              </li>
            }
          >
            <For each={displayItems()}>
              {(item: NavigationItem) => (
                <MenuItem
                  item={item}
                  isActive={() => isItemActive()(item.id)}
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
  isActive: Accessor<boolean>;
  handleItemClick: (item: NavigationItem) => void;
}) => {
  return (
    <li>
      <a
        class={props.isActive() ? "menu-active" : ""}
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
};
