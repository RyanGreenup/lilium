import { animate } from "motion/mini";
import { For, Show, createEffect, on } from "solid-js";
import type { ListItem, NoteListItem } from "~/lib/db/types";
import { FADE_DURATION, EASE_OUT } from "./constants";
import ItemIcon from "./ItemIcon";
import NotePreview from "./NotePreview";

interface PreviewPanelProps {
  focusedItem: ListItem | undefined;
  previewItems: ListItem[] | null;
  isSliding: boolean;
  prefersReducedMotion: boolean;
  disableAnimations: boolean;
}

export default function PreviewPanel(props: PreviewPanelProps) {
  let innerRef: HTMLDivElement | undefined;

  // Fade preview when focused item changes.
  // Footgun: fading preview during horizontal track slide produced compositor
  // contention and occasional overdraw artifacts. Pause fade while sliding.
  createEffect(
    on(
      () =>
        [
          props.focusedItem?.id,
          props.isSliding,
          props.prefersReducedMotion,
          props.disableAnimations,
        ] as const,
      ([, isSliding, prefersReducedMotion, disableAnimations]) => {
        if (isSliding || prefersReducedMotion || disableAnimations) return;
        requestAnimationFrame(() => {
          if (innerRef) {
            animate(
              innerRef,
              { opacity: [0, 1] },
              { duration: FADE_DURATION, ease: EASE_OUT },
            );
          }
        });
      },
      { defer: true },
    ),
  );

  return (
    // isolate + overflow clipping keep preview compositing inside this panel.
    // Footgun: without containment, preview paint could bleed across panes.
    <div class="bg-base-100 overflow-hidden relative z-0 isolate flex flex-col h-full">
      <div class="px-3 py-1.5 text-xs font-semibold text-base-content/50 uppercase tracking-wider border-b border-base-300">
        Preview
      </div>
      <div ref={innerRef} class="overflow-y-auto flex-1 min-h-0">
        <Show
          when={props.focusedItem}
          fallback={
            <div class="flex items-center justify-center h-32 text-base-content/40 text-sm">
              No selection
            </div>
          }
        >
          {(item) => (
            <Show
              when={item().type === "folder"}
              fallback={<NotePreview item={item() as NoteListItem} />}
            >
              <Show
                when={props.previewItems}
                fallback={
                  <div class="flex items-center justify-center h-32 text-base-content/40 text-sm">
                    Empty folder
                  </div>
                }
              >
                {(children) => (
                  <Show
                    when={children().length > 0}
                    fallback={
                      <div class="flex items-center justify-center h-32 text-base-content/40 text-sm">
                        Empty folder
                      </div>
                    }
                  >
                    <For each={children()}>
                      {(child) => (
                        <div class="flex items-center px-3 py-1.5 text-sm text-base-content/70">
                          <ItemIcon item={child} />
                          <span class="truncate">{child.title}</span>
                        </div>
                      )}
                    </For>
                  </Show>
                )}
              </Show>
            </Show>
          )}
        </Show>
      </div>
    </div>
  );
}
