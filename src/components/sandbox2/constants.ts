import type { ListItem } from "~/lib/db/types";

// Animation constants
export const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];
export const SLIDE_DURATION = 0.22;
export const STAGGER_DELAY = 0.02;
export const STAGGER_DURATION = 0.15;
export const FADE_DURATION = 0.15;
export const CSS_EASE = `cubic-bezier(${EASE_OUT.join(",")})`;

export interface ColumnEntry {
  folderId: string | null;
  items: ListItem[];
  focusedIndex: number;
  title: string;
}
