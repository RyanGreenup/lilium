import { createAsync } from "@solidjs/router";
import { useCurrentNote } from "./useCurrentNote";

// Server function to get children with folder status
const getChildrenWithFolderStatus = async (parentId?: string) => {
  "use server";
  const { getChildNotesWithFolderStatus } = await import("~/lib/db");
  return await getChildNotesWithFolderStatus(parentId);
};

/**
 * Hook to get the children of the current note
 * The sidebar always shows the children of whatever note is currently open
 */
export function useCurrentNoteChildren() {
  const { noteId } = useCurrentNote();

  // Get children of the current note
  const children = createAsync(async () => {
    try {
      return await getChildrenWithFolderStatus(noteId());
    } catch (error) {
      console.error("Failed to fetch children:", error);
      return [];
    }
  });

  return {
    children,
    parentNoteId: noteId,
  };
}