/**
 * Palette Components
 *
 * Command palettes for quick note operations:
 * - LinkPalette: Insert links to notes (Ctrl+K in editor)
 * - OpenNotePalette: Navigate to notes (global shortcut)
 *
 * These components share the same base UI (NotePaletteContent) but differ in:
 * - What happens when a note is selected (insert link vs navigate)
 * - Where they're triggered (editor vs global/sidebar)
 */

export { PaletteModal, type PaletteModalProps } from "./PaletteModal";

export {
  NotePalette,
  NotePaletteContent,
  type NotePaletteProps,
  type NotePaletteContentProps,
} from "./NotePaletteContent";

export {
  LinkPalette,
  useLinkPalette,
  type LinkPaletteProps,
  type UseLinkPaletteOptions,
} from "./LinkPalette";

export {
  OpenNotePalette,
  useOpenNotePalette,
  type OpenNotePaletteProps,
  type UseOpenNotePaletteOptions,
} from "./OpenNotePalette";

export {
  SandboxJumpPalette,
  type SandboxJumpPaletteProps,
  type SandboxJumpSelection,
} from "./SandboxJumpPalette";
