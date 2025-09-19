import { createAsync, query } from "@solidjs/router";
import { Accessor } from "solid-js";

// Query function to get children with folder status (reuse the same one)
const getChildrenWithFolderStatus = query(async (parentId?: string) => {
  "use server";
  const { getChildNotesWithFolderStatus } = await import("~/lib/db");
  return await getChildNotesWithFolderStatus(parentId);
}, "children-with-folder-status");

/**
 * Hook to get siblings of a note (notes with the same parent)
 */
export function useNoteSiblings(noteId: Accessor<string | undefined>, parentId: Accessor<string | undefined>) {
  const siblings = createAsync(() => {
    const currentNoteId = noteId();
    if (!currentNoteId) return Promise.resolve([]);
    const parentIdValue = parentId();
    return getChildrenWithFolderStatus(parentIdValue);
  });

  return siblings;
}