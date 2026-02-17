import { Show } from "solid-js";

interface KeyboardHintsProps {
  cutPending?: boolean;
}

export default function KeyboardHints(props: KeyboardHintsProps) {
  return (
    <div class="flex items-center gap-4 px-4 py-2 bg-base-200 text-xs text-base-content/50 border-t border-base-300 flex-wrap">
      <span>
        <kbd class="kbd kbd-xs">j</kbd>/<kbd class="kbd kbd-xs">k</kbd>{" "}
        navigate
      </span>
      <span>
        <kbd class="kbd kbd-xs">l</kbd> enter folder
      </span>
      <span>
        <kbd class="kbd kbd-xs">Enter</kbd> open
      </span>
      <span>
        <kbd class="kbd kbd-xs">h</kbd>/
        <kbd class="kbd kbd-xs">Backspace</kbd> back
      </span>
      <span>
        <kbd class="kbd kbd-xs">gg</kbd> top
      </span>
      <span>
        <kbd class="kbd kbd-xs">G</kbd> bottom
      </span>
      <span>
        <kbd class="kbd kbd-xs">z</kbd> jump palette
      </span>
      <span>
        <kbd class="kbd kbd-xs">u</kbd>/<kbd class="kbd kbd-xs">d</kbd>{" "}
        preview scroll
      </span>
      <span>
        <kbd class="kbd kbd-xs">x</kbd> cut
      </span>
      <Show
        when={props.cutPending}
        fallback={
          <span class="opacity-50">
            <kbd class="kbd kbd-xs">p</kbd> paste
          </span>
        }
      >
        <span class="text-warning font-medium">
          <kbd class="kbd kbd-xs">p</kbd> paste here
          {" "}·{" "}
          <kbd class="kbd kbd-xs">Esc</kbd> cancel
        </span>
      </Show>
    </div>
  );
}
