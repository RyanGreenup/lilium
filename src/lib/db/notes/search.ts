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
// Palette Search (using mv_note_paths) ////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

export type NoteWithPath = Note & {
  full_path: string;
  display_path: string;
};

/**
 * Search notes for command palette using mv_note_paths materialized view.
 * Supports filtering by parent_id (descendants only) and searching by
 * full path or title only.
 *
 * @param searchQuery - The search query (fuzzy matched client-side, this just filters)
 * @param options.parentId - Optional parent folder ID to scope search to descendants
 * @param options.searchFullPath - If true, returns full_path for searching; if false, title only
 * @param options.limit - Maximum number of results (default 25)
 */
export async function searchNotesForPalette(
  searchQuery: string,
  options: {
    parentId?: string | null;
    searchFullPath?: boolean;
    limit?: number;
  } = {},
): Promise<NoteWithPath[]> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  const { parentId = null, searchFullPath = true, limit = 25 } = options;

  // When we have a parentId, we need to find all descendants and compute relative paths
  // We do this by getting the parent's path prefix and using LIKE to find descendants
  let sql: string;
  const params: (string | number)[] = [];

  if (parentId) {
    // Get descendants of the parent folder by matching path prefix
    // The parentId is a FOLDER id, so we look up its path from mv_folder_paths
    // Then find all notes whose paths start with that folder's path
    sql = `
      WITH parent_path AS (
        SELECT full_path || '/' as prefix
        FROM mv_folder_paths
        WHERE folder_id = ? AND user_id = ?
      )
      SELECT
        n.id, n.title, n.abstract, n.content, n.syntax,
        n.parent_id, n.user_id, n.created_at, n.updated_at,
        p.full_path,
        SUBSTR(p.full_path, LENGTH(pp.prefix) + 1) as display_path
      FROM notes n
      INNER JOIN mv_note_paths p ON n.id = p.note_id
      CROSS JOIN parent_path pp
      WHERE p.user_id = ?
        AND p.full_path LIKE pp.prefix || '%'
      ORDER BY n.updated_at DESC
      LIMIT ?
    `;
    params.push(parentId, user.id, user.id, limit);
  } else {
    // Root level - get all notes, full_path equals display_path
    sql = `
      SELECT
        n.id, n.title, n.abstract, n.content, n.syntax,
        n.parent_id, n.user_id, n.created_at, n.updated_at,
        p.full_path,
        p.full_path as display_path
      FROM notes n
      INNER JOIN mv_note_paths p ON n.id = p.note_id
      WHERE p.user_id = ?
      ORDER BY n.updated_at DESC
      LIMIT ?
    `;
    params.push(user.id, limit);
  }

  const stmt = db.prepare(sql);
  return stmt.all(...params) as NoteWithPath[];
}

/**
 * Query function for palette search (for client-side use)
 */
export const searchNotesForPaletteQuery = query(
  async (
    searchQuery: string,
    options?: {
      parentId?: string | null;
      searchFullPath?: boolean;
      limit?: number;
    },
  ) => {
    "use server";
    return await searchNotesForPalette(searchQuery, options);
  },
  "search-notes-palette",
);

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
