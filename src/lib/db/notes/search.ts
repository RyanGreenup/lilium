/**
 * Note search and filtering functions for db schema
 */

"use server";

import { query, redirect } from "@solidjs/router";
import { requireUser } from "../../auth";
import { db } from "../index";
import type { Note, NoteWithParentFolderTitle } from "../types";

/**
 * Search notes using FTS5 full-text search
 */
export async function searchNotes(searchQuery: string, folderId?: string): Promise<NoteWithParentFolderTitle[]> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  let sql = `
    SELECT n.*, f.title as parent_folder_title
    FROM notes n
    INNER JOIN notes_fts fts ON n.id = fts.id
    LEFT JOIN folders f ON n.parent_id = f.id
    WHERE notes_fts MATCH ? AND fts.user_id = ?
  `;

  const params: any[] = [searchQuery.trim().replace(/['"]/g, '""'), user.id];

  if (folderId) {
    sql += ` AND n.parent_id = ?`;
    params.push(folderId);
  }

  sql += ` ORDER BY bm25(notes_fts), n.updated_at DESC`;

  const stmt = db.prepare(sql);
  return stmt.all(...params) as NoteWithParentFolderTitle[];
}

/**
 * Query function to search notes (for client-side use)
 */
export const searchNotesQuery = query(async (searchQuery: string, folderId?: string) => {
  "use server";
  return await searchNotes(searchQuery, folderId);
}, "search-notes");

/**
 * Get recently modified notes
 */
export async function getRecentNotes(limit: number = 10): Promise<NoteWithParentFolderTitle[]> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  const stmt = db.prepare(`
    SELECT
      n.id,
      n.title,
      n.abstract,
      n.content,
      n.syntax,
      n.parent_id,
      n.user_id,
      n.created_at,
      n.updated_at,
      f.title as parent_folder_title
    FROM notes n
    LEFT JOIN folders f ON n.parent_id = f.id
    WHERE n.user_id = ?
    ORDER BY n.updated_at DESC
    LIMIT ?
  `);

  return stmt.all(user.id, limit) as NoteWithParentFolderTitle[];
}

/**
 * Query function to get recent notes (for client-side use)
 */
export const getRecentNotesQuery = query(async (limit?: number) => {
  "use server";
  return await getRecentNotes(limit);
}, "recent-notes");

/**
 * Get backlinks - notes that reference the specified note ID in their content
 */
export async function getBacklinks(noteId: string): Promise<NoteWithParentFolderTitle[]> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  const stmt = db.prepare(`
    SELECT n.*, f.title as parent_folder_title
    FROM notes n
    LEFT JOIN folders f ON n.parent_id = f.id
    WHERE n.user_id = ? AND n.id != ? AND (
      n.title LIKE ? OR
      n.content LIKE ? OR
      n.abstract LIKE ?
    )
    ORDER BY n.updated_at DESC
  `);

  const searchTerm = `%${noteId}%`;
  return stmt.all(user.id, noteId, searchTerm, searchTerm, searchTerm) as NoteWithParentFolderTitle[];
}

/**
 * Query function to get backlinks (for client-side use)
 */
export const getBacklinksQuery = query(async (noteId: string) => {
  "use server";
  return await getBacklinks(noteId);
}, "backlinks");

/**
 * Get forward links - notes that the current note references in its content
 * This extracts note IDs from the current note's content and finds those notes
 */
export async function getForwardLinks(noteId: string): Promise<NoteWithParentFolderTitle[]> {
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
    .join(' ');

  const foundIds = content.match(noteIdRegex) || [];

  if (foundIds.length === 0) {
    return [];
  }

  // Remove duplicates and filter out the current note's ID
  const uniqueIds = [...new Set(foundIds)].filter(id => id !== noteId);

  if (uniqueIds.length === 0) {
    return [];
  }

  // Build query to find all referenced notes that exist
  const placeholders = uniqueIds.map(() => '?').join(',');
  const forwardLinksStmt = db.prepare(`
    SELECT n.*, f.title as parent_folder_title
    FROM notes n
    LEFT JOIN folders f ON n.parent_id = f.id
    WHERE n.user_id = ? AND n.id IN (${placeholders})
    ORDER BY n.updated_at DESC
  `);

  return forwardLinksStmt.all(user.id, ...uniqueIds) as NoteWithParentFolderTitle[];
}

/**
 * Query function to get forward links (for client-side use)
 */
export const getForwardLinksQuery = query(async (noteId: string) => {
  "use server";
  return await getForwardLinks(noteId);
}, "forward-links");
