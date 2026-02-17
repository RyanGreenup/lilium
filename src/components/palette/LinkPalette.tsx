/**
 * LinkPalette - Command palette for inserting links to notes
 *
 * This palette is used to insert a link to a note in the editing region at the
 * cursor position.
 *
 * Features:
 * - Fuzzy search with (fuse) across all notes (or scoped to a folder)
 * - Formats links based on the current note's syntax (Markdown, Org, etc.)
 * - Inserts the link at the textarea cursor position
 *
 * FUTURE CONSIDERATIONS:
 * - parentId may be connected to a URL parameter for virtual root
 * - Toggle for using full path vs title as link text
 */

import { createSignal, type Accessor } from "solid-js";
import { PaletteModal } from "./PaletteModal";
import { NotePalette } from "./NotePaletteContent";
import { formatNoteLink } from "~/lib/linkFormat";
import { useKeybinding } from "~/solid-daisy-components/utilities/useKeybinding";
import type { NoteSyntax } from "~/lib/db/types";
import type { NoteWithPath } from "~/lib/db/notes/search";

export interface LinkPaletteProps {
  /**
   * Whether the palette is open.
   * Control this externally to show/hide the palette.
   */
  open: Accessor<boolean>;

  /**
   * Called when the palette should close (Escape pressed or clicked outside).
   */
  onClose: () => void;

  /**
   * Called when user selects a note to insert a link to.
   * @param linkText - The formatted link text to insert
   * @param note - The selected note (for additional context if needed)
   */
  onInsertLink: (linkText: string, note: NoteWithPath) => void;

  /**
   * The syntax of the current note (for link formatting).
   * This determines how the link is formatted (Markdown, Org, etc.)
   */
  syntax: Accessor<NoteSyntax>;

  /**
   * Parent folder ID to scope the search.
   * - null: Search all notes globally
   * - string: Search only descendants of this folder
   *
   * FUTURE: This may be connected to a URL parameter for virtual root.
   */
  parentId: Accessor<string | null>;
}

/**
 * LinkPalette - Palette for inserting note links
 *
 * Wraps the base NotePalette with link-specific behavior:
 * - Formats selected notes as links based on syntax
 * - Calls onInsertLink callback with formatted link text
 */
export function LinkPalette(props: LinkPaletteProps) {
  // NOTE: In the future, we may want to add a toggle for full path vs title
  // For now, we default to using the title as link text
  const useFullPath = false;

  const handleSelect = (note: NoteWithPath) => {
    // Format the link based on the current note's syntax
    const linkText = formatNoteLink(note, props.syntax(), useFullPath);

    // Call the insertion callback
    props.onInsertLink(linkText, note);

    // Close the palette
    props.onClose();
  };

  return (
    <PaletteModal open={props.open} onClose={props.onClose}>
      <NotePalette
        parentId={props.parentId()}
        onSelect={handleSelect}
        actionHint="insert link"
      />
    </PaletteModal>
  );
}

// =============================================================================
// Hook for easy usage
// =============================================================================

export interface UseLinkPaletteOptions {
  /** The syntax of the current note */
  syntax: Accessor<NoteSyntax>;
  /** Parent folder ID for scoped search (null for global) */
  parentId?: Accessor<string | null>;
  /** Called when a link should be inserted */
  onInsertLink: (linkText: string, note: NoteWithPath) => void;
  /** Whether the palette keybinding (Ctrl+K) is enabled (default: always enabled) */
  enabled?: Accessor<boolean>;
}

/**
 * Hook to manage LinkPalette state and keybinding
 *
 * Automatically registers Ctrl+K keybinding when enabled.
 *
 * Returns:
 * - isOpen: Signal for palette visibility
 * - open: Function to open the palette
 * - close: Function to close the palette
 * - paletteProps: Props to spread onto LinkPalette component
 *
 * Example:
 * ```tsx
 * const linkPalette = useLinkPalette({
 *   syntax: () => currentNote()?.syntax ?? "md",
 *   onInsertLink: (text) => insertTextAtCursor(text),
 *   enabled: isEditing, // Only active when editing
 * });
 *
 * <LinkPalette {...linkPalette.paletteProps} />
 * ```
 */
export function useLinkPalette(options: UseLinkPaletteOptions) {
  const [isOpen, setIsOpen] = createSignal(false);

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);

  const parentId = options.parentId ?? (() => null);
  const enabled = options.enabled ?? (() => true);

  // Register Ctrl+K keybinding - handler only executes when enabled
  useKeybinding({ key: "k", ctrl: true }, () => {
    if (enabled()) {
      open();
    }
  });

  const paletteProps: LinkPaletteProps = {
    open: isOpen,
    onClose: close,
    onInsertLink: options.onInsertLink,
    syntax: options.syntax,
    parentId,
  };

  return {
    isOpen,
    open,
    close,
    paletteProps,
  };
}
