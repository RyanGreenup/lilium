/**
 * Note conversion functions
 */

"use server";

import { randomBytes } from "crypto";
import { query } from "@solidjs/router";
import { requireUser } from "../../auth";
import { redirect } from "@solidjs/router";
import type { Folder, Note } from "../types";
import { db } from "../index";
import { getNoteById } from "./read";
import { getFolderById } from "../folders/read";

/**
 * Convert a note to a folder
 *
 * The note becomes an "index" note inside a new folder.
 * The new folder inherits the note's original title and parent.
 *
 * Order of operations (to avoid UNIQUE constraint violations):
 * 1. Create folder with note's original title and parent_id
 * 2. Update note's parent_id to the new folder (move first!)
 * 3. Update note's title to "index" (rename second!)
 */
export async function convertNoteToFolder(
  noteId: string
): Promise<{ folder: Folder; note: Note }> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  // 1. Get the note
  const note = await getNoteById(noteId);
  if (!note) {
    throw new Error("Note not found");
  }

  // 2. Use a transaction for atomicity
  const convert = db.transaction(() => {
    // 3. Create folder with note's original title and parent
    const folderId = randomBytes(16).toString("hex");
    const createFolderStmt = db.prepare(`
      INSERT INTO folders (id, title, parent_id, user_id)
      VALUES (?, ?, ?, ?)
    `);
    createFolderStmt.run(folderId, note.title, note.parent_id, user.id);

    // 4. Update note's parent_id FIRST (move to new folder)
    // This avoids UNIQUE constraint issues since new folder is empty
    const moveNoteStmt = db.prepare(`
      UPDATE notes
      SET parent_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `);
    moveNoteStmt.run(folderId, noteId, user.id);

    // 5. Update note's title SECOND (rename to "index")
    const renameNoteStmt = db.prepare(`
      UPDATE notes
      SET title = 'index', updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `);
    renameNoteStmt.run(noteId, user.id);

    return folderId;
  });

  // 6. Execute transaction
  const newFolderId = convert();

  // 7. Fetch and return both entities
  const folder = await getFolderById(newFolderId);
  const updatedNote = await getNoteById(noteId);

  if (!folder || !updatedNote) {
    throw new Error("Failed to convert note to folder");
  }

  return { folder, note: updatedNote };
}

/**
 * Query function to convert a note to folder (for client-side use)
 */
export const convertNoteToFolderQuery = query(
  async (noteId: string) => {
    "use server";
    return await convertNoteToFolder(noteId);
  },
  "convert-note-to-folder",
);
