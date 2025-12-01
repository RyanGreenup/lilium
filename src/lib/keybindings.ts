/**
 * Centralized keybinding definitions for item actions.
 * Single source of truth for both context menus and keyboard handlers.
 */

export interface KeybindDef {
  /** Key combination (e.g., "F2", "Ctrl+N", "Ctrl+Shift+V") */
  key: string;
  /** Display label for context menu */
  label: string;
}

export const ITEM_KEYBINDINGS = {
  rename: { key: "F2", label: "Rename" },
  createSibling: { key: "Ctrl+N", label: "New sibling" },
  createChild: { key: "Shift+N", label: "New child" },
  copyLink: { key: "y", label: "Copy Link" },
  duplicate: { key: "Ctrl+D", label: "Duplicate" },
  cut: { key: "Ctrl+X", label: "Cut" },
  paste: { key: "Ctrl+V", label: "Paste as sibling" },
  pasteChild: { key: "Ctrl+Shift+V", label: "Paste as child" },
  delete: { key: "Delete", label: "Delete" },
} as const;

export type ItemAction = keyof typeof ITEM_KEYBINDINGS;

/**
 * Parse a keybind string and check if it matches a keyboard event.
 * Supports: "F2", "Ctrl+N", "Ctrl+Shift+V", "Delete", etc.
 */
export function matchesKeybind(event: KeyboardEvent, keybind: string): boolean {
  const parts = keybind.split("+");
  const key = parts.pop()!;
  const modifiers = new Set(parts.map((p) => p.toLowerCase()));

  const needsCtrl = modifiers.has("ctrl");
  const needsShift = modifiers.has("shift");
  const needsAlt = modifiers.has("alt");

  if (event.ctrlKey !== needsCtrl) return false;
  if (event.shiftKey !== needsShift) return false;
  if (event.altKey !== needsAlt) return false;

  // Handle special keys
  if (key === "Delete") return event.key === "Delete";

  return event.key === key || event.key.toLowerCase() === key.toLowerCase();
}
