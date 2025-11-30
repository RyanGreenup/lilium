/**
 * Note search and filtering functions for db_new schema
 */

"use server";

import { query, redirect } from "@solidjs/router";
import { requireUser } from "../../auth";
import { db } from "../index";
import type { Note } from "../types";

/**
 * Get recently modified notes
 */
export async function getRecentNotes(limit: number = 10): Promise<Note[]> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  const stmt = db.prepare(`
    SELECT
      id,
      title,
      abstract,
      content,
      syntax,
      parent_id,
      user_id,
      created_at,
      updated_at
    FROM notes
    WHERE user_id = ?
    ORDER BY updated_at DESC
    LIMIT ?
  `);

  return stmt.all(user.id, limit) as Note[];
}

/**
 * Query function to get recent notes (for client-side use)
 */
export const getRecentNotesQuery = query(async (limit?: number) => {
  "use server";
  return await getRecentNotes(limit);
}, "recent-notes");
