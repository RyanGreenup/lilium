/**
 * Notes application database module using SQLite
 *
 * This module provides data storage functions for notes, tags, and related entities.
 * Uses random IDs for security and follows best practices.
 */

"use server";

import Database from "better-sqlite3";
import { randomBytes } from "crypto";
import { requireUser } from "./auth";
import { redirect } from "@solidjs/router";
import { Note, NoteWithTags, Tag } from "./db/types";

// Initialize SQLite database for notes app
const db = new Database("./.data/notes.sqlite");


////////////////////////////////////////////////////////////////////////////////
// Tag Management //////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////



////////////////////////////////////////////////////////////////////////////////
// Search and Filtering ////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

/**
 * Search notes by title and content
 */
export async function searchNotes(query: string): Promise<Note[]> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  const stmt = db.prepare(`
    SELECT * FROM notes
    WHERE user_id = ? AND (
      title LIKE ? OR
      content LIKE ? OR
      abstract LIKE ?
    )
    ORDER BY updated_at DESC
  `);

  const searchTerm = `%${query}%`;
  return stmt.all(user.id, searchTerm, searchTerm, searchTerm) as Note[];
}

/**
 * Get notes by syntax type
 */
export async function getNotesBySyntax(syntax: string): Promise<Note[]> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  const stmt = db.prepare(`
    SELECT * FROM notes
    WHERE user_id = ? AND syntax = ?
    ORDER BY updated_at DESC
  `);

  return stmt.all(user.id, syntax) as Note[];
}

/**
 * Get recently modified notes
 */
export async function getRecentNotes(limit: number = 10): Promise<Note[]> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  const stmt = db.prepare(`
    SELECT * FROM notes
    WHERE user_id = ?
    ORDER BY updated_at DESC
    LIMIT ?
  `);

  return stmt.all(user.id, limit) as Note[];
}

