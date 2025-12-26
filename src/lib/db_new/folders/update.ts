/**
 * Folder update functions
 */

"use server";

import { query, redirect } from "@solidjs/router";
import { requireUser } from "../../auth";
import type { Folder } from "../types";
import { db } from "../index";
import { getFolderById } from "./read";

/**
 * Generic update function for folders
 * Accepts partial updates for any combination of updatable fields
 */
export async function updateFolder(
  id: string,
  updates: Partial<Pick<Folder, "title" | "parent_id">>,
): Promise<Folder> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  // Ensure we have at least one field to update
  const fields = Object.keys(updates);
  if (fields.length === 0) {
    throw new Error("No fields to update");
  }

  // Build dynamic UPDATE query
  const setClause = fields.map((f) => `${f} = ?`).join(", ");
  const values = fields.map((f) => updates[f as keyof typeof updates]);

  const stmt = db.prepare(`
    UPDATE folders
    SET ${setClause}, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND user_id = ?
  `);

  const result = stmt.run(...values, id, user.id);

  if (result.changes === 0) {
    throw new Error("Folder not found or no changes made");
  }

  // Return the updated folder
  const updatedFolder = await getFolderById(id);
  if (!updatedFolder) {
    throw new Error("Failed to retrieve updated folder");
  }

  return updatedFolder;
}

/**
 * Query function to update a folder (for client-side use)
 */
export const updateFolderQuery = query(
  async (
    folderId: string,
    updates: Partial<Pick<Folder, "title" | "parent_id">>,
  ) => {
    "use server";
    return await updateFolder(folderId, updates);
  },
  "update-folder",
);
