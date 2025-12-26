import { type Accessor, createSignal, For, Show } from "solid-js";
import { Portal } from "solid-js/web";
import { Transition } from "solid-transition-group";
import HelpCircle from "lucide-solid/icons/help-circle";
import {
  ITEM_KEYBINDINGS,
  LIST_KEYBINDINGS,
  NAV_KEYBINDINGS,
  getDisplayKeys,
} from "~/lib/keybindings";
import { Kbd } from "~/solid-daisy-components/components/Kbd";

/** Renders a key combination as styled Kbd elements */
function KeyCombo(props: { keys: readonly string[] }) {
  return (
    <span class="inline-flex items-center gap-0.5">
      <For each={props.keys}>
        {(k, i) => (
          <>
            <Show when={i() > 0}>
              <span class="text-base-content/40 text-[10px]">/</span>
            </Show>
            <Kbd size="xs">{k}</Kbd>
          </>
        )}
      </For>
    </span>
  );
}

export interface KeybindingHelpProps {
  /** Accessor for follow mode active state */
  followModeActive: Accessor<boolean>;
}

/** Keybinding help popup - shows on hover */
export function KeybindingHelp(props: KeybindingHelpProps) {
  const [showHelp, setShowHelp] = createSignal(false);
  const [position, setPosition] = createSignal({ x: 0, y: 0 });
  let triggerRef: HTMLButtonElement | undefined;

  const updatePosition = () => {
    if (triggerRef) {
      const rect = triggerRef.getBoundingClientRect();
      setPosition({
        x: rect.left,
        y: rect.bottom + 4,
      });
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        class="opacity-40 hover:opacity-100 transition-opacity p-1"
        onMouseEnter={() => {
          updatePosition();
          setShowHelp(true);
        }}
        onMouseLeave={() => setShowHelp(false)}
        aria-label="Keyboard shortcuts help"
      >
        <HelpCircle size={14} />
      </button>

      <Portal>
        <Transition
          onEnter={(el, done) => {
            const a = el.animate(
              [
                { opacity: 0, transform: "scale(0.95) translateY(-4px)" },
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
                { opacity: 0, transform: "scale(0.95) translateY(-4px)" },
              ],
              { duration: 100, easing: "cubic-bezier(0.4, 0, 0.2, 1)" }
            );
            a.finished.then(done);
          }}
        >
          {showHelp() && (
            <div
              class="fixed bg-base-100 border border-base-300 rounded-lg shadow-lg p-3 text-xs z-50"
              style={{
                left: `${position().x}px`,
                top: `${position().y}px`,
              }}
              onMouseEnter={() => setShowHelp(true)}
              onMouseLeave={() => setShowHelp(false)}
            >
              <div class="font-semibold mb-2 text-sm">Keyboard Shortcuts</div>

              {/* Navigation */}
              <div class="mb-2">
                <div class="text-base-content/60 mb-1">Navigation</div>
                <For each={Object.values(NAV_KEYBINDINGS)}>
                  {(kb) => (
                    <div class="flex items-center gap-2 py-0.5">
                      <span class="min-w-[4.5rem]">
                        <KeyCombo keys={getDisplayKeys(kb)} />
                      </span>
                      <span class="text-base-content/70">{kb.description}</span>
                    </div>
                  )}
                </For>
              </div>

              {/* Modes */}
              <div class="mb-2">
                <div class="text-base-content/60 mb-1">Modes</div>
                <For each={Object.values(LIST_KEYBINDINGS)}>
                  {(kb) => (
                    <div
                      class={`flex items-center gap-2 py-0.5 px-1 -mx-1 rounded ${
                        kb.key === "f" && props.followModeActive()
                          ? "bg-primary/20 ring-1 ring-primary/50"
                          : ""
                      }`}
                    >
                      <span class="min-w-[4.5rem]">
                        <KeyCombo keys={getDisplayKeys(kb)} />
                      </span>
                      <span class="text-base-content/70">{kb.description}</span>
                      <Show when={kb.key === "f" && props.followModeActive()}>
                        <span class="ml-auto text-primary text-[10px] font-medium">ON</span>
                      </Show>
                    </div>
                  )}
                </For>
              </div>

              {/* Item Actions */}
              <div>
                <div class="text-base-content/60 mb-1">Item Actions</div>
                <For each={Object.values(ITEM_KEYBINDINGS)}>
                  {(kb) => (
                    <div class="flex items-center gap-2 py-0.5">
                      <span class="min-w-[4.5rem]">
                        <KeyCombo keys={getDisplayKeys(kb)} />
                      </span>
                      <span class="text-base-content/70">{kb.description}</span>
                    </div>
                  )}
                </For>
              </div>
            </div>
          )}
        </Transition>
      </Portal>
    </>
  );
}
