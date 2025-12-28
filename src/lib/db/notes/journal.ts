/**
 * Functions to get the latest Journal Page
 */

"use server";

import { query } from "@solidjs/router";
import { requireUser } from "../../auth";
import { redirect } from "@solidjs/router";
import type { Note } from "../types";
import { JOURNAL_PATH_PREFIX } from "../types";
import { db } from "../index";

/**
 * Get the latest journal page
 *
 * Journal pages are stored under the JOURNAL_PATH_PREFIX path and use
 * YYYY-MM-DD format for their titles. This function returns the most
 * recent journal entry by sorting titles in descending order.
 *
 * Only returns entries with dates up to tomorrow (to handle timezone edge cases).
 */
export async function getLatestJournalPage(): Promise<Note | null> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  const stmt = db.prepare(`
    SELECT
      n.id,
      n.title,
      n.abstract,
      n.content,
      n.syntax,
      n.parent_id,
      n.user_id,
      n.created_at,
      n.updated_at
    FROM mv_note_paths mnp
    JOIN notes n ON n.id = mnp.note_id
    WHERE mnp.full_path LIKE ? || '%'
      AND n.title LIKE '____-__-__'
      AND n.title <= date('now', '+1 day')
      AND mnp.user_id = ?
    ORDER BY n.title DESC
    LIMIT 1
  `);
  const note = stmt.get(JOURNAL_PATH_PREFIX, user.id) as Note | undefined;
  return note || null;
}

/**
 * Query function to get the latest journal page (for client-side use)
 */
export const getLatestJournalPageQuery = query(async () => {
  "use server";
  return await getLatestJournalPage();
}, "latest-journal-page");
