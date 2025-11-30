/**
 * Folder move functions (change parent folder)
 */

"use server";

import { query, redirect } from "@solidjs/router";
import { requireUser } from "../../auth";
import type { Folder } from "../types";
import { updateFolder } from "./update";
import { getFolderById, getFolderParents } from "./read";

/**
 * Move a folder to a different parent folder
 * Validates folder exists, belongs to user, and prevents circular references
 *
 * Circular reference prevention:
 * A folder cannot be moved into itself or any of its descendants.
 * We check this by getting all parents of the target folder - if the folder
 * being moved is in that list, it means the target is a descendant.
 *
 * Example prevention:
 * Folder A � Folder B � Folder C
 * L Cannot move A into B (B is child of A)
 * L Cannot move A into C (C is descendant of A)
 *  Can move B into C (valid)
 */
export async function moveFolder(
  id: string,
  newParentId?: string,
): Promise<Folder> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  // Prevent setting folder as its own parent
  if (newParentId === id) {
    throw new Error("Cannot move a folder into itself");
  }

  // If moving to a specific folder, validate it
  if (newParentId) {
    // Check that the target folder exists and belongs to the user
    const targetFolder = await getFolderById(newParentId);
    if (!targetFolder) {
      throw new Error("Target folder not found");
    }
    if (targetFolder.user_id !== user.id) {
      throw new Error("Target folder does not belong to you");
    }

    // CRITICAL: Prevent circular reference
    // Get all parents of the target folder
    const targetParents = await getFolderParents(newParentId);

    // If the folder being moved is an ancestor of the target, it's circular
    if (targetParents.includes(id)) {
      throw new Error("Cannot move folder into its own descendant");
    }
  }

  // Perform the move by updating parent_id
  return await updateFolder(id, { parent_id: newParentId });
}

/**
 * Query function to move a folder (for client-side use)
 */
export const moveFolderQuery = query(
  async (folderId: string, newParentId?: string) => {
    "use server";
    return await moveFolder(folderId, newParentId);
  },
  "move-folder",
);
