import { createAsync, query } from "@solidjs/router";
import { useCurrentNote } from "./useCurrentNote";

// Query function to get children with folder status
const getChildrenWithFolderStatus = query(async (parentId?: string) => {
  "use server";
  const { getChildNotesWithFolderStatus } = await import("~/lib/db");
  return await getChildNotesWithFolderStatus(parentId);
}, "children-with-folder-status");

/**
 * Hook to get the children of the current note
 * The sidebar always shows the children of whatever note is currently open
 */
export function useCurrentNoteChildren() {
  const { noteId } = useCurrentNote();

  // Get children of the current note
  const children = createAsync(() => getChildrenWithFolderStatus(noteId()));

  return {
    children,
    parentNoteId: noteId,
  };
}