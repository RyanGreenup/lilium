import { createAsync, cache } from "@solidjs/router";
import { createMemo } from "solid-js";
import { useCurrentNote } from "./useCurrentNote";
import { getChildrenWithFolderStatusQuery } from "~/lib/db/notes/read";

/**
 * Consolidated hook that efficiently fetches note context data
 * Gets both children and siblings in optimized way to reduce network requests
 */
export function useNoteContext() {
  const { note, noteId } = useCurrentNote();
  
  // Get children of current note
  const children = createAsync(() => getChildrenWithFolderStatusQuery(noteId()));
  
  // Get siblings by fetching children of parent, or root items if no parent
  const siblings = createAsync(() => {
    const currentNote = note();
    const parentId = currentNote?.parent_id;
    // Fetch children of parent, or root items (null parent would be a root level item)
    return getChildrenWithFolderStatusQuery(parentId ?? undefined);
  });

  // Determine if current note is a folder (has children)
  const isCurrentNoteFolder = createMemo(() => (children()?.length ?? 0) > 0);
  
  // Get the display items based on folder status
  const displayItems = createMemo(() => 
    isCurrentNoteFolder() ? (children() ?? []) : (siblings() ?? [])
  );

  return {
    children,
    siblings, 
    displayItems,
    isCurrentNoteFolder,
    noteId,
    note
  };
}
