import { createAsync } from "@solidjs/router";
import { Accessor } from "solid-js";
import { getNoteFolderPathQuery } from "~/lib/db/api";

/**
 * Hook to get the folder path for a note
 * Returns the note's parent folder ID and the full folder hierarchy from root to parent
 */
export function useNoteFolderPath(noteId: Accessor<string | undefined>) {
  return createAsync(async () => {
    const id = noteId();
    if (!id) return null;
    return await getNoteFolderPathQuery(id);
  });
}
