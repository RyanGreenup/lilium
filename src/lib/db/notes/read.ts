/**
 * Note reading and retrieval functions
 */

"use server";

import { query } from "@solidjs/router";
import { requireUser } from "../../auth";
import { redirect } from "@solidjs/router";
import type { Note } from "../types";
import { db } from "../index";

/**
 * Get children with their folder status (enhanced version)
 */
export async function getChildNotesWithFolderStatus(
  parent_id?: string,
): Promise<(Note & { is_folder: boolean })[]> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  const stmt = db.prepare(`
    SELECT
      n.*,
      CASE WHEN ncc.child_count > 0 THEN 1 ELSE 0 END as is_folder
    FROM notes n
    LEFT JOIN note_child_counts ncc ON n.id = ncc.id
    WHERE ${parent_id ? "n.parent_id = ?" : "n.parent_id IS NULL"}
      AND n.user_id = ?
    ORDER BY is_folder DESC, n.title ASC
  `);

  const params = parent_id ? [parent_id, user.id] : [user.id];
  return stmt.all(...params) as (Note & { is_folder: boolean })[];
}

/**
 * Query function to get children with folder status (for client-side use)
 */
export const getChildrenWithFolderStatusQuery = query(async (parentId?: string) => {
  "use server";
  return await getChildNotesWithFolderStatus(parentId);
}, "children-with-folder-status");