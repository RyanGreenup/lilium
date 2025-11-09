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
 * Compute the display text for a link based on the relationship between notes
 *
 * Rules:
 * - Sibling notes (same parent): Just the title
 * - Descendant notes (current is ancestor): Relative path from current
 * - Other cases (upward, unrelated): Full absolute path
 */
function computeLinkDisplayText(
  currentPath: string | undefined,
  targetPath: string,
  targetTitle: string
): string {
  const fullPath = targetPath ? `${targetPath}/${targetTitle}` : targetTitle;

  // No current path means current note is at root
  if (!currentPath || currentPath === "") {
    // If target is also at root (no path), just use title
    if (!targetPath || targetPath === "") {
      return targetTitle;
    }
    // Target is descendant of root, use relative path
    return fullPath;
  }

  // Same parent (siblings) → just title
  if (currentPath === targetPath) {
    return targetTitle;
  }

  // Target is descendant → relative path
  if (targetPath && targetPath.startsWith(currentPath + '/')) {
    const relativePath = targetPath.substring(currentPath.length + 1);
    return `${relativePath}/${targetTitle}`;
  }

  // Otherwise (upward or unrelated) → full absolute path
  return fullPath;
}

/**
 * Search notes by title and path for link insertion
 * Returns LinkItem format with computed display text based on relationship
 */
export async function searchNotesForLinks(
  searchQuery: string,
  currentNoteId?: string,
  currentNotePath?: string
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

  // Convert to LinkItem format with computed display text
  return results.map((note) => {
    // Compute display text based on relationship to current note
    const displayText = computeLinkDisplayText(
      currentNotePath,
      note.path,
      note.title
    );

    // Build full path for subtitle
    const fullPath = note.path
      ? `${note.path}/${note.title}`
      : note.title;

    return {
      id: note.id,
      title: displayText,  // Use computed relative/absolute path
      value: note.id,
      subtitle: fullPath,  // Always show full path in subtitle
    };
  });
}

/**
 * Query function for client-side use with createAsync
 */
export const searchNotesForLinksQuery = query(
  async (searchQuery: string, currentNoteId?: string, currentNotePath?: string) => {
    "use server";
    return await searchNotesForLinks(searchQuery, currentNoteId, currentNotePath);
  },
  "search-notes-for-links"
);
