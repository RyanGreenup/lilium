/**
 * Note update functions
 */

"use server";

import { query } from "@solidjs/router";
import { requireUser } from "../../auth";
import { redirect } from "@solidjs/router";
import type { Note } from "../types";
import { db } from "../index";

/**
 * Get note by ID (temporary - will be moved to read.ts later)
 */
async function getNoteById(id: string): Promise<Note | null> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }
  
  const stmt = db.prepare("SELECT * FROM notes WHERE id = ? AND user_id = ?");
  const note = stmt.get(id, user.id) as Note | undefined;
  return note || null;
}

/**
 * Update note content and metadata
 */
export async function updateNote(
  id: string,
  updates: Partial<Pick<Note, "title" | "abstract" | "content" | "syntax" | "parent_id">>,
): Promise<Note> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }
  
  const setPairs = Object.keys(updates).map(key => `${key} = ?`).join(", ");
  const values = Object.values(updates);
  
  const stmt = db.prepare(`
    UPDATE notes 
    SET ${setPairs}, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ? AND user_id = ?
  `);
  
  const result = stmt.run(...values, id, user.id);
  if (result.changes === 0) throw new Error("Note not found");
  
  const updatedNote = await getNoteById(id);
  if (!updatedNote) {
    throw new Error("Note not found after update");
  }
  return updatedNote;
}

/**
 * Query function to update note title (for client-side use)
 */
export const updateNoteTitle = query(async (noteId: string, newTitle: string) => {
  "use server";
  return await updateNote(noteId, { title: newTitle });
}, "update-note-title");