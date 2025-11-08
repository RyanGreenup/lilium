/**
 * Custom hooks for LinkInsertionPalette component
 */

import { createSignal, createEffect, onCleanup, Accessor } from "solid-js";
import type { LinkItem } from "./types";

/**
 * Debounced search hook with loading state
 */
export function useDebouncedSearch(
  searchTerm: Accessor<string>,
  searchFn: (term: string) => Promise<LinkItem[]> | LinkItem[],
  delay = 300
) {
  const [results, setResults] = createSignal<LinkItem[]>([]);
  const [isLoading, setIsLoading] = createSignal(false);

  createEffect(() => {
    const term = searchTerm();

    // Clear results immediately for better UX
    setResults([]);

    if (!term || term.length < 1) {
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsLoading(true);
      try {
        const result = searchFn(term);
        const items = result instanceof Promise ? await result : result;
        setResults(items);
      } catch (error) {
        console.error("Search error:", error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, delay);

    onCleanup(() => clearTimeout(timeoutId));
  });

  return { results, isLoading };
}

/**
 * Keyboard navigation hook with configurable keybindings
 */
export function useKeyboardNavigation(
  isActive: Accessor<boolean>,
  handlers: {
    onMoveUp: () => void;
    onMoveDown: () => void;
    onSelect: () => void;
    onClose: () => void;
    onToggleTab?: () => void;
  }
) {
  createEffect(() => {
    if (!isActive()) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Close
      if (e.key === "Escape") {
        handlers.onClose();
        return;
      }

      // Toggle tabs with Alt+Left/Right arrows
      if ((e.key === "ArrowLeft" || e.key === "ArrowRight") && e.altKey && handlers.onToggleTab) {
        e.preventDefault();
        handlers.onToggleTab();
        return;
      }

      // Select
      if (e.key === "Enter") {
        e.preventDefault();
        handlers.onSelect();
        return;
      }

      // Move down
      if (isDownKey(e)) {
        e.preventDefault();
        handlers.onMoveDown();
        return;
      }

      // Move up
      if (isUpKey(e)) {
        e.preventDefault();
        handlers.onMoveUp();
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    onCleanup(() => window.removeEventListener("keydown", handleKeyDown));
  });
}

/**
 * Auto-scroll focused element into view
 */
export function useScrollIntoView(
  isActive: Accessor<boolean>,
  focusedIndex: Accessor<number>,
  containerRef: () => HTMLElement | undefined,
  itemRefs: Map<number, HTMLElement>
) {
  createEffect(() => {
    const index = focusedIndex();
    if (!isActive()) return;

    const container = containerRef();
    const element = itemRefs.get(index);

    if (!container || !element) return;

    const containerRect = container.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();

    const isAboveViewport = elementRect.top < containerRect.top;
    const isBelowViewport = elementRect.bottom > containerRect.bottom;

    if (isAboveViewport || isBelowViewport) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      });
    }
  });
}

/** Check if keyboard event is a "move down" command */
function isDownKey(e: KeyboardEvent): boolean {
  return (
    e.key === "ArrowDown" ||
    (e.altKey && e.key === "n") ||
    (e.ctrlKey && e.key === "j") ||
    (e.altKey && e.key === "j")
  );
}

/** Check if keyboard event is a "move up" command */
function isUpKey(e: KeyboardEvent): boolean {
  return (
    e.key === "ArrowUp" ||
    (e.altKey && e.key === "p") ||
    (e.ctrlKey && e.key === "k") ||
    (e.altKey && e.key === "k")
  );
}
