import { AccessorWithLatest, revalidate, query } from "@solidjs/router";
import { Focus } from "lucide-solid";
import ChevronRight from "lucide-solid/icons/chevron-right";
import FileText from "lucide-solid/icons/file-text";
import Folder from "lucide-solid/icons/folder";
import FolderUp from "lucide-solid/icons/folder-up";
import Scissors from "lucide-solid/icons/scissors";
import X from "lucide-solid/icons/x";
import {
  Accessor,
  createEffect,
  createMemo,
  createSignal,
  For,
  JSX,
  onMount,
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
import { Alert } from "~/solid-daisy-components/components/Alert";
import { Badge } from "~/solid-daisy-components/components/Badge";
import { Input } from "~/solid-daisy-components/components/Input";
import { useKeybinding } from "~/solid-daisy-components/utilities/useKeybinding";
import { createNewNote } from "~/lib/db/notes/create";

// Hook for navigation keybindings
function useNavigationKeybindings(
  tabRef: () => HTMLElement,
  displayItems: Accessor<NavigationItem[]>,
  focusedItemIndex: Accessor<number>,
  setFocusedItemIndex: (index: number) => void,
  focusedItem: Accessor<NavigationItem | null>,
  handleUpDirectory: () => void,
  handleItemClickWithDirection: (item: NavigationItem) => void,
  handleCreateNote: () => void,
  handleCreateChildNote: () => void,
  startEditingFocusedItem: () => void,
  handleCutNote: () => void,
  handleClearCut: () => void,
  handlePasteNote: () => void,
  handleDeleteNote: () => void,
) {
  // Navigation keybindings
  useKeybinding(
    { key: "ArrowDown" },
    () => {
      const items = displayItems();
      const currentIndex = focusedItemIndex();
      const nextIndex = currentIndex + 1;
      if (nextIndex < items.length) {
        setFocusedItemIndex(nextIndex);
      }
    },
    { ref: tabRef },
  );

  useKeybinding(
    { key: "ArrowUp" },
    () => {
      const currentIndex = focusedItemIndex();
      const nextIndex = currentIndex - 1;
      if (nextIndex >= 0) {
        setFocusedItemIndex(nextIndex);
      }
    },
    { ref: tabRef },
  );

  useKeybinding(
    { key: "ArrowLeft" },
    () => {
      // Go up a directory
      handleUpDirectory();
    },
    { ref: tabRef },
  );

  useKeybinding(
    { key: "ArrowRight" },
    () => {
      const focused = focusedItem();
      if (focused?.is_folder) {
        // Navigate into the folder
        handleItemClickWithDirection(focused);
      }
    },
    { ref: tabRef },
  );

  // Enter key to select current item
  useKeybinding(
    { key: "Enter" },
    () => {
      const focused = focusedItem();
      if (focused) {
        handleItemClickWithDirection(focused);
      }
    },
    { ref: tabRef },
  );

  // Create new note keybinding
  useKeybinding(
    { key: "n" },
    () => {
      console.log("Creating new note...");
      handleCreateNote();
    },
    { ref: tabRef },
  );

  // Create new child note keybinding
  useKeybinding(
    { key: "N", shift: true },
    () => {
      console.log("Creating new child note...");
      handleCreateChildNote();
    },
    { ref: tabRef },
  );

  // Rename focused item keybinding
  useKeybinding(
    { key: "F2" },
    () => {
      console.log("Starting rename...");
      startEditingFocusedItem();
    },
    { ref: tabRef },
  );

  // Cut focused item keybinding
  useKeybinding(
    { key: "x", ctrl: true },
    () => {
      console.log("Cutting note...");
      handleCutNote();
    },
    { ref: tabRef },
  );

  // Clear cut with Escape keybinding
  useKeybinding(
    { key: "Escape" },
    () => {
      handleClearCut();
    },
    { ref: tabRef },
  );

  // Paste keybinding
  useKeybinding(
    { key: "v", ctrl: true },
    () => {
      console.log("Pasting note...");
      handlePasteNote();
    },
    { ref: tabRef },
  );

  // Delete keybinding
  useKeybinding(
    { key: "Delete" },
    () => {
      console.log("Deleting note...");
      handleDeleteNote();
    },
    { ref: tabRef },
  );
}

// Hook for note renaming and creation functionality
function useNoteRenaming(
  tabRef: () => HTMLElement | undefined,
  focusedItem: Accessor<NavigationItem | null>,
  displayItems: Accessor<NavigationItem[]>,
  setFocusedItemIndex: (index: number) => void,
) {
  const [editingItemId, setEditingItemId] = createSignal<string | null>(null);
  const [renamedItemInfo, setRenamedItemInfo] = createSignal<{
    id: string;
    newTitle: string;
  } | null>(null);
  const [newlyCreatedNoteId, setNewlyCreatedNoteId] = createSignal<
    string | null
  >(null);

  // Track when a rename completes or new note appears and refocus the item
  createEffect(() => {
    const renamed = renamedItemInfo();
    const newNoteId = newlyCreatedNoteId();
    const items = displayItems();

    if (items.length > 0) {
      // Handle renamed item refocusing
      if (renamed) {
        const renamedItem = items.find((item) => item.id === renamed.id);

        if (renamedItem && renamedItem.title === renamed.newTitle) {
          const newIndex = items.findIndex((item) => item.id === renamed.id);

          if (newIndex !== -1) {
            setFocusedItemIndex(newIndex);

            const ref = tabRef();
            if (ref) {
              ref.focus();
            }
          }

          setRenamedItemInfo(null);
        }
      }

      // Handle newly created note refocusing
      if (newNoteId) {
        const newNoteItem = items.find((item) => item.id === newNoteId);

        if (newNoteItem) {
          const newIndex = items.findIndex((item) => item.id === newNoteId);

          if (newIndex !== -1) {
            setFocusedItemIndex(newIndex);

            const ref = tabRef();
            if (ref) {
              ref.focus();
            }
          }

          setNewlyCreatedNoteId(null);
        }
      }
    }
  });

  // Handle renaming a note
  const handleRenameNote = async (noteId: string, newTitle: string) => {
    try {
      await updateNoteTitle(noteId, newTitle);
      setEditingItemId(null);

      // Invalidate relevant caches to show the updated title
      revalidate([
        updateNoteTitle.key,
        "children-with-folder-status",
        "note-by-id",
      ]);

      // Track that this item was just renamed for refocusing
      setRenamedItemInfo({ id: noteId, newTitle });
    } catch (error) {
      console.error("Failed to rename note:", error);
      alert("Failed to rename note. Please try again.");
    }
  };

  // Start editing mode for focused item
  const startEditingFocusedItem = () => {
    const focused = focusedItem();
    if (focused) {
      setEditingItemId(focused.id);
    }
  };

  // Cancel editing and restore focus
  const cancelEditing = () => {
    setEditingItemId(null);
    // Restore focus to the tab container
    setTimeout(() => {
      const ref = tabRef();
      if (ref) {
        ref.focus();
      }
    }, 0);
  };

  return {
    editingItemId,
    handleRenameNote,
    startEditingFocusedItem,
    cancelEditing,
    setNewlyCreatedNoteId,
  };
}

// Query function to update note title
const updateNoteTitle = query(async (noteId: string, newTitle: string) => {
  "use server";
  const { updateNote } = await import("~/lib/db");
  return await updateNote(noteId, { title: newTitle });
}, "update-note-title");

// Query function to move a note
const moveNote = query(async (noteId: string, newParentId?: string) => {
  "use server";
  const { moveNote } = await import("~/lib/db");
  return await moveNote(noteId, newParentId);
}, "move-note");

// Query function to delete a note
const deleteNote = query(async (noteId: string) => {
  "use server";
  const { deleteNote } = await import("~/lib/db");
  return await deleteNote(noteId);
}, "delete-note");

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
  const { note, noteId, noteExists, noteLoaded } = useCurrentNote();
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

  // Track which item has keyboard focus (for navigation)
  const [focusedItemIndex, setFocusedItemIndex] = createSignal(-1);

  // Track cut note for clipboard operations
  const [cutNoteId, setCutNoteId] = createSignal<string | null>(null);

  // Create a unique identifier based on what's actually displayed in the sidebar
  const currentContentId = createMemo(() =>
    getSidebarContentId(note(), isCurrentNoteFolder()),
  );

  // Auto-focus first item when display items change (but content ID stays same)
  createEffect(() => {
    const items = displayItems();
    const currentFocus = focusedItemIndex();

    // If no item is focused and we have items, focus the first one
    if (currentFocus === -1 && items.length > 0) {
      setFocusedItemIndex(0);
    }
    // If focused index is beyond available items, reset to first or -1
    else if (currentFocus >= items.length) {
      setFocusedItemIndex(items.length > 0 ? 0 : -1);
    }
  });

  // Get the currently focused item
  const focusedItem = createMemo(() => {
    const items = displayItems();
    const index = focusedItemIndex();
    return index >= 0 && index < items.length ? items[index] : null;
  });

  // Use renaming hook
  const {
    editingItemId,
    handleRenameNote,
    startEditingFocusedItem,
    cancelEditing,
    setNewlyCreatedNoteId,
  } = useNoteRenaming(
    () => tabRef,
    focusedItem,
    displayItems,
    setFocusedItemIndex,
  );

  // Auto-focus the tab when it mounts
  useAutoFocus(() => tabRef);

  // Handle creating a new note
  const handleCreateNote = async () => {
    try {
      const currentNote = note();
      let parentId: string | undefined;

      if (isCurrentNoteFolder()) {
        // If current note is a folder, create note inside it
        parentId = currentNote?.id;
      } else {
        // If current note is a regular note, create sibling (same parent)
        parentId = currentNote?.parent_id;
      }

      const newNote = await createNewNote("New Note", "", parentId);

      // Invalidate relevant caches to show the new note
      revalidate([
        createNewNote.key,
        "children-with-folder-status",
        "note-by-id",
      ]);

      // Track that this note was just created for refocusing in sidebar
      setNewlyCreatedNoteId(newNote.id);

      // Navigate to the newly created note
      navigateToNote(newNote.id);
    } catch (error) {
      console.error("Failed to create note:", error);
      alert("Failed to create note. Please try again.");
    }
  };

  // Handle creating a new child note
  const handleCreateChildNote = async () => {
    try {
      const currentNote = note();

      // Always create as a child of the current note
      const parentId = currentNote?.id;

      const newNote = await createNewNote("New Note", "", parentId);

      // Invalidate relevant caches to show the new note
      revalidate([
        createNewNote.key,
        "children-with-folder-status",
        "note-by-id",
      ]);

      // Track that this note was just created for refocusing in sidebar
      setNewlyCreatedNoteId(newNote.id);

      // Navigate to the newly created note
      navigateToNote(newNote.id);
    } catch (error) {
      console.error("Failed to create child note:", error);
      alert("Failed to create child note. Please try again.");
    }
  };

  // Handle cutting a note
  const handleCutNote = () => {
    const focused = focusedItem();
    if (focused) {
      setCutNoteId(focused.id);
      console.log(`Cut note: ${focused.title} (${focused.id})`);
    }
  };

  // Handle clearing the cut state
  const handleClearCut = () => {
    if (cutNoteId()) {
      console.log("Cleared cut note");
      setCutNoteId(null);
    }
  };

  // Handle pasting a cut note
  const handlePasteNote = async () => {
    const cutId = cutNoteId();
    if (!cutId) {
      console.log("No note to paste");
      return;
    }

    try {
      const currentNote = note();
      let newParentId: string | undefined;

      if (isCurrentNoteFolder()) {
        // If current note is a folder, paste into it
        newParentId = currentNote?.id;
      } else {
        // If current note is a regular note, paste as sibling (same parent)
        newParentId = currentNote?.parent_id;
      }

      console.log(`Pasting note ${cutId} to parent ${newParentId || 'root'}`);
      
      await moveNote(cutId, newParentId);

      // Invalidate relevant caches to show the moved note
      revalidate([
        moveNote.key,
        "children-with-folder-status",
        "note-by-id",
      ]);

      // Clear the cut state
      setCutNoteId(null);

      // Track that this note was just moved for refocusing in sidebar
      setNewlyCreatedNoteId(cutId);

      console.log("Note pasted successfully");
    } catch (error) {
      console.error("Failed to paste note:", error);
      alert(`Failed to paste note: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Handle deleting a note
  const handleDeleteNote = async () => {
    const focused = focusedItem();
    if (!focused) {
      console.log("No note to delete");
      return;
    }

    // Check if note has children (is a folder)
    const isFolder = focused.is_folder;
    const confirmMessage = isFolder 
      ? `Are you sure you want to delete the folder "${focused.title}" and all its contents? This cannot be undone.`
      : `Are you sure you want to delete the note "${focused.title}"? This cannot be undone.`;

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      console.log(`Deleting note: ${focused.title} (${focused.id})`);
      
      // Store current focus index for repositioning after deletion
      const currentIndex = focusedItemIndex();
      const items = displayItems();
      
      await deleteNote(focused.id);

      // Invalidate relevant caches to show the updated list
      revalidate([
        deleteNote.key,
        "children-with-folder-status",
        "note-by-id",
      ]);

      // Clear cut state if the deleted note was cut
      if (cutNoteId() === focused.id) {
        setCutNoteId(null);
      }

      // Focus management after deletion
      setTimeout(() => {
        const newItems = displayItems();
        if (newItems.length > 0) {
          // If we deleted the last item, focus the new last item
          if (currentIndex >= newItems.length) {
            setFocusedItemIndex(newItems.length - 1);
          }
          // Otherwise, focus the item now at the same index (next item moved up)
          else {
            setFocusedItemIndex(currentIndex);
          }
        } else {
          // No items left, reset focus
          setFocusedItemIndex(-1);
        }
      }, 100); // Small delay to ensure revalidation completes

      console.log("Note deleted successfully");
    } catch (error) {
      console.error("Failed to delete note:", error);
      alert(`Failed to delete note: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Use navigation keybindings hook
  onMount(() => {
    useNavigationKeybindings(
      // The ref exists because we're in onMount
      () => tabRef!,
      displayItems,
      focusedItemIndex,
      setFocusedItemIndex,
      focusedItem,
      handleUpDirectory,
      handleItemClickWithDirection,
      handleCreateNote,
      handleCreateChildNote,
      startEditingFocusedItem,
      handleCutNote,
      handleClearCut,
      handlePasteNote,
      handleDeleteNote,
    );
  });

  // Handle case where note doesn't exist
  if (noteLoaded() && !noteExists() && noteId()) {
    return (
      <div class="">
        <Alert color="error" class="mb-4">
          <span class="flex-1 overflow-auto w-full">
            Note not found: <code>{noteId()}</code>
          </span>
        </Alert>
        <p class="text-base-content/60 mb-4">
          The note you're looking for doesn't exist or you don't have permission to view it.
        </p>
        <button 
          onClick={() => navigateToRoot()}
          class="btn btn-primary"
        >
          Go to Root
        </button>
      </div>
    );
  }

  return (
    <div
      ref={tabRef}
      tabIndex={0}
      class="flex flex-col h-full outline-none focus:outline-none group"
    >
      <div class="flex-1 space-y-4">
        {/*TODO Down the line we'll have to use context provider for keybindings to focus elements*/}

        <div class="w-full h-full bg-base-200 group-focus:bg-base-300  transition-bg duration-300 ease-in-out rounded">
          <Show when={cutNoteId()}>
            <CutIndicator
              noteTitle={
                displayItems().find((item) => item.id === cutNoteId())?.title ||
                "Unknown"
              }
              onClearCut={handleClearCut}
            />
          </Show>
          <ul class="menu  rounded-box w-full relative overflow-hidden">
            <Show when={showUpButton()}>
              <UpDirectoryButton onClick={handleUpDirectory} />
            </Show>

            <SlideTransition
              isGoingDeeper={isGoingDeeper}
              contentId={currentContentId()}
            >
              <div>
                <Show
                  when={displayItems().length > 0}
                  fallback={
                    <EmptyMessage note={note} isFolder={isCurrentNoteFolder} />
                  }
                >
                  <For each={displayItems()}>
                    {(item: NavigationItem, index) => (
                      <MenuItem
                        item={item}
                        isActive={noteId() === item.id}
                        isFocused={focusedItemIndex() === index()}
                        isEditing={editingItemId() === item.id}
                        handleItemClick={handleItemClickWithDirection}
                        handleRename={handleRenameNote}
                        onCancelEdit={cancelEditing}
                      />
                    )}
                  </For>
                </Show>
              </div>
            </SlideTransition>
          </ul>
        </div>
      </div>
    </div>
  );
}

const CutIndicator = (props: { noteTitle: string; onClearCut: () => void }) => {
  return (
    <Alert style="outline" color="info" class="my-4" showIcon={false}>
      <Scissors size={16} class="mr-2" />
      <span class="">"{props.noteTitle}"</span>
      <button
        onClick={props.onClearCut}
        class="btn btn-xs btn-ghost ml-2"
        title="Clear cut (Escape)"
      >
        <X size={14} />
      </button>
    </Alert>
  );
};

const MenuItem = (props: {
  item: NavigationItem;
  isActive: boolean;
  isFocused: boolean;
  isEditing: boolean;
  handleItemClick: (item: NavigationItem) => void;
  handleRename: (id: string, newTitle: string) => void;
  onCancelEdit: () => void;
}) => {
  let inputRef: HTMLInputElement | undefined;

  const classList = () => {
    const classes = [];
    if (props.isActive) classes.push("menu-active");
    if (props.isFocused) classes.push("ring-2 ring-primary ring-inset");
    return classes.join(" ");
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      props.onCancelEdit();
    } else if (e.key === "Enter") {
      const input = e.target as HTMLInputElement;
      props.handleRename(props.item.id, input.value);
    }
  };

  const handleBlur = (e: FocusEvent) => {
    const input = e.target as HTMLInputElement;
    props.handleRename(props.item.id, input.value);
  };

  // Focus the input when editing starts
  createEffect(() => {
    if (props.isEditing && inputRef) {
      inputRef.focus();
      inputRef.select(); // Select all text for easy replacement
    }
  });

  return (
    <li>
      <a
        class={classList()}
        onClick={() => !props.isEditing && props.handleItemClick(props.item)}
      >
        <Show when={props.item.is_folder} fallback={<FileText size={16} />}>
          <Folder size={16} />
        </Show>

        <Show
          when={props.isEditing}
          fallback={<span class="flex-1">{props.item.title}</span>}
        >
          <Input
            ref={inputRef}
            value={props.item.title}
            size="sm"
            class="flex-1 min-w-0"
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
          />
        </Show>

        <Show when={props.item.is_folder && !props.isEditing}>
          <ChevronRight size={14} class="text-base-content/40" />
        </Show>
      </a>
    </li>
  );
};

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

export const SlideTransition = (props: {
  children: JSX.Element;
  isGoingDeeper: Accessor<boolean>;
  contentId: string;
}) => {
  const [showContent, setShowContent] = createSignal(true);
  const [prevContentId, setPrevContentId] = createSignal<string | null>(null);

  // Handle content change with animation
  createEffect(() => {
    const currentId = props.contentId;
    const prevId = prevContentId();

    if (currentId !== prevId) {
      // Skip animation on initial load (when prevId is null)
      if (prevId === null) {
        setPrevContentId(currentId);
        return;
      }

      setShowContent(false);
      setTimeout(() => {
        setPrevContentId(currentId);
        setShowContent(true);
      }, 0);
    }
  });

  return (
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
      {showContent() && props.children}
    </Transition>
  );
};

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
