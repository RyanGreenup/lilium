/**
 * Note search optimized for link insertion palette
 * Searches title and hierarchical paths using FTS5
 */

"use server";

import { query, redirect } from "@solidjs/router";
import { requireUser } from "../../auth";
import { db } from "../index";
import type { LinkItem } from "~/components/LinkInsertionPalette";

interface NoteSearchResult {
  id: string;
  title: string;
  path: string;
  abstract?: string;
}

/**
 * Search notes by title and path for link insertion
 * Returns LinkItem with title and full path subtitle
 */
export async function searchNotesForLinks(
  searchQuery: string
): Promise<LinkItem[]> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  // Early return for empty queries
  if (!searchQuery || searchQuery.trim().length === 0) {
    return [];
  }

  // Sanitize search query for FTS5
  const sanitized = searchQuery.trim().replace(/['"]/g, '""');

  // Search FTS5 table which includes title, abstract, content, and path
  const stmt = db.prepare(`
    SELECT
      n.id,
      n.title,
      fts.path,
      n.abstract
    FROM notes n
    INNER JOIN notes_fts fts ON n.id = fts.id
    WHERE notes_fts MATCH ? AND fts.user_id = ?
    ORDER BY bm25(notes_fts), n.updated_at DESC
    LIMIT 50
  `);

  const results = stmt.all(sanitized, user.id) as NoteSearchResult[];

  // Convert to LinkItem format
  return results.map((note) => {
    const fullPath = note.path
      ? `${note.path}/${note.title}`
      : note.title;

    return {
      id: note.id,
      title: note.title,   // Always just the note title
      value: note.id,
      subtitle: fullPath,  // Full path for context
    };
  });
}

/**
 * Query function for client-side use with createAsync
 */
export const searchNotesForLinksQuery = query(
  async (searchQuery: string) => {
    "use server";
    return await searchNotesForLinks(searchQuery);
  },
  "search-notes-for-links"
);
