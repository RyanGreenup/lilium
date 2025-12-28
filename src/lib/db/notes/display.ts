/**
 * Display title resolution for notes
 *
 * Handles the special case of index notes, which should display
 * their parent folder's title instead of "index" in list views.
 */

"use server";

import { isIndexNote } from "../types";
import { db } from "../index";
import type { ContentItemData } from "~/components/layout/sidebar/shared/ContentItem";

/**
 * Minimal note interface for display title resolution
 */
export interface NoteForDisplay {
  id: string;
  title: string;
  abstract?: string;
  parent_id?: string;
}

/**
 * Get display titles for multiple notes in a single query
 *
 * For regular notes: uses the note's title
 * For index notes with parent: fetches and uses the parent folder's title
 * For index notes at root: keeps "index"
 *
 * @param notes - Array of notes to get display titles for
 * @returns Map from note ID to display title
 */
export async function getDisplayTitles(
  notes: NoteForDisplay[]
): Promise<Map<string, string>> {
  const result = new Map<string, string>();

  // Identify index notes that have parent folders
  const indexNotesWithParents: { id: string; parent_id: string }[] = [];

  for (const note of notes) {
    if (isIndexNote(note) && note.parent_id) {
      indexNotesWithParents.push({ id: note.id, parent_id: note.parent_id });
    } else {
      // Regular notes or root-level index notes keep their title
      result.set(note.id, note.title);
    }
  }

  // Batch fetch folder titles for index notes with parents
  if (indexNotesWithParents.length > 0) {
    const parentIds = [...new Set(indexNotesWithParents.map((n) => n.parent_id))];
    const placeholders = parentIds.map(() => "?").join(",");

    const stmt = db.prepare(`
      SELECT id, title FROM folders WHERE id IN (${placeholders})
    `);
    const folders = stmt.all(...parentIds) as { id: string; title: string }[];

    // Build parent_id -> title map
    const folderTitles = new Map(folders.map((f) => [f.id, f.title]));

    // Assign display titles to index notes
    for (const indexNote of indexNotesWithParents) {
      const folderTitle = folderTitles.get(indexNote.parent_id);
      result.set(indexNote.id, folderTitle ?? "index");
    }
  }

  return result;
}

/**
 * Transform notes to ContentItemData with resolved display titles
 *
 * Index notes will show their parent folder's title instead of "index".
 * This is the primary function for preparing notes for list display.
 *
 * @param notes - Array of notes to transform
 * @returns Array of ContentItemData ready for ContentList
 */
export async function transformNotesForDisplay(
  notes: NoteForDisplay[]
): Promise<ContentItemData[]> {
  const displayTitles = await getDisplayTitles(notes);

  return notes.map((note): ContentItemData => ({
    id: note.id,
    title: displayTitles.get(note.id) ?? note.title,
    abstract: note.abstract ?? "",
    path: `/note/${note.id}`,
  }));
}
