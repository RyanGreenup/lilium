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
  // Note: Index notes (title = "index") are excluded because they serve as
  // folder landing pages and are accessed via the dedicated index button
  // in the breadcrumb path, not through the file list.
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
      AND LOWER(TRIM(title)) != 'index'
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

/** Cache key used by the list-children query. Import this instead of using the raw string. */
export const LIST_CHILDREN_KEY = "list-children";

/**
 * Query function to get children (for client-side use)
 */
export const getChildrenQuery = query(async (parentId: string | null) => {
  "use server";
  return await getChildren(parentId);
}, LIST_CHILDREN_KEY);

export interface TreePaletteItem {
  id: string;
  title: string;
  parent_id: string | null;
  type: "folder" | "note";
  full_path: string;
  display_path: string;
}

/**
 * Get all folders and notes at the provided level or below.
 *
 * @param parentId - Current folder ID in sandbox2. null means root.
 */
export async function getTreeItemsForPalette(
  parentId: string | null,
): Promise<TreePaletteItem[]> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  let sql: string;
  const params: (string | number)[] = [];

  if (parentId) {
    sql = `
      WITH parent_path AS (
        SELECT full_path || '/' as prefix
        FROM mv_folder_paths
        WHERE folder_id = ? AND user_id = ?
      )
      SELECT
        f.id,
        f.title,
        f.parent_id,
        'folder' as type,
        fp.full_path,
        SUBSTR(fp.full_path, LENGTH(pp.prefix) + 1) as display_path
      FROM folders f
      INNER JOIN mv_folder_paths fp ON fp.folder_id = f.id
      CROSS JOIN parent_path pp
      WHERE f.user_id = ?
        AND fp.full_path LIKE pp.prefix || '%'

      UNION ALL

      SELECT
        n.id,
        n.title,
        n.parent_id,
        'note' as type,
        np.full_path,
        SUBSTR(np.full_path, LENGTH(pp.prefix) + 1) as display_path
      FROM notes n
      INNER JOIN mv_note_paths np ON np.note_id = n.id
      CROSS JOIN parent_path pp
      WHERE n.user_id = ?
        AND np.full_path LIKE pp.prefix || '%'
        AND LOWER(TRIM(n.title)) != 'index'

      ORDER BY display_path ASC
    `;
    params.push(parentId, user.id, user.id, user.id);
  } else {
    sql = `
      SELECT
        f.id,
        f.title,
        f.parent_id,
        'folder' as type,
        fp.full_path,
        fp.full_path as display_path
      FROM folders f
      INNER JOIN mv_folder_paths fp ON fp.folder_id = f.id
      WHERE f.user_id = ?

      UNION ALL

      SELECT
        n.id,
        n.title,
        n.parent_id,
        'note' as type,
        np.full_path,
        np.full_path as display_path
      FROM notes n
      INNER JOIN mv_note_paths np ON np.note_id = n.id
      WHERE n.user_id = ?
        AND LOWER(TRIM(n.title)) != 'index'

      ORDER BY display_path ASC
    `;
    params.push(user.id, user.id);
  }

  const stmt = db.prepare(sql);
  return stmt.all(...params) as TreePaletteItem[];
}

export const getTreeItemsForPaletteQuery = query(async (parentId: string | null) => {
  "use server";
  return await getTreeItemsForPalette(parentId);
}, "tree-items-palette");

/**
 * Get folder path for breadcrumb navigation
 *
 * Returns array of folders from root to current (inclusive).
 * Uses recursive CTE to traverse the parent chain.
 *
 * @param folderId - The current folder ID, or null for root
 * @returns Array of folders from root to current folder
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

/**
 * Move a note or folder to a new parent (cut & paste / reparent)
 *
 * Updates the parent_id of the given item. Pass null for targetParentId to
 * move the item to the root level. The item must belong to the current user.
 *
 * @param itemId - The note or folder ID to move
 * @param itemType - Whether the item is a "note" or "folder"
 * @param targetParentId - The destination folder ID, or null for root
 * @returns true on success, false if the item was not found / not owned
 */
export async function moveItem(
  itemId: string,
  itemType: "note" | "folder",
  targetParentId: string | null,
): Promise<boolean> {
  "use server";
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  const table = itemType === "note" ? "notes" : "folders";

  // Guard: prevent moving a folder into itself or its own descendant.
  // Walk up the target's ancestor chain and make sure itemId is not in it.
  if (itemType === "folder" && targetParentId !== null) {
    const ancestorStmt = db.prepare(`
      WITH RECURSIVE ancestors AS (
        SELECT id, parent_id FROM folders WHERE id = ? AND user_id = ?
        UNION ALL
        SELECT f.id, f.parent_id
        FROM folders f
        INNER JOIN ancestors a ON f.id = a.parent_id
        WHERE f.user_id = ?
      )
      SELECT id FROM ancestors WHERE id = ?
    `);
    const cycle = ancestorStmt.get(targetParentId, user.id, user.id, itemId) as
      | { id: string }
      | undefined;
    if (cycle) {
      // Would create a cycle — refuse silently.
      return false;
    }
  }

  const stmt = db.prepare(
    targetParentId
      ? `UPDATE ${table} SET parent_id = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?`
      : `UPDATE ${table} SET parent_id = NULL, updated_at = datetime('now') WHERE id = ? AND user_id = ?`,
  );

  const result = targetParentId
    ? stmt.run(targetParentId, itemId, user.id)
    : stmt.run(itemId, user.id);

  return result.changes > 0;
}

/**
 * Move multiple items to a new parent in a single transaction.
 *
 * @param items - Array of { id, type } to move
 * @param targetParentId - Destination folder ID, or null for root
 * @returns Object with arrays of moved and failed item IDs
 */
export async function moveItems(
  items: { id: string; type: "note" | "folder" }[],
  targetParentId: string | null,
): Promise<{ moved: string[]; failed: string[] }> {
  "use server";
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  const moved: string[] = [];
  const failed: string[] = [];

  const ancestorStmt = db.prepare(`
    WITH RECURSIVE ancestors AS (
      SELECT id, parent_id FROM folders WHERE id = ? AND user_id = ?
      UNION ALL
      SELECT f.id, f.parent_id
      FROM folders f
      INNER JOIN ancestors a ON f.id = a.parent_id
      WHERE f.user_id = ?
    )
    SELECT id FROM ancestors WHERE id = ?
  `);

  const updateNoteStmt = targetParentId
    ? db.prepare(`UPDATE notes SET parent_id = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?`)
    : db.prepare(`UPDATE notes SET parent_id = NULL, updated_at = datetime('now') WHERE id = ? AND user_id = ?`);

  const updateFolderStmt = targetParentId
    ? db.prepare(`UPDATE folders SET parent_id = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?`)
    : db.prepare(`UPDATE folders SET parent_id = NULL, updated_at = datetime('now') WHERE id = ? AND user_id = ?`);

  const runTransaction = db.transaction(() => {
    for (const item of items) {
      // Cycle detection for folders
      if (item.type === "folder" && targetParentId !== null) {
        const cycle = ancestorStmt.get(targetParentId, user.id, user.id, item.id) as
          | { id: string }
          | undefined;
        if (cycle) {
          failed.push(item.id);
          continue;
        }
      }

      const stmt = item.type === "note" ? updateNoteStmt : updateFolderStmt;
      const result = targetParentId
        ? stmt.run(targetParentId, item.id, user.id)
        : stmt.run(item.id, user.id);

      if (result.changes > 0) {
        moved.push(item.id);
      } else {
        failed.push(item.id);
      }
    }
  });

  runTransaction();
  return { moved, failed };
}
