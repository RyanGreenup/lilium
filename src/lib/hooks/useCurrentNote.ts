import { createAsync, useParams, useSearchParams } from "@solidjs/router";

// Server function to get note by ID
const getNoteById = async (noteId: string) => {
  "use server";
  const { getNoteById: dbGetNoteById } = await import("~/lib/db");
  return await dbGetNoteById(noteId);
};

/**
 * Hook to get the current note based on route params or search params
 * Returns the note object and the note ID
 */
export function useCurrentNote() {
  const params = useParams();
  const [searchParams] = useSearchParams();

  // Try to get id from route params first, then search params
  const rawId = params.id || searchParams.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  // Fetch the note data when we have an ID (reactive to ID changes)
  const note = createAsync(async () => {
    if (!id) return null;
    try {
      return await getNoteById(id);
    } catch (error) {
      console.error("Failed to fetch note:", error);
      return null;
    }
  });

  return {
    note,
    noteId: id,
  };
}