import { AccessorWithLatest } from "@solidjs/router";
import { Focus } from "lucide-solid";
import ChevronRight from "lucide-solid/icons/chevron-right";
import FileText from "lucide-solid/icons/file-text";
import Folder from "lucide-solid/icons/folder";
import FolderUp from "lucide-solid/icons/folder-up";
import {
  Accessor,
  createEffect,
  createMemo,
  createSignal,
  For,
  JSX,
  Show,
} from "solid-js";
import { Transition } from "solid-transition-group";
import { Note } from "~/lib/db";
import { useAutoFocus } from "~/lib/hooks/useAutoFocus";
import { useCurrentNoteChildren } from "~/lib/hooks/useCurrentDirectory";
import { useCurrentNote } from "~/lib/hooks/useCurrentNote";
import {
  useNoteNavigation,
  type NavigationItem,
} from "~/lib/hooks/useNoteNavigation";
import { useNoteSiblings } from "~/lib/hooks/useNoteSiblings";
import { Badge } from "~/solid-daisy-components/components/Badge";
import { useKeybinding } from "~/solid-daisy-components/utilities/useKeybinding";

/**
 * Generates a unique identifier for sidebar content based on what's actually displayed.
 * This ensures animations only trigger when the displayed items actually change.
 */
function getSidebarContentId(
  currentNote: Note | null | undefined,
  isFolder: boolean,
): string {
  if (isFolder) {
    // For folders, the content is the children of this note
    return `children-of-${currentNote?.id || "root"}`;
  } else {
    // For notes, the content is the siblings (children of the parent)
    // Use the parent ID since that's what determines the displayed items
    return `children-of-${currentNote?.parent_id || "root"}`;
  }
}

export default function NotesTab() {
  const { note, noteId } = useCurrentNote();
  const { children } = useCurrentNoteChildren();
  const { handleItemClick, navigateToNote, navigateToRoot } =
    useNoteNavigation();

  // Create a ref for the tab container to make it focusable
  let tabRef: HTMLDivElement | undefined;

  // Track navigation direction for slide animation
  const [isGoingDeeper, setIsGoingDeeper] = createSignal(true);

  const siblings = useNoteSiblings(
    noteId,
    createMemo(() => note()?.parent_id),
  );

  const isCurrentNoteFolder = createMemo(() => (children()?.length ?? 0) > 0);
  const displayItems = createMemo(() =>
    isCurrentNoteFolder() ? (children() ?? []) : (siblings() ?? []),
  );

  // Handle up directory navigation
  const handleUpDirectory = () => {
    setIsGoingDeeper(false); // Going up
    const currentNote = note();
    if (currentNote?.parent_id) {
      navigateToNote(currentNote.parent_id);
    } else {
      navigateToRoot();
    }
  };

  // Enhanced item click handler with direction tracking
  const handleItemClickWithDirection = (item: NavigationItem) => {
    // Only set direction for folders - notes don't change sidebar content
    if (item.is_folder) {
      setIsGoingDeeper(true); // Going deeper into folders
    }
    handleItemClick(item);
  };

  // Show up button only when there's actually a parent to navigate to
  const showUpButton = createMemo(() => {
    /*
    // const currentNote = note();
    // if (!currentNote) return false;
    // Always show if current note has a parent - we can navigate up to it
    // return currentNote.parent_id !== undefined;
    */
    // NOTE we should probably check for the grandparent of a note and the parent of a folder
    // We'll just return true now so it doesn't keep disappearing, it's a bit tricky
    return true;
  });

  // Track when content should be shown for transition
  const [showContent, setShowContent] = createSignal(true);

  // Create a unique identifier based on what's actually displayed in the sidebar
  const currentContentId = createMemo(() =>
    getSidebarContentId(note(), isCurrentNoteFolder()),
  );

  // Track previous content id to detect changes
  const [prevContentId, setPrevContentId] = createSignal(currentContentId());

  // Handle content change with animation
  createEffect(() => {
    const currentId = currentContentId();
    const prevId = prevContentId();

    if (currentId !== prevId) {
      setShowContent(false);
      setTimeout(() => {
        setPrevContentId(currentId);
        setShowContent(true);
      }, 0);
    }
  });

  // Auto-focus the tab when it mounts
  useAutoFocus(() => tabRef);

  useKeybinding(
    { key: "n" },
    () => {
      console.log("N triggered!");
      alert("N keybinding triggered! (placeholder)");
    },
    { ref: () => tabRef },
  );

  return (
    <div
      ref={tabRef}
      tabIndex={0}
      class="space-y-4 outline-none focus:outline-none group"
    >
      <div>
        {/*TODO Down the line we'll have to use context provider for keybindings to focus elements*/}
        <div class="hidden group-focus:block">
          <Badge color="primary" class="w-full" size="xs" variant="soft">
            <Focus size={12} class="mr-1" />
          </Badge>
        </div>
        <ul class="menu bg-base-200 rounded-box w-full relative overflow-hidden">
          <Show when={showUpButton()}>
            <UpDirectoryButton onClick={handleUpDirectory} />
          </Show>

          <SlideTransition isGoingDeeper={isGoingDeeper} show={showContent}>
            <div>
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
                      handleItemClick={handleItemClickWithDirection}
                    />
                  )}
                </For>
              </Show>
            </div>
          </SlideTransition>
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

const UpDirectoryButton = (props: { onClick: () => void }) => (
  <li class="border-b border-base-300 mb-2 pb-2">
    <a
      onClick={props.onClick}
      class="text-base-content/80 hover:text-base-content hover:bg-base-300 rounded-lg font-medium transition-colors"
    >
      <FolderUp size={16} class="text-primary" />
      <span class="flex-1">.. Parent Directory</span>
    </a>
  </li>
);

const SlideTransition = (props: {
  children: JSX.Element;
  isGoingDeeper: Accessor<boolean>;
  show: Accessor<boolean>;
}) => (
  <Transition
    onEnter={(el, done) => {
      const direction = props.isGoingDeeper() ? 1 : -1; // 1 = slide from right, -1 = slide from left
      const a = el.animate(
        [
          {
            transform: `translateX(${direction * 100}%)`,
            opacity: 0,
          },
          {
            transform: "translateX(0%)",
            opacity: 1,
          },
        ],
        {
          duration: 300,
          easing: "cubic-bezier(0.4, 0, 0.2, 1)",
        },
      );
      a.finished.then(done);
    }}
    onExit={(el, done) => {
      const direction = props.isGoingDeeper() ? -1 : 1; // Opposite direction for exit
      const a = el.animate(
        [
          {
            transform: "translateX(0%)",
            opacity: 1,
          },
          {
            transform: `translateX(${direction * 100}%)`,
            opacity: 0,
          },
        ],
        {
          duration: 300,
          easing: "cubic-bezier(0.4, 0, 0.2, 1)",
        },
      );
      a.finished.then(done);
    }}
  >
    {props.show() && props.children}
  </Transition>
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
