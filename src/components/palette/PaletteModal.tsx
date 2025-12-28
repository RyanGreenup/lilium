/**
 * PaletteModal - A reusable modal overlay for command palettes
 *
 * This component provides the modal/overlay behavior shared by:
 * - LinkPalette (insert link to a note)
 * - OpenNotePalette (navigate to a note)
 *
 * Features:
 * - Portal-based rendering to escape parent stacking contexts
 * - Click-outside to close
 * - Escape key to close
 * - Centered modal with backdrop
 */

import {
  Show,
  createEffect,
  onCleanup,
  type JSX,
  type Accessor,
} from "solid-js";
import { Portal } from "solid-js/web";
import { Transition } from "solid-transition-group";

export interface PaletteModalProps {
  /** Whether the modal is open */
  open: Accessor<boolean>;
  /** Called when the modal should close */
  onClose: () => void;
  /** The palette content to render inside the modal */
  children: JSX.Element;
}

export function PaletteModal(props: PaletteModalProps) {
  let backdropRef: HTMLDivElement | undefined;
  let contentRef: HTMLDivElement | undefined;

  // Handle escape key to close
  createEffect(() => {
    if (!props.open()) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        props.onClose();
      }
    };

    // Use capture to intercept before other handlers
    document.addEventListener("keydown", handleKeyDown, true);
    onCleanup(() => document.removeEventListener("keydown", handleKeyDown, true));
  });

  // Handle click outside to close
  const handleBackdropClick = (e: MouseEvent) => {
    // Only close if clicking the backdrop itself, not the content
    if (e.target === backdropRef) {
      props.onClose();
    }
  };

  return (
    <Show when={props.open()}>
      <Portal>
        <Transition
          onEnter={(el, done) => {
            const a = el.animate(
              [
                { opacity: 0 },
                { opacity: 1 },
              ],
              { duration: 100, easing: "ease-out" }
            );
            a.finished.then(done);
          }}
          onExit={(el, done) => {
            const a = el.animate(
              [
                { opacity: 1 },
                { opacity: 0 },
              ],
              { duration: 75, easing: "ease-in" }
            );
            a.finished.then(done);
          }}
        >
          {/* Backdrop */}
          <div
            ref={backdropRef}
            class="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-[15vh]"
            onClick={handleBackdropClick}
          >
            {/* Content wrapper - animation target */}
            <Transition
              onEnter={(el, done) => {
                const a = el.animate(
                  [
                    { opacity: 0, transform: "scale(0.95) translateY(-10px)" },
                    { opacity: 1, transform: "scale(1) translateY(0)" },
                  ],
                  { duration: 150, easing: "cubic-bezier(0.4, 0, 0.2, 1)" }
                );
                a.finished.then(done);
              }}
              onExit={(el, done) => {
                const a = el.animate(
                  [
                    { opacity: 1, transform: "scale(1) translateY(0)" },
                    { opacity: 0, transform: "scale(0.95) translateY(-10px)" },
                  ],
                  { duration: 100, easing: "cubic-bezier(0.4, 0, 0.2, 1)" }
                );
                a.finished.then(done);
              }}
            >
              <div ref={contentRef}>
                {props.children}
              </div>
            </Transition>
          </div>
        </Transition>
      </Portal>
    </Show>
  );
}
