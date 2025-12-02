/**
 * Folder conversion functions
 */

"use server";

import { randomBytes } from "crypto";
import { query, redirect } from "@solidjs/router";
import { requireUser } from "../../auth";
import type { Folder, Note } from "../types";
import { INDEX_NOTE_TITLE } from "../types";
import { db } from "../index";
import { getFolderById } from "./read";
import { getNoteById } from "../notes/read";

/**
 * Convert an empty folder to a new empty note.
 * Creates a note with the folder's title and parent, then deletes the folder.
 */
function convertEmptyFolder(folder: Folder, userId: string): Promise<Note> {
  const noteId = randomBytes(16).toString("hex");

  const convert = db.transaction(() => {
    db.prepare(`
      INSERT INTO notes (id, title, abstract, content, syntax, parent_id, user_id)
      VALUES (?, ?, NULL, '', 'md', ?, ?)
    `).run(noteId, folder.title, folder.parent_id, userId);

    db.prepare("DELETE FROM folders WHERE id = ? AND user_id = ?")
      .run(folder.id, userId);
  });

  convert();

  return getNoteById(noteId).then((note) => {
    if (!note) throw new Error("Failed to convert folder to note");
    return note;
  });
}

/**
 * Promote an index note to replace its parent folder.
 * Moves the note to the folder's parent, renames it to the folder's title, then deletes the folder.
 */
function promoteIndexNote(
  folder: Folder,
  indexNoteId: string,
  userId: string,
): Promise<Note> {
  const convert = db.transaction(() => {
    // Move AND rename in single UPDATE to avoid UNIQUE constraint issues
    db.prepare(`
      UPDATE notes
      SET parent_id = ?, title = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `).run(folder.parent_id, folder.title, indexNoteId, userId);

    db.prepare("DELETE FROM folders WHERE id = ? AND user_id = ?")
      .run(folder.id, userId);
  });

  convert();

  return getNoteById(indexNoteId).then((note) => {
    if (!note) throw new Error("Failed to convert folder to note");
    return note;
  });
}

/**
 * Convert a folder back to a note.
 *
 * Handles two cases:
 * 1. Empty folder → creates a new empty note with the folder's title/parent
 * 2. Folder with index note → promotes the index note (reverse of convertNoteToFolder)
 *
 * Rejects folders with subfolders or multiple/non-index notes.
 */
export async function convertFolderToNote(folderId: string): Promise<Note> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  // 1. Validate folder exists
  const folder = await getFolderById(folderId);
  if (!folder) {
    throw new Error("Folder not found");
  }

  // 2. Reject folders with subfolders (can't flatten hierarchy)
  const subfolderCount = db
    .prepare(
      "SELECT COUNT(*) as count FROM folders WHERE parent_id = ? AND user_id = ?",
    )
    .get(folderId, user.id) as { count: number };

  if (subfolderCount.count > 0) {
    throw new Error("Cannot convert folder: folder contains subfolders");
  }

  // 3. Get notes in folder
  const notes = db
    .prepare("SELECT id, title FROM notes WHERE parent_id = ? AND user_id = ?")
    .all(folderId, user.id) as { id: string; title: string }[];

  // 4. Handle based on note count
  if (notes.length === 0) {
    return convertEmptyFolder(folder, user.id);
  }

  if (notes.length === 1 && notes[0].title === INDEX_NOTE_TITLE) {
    return promoteIndexNote(folder, notes[0].id, user.id);
  }

  // Reject ambiguous or unexpected states
  if (notes.length === 1) {
    throw new Error(
      `Cannot convert folder: note must be titled "${INDEX_NOTE_TITLE}"`,
    );
  }
  throw new Error(
    "Cannot convert folder: folder must contain at most one note titled 'index'",
  );
}

/**
 * Query function to convert folder to note (for client-side use)
 */
export const convertFolderToNoteQuery = query(async (folderId: string) => {
  "use server";
  return await convertFolderToNote(folderId);
}, "convert-folder-to-note");
