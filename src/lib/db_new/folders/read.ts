/**
 * Folder reading and retrieval functions
 */

"use server";

import { query } from "@solidjs/router";
import { requireUser } from "../../auth";
import { redirect } from "@solidjs/router";
import type { Folder } from "../types";
import { db } from "../index";

/**
 * Get folder by ID
 */
export async function getFolderById(id: string): Promise<Folder | null> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  const stmt = db.prepare(`
    SELECT
      id,
      title,
      parent_id,
      user_id,
      created_at,
      updated_at
    FROM folders
    WHERE id = ? AND user_id = ?
  `);
  const folder = stmt.get(id, user.id) as Folder | undefined;
  return folder || null;
}

/**
 * Get all parent folders of a given folder (for circular reference prevention)
 * Returns array of parent folder IDs from immediate parent to root
 */
export async function getFolderParents(folderId: string): Promise<string[]> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  // Use recursive CTE to get all parent folders
  const stmt = db.prepare(`
    WITH RECURSIVE folder_parents AS (
      -- Start with the given folder
      SELECT id, parent_id, 0 as level
      FROM folders
      WHERE id = ? AND user_id = ?

      UNION ALL

      -- Recursively get parents
      SELECT f.id, f.parent_id, fp.level + 1 as level
      FROM folders f
      INNER JOIN folder_parents fp ON f.id = fp.parent_id
      WHERE f.user_id = ?
    )
    SELECT id
    FROM folder_parents
    WHERE level > 0  -- Exclude the starting folder itself
    ORDER BY level ASC  -- Immediate parent first, then grandparent, etc.
  `);

  const results = stmt.all(folderId, user.id, user.id) as { id: string }[];
  return results.map((row) => row.id);
}

/**
 * Query function to get folder by ID (for client-side use)
 */
export const getFolderByIdQuery = query(async (folderId: string) => {
  "use server";
  return await getFolderById(folderId);
}, "folder-by-id");

/**
 * Query function to get folder parents (for client-side use)
 */
export const getFolderParentsQuery = query(async (folderId: string) => {
  "use server";
  return await getFolderParents(folderId);
}, "folder-parents");
