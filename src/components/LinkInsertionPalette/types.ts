/**
 * Type definitions for LinkInsertionPalette component
 */

export interface LinkItem {
  id: string;
  title: string;
  value: string; // The identifier (UUID, file path, etc.)
  subtitle?: string; // Optional secondary info to display
}

export type LinkFormat = "markdown" | "org";
export type TabType = "notes" | "external";

export interface ExternalLinkState {
  displayName: string;
  url: string;
}

/** Format a link item according to the specified format */
export function formatLink(
  item: LinkItem,
  format: LinkFormat = "markdown"
): string {
  return format === "org"
    ? `[[${item.value}][${item.title}]]`
    : `[${item.title}](${item.value})`;
}
