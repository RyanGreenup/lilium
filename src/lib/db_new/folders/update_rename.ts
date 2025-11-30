/**
 * Folder rename functions
 */

"use server";

import { query } from "@solidjs/router";
import type { Folder } from "../types";
import { updateFolder } from "./update";

/**
 * Rename a folder (update title only)
 *
 * Thin wrapper around updateFolder for cleaner API.
 * Auth is handled by updateFolder.
 */
export async function renameFolder(
  id: string,
  newTitle: string,
): Promise<Folder> {
  return updateFolder(id, { title: newTitle });
}

/**
 * Query function to rename a folder (for client-side use)
 */
export const renameFolderQuery = query(
  async (folderId: string, newTitle: string) => {
    "use server";
    return await renameFolder(folderId, newTitle);
  },
  "rename-folder",
);
