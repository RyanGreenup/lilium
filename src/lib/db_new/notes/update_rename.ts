/**
 * Note rename functions
 */

"use server";

import { query } from "@solidjs/router";
import { requireUser } from "../../auth";
import { redirect } from "@solidjs/router";
import type { Note } from "../types";
import { updateNote } from "./update";

/**
 * Rename a note (update title only)
 * Thin wrapper around updateNote for cleaner API
 */
export async function renameNote(id: string, newTitle: string): Promise<Note> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  return await updateNote(id, { title: newTitle });
}

/**
 * Query function to rename a note (for client-side use)
 */
export const renameNoteQuery = query(
  async (noteId: string, newTitle: string) => {
    "use server";
    return await renameNote(noteId, newTitle);
  },
  "rename-note"
);
