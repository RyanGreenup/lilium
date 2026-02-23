import type { ListItem } from "~/lib/db/types";

// Animation constants
export const ANIMATION_DURATION_MULTIPLIER = 1;
export const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];
export const SLIDE_DURATION = 0.22 * ANIMATION_DURATION_MULTIPLIER;
export const STAGGER_DELAY = 0.02 * ANIMATION_DURATION_MULTIPLIER;
export const STAGGER_DURATION = 0.15 * ANIMATION_DURATION_MULTIPLIER;
export const FADE_DURATION = 0.15 * ANIMATION_DURATION_MULTIPLIER;
export const CSS_EASE = `cubic-bezier(${EASE_OUT.join(",")})`;

export interface ColumnEntry {
  folderId: string | null;
  items: ListItem[];
  focusedIndex: number;
  title: string;
}

/** All navigation state owned by a single finder tab. */
export interface TabState {
  /** Human-readable label shown in the tab bar (derived from deepest column). */
  label: string;
  /** The column stack for this tab. */
  columns: ColumnEntry[];
  /** Index of the active (rightmost visible) column. -1 = not yet initialized. */
  depth: number;
  /** Per-folder focus memory, keyed by folderId or "root". */
  focusMemory: Record<string, number>;
  /** Children of the focused folder for the preview panel. null = leaf note. */
  previewItems: ListItem[] | null;
}
