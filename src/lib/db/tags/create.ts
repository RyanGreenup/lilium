/**
 * Tag creation functions
 */

"use server";

import { randomBytes } from "crypto";
import { query } from "@solidjs/router";
import { requireUser } from "../../auth";
import { redirect } from "@solidjs/router";
import type { Tag } from "../types";
import { db } from "../index";

/**
 * Get tag by ID (temporary - will be moved to read.ts later)
 */
async function getTagById(id: string): Promise<Tag> {
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
 * Create a new tag
 */
export async function createTag(
  title: string,
  parent_id?: string,
): Promise<Tag> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  const id = randomBytes(16).toString("hex");
  const stmt = db.prepare(`
    INSERT INTO tags (id, title, parent_id, user_id)
    VALUES (?, ?, ?, ?)
  `);

  try {
    stmt.run(id, title, parent_id, user.id);
    return getTagById(id);
  } catch (error: any) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      throw new Error("Tag with this title already exists");
    }
    throw error;
  }
}

/**
 * Query function to create a new tag (for client-side use)
 */
export const createTagQuery = query(
  async (title: string, parentId?: string) => {
    "use server";
    return await createTag(title, parentId);
  },
  "create-tag",
);