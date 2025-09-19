import { onMount } from "solid-js";

/**
 * Hook to automatically focus an element when it mounts, but respects user editing state
 * 
 * @param elementRef - Function that returns the element to focus
 * @param options - Configuration options
 * @param options.respectEditing - If true, won't steal focus from input/textarea/contentEditable elements
 */
export function useAutoFocus(
  elementRef: () => HTMLElement | undefined,
  options: { respectEditing?: boolean } = {}
) {
  const { respectEditing = true } = options;

  onMount(() => {
    const element = elementRef();
    if (!element) return;

    if (respectEditing) {
      const activeElement = document.activeElement;
      const isEditableElement = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.contentEditable === 'true'
      );
      
      if (isEditableElement) {
        console.log("useAutoFocus: Not focusing because user is editing:", activeElement);
        return;
      }
    }

    console.log("useAutoFocus: Attempting to focus element");
    element.focus();
    console.log("useAutoFocus: Focus completed, active element:", document.activeElement);
  });
}