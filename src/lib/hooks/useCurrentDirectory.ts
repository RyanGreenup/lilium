import { createAsync } from "@solidjs/router";
import { useCurrentNote } from "./useCurrentNote";
import { getChildrenWithFolderStatusQuery } from "~/lib/db/notes/read";

/**
 * Hook to get the children of the current note
 * The sidebar always shows the children of whatever note is currently open
 */
export function useCurrentNoteChildren() {
  const { noteId } = useCurrentNote();

  // Get children of the current note
  const children = createAsync(() => getChildrenWithFolderStatusQuery(noteId()));

  return {
    children,
    parentNoteId: noteId,
  };
}