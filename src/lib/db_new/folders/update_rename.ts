/**
 * Folder rename functions
 */

"use server";

import { query } from "@solidjs/router";
import { requireUser } from "../../auth";
import { redirect } from "@solidjs/router";
import type { Folder } from "../types";
import { updateFolder } from "./update";

/**
 * Rename a folder (update title only)
 * Thin wrapper around updateFolder for cleaner API
 */
export async function renameFolder(id: string, newTitle: string): Promise<Folder> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  return await updateFolder(id, { title: newTitle });
}

/**
 * Query function to rename a folder (for client-side use)
 */
export const renameFolderQuery = query(
  async (folderId: string, newTitle: string) => {
    "use server";
    return await renameFolder(folderId, newTitle);
  },
  "rename-folder"
);
