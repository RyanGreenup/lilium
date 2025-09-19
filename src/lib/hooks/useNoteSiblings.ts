import { createAsync } from "@solidjs/router";
import { Accessor } from "solid-js";
import { getChildrenWithFolderStatusQuery } from "~/lib/db/notes/read";

/**
 * Hook to get siblings of a note (notes with the same parent)
 */
export function useNoteSiblings(noteId: Accessor<string | undefined>, parentId: Accessor<string | undefined>) {
  const siblings = createAsync(() => {
    const currentNoteId = noteId();
    if (!currentNoteId) return Promise.resolve([]);
    const parentIdValue = parentId();
    return getChildrenWithFolderStatusQuery(parentIdValue);
  });

  return siblings;
}