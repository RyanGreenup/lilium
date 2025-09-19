/**
 * Note deletion functions
 */

"use server";

import { query } from "@solidjs/router";
import { requireUser } from "../../auth";
import { redirect } from "@solidjs/router";
import { db } from "../index";

/**
 * Delete a note
 */
export async function deleteNote(id: string): Promise<void> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  const stmt = db.prepare("DELETE FROM notes WHERE id = ? AND user_id = ?");
  const result = stmt.run(id, user.id);
  if (result.changes === 0) throw new Error("Note not found");
}

/**
 * Query function to delete a note (for client-side use)
 */
export const deleteNoteQuery = query(async (noteId: string) => {
  "use server";
  return await deleteNote(noteId);
}, "delete-note");