/**
 * Note deletion functions
 */

"use server";

import { query, redirect } from "@solidjs/router";
import { requireUser } from "../../auth";
import { db } from "../index";

/**
 * Delete a note
 * Note: The database trigger `notes_before_delete` automatically:
 * - Copies the note to notes_history
 * - Keeps last 15 DELETE entries
 * - Cleans up FTS5 search index
 */
export async function deleteNote(id: string): Promise<void> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  const stmt = db.prepare("DELETE FROM notes WHERE id = ? AND user_id = ?");
  const result = stmt.run(id, user.id);
  if (result.changes === 0) {
    throw new Error("Note not found");
  }
}

/**
 * Query function to delete a note (for client-side use)
 */
export const deleteNoteQuery = query(async (noteId: string) => {
  "use server";
  return await deleteNote(noteId);
}, "delete-note");
