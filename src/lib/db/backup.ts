import type Database from "better-sqlite3";
import { existsSync, mkdirSync, readdirSync, unlinkSync, statSync } from "fs";
import { join } from "path";

const BACKUP_DIR = "./.data/backups";
const MAX_BACKUPS = 5;

// Intervals in milliseconds
const ONE_MINUTE = 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;
const ONE_DAY = 24 * 60 * 60 * 1000;

// Track last backup times to determine tier
let lastMinuteBackup = 0;
let lastHourlyBackup = 0;
let lastDailyBackup = 0;

// Database instance, set when scheduler starts
let dbInstance: Database.Database | null = null;

function ensureBackupDir() {
  if (!existsSync(BACKUP_DIR)) {
    mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

function getBackupTier(now: number): "minute" | "hourly" | "daily" | null {
  // Priority: daily > hourly > minute
  if (now - lastDailyBackup >= ONE_DAY) return "daily";
  if (now - lastHourlyBackup >= ONE_HOUR) return "hourly";
  if (now - lastMinuteBackup >= ONE_MINUTE) return "minute";
  return null;
}

function cleanOldBackups() {
  const files = readdirSync(BACKUP_DIR)
    .filter((f) => f.endsWith(".sqlite"))
    .map((f) => ({
      name: f,
      path: join(BACKUP_DIR, f),
      mtime: statSync(join(BACKUP_DIR, f)).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime); // newest first

  // Delete files beyond MAX_BACKUPS
  while (files.length > MAX_BACKUPS) {
    const oldest = files.pop()!;
    unlinkSync(oldest.path);
    console.log(`[backup] Deleted old backup: ${oldest.name}`);
  }
}

async function performBackup() {
  if (!dbInstance) return;

  const now = Date.now();
  const tier = getBackupTier(now);

  if (!tier) return; // No backup needed yet

  ensureBackupDir();

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `notes-${tier}-${timestamp}.sqlite`;
  const backupPath = join(BACKUP_DIR, filename);

  try {
    await dbInstance.backup(backupPath);

    // Update last backup time for this tier
    if (tier === "daily") lastDailyBackup = now;
    if (tier === "hourly") lastHourlyBackup = now;
    if (tier === "minute") lastMinuteBackup = now;

    console.log(`[backup] Created ${tier} backup: ${filename}`);

    cleanOldBackups();
  } catch (err) {
    console.error(`[backup] Failed to create backup:`, err);
  }
}

let backupIntervalId: ReturnType<typeof setInterval> | null = null;

export function startBackupScheduler(db: Database.Database) {
  if (backupIntervalId) return; // Already running

  dbInstance = db;

  // Initialize last backup times to now (don't immediately create all tiers)
  const now = Date.now();
  lastMinuteBackup = now;
  lastHourlyBackup = now;
  lastDailyBackup = now;

  // Check every minute if a backup is needed
  backupIntervalId = setInterval(performBackup, ONE_MINUTE);

  console.log("[backup] Backup scheduler started");
}

export function stopBackupScheduler() {
  if (backupIntervalId) {
    clearInterval(backupIntervalId);
    backupIntervalId = null;
    console.log("[backup] Backup scheduler stopped");
  }
}
