/**
 * Tag update and relationship functions
 */

"use server";

import { query, redirect } from "@solidjs/router";
import { randomBytes } from "crypto";
import { requireUser } from "../../auth";
import { getTagById } from "./read";
import { getNoteById } from "../notes/read";
import { db } from "../index";
import type { Note } from "../types";

/**
 * Add a tag to a note
 */
export async function addTagToNote(
  note_id: string,
  tag_id: string,
): Promise<void> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  // Verify both note and tag belong to the user
  await getNoteById(note_id);
  await getTagById(tag_id);

  const id = randomBytes(16).toString("hex");
  const stmt = db.prepare(`
    INSERT INTO note_tags (id, note_id, tag_id)
    VALUES (?, ?, ?)
  `);

  try {
    stmt.run(id, note_id, tag_id);
  } catch (error: any) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      // Tag already associated with note, ignore
      return;
    }
    throw error;
  }
}

/**
 * Remove a tag from a note
 */
export async function removeTagFromNote(
  note_id: string,
  tag_id: string,
): Promise<void> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  const stmt = db.prepare(
    "DELETE FROM note_tags WHERE note_id = ? AND tag_id = ?",
  );
  stmt.run(note_id, tag_id);
}

/**
 * Get notes by tag
 */
export async function getNotesByTag(tag_id: string): Promise<Note[]> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  await getTagById(tag_id); // Verify tag exists and belongs to user

  const stmt = db.prepare(`
    SELECT n.* FROM notes n
    INNER JOIN note_tags nt ON n.id = nt.note_id
    WHERE nt.tag_id = ? AND n.user_id = ?
    ORDER BY n.updated_at DESC
  `);

  return stmt.all(tag_id, user.id) as Note[];
}

/**
 * Query function to add a tag to a note (for client-side use)
 */
export const addTagToNoteQuery = query(async (noteId: string, tagId: string) => {
  "use server";
  return await addTagToNote(noteId, tagId);
}, "add-tag-to-note");

/**
 * Query function to remove a tag from a note (for client-side use)
 */
export const removeTagFromNoteQuery = query(async (noteId: string, tagId: string) => {
  "use server";
  return await removeTagFromNote(noteId, tagId);
}, "remove-tag-from-note");

/**
 * Query function to get notes by tag (for client-side use)
 */
export const getNotesByTagQuery = query(async (tagId: string) => {
  "use server";
  return await getNotesByTag(tagId);
}, "notes-by-tag");
