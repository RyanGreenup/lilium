/**
 * Tag reading functions
 */

"use server";

import { query, redirect } from "@solidjs/router";
import { requireUser } from "../../auth";
import { db } from "../index";
import type { Tag } from "../types";

/**
 * Get tag by ID
 */
export async function getTagById(id: string): Promise<Tag> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  const stmt = db.prepare("SELECT * FROM tags WHERE id = ? AND user_id = ?");
  const tag = stmt.get(id, user.id) as Tag;
  if (!tag) throw new Error("Tag not found");
  return tag;
}

/**
 * Get all tags for the current user
 */
export async function getTags(): Promise<Tag[]> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  const stmt = db.prepare(`
    SELECT * FROM tags
    WHERE user_id = ?
    ORDER BY title
  `);

  return stmt.all(user.id) as Tag[];
}

/**
 * Query function to get tag by ID (for client-side use)
 */
export const getTagByIdQuery = query(async (tagId: string) => {
  "use server";
  return await getTagById(tagId);
}, "tag-by-id");

/**
 * Query function to get all tags (for client-side use)
 */
export const getTagsQuery = query(async () => {
  "use server";
  return await getTags();
}, "all-tags");
