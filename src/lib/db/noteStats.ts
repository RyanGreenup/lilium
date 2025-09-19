/**
 * Note statistics functions
 */

"use server";

import { redirect } from "@solidjs/router";
import { requireUser } from "../auth";
import { db } from "./index";

/**
 * Get summary statistics
 */
export async function getNotesStats() {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  const totalNotesStmt = db.prepare(
    "SELECT COUNT(*) as count FROM notes WHERE user_id = ?",
  );
  const totalTagsStmt = db.prepare(
    "SELECT COUNT(*) as count FROM tags WHERE user_id = ?",
  );
  const recentNotesStmt = db.prepare(`
    SELECT COUNT(*) as count
    FROM notes
    WHERE user_id = ? AND updated_at >= datetime('now', '-7 days')
  `);
  const foldersStmt = db.prepare(`
    SELECT COUNT(*) as count
    FROM note_child_counts
    WHERE user_id = ? AND child_count > 0
  `);
  const syntaxStatsStmt = db.prepare(`
    SELECT syntax, COUNT(*) as count
    FROM notes
    WHERE user_id = ?
    GROUP BY syntax
    ORDER BY count DESC
  `);

  const totalNotes = totalNotesStmt.get(user.id) as { count: number };
  const totalTags = totalTagsStmt.get(user.id) as { count: number };
  const recentNotes = recentNotesStmt.get(user.id) as { count: number };
  const folders = foldersStmt.get(user.id) as { count: number };
  const syntaxStats = syntaxStatsStmt.all(user.id) as {
    syntax: string;
    count: number;
  }[];

  return {
    total_notes: totalNotes.count,
    total_tags: totalTags.count,
    recent_notes: recentNotes.count,
    folders: folders.count,
    syntax_breakdown: syntaxStats,
  };
}

