/**
 * Note reading and retrieval functions
 */

"use server";

import { query } from "@solidjs/router";
import { requireUser } from "../../auth";
import { redirect } from "@solidjs/router";
import type { Note, NoteWithoutContent } from "../types";
import { INDEX_NOTE_TITLE } from "../types";
import { db } from "../index";

/**
 * Get note by ID
 */
export async function getNoteById(id: string): Promise<Note | null> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  const stmt = db.prepare(`
    SELECT
      id,
      title,
      abstract,
      content,
      syntax,
      parent_id,
      user_id,
      created_at,
      updated_at
    FROM notes
    WHERE id = ? AND user_id = ?
  `);
  const note = stmt.get(id, user.id) as Note | undefined;
  return note || null;
}

/**
 * Query function to get note by ID (for client-side use)
 */
export const getNoteByIdQuery = query(async (noteId: string) => {
  "use server";
  return await getNoteById(noteId);
}, "note-by-id");

/**
 * Get note metadata by ID (without content)
 */
export async function getNoteByIdWithoutContent(
  id: string,
): Promise<NoteWithoutContent | null> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  const stmt = db.prepare(`
    SELECT
      id,
      title,
      abstract,
      syntax,
      parent_id,
      user_id,
      created_at,
      updated_at
    FROM notes
    WHERE id = ? AND user_id = ?
  `);
  const note = stmt.get(id, user.id) as NoteWithoutContent | undefined;
  return note || null;
}

/**
 * Query function to get note metadata by ID (for client-side use)
 */
export const getNoteByIdWithoutContentQuery = query(async (noteId: string) => {
  "use server";
  return await getNoteByIdWithoutContent(noteId);
}, "note-by-id-without-content");

/**
 * Get the root index note (title='index', parent_id IS NULL)
 */
export async function getIndexNote(): Promise<NoteWithoutContent | null> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  const stmt = db.prepare(`
    SELECT
      id,
      title,
      abstract,
      syntax,
      parent_id,
      user_id,
      created_at,
      updated_at
    FROM notes
    WHERE title = ? AND parent_id IS NULL AND user_id = ?
  `);
  const note = stmt.get(INDEX_NOTE_TITLE, user.id) as NoteWithoutContent | undefined;
  return note || null;
}

/**
 * Query function to get the index note (for client-side use)
 */
export const getIndexNoteQuery = query(async () => {
  "use server";
  return await getIndexNote();
}, "index-note");

/**
 * Get the full path for a note from the materialized view
 */
export async function getNotePath(noteId: string): Promise<string | null> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  const stmt = db.prepare(`
    SELECT full_path
    FROM mv_note_paths
    WHERE note_id = ? AND user_id = ?
  `);
  const result = stmt.get(noteId, user.id) as { full_path: string } | undefined;
  return result?.full_path || null;
}

/**
 * Query function to get note path (for client-side use)
 */
export const getNotePathQuery = query(async (noteId: string) => {
  "use server";
  return await getNotePath(noteId);
}, "note-path");
