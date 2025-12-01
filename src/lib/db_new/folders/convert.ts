/**
 * Folder conversion functions
 */

"use server";

import { query, redirect } from "@solidjs/router";
import { requireUser } from "../../auth";
import type { Note } from "../types";
import { INDEX_NOTE_TITLE } from "../types";
import { db } from "../index";
import { getFolderById } from "./read";
import { getNoteById } from "../notes/read";

/**
 * Convert a folder back to a note
 *
 * Only works if the folder contains exactly one child: a note titled "index".
 * This is the reverse of convertNoteToFolder.
 *
 * The index note keeps its ID (preserving all links), gets renamed to the
 * folder's title, and moved to the folder's parent. Then the folder is deleted.
 *
 * Order of operations:
 * 1. Move AND rename index note in a single UPDATE (avoids UNIQUE constraint issues)
 * 2. Delete the now-empty folder
 */
export async function convertFolderToNote(folderId: string): Promise<Note> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  // 1. Get the folder
  const folder = await getFolderById(folderId);
  if (!folder) {
    throw new Error("Folder not found");
  }

  // 2. Check folder has no subfolders
  const subfolderCount = db
    .prepare("SELECT COUNT(*) as count FROM folders WHERE parent_id = ? AND user_id = ?")
    .get(folderId, user.id) as { count: number };

  if (subfolderCount.count > 0) {
    throw new Error("Cannot convert folder: folder contains subfolders");
  }

  // 3. Get all notes in folder
  const notes = db
    .prepare("SELECT id, title FROM notes WHERE parent_id = ? AND user_id = ?")
    .all(folderId, user.id) as { id: string; title: string }[];

  // 4. Check exactly one note titled "index"
  if (notes.length !== 1) {
    throw new Error("Cannot convert folder: folder must contain exactly one note");
  }

  const indexNote = notes[0];
  if (indexNote.title !== INDEX_NOTE_TITLE) {
    throw new Error("Cannot convert folder: the note must be titled 'index'");
  }

  // 5. Use a transaction for atomicity
  const convert = db.transaction(() => {
    // Move AND rename in a single UPDATE to avoid UNIQUE constraint issues
    // (SQLite checks constraints after each statement, not at transaction end)
    db.prepare(`
      UPDATE notes
      SET parent_id = ?, title = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `).run(folder.parent_id, folder.title, indexNote.id, user.id);

    // Delete the now-empty folder
    db.prepare("DELETE FROM folders WHERE id = ? AND user_id = ?")
      .run(folderId, user.id);
  });

  // 6. Execute transaction
  convert();

  // 7. Fetch and return the updated note
  const note = await getNoteById(indexNote.id);
  if (!note) {
    throw new Error("Failed to convert folder to note");
  }

  return note;
}

/**
 * Query function to convert folder to note (for client-side use)
 */
export const convertFolderToNoteQuery = query(async (folderId: string) => {
  "use server";
  return await convertFolderToNote(folderId);
}, "convert-folder-to-note");
