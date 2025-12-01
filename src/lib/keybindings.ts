/**
 * Centralized keybinding definitions.
 * Single source of truth for context menus, keyboard handlers, and help popup.
 */

export interface KeybindDef {
  /** Key combination for matching (e.g., "F2", "Ctrl+N") - used by matchesKeybind() */
  key: string;
  /** Array of keys for display - if not provided, derived by splitting key on "+" */
  keys?: readonly string[];
  /** Display label */
  label: string;
  /** Description for help popup */
  description: string;
}

/**
 * Get display keys for a keybinding.
 * Returns explicit keys array if provided, otherwise splits key string on "+".
 */
export function getDisplayKeys(kb: KeybindDef): readonly string[] {
  if (kb.keys) return kb.keys;
  if (!kb.key) return [];
  return kb.key.split("+");
}

/** Navigation keybindings (display-only, not used for matching) */
export const NAV_KEYBINDINGS = {
  up: { key: "", keys: ["↑", "k"], label: "Move up", description: "Focus previous item" },
  down: { key: "", keys: ["↓", "j"], label: "Move down", description: "Focus next item" },
  enter: { key: "", keys: ["Enter"], label: "Select", description: "Select focused item" },
  into: { key: "", keys: ["l"], label: "Enter folder", description: "Navigate into folder" },
  back: { key: "", keys: ["h", "⌫"], label: "Go back", description: "Navigate to parent" },
  escape: { key: "", keys: ["Esc"], label: "Exit list", description: "Switch to path zone" },
  index: { key: "", keys: ["0"], label: "Index note", description: "Select folder's index note" },
} as const;

/** List-level mode toggles */
export const LIST_KEYBINDINGS = {
  followMode: { key: "f", label: "Follow mode", description: "Arrow keys select items as you navigate" },
} as const;

/** Item-level actions (context menu + keyboard) */
export const ITEM_KEYBINDINGS = {
  rename: { key: "F2", label: "Rename", description: "Rename the focused item" },
  createSibling: { key: "N", label: "New sibling", description: "Create note at same level" },
  createSiblingFolder: { key: "Ctrl+Shift+N", label: "New sibling folder", description: "Create folder at same level" },
  createChild: { key: "Shift+N", label: "New child", description: "Create note inside folder" },
  createChildFolder: { key: "Alt+Shift+N", label: "New child folder", description: "Create folder inside folder" },
  copyLink: { key: "y", label: "Copy link", description: "Copy link to clipboard" },
  duplicate: { key: "Ctrl+D", label: "Duplicate", description: "Create a copy" },
  cut: { key: "Ctrl+X", label: "Cut", description: "Cut for moving" },
  paste: { key: "Ctrl+V", label: "Paste sibling", description: "Paste at same level" },
  pasteChild: { key: "Ctrl+Shift+V", label: "Paste child", description: "Paste inside folder" },
  delete: { key: "Delete", label: "Delete", description: "Delete item" },
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
