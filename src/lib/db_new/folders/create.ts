/**
 * Folder creation functions
 */

"use server";

import { randomBytes } from "crypto";
import { query } from "@solidjs/router";
import { requireUser } from "../../auth";
import { redirect } from "@solidjs/router";
import type { Folder, Note } from "../types";
import { INDEX_NOTE_TITLE } from "../types";
import type { NoteSyntax } from "../../db/types";
import { db } from "../index";

/**
 * Get folder by ID (helper for internal use)
 */
async function getFolderById(id: string): Promise<Folder | null> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  const stmt = db.prepare(`
    SELECT
      id,
      title,
      parent_id,
      user_id,
      created_at,
      updated_at
    FROM folders
    WHERE id = ? AND user_id = ?
  `);
  const folder = stmt.get(id, user.id) as Folder | undefined;
  return folder || null;
}

/**
 * Create a new folder
 */
export async function createFolder(
  title: string,
  parent_id?: string,
): Promise<Folder> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  const id = randomBytes(16).toString("hex");
  const stmt = db.prepare(`
    INSERT INTO folders (id, title, parent_id, user_id)
    VALUES (?, ?, ?, ?)
  `);

  stmt.run(id, title, parent_id, user.id);
  const createdFolder = await getFolderById(id);
  if (!createdFolder) {
    throw new Error("Failed to create folder");
  }
  return createdFolder;
}

/**
 * Query function to create a new folder (for client-side use)
 */
export const createNewFolder = query(
  async (title: string, parentId?: string) => {
    "use server";
    return await createFolder(title, parentId);
  },
  "create-folder",
);

/**
 * Get note by ID (helper for internal use)
 */
async function getNoteById(id: string): Promise<Note | null> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  const stmt = db.prepare(`
    SELECT
      id,
      title,
      abstract,
      content,
      syntax,
      parent_id,
      user_id,
      created_at,
      updated_at
    FROM notes
    WHERE id = ? AND user_id = ?
  `);
  const note = stmt.get(id, user.id) as Note | undefined;
  return note || null;
}

/**
 * Create a folder with an index note inside it
 *
 * The index note serves as the default preview/landing page for the folder.
 * When users navigate to this folder, the index note's content is automatically
 * displayed, similar to how README files work in code repositories.
 *
 * @param folderTitle - Title for the new folder
 * @param indexContent - Content for the index note (defaults to empty string)
 * @param syntax - Syntax for the index note (defaults to "md")
 * @param parentId - Optional parent folder ID
 * @returns Object containing the created folder and index note
 */
export async function createFolderWithIndex(
  folderTitle: string,
  indexContent: string = "",
  syntax: NoteSyntax = "md",
  parentId?: string,
): Promise<{ folder: Folder; indexNote: Note }> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  // Use a transaction to ensure both folder and note are created atomically
  const create = db.transaction(() => {
    // 1. Create the folder
    const folderId = randomBytes(16).toString("hex");
    const folderStmt = db.prepare(`
      INSERT INTO folders (id, title, parent_id, user_id)
      VALUES (?, ?, ?, ?)
    `);
    folderStmt.run(folderId, folderTitle, parentId, user.id);

    // 2. Create the index note inside the folder
    const noteId = randomBytes(16).toString("hex");
    const noteStmt = db.prepare(`
      INSERT INTO notes (id, title, abstract, content, syntax, parent_id, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    noteStmt.run(
      noteId,
      INDEX_NOTE_TITLE,
      null,
      indexContent,
      syntax,
      folderId,
      user.id,
    );

    return { folderId, noteId };
  });

  // Execute the transaction
  const { folderId, noteId } = create();

  // Fetch and return both created entities
  const folder = await getFolderById(folderId);
  const indexNote = await getNoteById(noteId);

  if (!folder || !indexNote) {
    throw new Error("Failed to create folder with index note");
  }

  return { folder, indexNote };
}

/**
 * Query function to create a folder with index note (for client-side use)
 */
export const createFolderWithIndexQuery = query(
  async (
    folderTitle: string,
    indexContent?: string,
    syntax?: NoteSyntax,
    parentId?: string,
  ) => {
    "use server";
    return await createFolderWithIndex(
      folderTitle,
      indexContent,
      syntax,
      parentId,
    );
  },
  "create-folder-with-index",
);

/**
 * Recursively duplicate a folder's contents (internal helper, runs inside transaction)
 */
function duplicateFolderRecursive(
  sourceId: string,
  newTitle: string,
  parentId: string | null,
  userId: string,
): string {
  // 1. Create the new folder
  const newFolderId = randomBytes(16).toString("hex");
  db.prepare(`
    INSERT INTO folders (id, title, parent_id, user_id)
    VALUES (?, ?, ?, ?)
  `).run(newFolderId, newTitle, parentId, userId);

  // 2. Get all children (folders and notes) of source folder
  const children = db.prepare(`
    SELECT id, title, 'folder' as type FROM folders WHERE parent_id = ? AND user_id = ?
    UNION ALL
    SELECT id, title, 'note' as type FROM notes WHERE parent_id = ? AND user_id = ?
  `).all(sourceId, userId, sourceId, userId) as { id: string; title: string; type: string }[];

  // 3. Recursively duplicate each child
  for (const child of children) {
    if (child.type === "folder") {
      // Recursively duplicate subfolder (keep original title for children)
      duplicateFolderRecursive(child.id, child.title, newFolderId, userId);
    } else {
      // Duplicate note into new folder
      const newNoteId = randomBytes(16).toString("hex");
      db.prepare(`
        INSERT INTO notes (id, title, abstract, content, syntax, parent_id, user_id)
        SELECT ?, title, abstract, content, syntax, ?, user_id
        FROM notes WHERE id = ? AND user_id = ?
      `).run(newNoteId, newFolderId, child.id, userId);
    }
  }

  return newFolderId;
}

/**
 * Duplicate a folder and all its contents recursively (like cp -r)
 */
export async function duplicateFolder(
  sourceId: string,
  newTitle: string,
  targetParentId?: string,
): Promise<Folder> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  // Use transaction for atomicity - if any part fails, nothing is committed
  const duplicate = db.transaction(() => {
    return duplicateFolderRecursive(
      sourceId,
      newTitle,
      targetParentId ?? null,
      user.id,
    );
  });

  const newFolderId = duplicate();
  const folder = await getFolderById(newFolderId);
  if (!folder) {
    throw new Error("Failed to duplicate folder");
  }
  return folder;
}

/**
 * Query function to duplicate a folder (for client-side use)
 */
export const duplicateFolderQuery = query(
  async (sourceId: string, newTitle: string, targetParentId?: string) => {
    "use server";
    return await duplicateFolder(sourceId, newTitle, targetParentId);
  },
  "duplicate-folder",
);
