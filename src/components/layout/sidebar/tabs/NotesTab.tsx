import { AccessorWithLatest, revalidate, createAsync } from "@solidjs/router";
import ChevronDown from "lucide-solid/icons/chevron-down";
import ChevronRight from "lucide-solid/icons/chevron-right";
import FileText from "lucide-solid/icons/file-text";
import Folder from "lucide-solid/icons/folder";
import FolderUp from "lucide-solid/icons/folder-up";
import Home from "lucide-solid/icons/home";
import Scissors from "lucide-solid/icons/scissors";
import X from "lucide-solid/icons/x";
import {
  Accessor,
  createEffect,
  createMemo,
  createSignal,
  For,
  onMount,
  Show,
  Suspense,
} from "solid-js";
import NoteBreadcrumbsVertical from "~/components/NoteBreadcrumbsVertical";
import {
  useNoteNavigation,
  type NavigationItem,
} from "~/lib/hooks/useNoteNavigation";
import { useNoteContext } from "~/lib/hooks/useNoteContext";
import { Alert } from "~/solid-daisy-components/components/Alert";
import { Button } from "~/solid-daisy-components/components/Button";
import { Input } from "~/solid-daisy-components/components/Input";
import { Toggle } from "~/solid-daisy-components/components/Toggle";
import { Kbd } from "~/solid-daisy-components/components/Kbd";
import { useKeybinding } from "~/solid-daisy-components/utilities/useKeybinding";
import { createNewNote, duplicateNoteQuery } from "~/lib/db_new/notes/create";
import { updateNoteTitle, moveNoteQuery } from "~/lib/db/notes/update";
import { deleteNoteQuery } from "~/lib/db/notes/delete";
import { Note } from "~/lib/db/types";
import { Card } from "~/solid-daisy-components/components/Card";
import { useFollowMode } from "~/lib/hooks/useFollowMode";
import {
  ContextMenu,
  useContextMenu,
  type ContextMenuItem,
} from "~/solid-daisy-components/components/ContextMenu";

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
  handleCutNote: (noteId?: string) => void,
  handleClearCut: () => void,
  handlePasteNote: () => void,
  handlePasteAsChild: (parentId?: string) => void,
  handleDeleteNote: (noteId?: string) => void,
  handleDuplicateNote: (id: string) => void,
  handleCopyLink: (noteId?: string) => void,
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

  // Paste as child keybinding
  useKeybinding(
    { key: "v", ctrl: true, shift: true },
    () => {
      console.log("Pasting note as child...");
      handlePasteAsChild();
    },
    { ref: tabRef },
  );

  // Duplicate keybinding
  useKeybinding(
    { key: "d", ctrl: true },
    () => {
      console.log("Duplicating note...");
      const focused = focusedItem();
      if (focused) {
        handleDuplicateNote(focused.id);
      }
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

  // Copy link keybinding
  useKeybinding(
    { key: "y" },
    () => {
      console.log("Copying note link...");
      handleCopyLink();
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

  // Start editing mode for specified or focused item
  const startEditingItem = (noteId?: string) => {
    if (noteId) {
      setEditingItemId(noteId);
    } else {
      const focused = focusedItem();
      if (focused) {
        setEditingItemId(focused.id);
      }
    }
  };

  // Start editing mode for focused item (for keyboard shortcut)
  const startEditingFocusedItem = () => {
    startEditingItem();
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
    setEditingItemId,
    handleRenameNote,
    startEditingItem,
    startEditingFocusedItem,
    cancelEditing,
    setNewlyCreatedNoteId,
  };
}

// Compact header that combines up directory and follow mode toggle
const CompactHeader = (props: {
  showUpButton: boolean;
  onUpClick: () => void;
  followMode: Accessor<boolean>;
  setFollowMode: (value: boolean) => void;
}) => (
  <div class="flex items-center justify-between p-2 bg-base-100 border-b border-base-300">
    <div class="flex items-center space-x-2">
      <Show when={props.showUpButton}>
        <Button
          variant="ghost"
          size="sm"
          onClick={props.onUpClick}
          class="px-2 py-1 h-7"
          title="Go to parent directory"
        >
          <FolderUp size={14} />
        </Button>
      </Show>
    </div>
    
    <div class="flex items-center space-x-2">
      <span class="text-xs text-base-content/60">Follow</span>
      <Toggle
        size="sm"
        color="primary"
        checked={props.followMode()}
        onChange={(e) => props.setFollowMode(e.currentTarget.checked)}
        title="Follow Mode (Ctrl+F)"
      />
    </div>
  </div>
);

interface NotesTabProps {
  focusTrigger?: () => string | null;
}

// Main component wrapper
export default function NotesTab(props: NotesTabProps = {}) {
  return (
    <Suspense
      fallback={
        <div class="w-full h-full bg-base-200 rounded flex items-center justify-center">
          <div class="loading loading-spinner loading-md"></div>
        </div>
      }
    >
      <NotesTabContent focusTrigger={props.focusTrigger} />
    </Suspense>
  );
}

// Component that contains all async-dependent logic
function NotesTabContent(props: NotesTabProps = {}) {
  const {
    note,
    noteId,
    children,
    siblings,
    displayItems,
    isCurrentNoteFolder,
  } = useNoteContext();

  const { handleItemClick, navigateToNote, navigateToRoot } =
    useNoteNavigation();

  // Create a ref for the tab container to make it focusable
  let tabRef: HTMLDivElement | undefined;
  let menuContainerRef: HTMLDivElement | undefined;
  const itemRefs: (HTMLLIElement | undefined)[] = [];

  // Check if note exists and is loaded (from useCurrentNote)
  const noteExists = createMemo(() => note() !== null);
  const noteLoaded = createMemo(() => note() !== undefined);

  // Handle up directory navigation
  const handleUpDirectory = () => {
    const currentNote = note();
    if (currentNote?.parent_id) {
      navigateToNote(currentNote.parent_id);
    } else {
      navigateToRoot();
    }
  };

  // Enhanced item click handler with direction tracking
  // TODO remove this
  const handleItemClickWithDirection = (item: NavigationItem) => {
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

  // Scroll focused item into view
  createEffect(() => {
    const focusIndex = focusedItemIndex();
    if (focusIndex >= 0 && itemRefs[focusIndex] && menuContainerRef) {
      const focusedElement = itemRefs[focusIndex];
      const container = menuContainerRef;

      if (focusedElement) {
        // Calculate if element is visible
        const containerRect = container.getBoundingClientRect();
        const elementRect = focusedElement.getBoundingClientRect();

        // Check if element is outside the visible area
        const isAboveViewport = elementRect.top < containerRect.top;
        const isBelowViewport = elementRect.bottom > containerRect.bottom;

        if (isAboveViewport || isBelowViewport) {
          focusedElement.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
            inline: "nearest",
          });
        }
      }
    }
  });

  // Get the currently focused item
  const focusedItem = createMemo(() => {
    const items = displayItems();
    const index = focusedItemIndex();
    return index >= 0 && index < items.length ? items[index] : null;
  });

  // Follow mode hook (after focusedItem is defined)
  const { followMode, setFollowMode } = useFollowMode({
    getFocusedItem: focusedItem,
    keyBindingRef: () => tabRef,
    shouldNavigate: (item) => !item.is_folder, // Don't navigate to folders
  });

  // Use renaming hook
  const {
    editingItemId,
    setEditingItemId,
    handleRenameNote,
    startEditingItem,
    startEditingFocusedItem,
    cancelEditing,
    setNewlyCreatedNoteId,
  } = useNoteRenaming(
    () => tabRef,
    focusedItem,
    displayItems,
    setFocusedItemIndex,
  );

  // Handle external focus requests
  createEffect(() => {
    const trigger = props.focusTrigger?.();
    if (trigger && tabRef) {
      // Focus on next tick after render
      setTimeout(() => {
        tabRef.focus();
      }, 0);
    }
  });

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
  const handleCutNote = (noteId?: string) => {
    // Use provided ID or fall back to focused item
    const targetItem = noteId
      ? displayItems().find((item) => item.id === noteId)
      : focusedItem();

    if (targetItem) {
      setCutNoteId(targetItem.id);
      console.log(`Cut note: ${targetItem.title} (${targetItem.id})`);
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

      // Prevent setting note as its own parent
      if (newParentId === cutId) {
        alert("Cannot move a note inside itself");
        return;
      }

      console.log(`Pasting note ${cutId} to parent ${newParentId || "root"}`);

      await moveNoteQuery(cutId, newParentId);

      // Invalidate relevant caches to show the moved note
      revalidate([
        moveNoteQuery.key,
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
      alert(
        `Failed to paste note: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  };

  // Handle pasting a cut note as a child of the specified or focused note
  const handlePasteAsChild = async (parentId?: string) => {
    const cutId = cutNoteId();
    if (!cutId) {
      console.log("No note to paste");
      return;
    }

    // Use provided parentId or fall back to focused item
    const targetItem = parentId
      ? displayItems().find((item) => item.id === parentId)
      : focusedItem();

    if (!targetItem) {
      console.log("No target item to paste under");
      return;
    }

    try {
      // Paste as child of the target item
      const newParentId = targetItem.id;

      // Prevent setting note as its own parent
      if (newParentId === cutId) {
        alert("Cannot move a note inside itself");
        return;
      }

      console.log(
        `Pasting note ${cutId} as child of ${targetItem.title} (${newParentId})`,
      );

      await moveNoteQuery(cutId, newParentId);

      // Invalidate relevant caches to show the moved note
      revalidate([
        moveNoteQuery.key,
        "children-with-folder-status",
        "note-by-id",
      ]);

      // Clear the cut state
      setCutNoteId(null);

      // Track that this note was just moved for refocusing in sidebar
      setNewlyCreatedNoteId(cutId);

      console.log("Note pasted as child successfully");
    } catch (error) {
      console.error("Failed to paste note as child:", error);
      alert(
        `Failed to paste note as child: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  };

  // Handle deleting a note
  const handleDeleteNote = async (noteId?: string) => {
    // Use provided ID or fall back to focused item
    const targetItem = noteId
      ? displayItems().find((item) => item.id === noteId)
      : focusedItem();

    if (!targetItem) {
      console.log("No note to delete");
      return;
    }

    // Check if note has children (is a folder)
    const isFolder = targetItem.is_folder;
    const confirmMessage = isFolder
      ? `Are you sure you want to delete the folder "${targetItem.title}" and all its contents? This cannot be undone.`
      : `Are you sure you want to delete the note "${targetItem.title}"? This cannot be undone.`;

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      console.log(`Deleting note: ${targetItem.title} (${targetItem.id})`);

      // Store current focus index for repositioning after deletion
      const currentIndex = focusedItemIndex();

      await deleteNoteQuery(targetItem.id);

      // Invalidate relevant caches to show the updated list
      revalidate([
        deleteNoteQuery.key,
        "children-with-folder-status",
        "note-by-id",
      ]);

      // Clear cut state if the deleted note was cut
      if (cutNoteId() === targetItem.id) {
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
      alert(
        `Failed to delete note: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  };

  // Handle duplicating a note
  const handleDuplicateNote = async (noteId: string) => {
    try {
      // Get the note to duplicate
      const noteToClone = displayItems().find((item) => item.id === noteId);
      if (!noteToClone) return;

      // Create a new title with (copy) suffix
      const newTitle = `${noteToClone.title} (copy)`;
      const newNote = await duplicateNoteQuery(noteId, newTitle);

      if (newNote) {
        // Revalidate to refresh the display
        revalidate([
          "children-with-folder-status",
          "note-by-id",
        ]);
      }
    } catch (error) {
      console.error("Failed to duplicate note:", error);
      alert(
        `Failed to duplicate note: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  };

  // Handle copying note link (for keyboard shortcut)
  const handleCopyLink = (noteId?: string) => {
    // Use provided ID or fall back to focused item
    const targetItem = noteId
      ? displayItems().find((item) => item.id === noteId)
      : focusedItem();

    if (targetItem) {
      const noteLink = `[${targetItem.title}](${targetItem.id})`;

      navigator.clipboard
        .writeText(noteLink)
        .then(() => {
          console.log(`Copied note link: ${noteLink}`);
        })
        .catch((error) => {
          console.error("Failed to copy note link:", error);
          // Fallback for browsers that don't support clipboard API
          const textArea = document.createElement("textarea");
          textArea.value = noteLink;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand("copy");
          document.body.removeChild(textArea);
        });
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
      handlePasteAsChild,
      handleDeleteNote,
      handleDuplicateNote,
      handleCopyLink,
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
          The note you're looking for doesn't exist or you don't have permission
          to view it.
        </p>
        <button onClick={() => navigateToRoot()} class="btn btn-primary">
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
      <div class="flex flex-col h-full">
        <div class="flex flex-col flex-1 min-h-0 bg-base-200 group-focus:bg-base-300 transition-bg duration-300 ease-in-out rounded">
          <div class="flex-shrink-0">
            <CompactHeader
              showUpButton={showUpButton()}
              onUpClick={handleUpDirectory}
              followMode={followMode}
              setFollowMode={setFollowMode}
            />
            
            <Show when={cutNoteId()}>
              <CutIndicator
                noteTitle={
                  displayItems().find((item) => item.id === cutNoteId())
                    ?.title || "Unknown"
                }
                onClearCut={handleClearCut}
              />
            </Show>
          </div>

          <div ref={menuContainerRef} class="overflow-y-auto">
            <div class="flex-shrink-0">
              <div class="mb-4">
                <NoteBreadcrumbsVertical />
              </div>
              <div class="divider" />
            </div>

            <ul class="menu rounded-box w-full relative flex-1  min-h-0">
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
                        ref={(el) => (itemRefs[index()] = el)}
                        item={item}
                        isActive={noteId() === item.id}
                        isFocused={focusedItemIndex() === index()}
                        isEditing={editingItemId() === item.id}
                        handleItemClick={handleItemClickWithDirection}
                        handleRename={handleRenameNote}
                        onCancelEdit={cancelEditing}
                        startEditingItem={startEditingItem}
                        handleDeleteNote={handleDeleteNote}
                        handleCutNote={handleCutNote}
                        handleCreateChildNote={handleCreateChildNote}
                        handleCreateSiblingNote={handleCreateNote}
                        handleDuplicateNote={handleDuplicateNote}
                        handlePasteNote={handlePasteNote}
                        handlePasteAsChild={handlePasteAsChild}
                      />
                    )}
                  </For>
                </Show>
              </div>
            </ul>
          </div>
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
  ref?: (el: HTMLLIElement) => void;
  item: NavigationItem;
  isActive: boolean;
  isFocused: boolean;
  isEditing: boolean;
  handleItemClick: (item: NavigationItem) => void;
  handleRename: (id: string, newTitle: string) => void;
  onCancelEdit: () => void;
  startEditingItem: (id?: string) => void;
  handleDeleteNote: (id?: string) => void;
  handleCutNote: (id?: string) => void;
  handleCreateChildNote: (parentId: string) => void;
  handleCreateSiblingNote: () => void;
  handleDuplicateNote: (id: string) => void;
  handlePasteNote: () => void;
  handlePasteAsChild: (parentId?: string) => void;
}) => {
  let inputRef: HTMLInputElement | undefined;

  // Create a markdown link for a note
  const createNoteLink = (id: string, title: string) => {
    return `[${title}](${id})`;
  };

  // Handle copying note ID to clipboard
  const handleCopyId = async (noteId: string) => {
    const noteLink = createNoteLink(noteId, props.item.title);

    try {
      // NOTE requires HTTPS
      await navigator.clipboard.writeText(noteLink);
      console.log(`Copied note link: ${noteLink}`);
    } catch (error) {
      console.error("Failed to copy note link:", error);
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement("textarea");
      textArea.value = noteLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    }
  };

  // Context menu items for this note
  const contextMenuItems = (): ContextMenuItem[] => [
    {
      id: "edit",
      label: "Rename",
      keybind: "F2",
      onClick: () => props.startEditingItem(props.item.id),
    },
    {
      id: "create-sibling",
      label: "New sibling note",
      keybind: "Ctrl+N",
      onClick: () => props.handleCreateSiblingNote(),
    },
    {
      id: "create-child",
      label: props.item.is_folder ? "New child note" : "New child note",
      keybind: "Shift+N",
      onClick: () => props.handleCreateChildNote(props.item.id),
    },
    {
      id: "sep1",
      label: "",
      separator: true,
    },
    {
      id: "copy-link",
      label: "Copy Link",
      keybind: "y",
      onClick: () => handleCopyId(props.item.id),
    },
    {
      id: "duplicate",
      label: "Duplicate",
      keybind: "Ctrl+D",
      onClick: () => props.handleDuplicateNote(props.item.id),
    },
    {
      id: "cut",
      label: "Cut",
      keybind: "Ctrl+X",
      onClick: () => props.handleCutNote(props.item.id),
    },
    {
      id: "paste",
      label: "Paste as sibling",
      keybind: "Ctrl+V",
      onClick: () => props.handlePasteNote(),
    },
    {
      id: "paste-child",
      label: "Paste as child",
      keybind: "Ctrl+Shift+V",
      onClick: () => props.handlePasteAsChild(props.item.id),
    },
    {
      id: "sep2",
      label: "",
      separator: true,
    },
    {
      id: "delete",
      label: "Delete",
      keybind: "Del",
      onClick: () => props.handleDeleteNote(props.item.id),
    },
  ];

  const contextMenu = useContextMenu({
    items: contextMenuItems(),
  });

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
    <>
      <li ref={props.ref}>
        <a
          class={classList()}
          onClick={() => !props.isEditing && props.handleItemClick(props.item)}
          onContextMenu={contextMenu.open}
          onDblClick={(e) => {
            e.preventDefault();
            contextMenu.open(e as any as MouseEvent);
          }}
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
      <ContextMenu {...contextMenu.contextMenuProps()} />
    </>
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
