/**
 * Consumption tracking database module using SQLite
 *
 * This module provides consumption tracking data storage functions.
 * Uses random IDs for security and follows best practices.
 */

"use server";

import Database from "better-sqlite3";
import { randomBytes } from "crypto";
import { requireUser } from "./auth";
import { redirect } from "@solidjs/router";

// Initialize SQLite database for general app data
const db = new Database("./.data/app.sqlite");

// Create consumption items table
db.exec(`
  CREATE TABLE IF NOT EXISTS consumption_items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    interval_days INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Create consumption entries table
db.exec(`
  CREATE TABLE IF NOT EXISTS consumption_entries (
    id TEXT PRIMARY KEY,
    consumption_item_id TEXT NOT NULL,
    consumed_at DATETIME NOT NULL,
    quantity REAL NOT NULL DEFAULT 1.0,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (consumption_item_id) REFERENCES consumption_items(id) ON DELETE CASCADE
  )
`);

// Create indexes for better performance
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_consumption_entries_item_date 
  ON consumption_entries(consumption_item_id, consumed_at DESC)
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_consumption_entries_consumed_at 
  ON consumption_entries(consumed_at DESC)
`);

export interface ConsumptionItem {
  id: string;
  name: string;
  interval_days: number;
  created_at: string;
  updated_at: string;
}

export interface ConsumptionEntry {
  id: string;
  consumption_item_id: string;
  consumed_at: string;
  quantity: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ConsumptionItemWithStatus extends ConsumptionItem {
  last_consumed_at?: string;
  last_quantity?: number;
  is_overdue: boolean;
  next_allowed_at: string;
}

export interface ConsumptionStats {
  total_consumptions: number;
  avg_quantity: number;
  total_quantity: number;
  first_consumption?: string;
  last_consumption?: string;
  avg_days_between?: number;
}

export interface ConsumptionValidation {
  name: string;
  interval_days: number;
  last_consumed_at?: string;
  proposed_consumption_date: string;
  is_allowed: boolean;
  next_allowed_date?: string;
}

// User authentication is now handled within each function

////////////////////////////////////////////////////////////////////////////////
// Consumption Items Management ////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

/**
 * Get all consumption items with their status
 */
export async function getConsumptionItemsWithStatus(): Promise<ConsumptionItemWithStatus[]> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }
  const stmt = db.prepare(`
    SELECT 
      ci.id,
      ci.name,
      ci.interval_days,
      ci.created_at,
      ci.updated_at,
      ce.last_consumed_at,
      ce.last_quantity,
      CASE 
        WHEN ce.last_consumed_at IS NULL THEN 0
        WHEN datetime('now') > datetime(ce.last_consumed_at, '+' || ci.interval_days || ' days') THEN 1
        ELSE 0
      END as is_overdue,
      CASE 
        WHEN ce.last_consumed_at IS NULL THEN datetime('now')
        ELSE datetime(ce.last_consumed_at, '+' || ci.interval_days || ' days')
      END as next_allowed_at
    FROM consumption_items ci
    LEFT JOIN (
      SELECT 
        consumption_item_id,
        MAX(consumed_at) as last_consumed_at,
        quantity as last_quantity
      FROM consumption_entries ce1
      WHERE consumed_at = (
        SELECT MAX(consumed_at) 
        FROM consumption_entries ce2 
        WHERE ce2.consumption_item_id = ce1.consumption_item_id
      )
      GROUP BY consumption_item_id
    ) ce ON ci.id = ce.consumption_item_id
    ORDER BY ci.name
  `);

  return stmt.all() as ConsumptionItemWithStatus[];
}

/**
 * Get only overdue consumption items
 */
export async function getOverdueConsumptionItems(): Promise<ConsumptionItemWithStatus[]> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }
  const allItems = await getConsumptionItemsWithStatus();
  return allItems.filter((item) => item.is_overdue);
}

/**
 * Update consumption item interval
 */
export async function updateConsumptionItemInterval(
  id: string,
  interval_days: number,
): Promise<void> {
  const stmt = db.prepare(
    "UPDATE consumption_items SET interval_days = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
  );
  const result = stmt.run(interval_days, id);
  if (result.changes === 0) throw new Error("Consumption item not found");
}

////////////////////////////////////////////////////////////////////////////////
// Consumption Entries Management //////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

/**
 * Create a new consumption entry
 */
export async function createConsumptionEntry(
  consumption_item_id: string,
  consumed_at: string,
  quantity: number,
  notes?: string,
): Promise<ConsumptionEntry> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }
  const id = randomBytes(16).toString("hex");
  const stmt = db.prepare(
    "INSERT INTO consumption_entries (id, consumption_item_id, consumed_at, quantity, notes) VALUES (?, ?, ?, ?, ?)",
  );
  stmt.run(id, consumption_item_id, consumed_at, quantity, notes);

  const getStmt = db.prepare("SELECT * FROM consumption_entries WHERE id = ?");
  return getStmt.get(id) as ConsumptionEntry;
}

/**
 * Update existing consumption entry
 */
export async function updateConsumptionEntry(
  id: string,
  consumed_at: string,
  quantity: number,
  notes?: string,
): Promise<void> {
  const stmt = db.prepare(
    "UPDATE consumption_entries SET consumed_at = ?, quantity = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
  );
  const result = stmt.run(consumed_at, quantity, notes, id);
  if (result.changes === 0) throw new Error("Consumption entry not found");
}

/**
 * Delete consumption entry
 */
export async function deleteConsumptionEntry(id: string): Promise<void> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }
  const stmt = db.prepare("DELETE FROM consumption_entries WHERE id = ?");
  const result = stmt.run(id);
  if (result.changes === 0) throw new Error("Consumption entry not found");
}

