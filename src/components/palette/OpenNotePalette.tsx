/**
 * OpenNotePalette - Command palette for opening/navigating to notes
 *
 * This palette provides a list of notes to open.
 *
 * Features:
 * - Fuzzy search across all notes (or scoped to a folder)
 * - Keyboard navigation (up/down, Enter to select)
 * - Click-outside or Escape to close
 *
 * TODO FUTURE CONSIDERATIONS:
 * - The parentId for sidebar context may be connected to a URL parameter
 *   for "virtual root" to limit results. For now, it connects to the
 *   currentParent variable from the file browser's navigation history.
 */

import { createSignal, type Accessor } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { PaletteModal } from "./PaletteModal";
import { NotePalette } from "./NotePaletteContent";
import type { NoteWithPath } from "~/lib/db/notes/search";

export interface OpenNotePaletteProps {
  /**
   * Whether the palette is open.
   * Control this externally to show/hide the palette.
   */
  open: Accessor<boolean>;

  /**
   * Called when the palette should close (e.g. Escape pressed or clicked outside).
   */
  onClose: () => void;

  /**
   * Called when user selects a note to navigate to.
   * @param noteId - The ID of the selected note
   * @param note - The full note object (for additional context if needed)
   */
  onSelect: (noteId: string, note: NoteWithPath) => void;

  /**
   * Parent folder ID to scope the search.
   * - null: Search all notes globally
   * - string: Search only descendants of this folder
   *
   * NOTE: When used from the sidebar, this connects to the currentParent
   * from the file browser's navigation history. This allows users to
   * search within their current folder context without changing the note.
   *
   * FUTURE: This may be connected to a URL parameter for virtual root.
   */
  parentId: Accessor<string | null>;
}

/**
 * OpenNotePalette - Palette for navigating to notes
 *
 * Wraps the base NotePalette with navigation-specific behavior.
 */
export function OpenNotePalette(props: OpenNotePaletteProps) {
  const handleSelect = (note: NoteWithPath) => {
    props.onSelect(note.id, note);
    props.onClose();
  };

  return (
    <PaletteModal open={props.open} onClose={props.onClose}>
      <NotePalette
        parentId={props.parentId()}
        onSelect={handleSelect}
        actionHint="open"
      />
    </PaletteModal>
  );
}

// =============================================================================
// Hook for easy usage with navigation
// =============================================================================

export interface UseOpenNotePaletteOptions {
  /**
   * Parent folder ID for scoped search.
   * Pass null for global search, or an accessor to a folder ID.
   */
  parentId?: Accessor<string | null>;

  /**
   * Optional callback called after navigation.
   */
  onNavigate?: (noteId: string, note: NoteWithPath) => void;
}

/**
 * Hook to manage OpenNotePalette state with auto-navigation
 *
 * This hook integrates with @solidjs/router to automatically navigate
 * to the selected note.
 *
 * Returns:
 * - isOpen: Signal for palette visibility
 * - open: Function to open the palette
 * - close: Function to close the palette
 * - paletteProps: Props to spread onto OpenNotePalette component
 *
 * Example (global):
 * ```tsx
 * const openPalette = useOpenNotePalette();
 * useKeybinding({ key: "p", ctrl: true }, openPalette.open);
 * <OpenNotePalette {...openPalette.paletteProps} />
 * ```
 *
 * Example (sidebar with parent context):
 * ```tsx
 * const currentParent = createMemo(() => list.history.at(-1) ?? null);
 * const openPalette = useOpenNotePalette({ parentId: currentParent });
 * ```
 */
export function useOpenNotePalette(options: UseOpenNotePaletteOptions = {}) {
  const [isOpen, setIsOpen] = createSignal(false);
  const navigate = useNavigate();

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);

  const parentId = options.parentId ?? (() => null);

  const handleSelect = (noteId: string, note: NoteWithPath) => {
    // Navigate to the note
    navigate(`/note/${noteId}`);

    // Call optional callback
    options.onNavigate?.(noteId, note);
  };

  const paletteProps: OpenNotePaletteProps = {
    open: isOpen,
    onClose: close,
    onSelect: handleSelect,
    parentId,
  };

  return {
    isOpen,
    open,
    close,
    paletteProps,
  };
}

// =============================================================================
// Global provider for app-wide palette
// =============================================================================

/**
 * NOTE: For a global palette (accessible anywhere ),
 * we may want to:
 *
 * 1. Create a context provider at the app root
 * 2. Use the provider to expose open/close functions
 * 3. Register global keybindings in the provider
 *
 * For now, palettes are managed by the component
 * that needs them, using the hooks above.
 *
 * In the future consider:
 *
 * ```tsx
 * // In App.tsx or root layout
 * export function OpenNotePaletteProvider(props: { children: JSX.Element }) {
 *   const palette = useOpenNotePalette();
 *
 *   // Global keybinding
 *   useKeybinding({ key: "p", ctrl: true }, palette.open);
 *
 *   return (
 *     <OpenNotePaletteContext.Provider value={palette}>
 *       {props.children}
 *       <OpenNotePalette {...palette.paletteProps} />
 *     </OpenNotePaletteContext.Provider>
 *   );
 * }
 * ```
 */
