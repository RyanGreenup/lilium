import { Accessor, createEffect, createSignal, JSXElement } from "solid-js";
import { Transition } from "solid-transition-group";

export const SlideTransition = (props: {
  children: JSXElement;
  isGoingDeeper: Accessor<boolean>;
  contentId: string;
}) => {
  const [showContent, setShowContent] = createSignal(true);
  const [prevContentId, setPrevContentId] = createSignal<string | null>(null);

  // Handle content change with animation
  createEffect(() => {
    const currentId = props.contentId;
    const prevId = prevContentId();

    if (currentId !== prevId) {
      // Skip animation on initial load (when prevId is null)
      if (prevId === null) {
        setPrevContentId(currentId);
        return;
      }

      setShowContent(false);
      // TODO Remove all setTimeout -- anti-pattern
      setTimeout(() => {
        setPrevContentId(currentId);
        setShowContent(true);
      }, 0);
    }
  });

  return (
    <Transition
      onEnter={(el, done) => {
        const direction = props.isGoingDeeper() ? 1 : -1; // 1 = slide from right, -1 = slide from left
        const a = el.animate(
          [
            {
              transform: `translateX(${direction * 100}%)`,
              opacity: 0,
            },
            {
              transform: "translateX(0%)",
              opacity: 1,
            },
          ],
          {
            duration: 300,
            easing: "cubic-bezier(0.4, 0, 0.2, 1)",
          },
        );
        a.finished.then(done);
      }}
      onExit={(el, done) => {
        const direction = props.isGoingDeeper() ? -1 : 1; // Opposite direction for exit
        const a = el.animate(
          [
            {
              transform: "translateX(0%)",
              opacity: 1,
            },
            {
              transform: `translateX(${direction * 100}%)`,
              opacity: 0,
            },
          ],
          {
            duration: 300,
            easing: "cubic-bezier(0.4, 0, 0.2, 1)",
          },
        );
        a.finished.then(done);
      }}
    >
      {showContent() && props.children}
    </Transition>
  );
};
