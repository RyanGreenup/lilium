import { For, Show } from "solid-js";
import X from "lucide-solid/icons/x";

interface FinderTabBarProps {
  /** Tab labels in order. */
  labels: string[];
  /** Index of the currently active tab. */
  activeIndex: number;
  /** Called when the user clicks a tab. */
  onSwitch: (index: number) => void;
  /** Called when the user clicks the close button on a tab. */
  onClose: (index: number) => void;
}

/**
 * Renders a tab bar for the finder. Only shown when there are 2 or more tabs.
 */
export default function FinderTabBar(props: FinderTabBarProps) {
  return (
    <Show when={props.labels.length >= 2}>
      <div class="flex items-end gap-0.5 px-2 pt-1 bg-base-200 border-b border-base-300 overflow-x-auto">
        <For each={props.labels}>
          {(label, i) => {
            const isActive = () => i() === props.activeIndex;
            return (
              <button
                type="button"
                class={`
                  group flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-t
                  border border-b-0 transition-colors select-none whitespace-nowrap
                  ${
                    isActive()
                      ? "bg-base-100 border-base-300 text-base-content z-10"
                      : "bg-base-200 border-transparent text-base-content/50 hover:text-base-content/80 hover:bg-base-300/50"
                  }
                `}
                onClick={() => props.onSwitch(i())}
              >
                <span class="max-w-36 truncate">{label}</span>
                <span
                  class={`
                    flex items-center justify-center w-3.5 h-3.5 rounded
                    transition-opacity
                    ${isActive() ? "opacity-40 hover:opacity-100" : "opacity-0 group-hover:opacity-40 hover:!opacity-80"}
                  `}
                  onClick={(e) => {
                    e.stopPropagation();
                    props.onClose(i());
                  }}
                  role="button"
                  aria-label={`Close tab ${label}`}
                >
                  <X size={10} />
                </span>
              </button>
            );
          }}
        </For>
      </div>
    </Show>
  );
}
