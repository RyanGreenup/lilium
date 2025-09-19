import { createAsync } from "@solidjs/router";
import { Accessor } from "solid-js";
import { getNoteParentsQuery } from "~/lib/db/notes/read";

/**
 * Hook to get the parent hierarchy of a note
 * Returns an array of parent notes from root to immediate parent
 */
export function useNoteParents(noteId: Accessor<string | undefined>) {
  const parents = createAsync(async () => {
    const currentNoteId = noteId();
    if (!currentNoteId) return [];
    try {
      const parentChain = await getNoteParentsQuery(currentNoteId);
      // Add folder status for navigation
      return parentChain.map(parent => ({
        ...parent,
        is_folder: true, // Parents are always folders since they have children
      }));
    } catch (error) {
      console.error("Failed to fetch note parents:", error);
      return [];
    }
  });

  return parents;
}