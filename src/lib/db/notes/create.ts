/**
 * Note creation functions
 */

"use server";

import { randomBytes } from "crypto";
import { query } from "@solidjs/router";
import { requireUser } from "../../auth";
import { redirect } from "@solidjs/router";
import type { Note } from "../types";
import { db } from "../index";

/**
 * Get note by ID (temporary - will be moved to read.ts later)
 */
async function getNoteById(id: string): Promise<Note | null> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }
  
  const stmt = db.prepare("SELECT * FROM notes WHERE id = ? AND user_id = ?");
  const note = stmt.get(id, user.id) as Note | undefined;
  return note || null;
}

/**
 * Create a new note
 */
export async function createNote(
  title: string,
  content: string,
  syntax: string = "markdown",
  abstract?: string,
  parent_id?: string,
): Promise<Note> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }
  
  const id = randomBytes(16).toString("hex");
  const stmt = db.prepare(`
    INSERT INTO notes (id, title, abstract, content, syntax, parent_id, user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(id, title, abstract, content, syntax, parent_id, user.id);
  const createdNote = await getNoteById(id);
  if (!createdNote) {
    throw new Error("Failed to create note");
  }
  return createdNote;
}

/**
 * Query function to create a new note (for client-side use)
 */
export const createNewNote = query(
  async (title: string, content: string, parentId?: string) => {
    "use server";
    return await createNote(title, content, "markdown", undefined, parentId);
  },
  "create-note",
);