/**
 * Note creation functions
 */

"use server";

import { randomBytes } from "crypto";
import { query } from "@solidjs/router";
import { requireUser } from "../../auth";
import { redirect } from "@solidjs/router";
import type { Note } from "../types";
import type { NoteSyntax } from "../../db/types";
import { db } from "../index";

/**
 * Get note by ID (helper for internal use)
 */
async function getNoteById(id: string): Promise<Note | null> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  const stmt = db.prepare(`
    SELECT
      id,
      title,
      abstract,
      content,
      syntax,
      parent_id,
      user_id,
      created_at,
      updated_at
    FROM notes
    WHERE id = ? AND user_id = ?
  `);
  const note = stmt.get(id, user.id) as Note | undefined;
  return note || null;
}

/**
 * Create a new note
 */
export async function createNote(
  title: string,
  content: string,
  syntax: NoteSyntax = "md",
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
 * Duplicate an existing note with a new ID and title
 */
export async function duplicateNote(
  sourceId: string,
  newTitle: string,
): Promise<Note> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  const newId = randomBytes(16).toString("hex");
  const stmt = db.prepare(`
    INSERT INTO notes (id, title, abstract, content, syntax, parent_id, user_id)
    SELECT ?, ?, abstract, content, syntax, parent_id, user_id
    FROM notes
    WHERE id = ? AND user_id = ?
  `);

  stmt.run(newId, newTitle, sourceId, user.id);
  const duplicatedNote = await getNoteById(newId);
  if (!duplicatedNote) {
    throw new Error("Failed to duplicate note");
  }
  return duplicatedNote;
}

/**
 * Create a duplicate note by title and content (generates unique ID)
 */
export async function duplicateNoteByTitleAndContent(
  title: string,
  content: string,
  syntax: NoteSyntax = "md",
  abstract?: string,
  parent_id?: string,
): Promise<Note> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  // Generate unique ID for the duplicate
  const id = randomBytes(16).toString("hex");
  const stmt = db.prepare(`
    INSERT INTO notes (id, title, abstract, content, syntax, parent_id, user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(id, title, abstract, content, syntax, parent_id, user.id);
  const createdNote = await getNoteById(id);
  if (!createdNote) {
    throw new Error("Failed to create duplicate note");
  }
  return createdNote;
}

/**
 * Query function to create a new note (for client-side use)
 */
export const createNewNote = query(
  async (title: string, content: string, parentId?: string) => {
    "use server";
    return await createNote(title, content, "md", undefined, parentId);
  },
  "create-note",
);

/**
 * Query function to duplicate a note (for client-side use)
 */
export const duplicateNoteQuery = query(
  async (sourceId: string, newTitle: string) => {
    "use server";
    return await duplicateNote(sourceId, newTitle);
  },
  "duplicate-note",
);

/**
 * Query function to duplicate a note by title and content (for client-side use)
 */
export const duplicateNoteByTitleAndContentQuery = query(
  async (
    title: string,
    content: string,
    syntax?: NoteSyntax,
    abstract?: string,
    parentId?: string,
  ) => {
    "use server";
    return await duplicateNoteByTitleAndContent(title, content, syntax, abstract, parentId);
  },
  "duplicate-note-by-title-content",
);
