import { revalidate } from "@solidjs/router";
import { createSignal } from "solid-js";
import type { Accessor, Setter } from "solid-js";
import type { ListItem } from "~/lib/db_new/types";
import { createNewNote, duplicateNoteQuery } from "~/lib/db_new/notes/create";
import { createNewFolder, duplicateFolderQuery } from "~/lib/db_new/folders/create";
import { renameNoteQuery } from "~/lib/db_new/notes/update_rename";
import { renameFolderQuery } from "~/lib/db_new/folders/update_rename";
import { getChildrenQuery } from "~/lib/db_new/api";
import { moveNoteQuery } from "~/lib/db_new/notes/update_move";

interface UseListItemActionsReturn {
  /** ID of item currently being edited (for inline rename) */
  editingItemId: Accessor<string | null>;
  setEditingItemId: Setter<string | null>;
  /** Start inline editing for an item */
  handleStartEdit: (item: ListItem) => void;
  /** Cancel inline editing */
  handleCancelRename: () => void;
  /** Confirm rename with new title */
  handleRename: (item: ListItem, newTitle: string) => Promise<void>;
  /** Create a sibling note or folder */
  handleCreateSibling: (item: ListItem, type: "note" | "folder") => Promise<void>;
  /** Create a child note or folder inside a folder */
  handleCreateChild: (item: ListItem, type: "note" | "folder") => Promise<void>;
  /** Copy a markdown link to clipboard */
  handleCopyLink: (item: ListItem) => Promise<void>;
  /** Duplicate a note */
  handleDuplicate: (item: ListItem) => Promise<void>;
  /** Currently cut item */
  cutItem: Accessor<ListItem | null>;
  /** Cut an item for later pasting */
  handleCut: (item: ListItem) => void;
  /** Paste cut item as sibling of target */
  handlePaste: (targetItem: ListItem) => Promise<void>;
}

/**
 * Hook for managing list item actions (create, rename, etc.)
 * Encapsulates state and handlers for sidebar list operations.
 */
export function useListItemActions(): UseListItemActionsReturn {
  const [editingItemId, setEditingItemId] = createSignal<string | null>(null);
  const [cutItem, setCutItem] = createSignal<ListItem | null>(null);

  // Generate a unique title by checking existing siblings
  const generateUniqueTitle = async (
    baseTitle: string,
    parentId: string | null
  ): Promise<string> => {
    const siblings = await getChildrenQuery(parentId);
    const existingTitles = new Set(siblings.map((s) => s.title));

    if (!existingTitles.has(baseTitle)) {
      return baseTitle;
    }

    let counter = 1;
    while (existingTitles.has(`${baseTitle} (${counter})`)) {
      counter++;
      if (counter > 100) {
        throw new Error(
          `Failed to generate unique title: exceeded 100 attempts for "${baseTitle}"`
        );
      }
    }
    return `${baseTitle} (${counter})`;
  };

  const handleStartEdit = (item: ListItem) => {
    setEditingItemId(item.id);
  };

  const handleCancelRename = () => {
    setEditingItemId(null);
  };

  const handleRename = async (item: ListItem, newTitle: string) => {
    try {
      if (item.type === "folder") {
        await renameFolderQuery(item.id, newTitle);
      } else {
        await renameNoteQuery(item.id, newTitle);
      }
      revalidate("list-children");
    } catch (error) {
      console.error("Failed to rename:", error);
      alert("Failed to rename item");
    } finally {
      setEditingItemId(null);
    }
  };

  const handleCreateSibling = async (
    item: ListItem,
    type: "note" | "folder"
  ) => {
    try {
      const parentId = item.parent_id ?? null;
      const baseTitle = type === "note" ? "Untitled" : "New Folder";
      const title = await generateUniqueTitle(baseTitle, parentId);

      let newItem;
      if (type === "note") {
        newItem = await createNewNote(title, "", parentId ?? undefined);
      } else {
        newItem = await createNewFolder(title, parentId ?? undefined);
      }

      revalidate("list-children");
      setEditingItemId(newItem.id);
    } catch (error) {
      console.error("Failed to create item:", error);
      alert(error instanceof Error ? error.message : "Failed to create item");
    }
  };

  const handleCreateChild = async (item: ListItem, type: "note" | "folder") => {
    if (item.type === "note") {
      alert("Creating children under notes is not implemented yet. The logic will also need to be shared between Pasting, so we'll implement this cohesively all together");
      return;
    }

    try {
      const parentId = item.id;
      const baseTitle = type === "note" ? "Untitled" : "New Folder";
      const title = await generateUniqueTitle(baseTitle, parentId);

      let newItem;
      if (type === "note") {
        newItem = await createNewNote(title, "", parentId);
      } else {
        newItem = await createNewFolder(title, parentId);
      }

      revalidate("list-children");
      setEditingItemId(newItem.id);
    } catch (error) {
      console.error("Failed to create item:", error);
      alert(error instanceof Error ? error.message : "Failed to create item");
    }
  };

  const handleCopyLink = async (item: ListItem) => {
    const link = `[${item.title}](${item.id})`;
    await navigator.clipboard.writeText(link);
  };

  const handleDuplicate = async (item: ListItem) => {
    try {
      const parentId = item.parent_id ?? null;
      const baseTitle = `${item.title} (copy)`;
      const title = await generateUniqueTitle(baseTitle, parentId);

      let newItem;
      if (item.type === "folder") {
        newItem = await duplicateFolderQuery(item.id, title, parentId ?? undefined);
      } else {
        newItem = await duplicateNoteQuery(item.id, title);
      }

      revalidate("list-children");
      setEditingItemId(newItem.id);
    } catch (error) {
      console.error("Failed to duplicate:", error);
      alert(error instanceof Error ? error.message : "Failed to duplicate item");
    }
  };

  const handleCut = (item: ListItem) => {
    if (item.type === "folder") {
      alert("Cutting folders is not implemented yet");
      return;
    }
    setCutItem(item);
  };

  const handlePaste = async (targetItem: ListItem) => {
    const itemToPaste = cutItem();
    if (!itemToPaste) return;

    try {
      const newParentId = targetItem.parent_id ?? undefined;
      await moveNoteQuery(itemToPaste.id, newParentId);
      revalidate("list-children");
      setCutItem(null);
    } catch (error) {
      console.error("Failed to paste:", error);
      alert(error instanceof Error ? error.message : "Failed to paste item");
    }
  };

  return {
    editingItemId,
    setEditingItemId,
    handleStartEdit,
    handleCancelRename,
    handleRename,
    handleCreateSibling,
    handleCreateChild,
    handleCopyLink,
    handleDuplicate,
    cutItem,
    handleCut,
    handlePaste,
  };
}
