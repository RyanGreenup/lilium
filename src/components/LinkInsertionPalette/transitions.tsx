/**
 * Reusable transition components for modals and overlays
 */

import { Transition } from "solid-transition-group";
import { JSXElement } from "solid-js";

const ANIMATION_DURATION = {
  enter: 200,
  exit: 150,
};

const EASING = {
  enter: "cubic-bezier(0.4, 0, 0.2, 1)",
  exit: "cubic-bezier(0.4, 0, 1, 1)",
};

export function PopupTransition(props: { children: JSXElement }) {
  return (
    <Transition
      onEnter={(el, done) => {
        const a = el.animate(
          [
            { opacity: 0, transform: "scale(0.95)" },
            { opacity: 1, transform: "scale(1)" },
          ],
          { duration: ANIMATION_DURATION.enter, easing: EASING.enter }
        );
        a.finished.then(done);
      }}
      onExit={(el, done) => {
        const a = el.animate(
          [
            { opacity: 1, transform: "scale(1)" },
            { opacity: 0, transform: "scale(0.95)" },
          ],
          { duration: ANIMATION_DURATION.exit, easing: EASING.exit }
        );
        a.finished.then(done);
      }}
    >
      {props.children}
    </Transition>
  );
}

export function BackdropTransition(props: { children: JSXElement }) {
  return (
    <Transition
      onEnter={(el, done) => {
        const a = el.animate(
          [{ opacity: 0 }, { opacity: 1 }],
          { duration: ANIMATION_DURATION.enter, easing: "ease-out" }
        );
        a.finished.then(done);
      }}
      onExit={(el, done) => {
        const a = el.animate(
          [{ opacity: 1 }, { opacity: 0 }],
          { duration: ANIMATION_DURATION.exit, easing: "ease-in" }
        );
        a.finished.then(done);
      }}
    >
      {props.children}
    </Transition>
  );
}
