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
 * Get the parent hierarchy of a note (temporary - will be moved to hierarchy.ts later)
 */
async function getNoteParents(note_id: string): Promise<Note[]> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }
  
  // Recursive CTE to get the parent chain
  const stmt = db.prepare(`
    WITH RECURSIVE parent_chain AS (
      -- Start with the current note
      SELECT id, title, parent_id, user_id, 0 as level
      FROM notes 
      WHERE id = ? AND user_id = ?
      
      UNION ALL
      
      -- Recursively get parents
      SELECT n.id, n.title, n.parent_id, n.user_id, pc.level + 1 as level
      FROM notes n
      INNER JOIN parent_chain pc ON n.id = pc.parent_id
      WHERE n.user_id = ?
    )
    SELECT id, title, parent_id, user_id
    FROM parent_chain 
    WHERE level > 0  -- Exclude the current note itself
    ORDER BY level DESC  -- Root first, then descendants
  `);
  
  return stmt.all(note_id, user.id, user.id) as Note[];
}

/**
 * Move a note to a new parent (for cut/paste operations)
 */
export async function moveNote(id: string, newParentId?: string): Promise<Note> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  // Validate that the note exists and belongs to the user
  const note = await getNoteById(id);
  if (!note) {
    throw new Error("Note not found");
  }
  
  // If newParentId is provided, validate that the parent exists and belongs to the user
  if (newParentId) {
    const parentNote = await getNoteById(newParentId);
    if (!parentNote) {
      throw new Error("Parent note not found");
    }
    
    // Prevent moving a note to itself or its descendants to avoid circular references
    const parents = await getNoteParents(newParentId);
    if (parents.some(parent => parent.id === id)) {
      throw new Error("Cannot move note to its own descendant");
    }
  }
  
  const stmt = db.prepare(`
    UPDATE notes 
    SET parent_id = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ? AND user_id = ?
  `);
  
  const result = stmt.run(newParentId, id, user.id);
  if (result.changes === 0) throw new Error("Note not found");
  
  const movedNote = await getNoteById(id);
  if (!movedNote) {
    throw new Error("Note not found after move");
  }
  return movedNote;
}

/**
 * Query function to update note title (for client-side use)
 */
export const updateNoteTitle = query(async (noteId: string, newTitle: string) => {
  "use server";
  return await updateNote(noteId, { title: newTitle });
}, "update-note-title");

/**
 * Query function to move a note (for client-side use)
 */
export const moveNoteQuery = query(async (noteId: string, newParentId?: string) => {
  "use server";
  return await moveNote(noteId, newParentId);
}, "move-note");