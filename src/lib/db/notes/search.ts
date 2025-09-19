/**
 * Note search and filtering functions
 */

"use server";

import { query, redirect } from "@solidjs/router";
import { requireUser } from "../../auth";
import { db } from "../index";
import type { Note } from "../types";

/**
 * Search notes using FTS5 full-text search
 */
export async function searchNotes(searchQuery: string, parentId?: string): Promise<Note[]> {
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
 * Search notes using simple LIKE queries (fallback for simple searches)
 */
export async function searchNotesSimple(searchQuery: string): Promise<Note[]> {
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

  const searchTerm = `%${searchQuery}%`;
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

/**
 * Advanced search with filters
 */
export async function searchNotesAdvanced(options: {
  query?: string;
  syntax?: string;
  hasAbstract?: boolean;
  dateRange?: { start: string; end: string };
  limit?: number;
}): Promise<Note[]> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  let whereConditions = ["user_id = ?"];
  let params: any[] = [user.id];

  // Add FTS5 search if query provided
  if (options.query) {
    whereConditions.push("id IN (SELECT id FROM notes_fts WHERE notes_fts MATCH ? AND user_id = ?)");
    params.push(options.query.trim().replace(/['"]/g, '""'), user.id);
  }

  // Add syntax filter
  if (options.syntax) {
    whereConditions.push("syntax = ?");
    params.push(options.syntax);
  }

  // Add abstract filter
  if (options.hasAbstract !== undefined) {
    if (options.hasAbstract) {
      whereConditions.push("abstract IS NOT NULL AND abstract != ''");
    } else {
      whereConditions.push("(abstract IS NULL OR abstract = '')");
    }
  }

  // Add date range filter
  if (options.dateRange) {
    whereConditions.push("updated_at BETWEEN ? AND ?");
    params.push(options.dateRange.start, options.dateRange.end);
  }

  const stmt = db.prepare(`
    SELECT * FROM notes
    WHERE ${whereConditions.join(" AND ")}
    ORDER BY updated_at DESC
    ${options.limit ? "LIMIT ?" : ""}
  `);

  if (options.limit) {
    params.push(options.limit);
  }

  return stmt.all(...params) as Note[];
}

/**
 * Query function to search notes (for client-side use)
 */
export const searchNotesQuery = query(async (searchQuery: string, parentId?: string) => {
  "use server";
  return await searchNotes(searchQuery, parentId);
}, "search-notes");

/**
 * Query function to search notes with simple LIKE (for client-side use)
 */
export const searchNotesSimpleQuery = query(async (searchQuery: string) => {
  "use server";
  return await searchNotesSimple(searchQuery);
}, "search-notes-simple");

/**
 * Query function to get notes by syntax (for client-side use)
 */
export const getNotesBySyntaxQuery = query(async (syntax: string) => {
  "use server";
  return await getNotesBySyntax(syntax);
}, "notes-by-syntax");

/**
 * Query function to get recent notes (for client-side use)
 */
export const getRecentNotesQuery = query(async (limit?: number) => {
  "use server";
  return await getRecentNotes(limit);
}, "recent-notes");

/**
 * Query function for advanced search (for client-side use)
 */
export const searchNotesAdvancedQuery = query(async (options: {
  query?: string;
  syntax?: string;
  hasAbstract?: boolean;
  dateRange?: { start: string; end: string };
  limit?: number;
}) => {
  "use server";
  return await searchNotesAdvanced(options);
}, "search-notes-advanced");