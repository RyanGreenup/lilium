import { revalidate } from "@solidjs/router";
import { createSignal } from "solid-js";
import type { Accessor, Setter } from "solid-js";
import type { ListItem } from "~/lib/db_new/types";
import { createNewNote } from "~/lib/db_new/notes/create";
import { createNewFolder } from "~/lib/db_new/folders/create";
import { renameNoteQuery } from "~/lib/db_new/notes/update_rename";
import { renameFolderQuery } from "~/lib/db_new/folders/update_rename";
import { getChildrenQuery } from "~/lib/db_new/api";

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
}

/**
 * Hook for managing list item actions (create, rename, etc.)
 * Encapsulates state and handlers for sidebar list operations.
 */
export function useListItemActions(): UseListItemActionsReturn {
  const [editingItemId, setEditingItemId] = createSignal<string | null>(null);

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
      alert("Creating children under notes is not implemented yet");
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

  return {
    editingItemId,
    setEditingItemId,
    handleStartEdit,
    handleCancelRename,
    handleRename,
    handleCreateSibling,
    handleCreateChild,
  };
}
