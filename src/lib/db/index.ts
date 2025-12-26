"use server";

import Database from "better-sqlite3";
import { INDEX_NOTE_TITLE } from "./types";
import { initializeDatabase } from "./initialize_db_schema";

// Initialize SQLite database for notes app
export const db = new Database("./.data/notes.sqlite");
initializeDatabase(db);

/**
 * Ensure the root 'index' note exists for a user.
 * Creates it only if one doesn't already exist with title='index' and parent_id IS NULL.
 * TODO this probably needs to be used somewhere
 */
export function ensureIndexNote(userId: string): void {
  const existing = db
    .prepare(
      `
    SELECT id FROM notes
    WHERE title = ? AND parent_id IS NULL AND user_id = ?
  `,
    )
    .get(INDEX_NOTE_TITLE, userId);

  if (!existing) {
    const id = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    db.prepare(
      `
      INSERT INTO notes (id, title, content, user_id, parent_id)
      VALUES (?, ?, '', ?, NULL)
    `,
    ).run(id, INDEX_NOTE_TITLE, userId);
  }
}
