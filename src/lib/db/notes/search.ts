/**
 * Note search and filtering functions for db schema
 */

"use server";

import { query, redirect } from "@solidjs/router";
import { requireUser } from "../../auth";
import { db } from "../index";
import type { Note } from "../types";

////////////////////////////////////////////////////////////////////////////////
// Recent //////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

/**
 * Get recently modified notes
 */
export async function getRecentNotes(limit: number = 10): Promise<Note[]> {
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
    WHERE user_id = ?
    ORDER BY updated_at DESC
    LIMIT ?
  `);

  return stmt.all(user.id, limit) as Note[];
}

/**
 * Query function to get recent notes (for client-side use)
 */
export const getRecentNotesQuery = query(async (limit?: number) => {
  "use server";
  return await getRecentNotes(limit);
}, "recent-notes");

////////////////////////////////////////////////////////////////////////////////
// Backlinks ///////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

/**
 * Get backlinks - notes that reference the specified note ID in their content
 */
export async function getBacklinks(noteId: string): Promise<Note[]> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  const stmt = db.prepare(`
    SELECT * FROM notes
    WHERE user_id = ? AND id != ? AND (
      title LIKE ? OR
      content LIKE ? OR
      abstract LIKE ?
    )
    ORDER BY updated_at DESC
  `);

  const searchTerm = `%${noteId}%`;
  return stmt.all(
    user.id,
    noteId,
    searchTerm,
    searchTerm,
    searchTerm,
  ) as Note[];
}

////////////////////////////////////////////////////////////////////////////////
// Forward Links ///////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

/**
 * Get forward links - notes that the current note references in its content
 * This extracts note IDs from the current note's content and finds those notes
 */
export async function getForwardLinks(noteId: string): Promise<Note[]> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  // First, get the current note's content
  const currentNoteStmt = db.prepare(`
    SELECT title, content, abstract FROM notes
    WHERE id = ? AND user_id = ?
  `);
  const currentNote = currentNoteStmt.get(noteId, user.id) as Note | undefined;

  if (!currentNote) {
    return [];
  }

  // Extract potential note IDs from content using regex
  // Look for 32-character hex strings (our note ID format)
  const noteIdRegex = /\b[a-fA-F0-9]{32}\b/g;
  const content = [currentNote.title, currentNote.content, currentNote.abstract]
    .filter(Boolean)
    .join(" ");

  const foundIds = content.match(noteIdRegex) || [];

  if (foundIds.length === 0) {
    return [];
  }

  // Remove duplicates and filter out the current note's ID
  const uniqueIds = [...new Set(foundIds)].filter((id) => id !== noteId);

  if (uniqueIds.length === 0) {
    return [];
  }

  // Build query to find all referenced notes that exist
  const placeholders = uniqueIds.map(() => "?").join(",");
  const forwardLinksStmt = db.prepare(`
    SELECT * FROM notes
    WHERE user_id = ? AND id IN (${placeholders})
    ORDER BY updated_at DESC
  `);

  return forwardLinksStmt.all(user.id, ...uniqueIds) as Note[];
}

////////////////////////////////////////////////////////////////////////////////
// Search //////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

/**
 * Search notes using FTS5 full-text search
 */
export async function searchNotes(
  searchQuery: string,
  parentId?: string,
): Promise<Note[]> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  let sql = `
    SELECT n.* FROM notes n
    INNER JOIN notes_fts fts ON n.id = fts.id
    WHERE notes_fts MATCH ? AND fts.user_id = ?
  `;

  const params: any[] = [searchQuery.trim().replace(/['"]/g, '""'), user.id];

  if (parentId) {
    sql += ` AND n.parent_id = ?`;
    params.push(parentId);
  }

  sql += ` ORDER BY bm25(notes_fts), n.updated_at DESC`;

  const stmt = db.prepare(sql);
  return stmt.all(...params) as Note[];
}

/**
 * Query function to search notes (for client-side use)
 */
export const searchNotesQuery = query(
  async (searchQuery: string, parentId?: string) => {
    "use server";
    return await searchNotes(searchQuery, parentId);
  },
  "search-notes",
);

/**
 * Query function to search notes with display titles resolved
 * Index notes will display their parent folder's title instead of "index"
 */
export const searchNotesWithDisplayTitlesQuery = query(
  async (searchQuery: string, parentId?: string) => {
    "use server";
    const { transformNotesForDisplay } = await import("./display");
    const notes = await searchNotes(searchQuery, parentId);
    return await transformNotesForDisplay(notes);
  },
  "search-notes-display",
);
