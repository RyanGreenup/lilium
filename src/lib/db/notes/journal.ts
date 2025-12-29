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
 * Matches both formats:
 * - Direct notes: Personal/Journal/2024-01-15 (title is the date)
 * - Folder index: Personal/Journal/2024-01-15/index (date is in the path)
 *
 * Only returns entries with dates up to tomorrow (to handle timezone edge cases).
 */
export async function getLatestJournalPage(): Promise<Note | null> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  // Match both direct date-titled notes and index notes inside date-named folders
  // Extract the date portion from the path for sorting (works for both formats)
  const stmt = db.prepare(`
    WITH journal_notes AS (
      SELECT
        n.id,
        n.title,
        n.abstract,
        n.content,
        n.syntax,
        n.parent_id,
        n.user_id,
        n.created_at,
        n.updated_at,
        CASE
          -- For index notes, extract date from parent folder in path
          WHEN n.title = 'index' THEN
            SUBSTR(mnp.full_path, LENGTH(?) + 2, 10)
          -- For direct date-titled notes, use the title
          ELSE n.title
        END as journal_date
      FROM mv_note_paths mnp
      JOIN notes n ON n.id = mnp.note_id
      WHERE mnp.full_path LIKE ? || '/%'
        AND mnp.user_id = ?
        AND (
          -- Direct date-titled note: Personal/Journal/2024-01-15
          (n.title LIKE '____-__-__' AND n.title <= date('now', '+1 day'))
          OR
          -- Index note in date folder: Personal/Journal/2024-01-15/index
          (n.title = 'index' AND mnp.full_path GLOB ? || '/[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]/index')
        )
    )
    SELECT id, title, abstract, content, syntax, parent_id, user_id, created_at, updated_at
    FROM journal_notes
    WHERE journal_date <= date('now', '+1 day')
    ORDER BY journal_date DESC
    LIMIT 1
  `);
  const note = stmt.get(
    JOURNAL_PATH_PREFIX,
    JOURNAL_PATH_PREFIX,
    user.id,
    JOURNAL_PATH_PREFIX,
  ) as Note | undefined;
  return note || null;
}

/**
 * Query function to get the latest journal page (for client-side use)
 */
export const getLatestJournalPageQuery = query(async () => {
  "use server";
  return await getLatestJournalPage();
}, "latest-journal-page");
