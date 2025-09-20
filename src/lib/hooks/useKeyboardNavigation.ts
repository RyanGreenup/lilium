/**
 * Reusable hook for keyboard navigation in list components
 */

import { createSignal, createEffect, onMount, Accessor } from "solid-js";
import { useKeybinding } from "~/solid-daisy-components/utilities/useKeybinding";

interface UseKeyboardNavigationOptions<T> {
  items: Accessor<T[]>;
  containerRef: () => HTMLElement | undefined;
  onEnter?: (item: T, index: number) => void;
  focusTrigger?: () => string | null;
}

export function useKeyboardNavigation<T>(options: UseKeyboardNavigationOptions<T>) {
  const [focusedItemIndex, setFocusedItemIndex] = createSignal(-1);

  // Auto-focus first item when items change
  createEffect(() => {
    const items = options.items();
    const currentFocus = focusedItemIndex();

    // If no item is focused and we have items, focus the first one
    if (currentFocus === -1 && items.length > 0) {
      setFocusedItemIndex(0);
    }
    // If focused index is beyond available items, reset to first or -1
    else if (currentFocus >= items.length) {
      setFocusedItemIndex(items.length > 0 ? 0 : -1);
    }
  });

  // Handle external focus requests
  createEffect(() => {
    const trigger = options.focusTrigger?.();
    const containerRef = options.containerRef();
    if (trigger && containerRef) {
      setTimeout(() => {
        containerRef.focus();
      }, 0);
    }
  });

  // Set up keyboard bindings
  onMount(() => {
    useKeybinding(
      { key: "ArrowDown" },
      () => {
        const items = options.items();
        const currentIndex = focusedItemIndex();
        const nextIndex = currentIndex + 1;
        if (nextIndex < items.length) {
          setFocusedItemIndex(nextIndex);
        }
      },
      { ref: options.containerRef },
    );

    useKeybinding(
      { key: "ArrowUp" },
      () => {
        const currentIndex = focusedItemIndex();
        const nextIndex = currentIndex - 1;
        if (nextIndex >= 0) {
          setFocusedItemIndex(nextIndex);
        }
      },
      { ref: options.containerRef },
    );

    useKeybinding(
      { key: "Enter" },
      () => {
        const items = options.items();
        const currentIndex = focusedItemIndex();
        if (currentIndex >= 0 && currentIndex < items.length && options.onEnter) {
          const item = items[currentIndex];
          options.onEnter(item, currentIndex);
        }
      },
      { ref: options.containerRef },
    );
  });

  return {
    focusedItemIndex,
    setFocusedItemIndex,
  };
}