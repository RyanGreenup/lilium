/**
 * API Compatibility Layer for NotesListTabNew Component
 *
 * This module provides a compatibility layer between the existing database
 * functions and the NotesListTabNew component's expected API.
 *
 * TODO: Schema Migration in Progress
 * The application is migrating from a unified notes table to separate
 * Notes and Folders tables. This file will need updates when that migration
 * completes, particularly the getIndexNoteId function.
 */

"use server";

import { query } from "@solidjs/router";
import {
  getChildrenWithFolderStatusQuery,
  getNoteParentsQuery,
} from "./db/notes/read";
import type { Note } from "./db/types";

/**
 * ListItem type combining Note with folder status and type discriminator
 *
 * - is_folder: Derived from note_child_counts view (true if note has children)
 * - type: String discriminator for component logic ("folder" | "note")
 */
export type ListItem = Note & {
  is_folder: boolean;
  type: "folder" | "note";
};

/**
 * Get children of a folder with type discriminator
 *
 * Transforms is_folder boolean to type field for component compatibility.
 * The component expects both fields to support flexible type checking.
 *
 * @param parentId - The parent folder ID, or null for root-level items
 * @returns Array of items with both is_folder boolean and type discriminator
 */
export const getChildren = query(async (parentId: string | null) => {
  "use server";
  const children = await getChildrenWithFolderStatusQuery(parentId || undefined);

  // Transform to add type field derived from is_folder
  return children.map(child => ({
    ...child,
    type: child.is_folder ? "folder" : "note"
  } as ListItem));
}, "list-children");

/**
 * Get folder path for breadcrumb navigation
 *
 * Takes array of folder IDs from navigation history and returns the parent
 * chain for the current folder (last ID in history).
 *
 * @param history - Array of folder IDs representing navigation path
 * @returns Array of parent notes from root to current folder (excludes current)
 */
export const getFolderPath = query(async (history: string[]) => {
  "use server";
  if (history.length === 0) return [];

  const currentFolderId = history[history.length - 1];
  return await getNoteParentsQuery(currentFolderId);
}, "folder-path");

/**
 * Get index note ID for a folder
 *
 * TODO: TRANSITIONAL IMPLEMENTATION - Schema Migration in Progress
 *
 * Current Behavior:
 * - Searches for notes with title "index" (case-insensitive) within the folder
 * - Returns the first matching note's ID, or null if none found
 *
 * Future Implementation (post-migration to Notes/Folders tables):
 * - Query the Folders table for the folder's index_note_id field
 * - Index notes will be explicitly linked via foreign key
 * - Remove title-based lookup in favor of direct ID reference
 * - Add database constraint to ensure index_note_id references valid notes
 *
 * Index Notes Concept:
 * - An "index note" is the content page for a folder (like a README)
 * - In the future schema: Folders table will have index_note_id → Notes table
 * - Currently: We identify them by title matching "index"
 *
 * @param parentId - The folder ID to find an index note for, or null for root
 * @returns The ID of the index note if found, or null
 */
export const getIndexNoteId = query(async (parentId: string | null) => {
  "use server";
  const children = await getChildrenWithFolderStatusQuery(parentId || undefined);

  // Find note with title "index" (case-insensitive)
  // TODO: Replace with direct Folders.index_note_id lookup after schema migration
  const indexNote = children.find(
    child => child.title.toLowerCase().trim() === "index"
  );

  return indexNote?.id || null;
}, "index-note-id");
