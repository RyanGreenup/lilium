/**
 * Note update functions
 */

"use server";

import { query, redirect } from "@solidjs/router";
import { requireUser } from "../../auth";
import type { Note } from "../types";
import { db } from "../index";
import { getNoteById } from "./read";

/**
 * Generic update function for notes
 * Accepts partial updates for any combination of updatable fields
 */
export async function updateNote(
  id: string,
  updates: Partial<Pick<Note, "title" | "abstract" | "content" | "syntax" | "parent_id">>
): Promise<Note> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  // Ensure we have at least one field to update
  const fields = Object.keys(updates);
  if (fields.length === 0) {
    throw new Error("No fields to update");
  }

  // Build dynamic UPDATE query
  const setClause = fields.map(f => `${f} = ?`).join(", ");
  const values = fields.map(f => updates[f as keyof typeof updates]);

  const stmt = db.prepare(`
    UPDATE notes
    SET ${setClause}, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND user_id = ?
  `);

  const result = stmt.run(...values, id, user.id);

  if (result.changes === 0) {
    throw new Error("Note not found or no changes made");
  }

  // Return the updated note
  const updatedNote = await getNoteById(id);
  if (!updatedNote) {
    throw new Error("Failed to retrieve updated note");
  }

  return updatedNote;
}

/**
 * Query function to update a note (for client-side use)
 */
export const updateNoteQuery = query(
  async (
    noteId: string,
    updates: Partial<Pick<Note, "title" | "abstract" | "content" | "syntax" | "parent_id">>
  ) => {
    "use server";
    return await updateNote(noteId, updates);
  },
  "update-note"
);
