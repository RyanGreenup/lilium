/**
 * Note move functions (change parent folder)
 */

"use server";

import { query } from "@solidjs/router";
import type { Note } from "../types";
import { updateNote } from "./update";
import { getFolderById } from "../folders/read";

/**
 * Move a note to a different parent folder
 *
 * Unlike folders, notes don't have descendants, so no circular reference
 * prevention is needed. We only validate the target folder exists.
 *
 * Moving to undefined/null moves the note to root level.
 *
 * Auth is handled by updateNote.
 */
export async function moveNote(
  id: string,
  newParentId?: string
): Promise<Note> {
  // If moving to a specific folder, validate it exists
  if (newParentId) {
    const targetFolder = await getFolderById(newParentId);
    if (!targetFolder) {
      throw new Error("Target folder not found");
    }
    // Note: user_id validation is handled by updateNote
  }

  return updateNote(id, { parent_id: newParentId });
}

/**
 * Query function to move a note (for client-side use)
 */
export const moveNoteQuery = query(
  async (noteId: string, newParentId?: string) => {
    "use server";
    return await moveNote(noteId, newParentId);
  },
  "move-note"
);
