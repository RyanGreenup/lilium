/**
 * Server-side data fetching for sidebar components
 *
 * These functions fetch notes and transform them for display,
 * resolving index note titles to their parent folder names.
 * This is essentially an API Layer to the database
 */

"use server";

import type { ContentItemData } from "~/components/layout/sidebar/shared/ContentItem";
import {
  getRecentNotes,
  getBacklinks,
  getForwardLinks,
} from "~/lib/db_new/notes/search";
import { transformNotesForDisplay } from "~/lib/db_new/notes/display";

/**
 * Get recent notes with display titles resolved
 */
export async function getRecentNotesForDisplay(
  limit: number = 10,
): Promise<ContentItemData[]> {
  const notes = await getRecentNotes(limit);
  return await transformNotesForDisplay(notes);
}

/**
 * Get backlinks with display titles resolved
 */
export async function getBacklinksForDisplay(
  noteId: string,
): Promise<ContentItemData[]> {
  const notes = await getBacklinks(noteId);
  return await transformNotesForDisplay(notes);
}

/**
 * Get forward links with display titles resolved
 */
export async function getForwardLinksForDisplay(
  noteId: string,
): Promise<ContentItemData[]> {
  const notes = await getForwardLinks(noteId);
  return await transformNotesForDisplay(notes);
}
