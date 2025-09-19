import { createAsync } from "@solidjs/router";
import { Accessor } from "solid-js";

// Server function to get note parents
const getNoteParents = async (noteId: string) => {
  "use server";
  const { getNoteParents: dbGetNoteParents } = await import("~/lib/db");
  return await dbGetNoteParents(noteId);
};

/**
 * Hook to get the parent hierarchy of a note
 * Returns an array of parent notes from root to immediate parent
 */
export function useNoteParents(noteId: Accessor<string | undefined>) {
  const parents = createAsync(async () => {
    const currentNoteId = noteId();
    if (!currentNoteId) return [];
    try {
      const parentChain = await getNoteParents(currentNoteId);
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