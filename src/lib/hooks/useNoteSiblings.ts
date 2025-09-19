import { createAsync } from "@solidjs/router";
import { Accessor } from "solid-js";

// Server function to get children with folder status
const getChildrenWithFolderStatus = async (parentId?: string) => {
  "use server";
  const { getChildNotesWithFolderStatus } = await import("~/lib/db");
  return await getChildNotesWithFolderStatus(parentId);
};

/**
 * Hook to get siblings of a note (notes with the same parent)
 */
export function useNoteSiblings(noteId: Accessor<string | undefined>, parentId: Accessor<string | undefined>) {
  const siblings = createAsync(async () => {
    const currentNoteId = noteId();
    if (!currentNoteId) return [];
    try {
      const parentIdValue = parentId();
      return await getChildrenWithFolderStatus(parentIdValue);
    } catch (error) {
      console.error("Failed to fetch siblings:", error);
      return [];
    }
  });

  return siblings;
}