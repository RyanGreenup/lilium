import {
  AccessorWithLatest,
  createAsync,
  useParams,
  useSearchParams,
} from "@solidjs/router";
import { createMemo } from "solid-js";
import { Note } from "~/lib/db";
import { getNoteByIdQuery } from "~/lib/db/notes/read";

export interface UseNoteByIdResult {
  note: AccessorWithLatest<Note | null | undefined>;
  noteId: () => string | undefined;
  noteExists: () => boolean;
  noteLoaded: () => boolean;
}

/**
 * Hook to fetch and track note state given a reactive ID accessor
 *
 * This is the core note-fetching logic, separated from route handling.
 * Use this directly when you have a known note ID.
 *
 * @param idAccessor - Accessor that provides the note ID to fetch
 */
export function useNoteById(
  idAccessor: () => string | null | undefined,
): UseNoteByIdResult {
  const noteId = createMemo(() => idAccessor() ?? undefined);

  // Fetch the note data when we have an ID (reactive to ID changes)
  const note = createAsync(() => {
    const id = noteId();
    return id ? getNoteByIdQuery(id) : Promise.resolve(null);
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

/**
 * Hook to get the current note based on route params or search params
 *
 * This is a route-aware wrapper around useNoteById that derives the note ID
 * from URL parameters.
 *
 * @param idOverride - Optional accessor that provides a fixed note ID, bypassing route params
 */
export function useCurrentNote(
  idOverride?: () => string | null,
): UseNoteByIdResult {
  const params = useParams();
  const [searchParams] = useSearchParams();

  // Derive noteId from route params, search params, or override
  const derivedId = createMemo(() => {
    const overrideId = idOverride?.();
    if (overrideId) return overrideId;
    const rawId = params.id || searchParams.id;
    return Array.isArray(rawId) ? rawId[0] : rawId;
  });

  return useNoteById(derivedId);
}
