/**
 * Folder deletion functions
 */

"use server";

import { query } from "@solidjs/router";
import { requireUser } from "../../auth";
import { redirect } from "@solidjs/router";
import { db } from "../index";

/**
 * Delete a folder and all its contents
 * CASCADE automatically handles:
 * - All child folders (recursive)
 * - All notes in this folder
 * - All notes in child folders
 *
 * Note: CASCADE only works because PRAGMA foreign_keys is enabled in db/index.ts
 */
export async function deleteFolder(id: string): Promise<void> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  const stmt = db.prepare("DELETE FROM folders WHERE id = ? AND user_id = ?");
  const result = stmt.run(id, user.id);
  if (result.changes === 0) {
    throw new Error("Folder not found");
  }
}

/**
 * Check if folder has children (folders or notes)
 */
async function hasChildren(folderId: string, userId: string): Promise<boolean> {
  const folderCount = db
    .prepare(
      "SELECT COUNT(*) as count FROM folders WHERE parent_id = ? AND user_id = ?",
    )
    .get(folderId, userId) as { count: number };

  const noteCount = db
    .prepare(
      "SELECT COUNT(*) as count FROM notes WHERE parent_id = ? AND user_id = ?",
    )
    .get(folderId, userId) as { count: number };

  return folderCount.count > 0 || noteCount.count > 0;
}

/**
 * Delete folder only if empty (safe delete)
 * Throws error if folder contains any child folders or notes
 */
export async function deleteFolderIfEmpty(id: string): Promise<void> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  if (await hasChildren(id, user.id)) {
    throw new Error("Cannot delete folder: folder is not empty");
  }

  return await deleteFolder(id);
}

/**
 * Query function to delete a folder (for client-side use)
 */
export const deleteFolderQuery = query(async (folderId: string) => {
  "use server";
  return await deleteFolder(folderId);
}, "delete-folder");

/**
 * Query function to delete folder if empty (for client-side use)
 */
export const deleteFolderIfEmptyQuery = query(async (folderId: string) => {
  "use server";
  return await deleteFolderIfEmpty(folderId);
}, "delete-folder-if-empty");
