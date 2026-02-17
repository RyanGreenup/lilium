import { Show } from "solid-js";

interface KeyboardHintsProps {
  cutPending?: boolean;
  cutCount?: number;
  markCount?: number;
  isMarkMode?: boolean;
  /** Total number of open tabs. Used to conditionally show tab shortcuts. */
  tabCount?: number;
}

export default function KeyboardHints(props: KeyboardHintsProps) {
  return (
    <div class="flex items-center gap-4 px-4 py-2 bg-base-200 text-xs text-base-content/50 border-t border-base-300 flex-wrap">
      <Show when={props.isMarkMode}>
        <span class="text-info font-medium">-- MARK --</span>
      </Show>
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
        <kbd class="kbd kbd-xs">a</kbd> new note
      </span>
      <span>
        <kbd class="kbd kbd-xs">A</kbd> new folder
      </span>
      <span>
        <kbd class="kbd kbd-xs">u</kbd>/<kbd class="kbd kbd-xs">d</kbd>{" "}
        preview scroll
      </span>
      <Show
        when={props.markCount && props.markCount > 0}
        fallback={
          <span>
            <kbd class="kbd kbd-xs">v</kbd> mark
          </span>
        }
      >
        <span class="text-info font-medium">
          <kbd class="kbd kbd-xs">v</kbd> mark ({props.markCount})
        </span>
      </Show>
      <Show
        when={props.markCount && props.markCount > 0}
        fallback={
          <span>
            <kbd class="kbd kbd-xs">x</kbd> cut
          </span>
        }
      >
        <span>
          <kbd class="kbd kbd-xs">x</kbd> cut {props.markCount} marked
        </span>
      </Show>
      <Show
        when={props.cutPending}
        fallback={
          <span class="opacity-50">
            <kbd class="kbd kbd-xs">p</kbd> paste
          </span>
        }
      >
        <span class="text-warning font-medium">
          <kbd class="kbd kbd-xs">p</kbd> paste {(props.cutCount ?? 0) > 1 ? `${props.cutCount} items` : ""} here
          {" "}&middot;{" "}
          <kbd class="kbd kbd-xs">Esc</kbd> cancel
        </span>
      </Show>
      {/* Tab shortcuts — always shown so users can discover them */}
      <span class="ml-auto opacity-70">
        <kbd class="kbd kbd-xs">t</kbd> new tab
      </span>
      <Show when={(props.tabCount ?? 1) >= 2}>
        <span class="opacity-70">
          <kbd class="kbd kbd-xs">[</kbd>/<kbd class="kbd kbd-xs">]</kbd> switch tab
        </span>
        <span class="opacity-70">
          <kbd class="kbd kbd-xs">Ctrl</kbd>+<kbd class="kbd kbd-xs">c</kbd> close tab
        </span>
      </Show>
    </div>
  );
}
