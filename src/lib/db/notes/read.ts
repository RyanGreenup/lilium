/**
 * Note reading and retrieval functions
 */

"use server";

import { query } from "@solidjs/router";
import { requireUser } from "../../auth";
import { redirect } from "@solidjs/router";
import type { Note, NoteWithTags } from "../types";
import { db } from "../index";

/**
 * Get note by ID with path from FTS5
 */
export async function getNoteById(id: string): Promise<Note | null> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  const stmt = db.prepare(`
    SELECT n.*, fts.path
    FROM notes n
    LEFT JOIN notes_fts fts ON n.id = fts.id
    WHERE n.id = ? AND n.user_id = ?
  `);
  const note = stmt.get(id, user.id) as Note | undefined;
  return note || null;
}

/**
 * Get notes with their tags
 */
export async function getNotesWithTags(): Promise<NoteWithTags[]> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  const stmt = db.prepare(`
    SELECT
      n.*,
      json_group_array(
        CASE WHEN t.id IS NOT NULL
        THEN json_object('id', t.id, 'title', t.title, 'parent_id', t.parent_id, 'user_id', t.user_id, 'created_at', t.created_at)
        ELSE NULL END
      ) as tags_json
    FROM notes n
    LEFT JOIN note_tags nt ON n.id = nt.note_id
    LEFT JOIN tags t ON nt.tag_id = t.id
    WHERE n.user_id = ?
    GROUP BY n.id
    ORDER BY n.updated_at DESC
  `);

  const results = stmt.all(user.id) as (Note & { tags_json: string })[];

  return results.map((row) => {
    const tags = JSON.parse(row.tags_json).filter((tag: any) => tag !== null);
    const { tags_json, ...note } = row;
    return { ...note, tags };
  });
}

/**
 * Get children with their folder status (enhanced version)
 */
export async function getChildNotesWithFolderStatus(
  parent_id?: string,
): Promise<(Note & { is_folder: boolean })[]> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  const stmt = db.prepare(`
    SELECT
      n.*,
      CASE WHEN ncc.child_count > 0 THEN 1 ELSE 0 END as is_folder
    FROM notes n
    LEFT JOIN note_child_counts ncc ON n.id = ncc.id
    WHERE ${parent_id ? "n.parent_id = ?" : "n.parent_id IS NULL"}
      AND n.user_id = ?
    ORDER BY is_folder DESC, n.title ASC
  `);

  const params = parent_id ? [parent_id, user.id] : [user.id];
  return stmt.all(...params) as (Note & { is_folder: boolean })[];
}

/**
 * Get note child counts for all notes
 */
export async function getNoteChildCounts(): Promise<import("../types").NoteChildCount[]> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  const stmt = db.prepare(`
    SELECT id, user_id, child_count
    FROM note_child_counts
    WHERE user_id = ?
    ORDER BY child_count DESC, id
  `);

  return stmt.all(user.id) as import("../types").NoteChildCount[];
}

/**
 * Query function to get children with folder status (for client-side use)
 */
export const getChildrenWithFolderStatusQuery = query(async (parentId?: string) => {
  "use server";
  return await getChildNotesWithFolderStatus(parentId);
}, "children-with-folder-status");

/**
 * Get child count for a specific note
 */
export async function getNoteChildCount(note_id: string): Promise<number> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  const stmt = db.prepare(`
    SELECT child_count
    FROM note_child_counts
    WHERE id = ? AND user_id = ?
  `);

  const result = stmt.get(note_id, user.id) as
    | { child_count: number }
    | undefined;
  return result?.child_count ?? 0;
}

/**
 * Query function to get note child counts (for client-side use)
 */
export const getNoteChildCountsQuery = query(async () => {
  "use server";
  return await getNoteChildCounts();
}, "child-counts");

/**
 * Get the parent hierarchy of a note (from root to current note)
 */
export async function getNoteParents(note_id: string): Promise<Note[]> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  // Recursive CTE to get the parent chain
  const stmt = db.prepare(`
    WITH RECURSIVE parent_chain AS (
      -- Start with the current note
      SELECT id, title, parent_id, user_id, 0 as level
      FROM notes
      WHERE id = ? AND user_id = ?

      UNION ALL

      -- Recursively get parents
      SELECT n.id, n.title, n.parent_id, n.user_id, pc.level + 1 as level
      FROM notes n
      INNER JOIN parent_chain pc ON n.id = pc.parent_id
      WHERE n.user_id = ?
    )
    SELECT id, title, parent_id, user_id
    FROM parent_chain
    WHERE level > 0  -- Exclude the current note itself
    ORDER BY level DESC  -- Root first, then descendants
  `);

  return stmt.all(note_id, user.id, user.id) as Note[];
}

/**
 * Query function to get child count for a specific note (for client-side use)
 */
export const getNoteChildCountQuery = query(async (noteId: string) => {
  "use server";
  return await getNoteChildCount(noteId);
}, "note-child-count");

/**
 * Query function to get note by ID (for client-side use)
 */
export const getNoteByIdQuery = query(async (noteId: string) => {
  "use server";
  return await getNoteById(noteId);
}, "note-by-id");

/**
 * Query function to get notes with tags (for client-side use)
 */
export const getNotesWithTagsQuery = query(async () => {
  "use server";
  return await getNotesWithTags();
}, "notes-with-tags");

/**
 * Query function to get note parents (for client-side use)
 */
export const getNoteParentsQuery = query(async (noteId: string) => {
  "use server";
  return await getNoteParents(noteId);
}, "note-parents");