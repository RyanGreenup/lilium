/**
 * Notes application database module using SQLite
 *
 * This module provides data storage functions for notes, tags, and related entities.
 * Uses random IDs for security and follows best practices.
 */

"use server";

import Database from "better-sqlite3";
import { randomBytes } from "crypto";
import { requireUser } from "./auth";
import { redirect } from "@solidjs/router";
import { Note, NoteWithTags, Tag } from "./db/types";

// Initialize SQLite database for notes app
const db = new Database("./.data/notes.sqlite");

////////////////////////////////////////////////////////////////////////////////
// Note Management /////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////
// Tag Management //////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

/**
 * Get tag by ID
 */
export async function getTagById(id: string): Promise<Tag> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  const stmt = db.prepare("SELECT * FROM tags WHERE id = ? AND user_id = ?");
  const tag = stmt.get(id, user.id) as Tag;
  if (!tag) throw new Error("Tag not found");
  return tag;
}

/**
 * Get all tags for the current user
 */
export async function getTags(): Promise<Tag[]> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  const stmt = db.prepare(`
    SELECT * FROM tags
    WHERE user_id = ?
    ORDER BY title
  `);

  return stmt.all(user.id) as Tag[];
}

/**
 * Delete a tag
 */
export async function deleteTag(id: string): Promise<void> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  const stmt = db.prepare("DELETE FROM tags WHERE id = ? AND user_id = ?");
  const result = stmt.run(id, user.id);
  if (result.changes === 0) throw new Error("Tag not found");
}

////////////////////////////////////////////////////////////////////////////////
// Note-Tag Relationships /////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

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
  const { getNoteById } = await import("./db/notes/read");
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

////////////////////////////////////////////////////////////////////////////////
// Search and Filtering ////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

/**
 * Search notes by title and content
 */
export async function searchNotes(query: string): Promise<Note[]> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  const stmt = db.prepare(`
    SELECT * FROM notes
    WHERE user_id = ? AND (
      title LIKE ? OR
      content LIKE ? OR
      abstract LIKE ?
    )
    ORDER BY updated_at DESC
  `);

  const searchTerm = `%${query}%`;
  return stmt.all(user.id, searchTerm, searchTerm, searchTerm) as Note[];
}

/**
 * Get notes by syntax type
 */
export async function getNotesBySyntax(syntax: string): Promise<Note[]> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  const stmt = db.prepare(`
    SELECT * FROM notes
    WHERE user_id = ? AND syntax = ?
    ORDER BY updated_at DESC
  `);

  return stmt.all(user.id, syntax) as Note[];
}

/**
 * Get recently modified notes
 */
export async function getRecentNotes(limit: number = 10): Promise<Note[]> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  const stmt = db.prepare(`
    SELECT * FROM notes
    WHERE user_id = ?
    ORDER BY updated_at DESC
    LIMIT ?
  `);

  return stmt.all(user.id, limit) as Note[];
}

