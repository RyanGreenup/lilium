/**
 * Tag deletion functions
 */

"use server";

import { query, redirect } from "@solidjs/router";
import { requireUser } from "../../auth";
import { db } from "../index";

/**
 * Delete a tag
 */
export async function deleteTag(id: string): Promise<void> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  const stmt = db.prepare("DELETE FROM tags WHERE id = ? AND user_id = ?");
  const result = stmt.run(id, user.id);
  if (result.changes === 0) throw new Error("Tag not found");
}

/**
 * Query function to delete a tag (for client-side use)
 */
export const deleteTagQuery = query(async (tagId: string) => {
  "use server";
  return await deleteTag(tagId);
}, "delete-tag");
