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

/**
 * Create a new note
 */
export async function createNote(
  title: string,
  content: string,
  syntax: string = "markdown",
  abstract?: string,
  parent_id?: string,
): Promise<Note> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  const id = randomBytes(16).toString("hex");
  const stmt = db.prepare(`
    INSERT INTO notes (id, title, abstract, content, syntax, parent_id, user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(id, title, abstract, content, syntax, parent_id, user.id);
  const createdNote = await getNoteById(id);
  if (!createdNote) {
    throw new Error("Failed to create note");
  }
  return createdNote;
}

/**
 * Get note by ID
 */
export async function getNoteById(id: string): Promise<Note | null> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  const stmt = db.prepare("SELECT * FROM notes WHERE id = ? AND user_id = ?");
  const note = stmt.get(id, user.id) as Note | undefined;
  return note || null;
}

/**
 * Get all notes for the current user
 */
export async function getNotes(): Promise<Note[]> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  const stmt = db.prepare(`
    SELECT * FROM notes
    WHERE user_id = ?
    ORDER BY updated_at DESC
  `);

  return stmt.all(user.id) as Note[];
}

/**
 * Get notes with their tags
 */
export async function getNotesWithTags(): Promise<NoteWithTags[]> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  const stmt = db.prepare(`
    SELECT
      n.*,
      json_group_array(
        CASE WHEN t.id IS NOT NULL
        THEN json_object('id', t.id, 'title', t.title, 'parent_id', t.parent_id, 'user_id', t.user_id, 'created_at', t.created_at)
        ELSE NULL END
      ) as tags_json
    FROM notes n
    LEFT JOIN note_tags nt ON n.id = nt.note_id
    LEFT JOIN tags t ON nt.tag_id = t.id
    WHERE n.user_id = ?
    GROUP BY n.id
    ORDER BY n.updated_at DESC
  `);

  const results = stmt.all(user.id) as (Note & { tags_json: string })[];

  return results.map((row) => {
    const tags = JSON.parse(row.tags_json).filter((tag: any) => tag !== null);
    const { tags_json, ...note } = row;
    return { ...note, tags };
  });
}

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

////////////////////////////////////////////////////////////////////////////////
// Statistics //////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

/**
 * Get summary statistics
 */
export async function getNotesStats() {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  const totalNotesStmt = db.prepare(
    "SELECT COUNT(*) as count FROM notes WHERE user_id = ?",
  );
  const totalTagsStmt = db.prepare(
    "SELECT COUNT(*) as count FROM tags WHERE user_id = ?",
  );
  const recentNotesStmt = db.prepare(`
    SELECT COUNT(*) as count
    FROM notes
    WHERE user_id = ? AND updated_at >= datetime('now', '-7 days')
  `);
  const foldersStmt = db.prepare(`
    SELECT COUNT(*) as count
    FROM note_child_counts
    WHERE user_id = ? AND child_count > 0
  `);
  const syntaxStatsStmt = db.prepare(`
    SELECT syntax, COUNT(*) as count
    FROM notes
    WHERE user_id = ?
    GROUP BY syntax
    ORDER BY count DESC
  `);

  const totalNotes = totalNotesStmt.get(user.id) as { count: number };
  const totalTags = totalTagsStmt.get(user.id) as { count: number };
  const recentNotes = recentNotesStmt.get(user.id) as { count: number };
  const folders = foldersStmt.get(user.id) as { count: number };
  const syntaxStats = syntaxStatsStmt.all(user.id) as {
    syntax: string;
    count: number;
  }[];

  return {
    total_notes: totalNotes.count,
    total_tags: totalTags.count,
    recent_notes: recentNotes.count,
    folders: folders.count,
    syntax_breakdown: syntaxStats,
  };
}
