/**
 * Tailwind Variants for NotesListTabNew Component
 *
 * This file defines styling variants for the list viewer component using
 * tailwind-variants (tv). All styles follow the application's DaisyUI design
 * system and match established patterns from NotesTab.tsx and other components.
 *
 * Key Design Patterns:
 * - Focus Ring: ring-2 ring-primary ring-inset (matches NotesTab.tsx)
 * - Color System: DaisyUI base-100/200/300 with opacity modifiers
 * - Hover States: hover:bg-base-200 for interactive elements
 * - State Distinction: Selected (darker bg) vs Current (medium bg)
 */

import { tv } from "tailwind-variants";

/**
 * Container for breadcrumb navigation path
 * Matches application's base color scheme with subtle border
 */
export const pathContainerVariants = tv({
  base: "flex flex-col space-y-0.5 bg-base-100 border-b border-base-300 pb-2"
});

/**
 * Individual breadcrumb path items
 * States: focused (keyboard nav), current (active folder)
 * Pattern matches NotesTab.tsx focus ring: ring-2 ring-primary ring-inset
 */
export const pathItemVariants = tv({
  base: [
    "flex items-center gap-2 px-3 py-2",
    "cursor-pointer transition-colors rounded",
    "hover:bg-base-200"
  ],
  variants: {
    focused: {
      true: "ring-2 ring-primary ring-inset",
      false: ""
    },
    current: {
      true: "bg-base-200 font-medium",
      false: "text-base-content/70"
    }
  }
});

/**
 * Text within breadcrumb items
 */
export const pathTextVariants = tv({
  base: "text-sm truncate"
});

/**
 * Inline button to view folder index note
 * Uses primary color when selected to indicate active state
 */
export const indexButtonVariants = tv({
  base: [
    "p-1 rounded transition-colors ml-auto",
    "hover:bg-base-300"
  ],
  variants: {
    focused: {
      true: "ring-2 ring-primary ring-inset",
      false: ""
    },
    selected: {
      true: "bg-primary text-primary-content",
      false: "text-base-content/60"
    }
  }
});

/**
 * "Back to selection" jump button
 * Uses info color to visually distinguish navigation action
 */
export const jumpButtonVariants = tv({
  base: [
    "flex items-center gap-2 px-3 py-1.5",
    "text-xs text-info bg-info/10",
    "rounded border border-info/20",
    "hover:bg-info/20 transition-colors",
    "mb-2"
  ]
});

/**
 * Divider between breadcrumb path and list sections
 */
export const dividerVariants = tv({
  base: "border-t border-base-300 my-2"
});

/**
 * Container for scrollable items list
 */
export const listContainerVariants = tv({
  base: "flex flex-col space-y-0.5 overflow-y-auto flex-1"
});

/**
 * Individual list items (files and folders)
 * States: focused (keyboard nav), selected (active selection)
 * Pattern matches NotesTab.tsx: focus ring + distinct selected background
 */
export const listItemVariants = tv({
  base: [
    "flex items-center px-3 py-2",
    "cursor-pointer transition-colors rounded",
    "hover:bg-base-200"
  ],
  variants: {
    focused: {
      true: "ring-2 ring-primary ring-inset",
      false: ""
    },
    selected: {
      true: "bg-base-300",
      false: ""
    }
  }
});

/**
 * Item name/title text
 * Subtle emphasis for focused/selected states
 */
export const listItemNameVariants = tv({
  base: "text-sm truncate",
  variants: {
    focused: {
      true: "text-base-content",
      false: "text-base-content/90"
    },
    selected: {
      true: "font-medium",
      false: ""
    }
  }
});
