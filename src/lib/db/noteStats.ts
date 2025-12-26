/**
 * Note statistics functions for db schema
 */

"use server";

import { query } from "@solidjs/router";
import { redirect } from "@solidjs/router";
import { requireUser } from "../auth";
import { db } from "./index";

export interface NotesStats {
  total_notes: number;
  total_folders: number;
  recent_notes: number;
  syntax_breakdown: { syntax: string; count: number }[];
}

/**
 * Get summary statistics
 */
export async function getNotesStats(): Promise<NotesStats> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  const totalNotesStmt = db.prepare(
    "SELECT COUNT(*) as count FROM notes WHERE user_id = ?"
  );
  const totalFoldersStmt = db.prepare(
    "SELECT COUNT(*) as count FROM folders WHERE user_id = ?"
  );
  const recentNotesStmt = db.prepare(`
    SELECT COUNT(*) as count
    FROM notes
    WHERE user_id = ? AND updated_at >= datetime('now', '-7 days')
  `);
  const syntaxStatsStmt = db.prepare(`
    SELECT syntax, COUNT(*) as count
    FROM notes
    WHERE user_id = ?
    GROUP BY syntax
    ORDER BY count DESC
  `);

  const totalNotes = totalNotesStmt.get(user.id) as { count: number };
  const totalFolders = totalFoldersStmt.get(user.id) as { count: number };
  const recentNotes = recentNotesStmt.get(user.id) as { count: number };
  const syntaxStats = syntaxStatsStmt.all(user.id) as {
    syntax: string;
    count: number;
  }[];

  return {
    total_notes: totalNotes.count,
    total_folders: totalFolders.count,
    recent_notes: recentNotes.count,
    syntax_breakdown: syntaxStats,
  };
}

/**
 * Query function to get note statistics (for client-side use)
 */
export const getNotesStatsQuery = query(async () => {
  "use server";
  return await getNotesStats();
}, "notes-stats");
