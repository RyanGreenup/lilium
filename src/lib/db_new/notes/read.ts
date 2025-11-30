/**
 * Note reading and retrieval functions
 */

"use server";

import { query } from "@solidjs/router";
import { requireUser } from "../../auth";
import { redirect } from "@solidjs/router";
import type { Note } from "../../db/types";
import { db } from "../index";

/**
 * Get note by ID
 */
export async function getNoteById(id: string): Promise<Note | null> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  const stmt = db.prepare("SELECT * FROM notes WHERE id = ? AND user_id = ?");
  const note = stmt.get(id, user.id) as Note | undefined;
  return note || null;
}

/**
 * Query function to get note by ID (for client-side use)
 */
export const getNoteByIdQuery = query(async (noteId: string) => {
  "use server";
  return await getNoteById(noteId);
}, "note-by-id");
