import {
  AccessorWithLatest,
  createAsync,
  query,
  useParams,
  useSearchParams,
} from "@solidjs/router";
import { createMemo } from "solid-js";
import { Note } from "~/lib/db";

// Query function to get note by ID
const getNoteById = query(async (noteId: string) => {
  "use server";
  const { getNoteById: dbGetNoteById } = await import("~/lib/db");
  return await dbGetNoteById(noteId);
}, "note-by-id");

/**
 * Hook to get the current note based on route params or search params
 * Returns the note object, the note ID, and a boolean indicating if the note exists
 */
export function useCurrentNote(): {
  note: AccessorWithLatest<Note | null | undefined>;
  noteId: () => string | undefined;
  noteExists: () => boolean;
  noteLoaded: () => boolean;
} {
  const params = useParams();
  const [searchParams] = useSearchParams();

  // Make noteId reactive to route changes
  const noteId = createMemo(() => {
    const rawId = params.id || searchParams.id;
    return Array.isArray(rawId) ? rawId[0] : rawId;
  });

  // Fetch the note data when we have an ID (reactive to ID changes)
  const note = createAsync(() => {
    const id = noteId();
    return id ? getNoteById(id) : Promise.resolve(null);
  });

  // Helper to check if note exists (null means not found, undefined means loading)
  const noteExists = createMemo(() => {
    const currentNote = note();
    const id = noteId();
    // If we have an ID but note is null (not undefined), it means the note doesn't exist
    return !id || (currentNote !== undefined && currentNote !== null);
  });

  // Helper to check if note has finished loading
  const noteLoaded = createMemo(() => {
    const id = noteId();
    return !id || note() !== undefined;
  });

  return {
    note,
    noteId,
    noteExists,
    noteLoaded,
  };
}
