/**
 * General application database module using SQLite
 *
 * This module provides non-security related data storage functions.
 * Uses random IDs for security and follows best practices.
 */

"use server";

import Database from "better-sqlite3";
import { randomBytes } from "crypto";
import { requireUser } from "./auth";
import { redirect } from "@solidjs/router";

// Initialize SQLite database for general app data
const db = new Database("./.data/app.sqlite");

// Create chores table
db.exec(`
  CREATE TABLE IF NOT EXISTS chores (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    duration_hours INTEGER NOT NULL DEFAULT 24,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Create chore completions table
db.exec(`
  CREATE TABLE IF NOT EXISTS chore_completions (
    id TEXT PRIMARY KEY,
    chore_id TEXT NOT NULL,
    completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    FOREIGN KEY (chore_id) REFERENCES chores(id) ON DELETE CASCADE
  )
`);

export interface Chore {
  id: string;
  name: string;
  duration_hours: number;
  created_at: string;
  updated_at: string;
}

export interface ChoreCompletion {
  id: string;
  chore_id: string;
  completed_at: string;
  notes?: string;
}

export interface ChoreWithStatus extends Chore {
  last_completed?: string;
  is_overdue: boolean;
  last_completion_notes?: string;
}

const user = await requireUser();
// Only allow logged in user to fetch data
if (!user.id) {
  throw redirect("/login");
}

////////////////////////////////////////////////////////////////////////////////
// Chore Management ////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

/**
 * Create a new chore
 */
export async function createChore(
  name: string,
  duration_hours: number = 24,
): Promise<Chore> {
  const id = randomBytes(16).toString("hex");
  const stmt = db.prepare(
    "INSERT INTO chores (id, name, duration_hours) VALUES (?, ?, ?)",
  );
  stmt.run(id, name, duration_hours);

  return getChoreById(id);
}

/**
 * Get chore by ID
 */
export async function getChoreById(id: string): Promise<Chore> {
  const stmt = db.prepare("SELECT * FROM chores WHERE id = ?");
  const chore = stmt.get(id) as Chore;
  if (!chore) throw new Error("Chore not found");
  return chore;
}

/**
 * Get all chores with their completion status
 */
export async function getChoresWithStatus(): Promise<ChoreWithStatus[]> {
  const stmt = db.prepare(`
    SELECT
      c.*,
      cc.completed_at as last_completed,
      cc.notes as last_completion_notes
    FROM chores c
    LEFT JOIN chore_completions cc ON c.id = cc.chore_id
    LEFT JOIN chore_completions cc2 ON c.id = cc2.chore_id AND cc.completed_at < cc2.completed_at
    WHERE cc2.id IS NULL
    ORDER BY c.name
  `);

  const chores = stmt.all() as (Chore & {
    last_completed?: string;
    last_completion_notes?: string;
  })[];

  return chores.map((chore) => ({
    ...chore,
    is_overdue: isChoreOverdue(chore.last_completed, chore.duration_hours),
  }));
}

/**
 * Get only overdue chores with their completion status
 */
export async function getOverdueChores(): Promise<ChoreWithStatus[]> {
  const allChores = await getChoresWithStatus();
  return allChores.filter((chore) => chore.is_overdue);
}

/**
 * Update chore duration
 */
export async function updateChoreDuration(
  id: string,
  duration_hours: number,
): Promise<void> {
  const stmt = db.prepare(
    "UPDATE chores SET duration_hours = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
  );
  const result = stmt.run(duration_hours, id);
  if (result.changes === 0) throw new Error("Chore not found");
}

////////////////////////////////////////////////////////////////////////////////
// Chore Completions ///////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

/**
 * Mark chore as completed
 */
export async function completeChore(
  chore_id: string,
  notes?: string,
): Promise<ChoreCompletion> {
  const id = randomBytes(16).toString("hex");
  const stmt = db.prepare(
    "INSERT INTO chore_completions (id, chore_id, notes) VALUES (?, ?, ?)",
  );
  stmt.run(id, chore_id, notes);

  const getStmt = db.prepare("SELECT * FROM chore_completions WHERE id = ?");
  return getStmt.get(id) as ChoreCompletion;
}

/**
 * Remove last completion (undo)
 */
export async function undoLastCompletion(chore_id: string): Promise<void> {
  const stmt = db.prepare(`
    DELETE FROM chore_completions
    WHERE id = (
      SELECT id FROM chore_completions
      WHERE chore_id = ?
      ORDER BY completed_at DESC
      LIMIT 1
    )
  `);
  const result = stmt.run(chore_id);
  if (result.changes === 0) throw new Error("No completion to undo");
}

/**
 * Get completion history for a chore
 */
export async function getChoreCompletions(
  chore_id: string,
  limit: number = 10,
): Promise<ChoreCompletion[]> {
  const stmt = db.prepare(
    "SELECT * FROM chore_completions WHERE chore_id = ? ORDER BY completed_at DESC LIMIT ?",
  );
  return stmt.all(chore_id, limit) as ChoreCompletion[];
}

////////////////////////////////////////////////////////////////////////////////
// Utility Functions ///////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

/**
 * Check if chore is overdue based on last completion and duration
 */
function isChoreOverdue(
  last_completed?: string,
  duration_hours: number = 24,
): boolean {
  if (!last_completed) return true;

  const lastCompletedTime = new Date(last_completed).getTime();
  const durationMs = duration_hours * 60 * 60 * 1000;
  const now = Date.now();

  return now - lastCompletedTime > durationMs;
}

/**
 * Seed database with sample chores if empty
 */
export async function seedChoresIfEmpty(): Promise<void> {
  const stmt = db.prepare("SELECT COUNT(*) as count FROM chores");
  const result = stmt.get() as { count: number };

  if (result.count === 0) {
    const sampleChores = [
      { name: "Vacuum Living Room", duration_hours: 168 }, // Weekly
      { name: "Take Out Trash", duration_hours: 72 }, // 3 days
      { name: "Do Laundry", duration_hours: 48 }, // 2 days
      { name: "Clean Kitchen", duration_hours: 24 }, // Daily
      { name: "Water Plants", duration_hours: 48 }, // 2 days
    ];

    for (const chore of sampleChores) {
      await createChore(chore.name, chore.duration_hours);
    }
  }
}

////////////////////////////////////////////////////////////////////////////////
// Report Analytics ////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

export interface ChoreStats {
  name: string;
  total_completions: number;
  days_since_last_completion: number;
  average_days_between: number;
  is_overdue: boolean;
  completion_rate: number; // percentage based on expected frequency
}

export interface CompletionTrend {
  date: string;
  completions: number;
}

/**
 * Get comprehensive statistics for all chores
 */
export async function getChoreStatistics(): Promise<ChoreStats[]> {
  const stmt = db.prepare(`
    SELECT 
      c.name,
      c.duration_hours,
      c.id,
      COUNT(cc.id) as total_completions,
      MAX(cc.completed_at) as last_completed,
      MIN(cc.completed_at) as first_completed
    FROM chores c
    LEFT JOIN chore_completions cc ON c.id = cc.chore_id
    GROUP BY c.id, c.name, c.duration_hours
    ORDER BY c.name
  `);

  const results = stmt.all() as Array<{
    name: string;
    duration_hours: number;
    id: string;
    total_completions: number;
    last_completed?: string;
    first_completed?: string;
  }>;

  return results.map(row => {
    const now = Date.now();
    const lastCompleted = row.last_completed ? new Date(row.last_completed).getTime() : null;
    const firstCompleted = row.first_completed ? new Date(row.first_completed).getTime() : null;
    
    const days_since_last = lastCompleted 
      ? Math.floor((now - lastCompleted) / (1000 * 60 * 60 * 24))
      : 999;
    
    const total_days = firstCompleted && lastCompleted && row.total_completions > 1
      ? Math.floor((lastCompleted - firstCompleted) / (1000 * 60 * 60 * 24))
      : 0;
    
    const average_days_between = total_days > 0 && row.total_completions > 1
      ? total_days / (row.total_completions - 1)
      : row.duration_hours / 24;

    const expected_frequency_days = row.duration_hours / 24;
    const completion_rate = average_days_between > 0 
      ? Math.min(100, (expected_frequency_days / average_days_between) * 100)
      : 0;

    return {
      name: row.name,
      total_completions: row.total_completions,
      days_since_last_completion: days_since_last,
      average_days_between: Math.round(average_days_between * 10) / 10,
      is_overdue: isChoreOverdue(row.last_completed, row.duration_hours),
      completion_rate: Math.round(completion_rate)
    };
  });
}

/**
 * Get completion trends over the last 30 days
 */
export async function getCompletionTrends(): Promise<CompletionTrend[]> {
  const stmt = db.prepare(`
    SELECT 
      DATE(completed_at) as date,
      COUNT(*) as completions
    FROM chore_completions 
    WHERE completed_at >= datetime('now', '-30 days')
    GROUP BY DATE(completed_at)
    ORDER BY date
  `);

  return stmt.all() as CompletionTrend[];
}

/**
 * Get summary statistics
 */
export async function getSummaryStats() {
  const totalChoresStmt = db.prepare("SELECT COUNT(*) as count FROM chores");
  const overdueStmt = db.prepare(`
    SELECT COUNT(*) as count FROM (
      SELECT c.*, cc.completed_at as last_completed
      FROM chores c
      LEFT JOIN chore_completions cc ON c.id = cc.chore_id
      LEFT JOIN chore_completions cc2 ON c.id = cc2.chore_id AND cc.completed_at < cc2.completed_at
      WHERE cc2.id IS NULL
    ) WHERE last_completed IS NULL OR 
    (julianday('now') - julianday(last_completed)) * 24 > duration_hours
  `);
  
  const completionsThisWeekStmt = db.prepare(`
    SELECT COUNT(*) as count 
    FROM chore_completions 
    WHERE completed_at >= datetime('now', '-7 days')
  `);

  const total = totalChoresStmt.get() as { count: number };
  const overdue = overdueStmt.get() as { count: number };
  const thisWeek = completionsThisWeekStmt.get() as { count: number };

  return {
    total_chores: total.count,
    overdue_chores: overdue.count,
    completions_this_week: thisWeek.count,
    on_time_chores: total.count - overdue.count
  };
}
