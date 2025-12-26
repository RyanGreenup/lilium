/**
 * Utility functions for notes
 */

import type { Note, NoteWithoutContent, NoteWithParentFolderTitle } from "../types";
import { INDEX_NOTE_TITLE } from "../types";

/**
 * Check if a note is an index note
 *
 * Index notes are special notes that serve as the default preview
 * for their parent folder. They are displayed automatically when
 * a user navigates to the folder.
 *
 * @param note - The note to check (or just its title)
 * @returns true if the note is an index note
 */
export function isIndexNote(
  note: Note | NoteWithoutContent | { title: string },
): boolean {
  return note.title === INDEX_NOTE_TITLE;
}

/**
 * Get the display title for a note.
 * Index notes return parent folder's title; regular notes return their title.
 *
 * @param note - The note to get display title for
 * @returns The title to display in list views
 */
export function getDisplayTitle(note: Note | NoteWithParentFolderTitle): string {
  if (isIndexNote(note)) {
    if ("parent_folder_title" in note && note.parent_folder_title) {
      return note.parent_folder_title;
    }
    return INDEX_NOTE_TITLE;
  }
  return note.title;
}
