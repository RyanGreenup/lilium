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

export interface DashboardStats extends NotesStats {
  notes_created_by_month: { month: string; count: number }[];
  notes_updated_by_day: { day: string; count: number }[];
  top_folders: { name: string; value: number }[];
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

/**
 * Get dashboard statistics including chart data
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  const baseStats = await getNotesStats();

  const createdByMonthStmt = db.prepare(`
    SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as count
    FROM notes
    WHERE user_id = ? AND created_at >= datetime('now', '-6 months')
    GROUP BY month
    ORDER BY month
  `);

  const updatedByDayStmt = db.prepare(`
    SELECT date(updated_at) as day, COUNT(*) as count
    FROM notes
    WHERE user_id = ? AND updated_at >= datetime('now', '-14 days')
    GROUP BY day
    ORDER BY day
  `);

  const topFoldersStmt = db.prepare(`
    SELECT f.title as name, COUNT(n.id) as value
    FROM folders f
    LEFT JOIN notes n ON n.parent_id = f.id AND n.user_id = ?
    WHERE f.user_id = ?
    GROUP BY f.id
    ORDER BY value DESC
    LIMIT 5
  `);

  const notesCreatedByMonth = createdByMonthStmt.all(user.id) as {
    month: string;
    count: number;
  }[];
  const notesUpdatedByDay = updatedByDayStmt.all(user.id) as {
    day: string;
    count: number;
  }[];
  const topFolders = topFoldersStmt.all(user.id, user.id) as {
    name: string;
    value: number;
  }[];

  return {
    ...baseStats,
    notes_created_by_month: notesCreatedByMonth,
    notes_updated_by_day: notesUpdatedByDay,
    top_folders: topFolders,
  };
}

/**
 * Query function to get dashboard statistics (for client-side use)
 */
export const getDashboardStatsQuery = query(async () => {
  "use server";
  return await getDashboardStats();
}, "dashboard-stats");
