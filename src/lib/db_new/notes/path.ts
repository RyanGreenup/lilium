/**
 * Note path retrieval functions
 */

"use server";

import { query } from "@solidjs/router";
import { requireUser } from "../../auth";
import { redirect } from "@solidjs/router";
import { db } from "../index";

/**
 * Get note path by ID from mv_note_paths materialized view
 */
export async function getNotePath(id: string): Promise<string | null> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  const stmt = db.prepare(`
    SELECT full_path
    FROM mv_note_paths
    WHERE note_id = ? AND user_id = ?
  `);
  const result = stmt.get(id, user.id) as { full_path: string } | undefined;
  return result?.full_path || null;
}

/**
 * Query function to get note path by ID (for client-side use)
 */
export const getNotePathQuery = query(async (noteId: string) => {
  "use server";
  return await getNotePath(noteId);
}, "note-path");
