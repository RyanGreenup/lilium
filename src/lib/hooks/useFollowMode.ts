import { createSignal, createEffect, Accessor } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { useKeybinding } from "~/solid-daisy-components/utilities/useKeybinding";

export interface FollowModeItem {
  id: string;
  is_folder?: boolean;
}

export interface UseFollowModeProps {
  /**
   * Function that returns the currently focused/selected item
   */
  getFocusedItem: Accessor<FollowModeItem | null>;
  
  /**
   * Optional ref for keybinding scope (defaults to global)
   */
  keyBindingRef?: () => HTMLElement | undefined;
  
  /**
   * Optional filter function to determine if item should be navigated to
   * Defaults to: navigate to non-folders only
   */
  shouldNavigate?: (item: FollowModeItem) => boolean;
}

/**
 * Reusable hook for follow mode functionality across different tabs
 * Provides state management, auto-navigation, and keybinding for follow mode
 */
export function useFollowMode(props: UseFollowModeProps) {
  const navigate = useNavigate();
  const [followMode, setFollowMode] = createSignal(false);

  // Default filter: navigate to non-folders only
  const shouldNavigate = props.shouldNavigate || ((item: FollowModeItem) => !item.is_folder);

  // Auto-navigation effect
  createEffect(() => {
    if (!followMode()) return;
    
    const focusedItem = props.getFocusedItem();
    if (focusedItem && shouldNavigate(focusedItem)) {
      navigate(`/note/${focusedItem.id}`);
    }
  });

  // Keybinding for toggle
  useKeybinding(
    { key: "f", ctrl: true },
    () => {
      console.log("Toggling follow mode...");
      setFollowMode(!followMode());
    },
    props.keyBindingRef ? { ref: props.keyBindingRef } : undefined
  );

  return {
    followMode,
    setFollowMode,
  };
}