/**
 * Get consumption entry by ID
 */
export async function getConsumptionEntryById(id: string): Promise<ConsumptionEntry> {
  const stmt = db.prepare("SELECT * FROM consumption_entries WHERE id = ?");
  const entry = stmt.get(id) as ConsumptionEntry;
  if (!entry) throw new Error("Consumption entry not found");
  return entry;
}

/**
 * Get consumption history for a specific item
 */
export async function getConsumptionHistory(
  consumption_item_id: string,
  limit: number = 10,
): Promise<ConsumptionEntry[]> {
  const stmt = db.prepare(
    "SELECT * FROM consumption_entries WHERE consumption_item_id = ? ORDER BY consumed_at DESC LIMIT ?",
  );
  return stmt.all(consumption_item_id, limit) as ConsumptionEntry[];
}

/**
 * Get all consumption history for a specific item
 */
export async function getAllConsumptionHistory(
  consumption_item_id: string,
): Promise<ConsumptionEntry[]> {
  const stmt = db.prepare(
    "SELECT * FROM consumption_entries WHERE consumption_item_id = ? ORDER BY consumed_at DESC",
  );
  return stmt.all(consumption_item_id) as ConsumptionEntry[];
}

////////////////////////////////////////////////////////////////////////////////
// Consumption Analytics ///////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

/**
 * Get consumption statistics for an item
 */
export async function getConsumptionStats(
  consumption_item_id: string,
  days_back: number = 90,
): Promise<ConsumptionStats> {
  const stmt = db.prepare(`
    SELECT 
      COUNT(*) as total_consumptions,
      AVG(quantity) as avg_quantity,
      SUM(quantity) as total_quantity,
      MIN(consumed_at) as first_consumption,
      MAX(consumed_at) as last_consumption,
      CASE 
        WHEN COUNT(*) > 1 THEN
          CAST((julianday(MAX(consumed_at)) - julianday(MIN(consumed_at))) / (COUNT(*) - 1) AS INTEGER)
        ELSE NULL
      END as avg_days_between
    FROM consumption_entries
    WHERE consumption_item_id = ?
    AND consumed_at >= datetime('now', '-' || ? || ' days')
  `);

  const result = stmt.get(consumption_item_id, days_back) as ConsumptionStats;
  return result || {
    total_consumptions: 0,
    avg_quantity: 0,
    total_quantity: 0,
    avg_days_between: undefined,
  };
}

/**
 * Check if consumption is allowed (not within restriction period)
 */
export async function validateConsumption(
  consumption_item_id: string,
  proposed_date?: string,
): Promise<ConsumptionValidation> {
  const stmt = db.prepare(`
    SELECT 
      ci.name,
      ci.interval_days,
      ce.last_consumed_at,
      datetime(COALESCE(?, datetime('now'))) as proposed_consumption_date,
      CASE 
        WHEN ce.last_consumed_at IS NULL THEN 1
        WHEN datetime(COALESCE(?, datetime('now'))) >= datetime(ce.last_consumed_at, '+' || ci.interval_days || ' days') THEN 1
        ELSE 0
      END as is_allowed,
      CASE 
        WHEN ce.last_consumed_at IS NOT NULL THEN datetime(ce.last_consumed_at, '+' || ci.interval_days || ' days')
        ELSE NULL
      END as next_allowed_date
    FROM consumption_items ci
    LEFT JOIN (
      SELECT 
        consumption_item_id,
        MAX(consumed_at) as last_consumed_at
      FROM consumption_entries
      WHERE consumption_item_id = ?
      GROUP BY consumption_item_id
    ) ce ON ci.id = ce.consumption_item_id
    WHERE ci.id = ?
  `);

  const proposedDateTime = proposed_date || new Date().toISOString();
  const result = stmt.get(proposedDateTime, proposedDateTime, consumption_item_id, consumption_item_id) as ConsumptionValidation;
  
  if (!result) throw new Error("Consumption item not found");
  return result;
}

////////////////////////////////////////////////////////////////////////////////
// Utility Functions ///////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

/**
 * Check if consumption item is overdue based on last consumption and interval
 */
function isConsumptionOverdue(
  last_consumed_at?: string,
  interval_days: number = 30,
): boolean {
  if (!last_consumed_at) return false; // Never consumed, not overdue

  // SQLite CURRENT_TIMESTAMP stores UTC time as 'YYYY-MM-DD HH:MM:SS'
  // We need to explicitly treat it as UTC to avoid timezone issues
  const lastConsumedTime = new Date(last_consumed_at + 'Z').getTime();
  const intervalMs = interval_days * 24 * 60 * 60 * 1000;
  const now = Date.now();

  return now - lastConsumedTime > intervalMs;
}

/**
 * Seed database with medical dietary restriction items if empty
 */
export async function seedConsumptionItemsIfEmpty(): Promise<void> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }
  const stmt = db.prepare("SELECT COUNT(*) as count FROM consumption_items");
  const result = stmt.get() as { count: number };

  if (result.count === 0) {
    const medicalItems = [
      { id: "lemons", name: "Lemons", interval_days: 30 },
      { id: "meat", name: "Meat", interval_days: 90 },
      { id: "candy", name: "Candy", interval_days: 14 },
      { id: "kale", name: "Kale", interval_days: 14 },
      { id: "turmeric", name: "Turmeric", interval_days: 14 },
    ];

    const insertStmt = db.prepare(
      "INSERT INTO consumption_items (id, name, interval_days) VALUES (?, ?, ?)"
    );

    for (const item of medicalItems) {
      insertStmt.run(item.id, item.name, item.interval_days);
    }
  }
}