"use server";

import Database from "better-sqlite3";
import { INDEX_NOTE_TITLE } from "./types";
import { initSchema } from "./InitializeDbSchema";
import { startBackupScheduler } from "./backup";

// Initialize SQLite database for notes app
export const db = new Database("./.data/notes.sqlite");
initSchema(db);
startBackupScheduler(db);
