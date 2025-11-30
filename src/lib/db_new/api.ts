/**
 * API Layer for NotesListTabNew Component
 *
 * Provides server-side functions for the sidebar navigation component.
 * All functions use "use server" directive to ensure database code
 * stays server-side and better-sqlite3 is not bundled to the client.
 */

"use server";

import { query, redirect } from "@solidjs/router";
import { requireUser } from "../auth";
import type { ListItem, Folder, NoteWithoutContent } from "./types";
import { db } from "./index";

/**
 * Get children of a folder (folders first, then notes by title)
 *
 * @param parentId - The parent folder ID, or null for root-level items
 * @returns Array of items with type discriminator (folders first, then notes)
 */
export async function getChildren(parentId: string | null): Promise<ListItem[]> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  // Get child folders
  const foldersStmt = db.prepare(`
    SELECT
      id,
      title,
      parent_id,
      user_id,
      created_at,
      updated_at
    FROM folders
    WHERE ${parentId ? "parent_id = ?" : "parent_id IS NULL"}
      AND user_id = ?
    ORDER BY title ASC
  `);
  const folders = (parentId
    ? foldersStmt.all(parentId, user.id)
    : foldersStmt.all(user.id)
  ) as Folder[];

  // Get child notes (without content)
  const notesStmt = db.prepare(`
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
    WHERE ${parentId ? "parent_id = ?" : "parent_id IS NULL"}
      AND user_id = ?
    ORDER BY title ASC
  `);
  const notes = (parentId
    ? notesStmt.all(parentId, user.id)
    : notesStmt.all(user.id)
  ) as NoteWithoutContent[];

  // Combine with type discriminator: folders first, then notes
  const folderItems: ListItem[] = folders.map(f => ({ ...f, type: "folder" as const }));
  const noteItems: ListItem[] = notes.map(n => ({ ...n, type: "note" as const }));

  return [...folderItems, ...noteItems];
}

/**
 * Query function to get children (for client-side use)
 */
export const getChildrenQuery = query(async (parentId: string | null) => {
  "use server";
  return await getChildren(parentId);
}, "list-children");

/**
 * Get folder path for breadcrumb navigation
 *
 * Returns array of folders from root to current (excludes current folder).
 * Uses recursive CTE to traverse the parent chain.
 *
 * @param folderId - The current folder ID, or null for root
 * @returns Array of parent folders from root to immediate parent
 */
export async function getFolderPath(folderId: string | null): Promise<Folder[]> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  if (!folderId) return [];

  // Use recursive CTE to get parent chain
  const stmt = db.prepare(`
    WITH RECURSIVE parent_chain AS (
      SELECT
        id,
        title,
        parent_id,
        user_id,
        created_at,
        updated_at,
        0 as level
      FROM folders
      WHERE id = ? AND user_id = ?

      UNION ALL

      SELECT
        f.id,
        f.title,
        f.parent_id,
        f.user_id,
        f.created_at,
        f.updated_at,
        pc.level + 1
      FROM folders f
      INNER JOIN parent_chain pc ON f.id = pc.parent_id
      WHERE f.user_id = ?
    )
    SELECT
      id,
      title,
      parent_id,
      user_id,
      created_at,
      updated_at
    FROM parent_chain
    WHERE level > 0
    ORDER BY level DESC
  `);

  return stmt.all(folderId, user.id, user.id) as Folder[];
}

/**
 * Query function to get folder path (for client-side use)
 */
export const getFolderPathQuery = query(async (folderId: string | null) => {
  "use server";
  return await getFolderPath(folderId);
}, "folder-path");

/**
 * Get index note ID for a folder
 *
 * Finds note with title "index" (case-insensitive) within the specified folder.
 * Index notes serve as the default landing page for a folder.
 *
 * @param parentId - The folder ID to search in, or null for root
 * @returns The ID of the index note if found, or null
 */
export async function getIndexNoteId(parentId: string | null): Promise<string | null> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  const stmt = db.prepare(`
    SELECT id
    FROM notes
    WHERE ${parentId ? "parent_id = ?" : "parent_id IS NULL"}
      AND user_id = ?
      AND LOWER(TRIM(title)) = 'index'
    LIMIT 1
  `);

  const result = (parentId
    ? stmt.get(parentId, user.id)
    : stmt.get(user.id)
  ) as { id: string } | undefined;

  return result?.id ?? null;
}

/**
 * Query function to get index note ID (for client-side use)
 */
export const getIndexNoteIdQuery = query(async (parentId: string | null) => {
  "use server";
  return await getIndexNoteId(parentId);
}, "index-note-id");

/**
 * Get the folder path for a note (to enable auto-expand in sidebar)
 *
 * Returns the note's parent folder ID and the full folder path to navigate to it.
 * Used when URL changes to a note - the sidebar needs to expand to show that note.
 *
 * @param noteId - The note ID to find the folder path for
 * @returns Object with parentId and folderPath, or null if note not found
 */
export async function getNoteFolderPath(noteId: string): Promise<{
  parentId: string | null;
  folderPath: Folder[];
} | null> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  // 1. Get the note to find its parent_id
  const noteStmt = db.prepare(`
    SELECT parent_id
    FROM notes
    WHERE id = ? AND user_id = ?
  `);
  const note = noteStmt.get(noteId, user.id) as { parent_id: string | null } | undefined;

  if (!note) {
    return null;
  }

  // 2. If note has a parent folder, get the full path
  const parentId = note.parent_id;
  const folderPath = parentId ? await getFolderPath(parentId) : [];

  return { parentId, folderPath };
}

/**
 * Query function to get note's folder path (for client-side use)
 */
export const getNoteFolderPathQuery = query(async (noteId: string) => {
  "use server";
  return await getNoteFolderPath(noteId);
}, "note-folder-path");
