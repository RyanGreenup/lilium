import {
  createSignal,
  For,
  Show,
  onCleanup,
  createEffect,
  JSXElement,
} from "solid-js";
import { Transition } from "solid-transition-group";
import { Tabs } from "~/solid-daisy-components/components/Tabs";
import { Button } from "~/solid-daisy-components/components/Button";
import { Search, X } from "lucide-solid";

interface LinkItem {
  id: string;
  title: string;
  path?: string;
}

interface LinkInsertionPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (link: string) => void;
}

export const LinkInsertionPalette = (props: LinkInsertionPaletteProps) => {
  const [activeTab, setActiveTab] = createSignal<"notes" | "external">("notes");
  const [searchTerm, setSearchTerm] = createSignal("");
  const [selectedItem, setSelectedItem] = createSignal<LinkItem | null>(null);

  // Handle Escape key to close modal
  createEffect(() => {
    if (props.isOpen) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          props.onClose();
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      onCleanup(() => window.removeEventListener("keydown", handleKeyDown));
    }
  });

  // Dummy data for now
  const dummyNotes: LinkItem[] = [
    { id: "1", title: "Forgejo", path: "/note/1" },
    {
      id: "2",
      title: "Forgejo/Indexing Markdown Repositories",
      path: "/note/2",
    },
    { id: "3", title: "Forgejo/Render Jupyter", path: "/note/3" },
    { id: "4", title: "Forgejo/Render Math", path: "/note/4" },
    {
      id: "5",
      title: "Forgejo/Render Math/Async Javascript and Callback",
      path: "/note/5",
    },
    { id: "6", title: "Forums to Review", path: "/note/6" },
  ];

  const filteredNotes = () => {
    const term = searchTerm().toLowerCase();
    if (!term) return dummyNotes;
    return dummyNotes.filter((note) => note.title.toLowerCase().includes(term));
  };

  const handleInsert = () => {
    if (selectedItem()) {
      props.onInsert(selectedItem()!.path || "");
    }
  };

  const handleClearSearch = () => {
    setSearchTerm("");
  };

  return (
    <>
      {/* Backdrop */}
      <Transition
        onEnter={(el, done) => {
          const a = el.animate([{ opacity: 0 }, { opacity: 1 }], {
            duration: 200,
            easing: "ease-out",
          });
          a.finished.then(done);
        }}
        onExit={(el, done) => {
          const a = el.animate([{ opacity: 1 }, { opacity: 0 }], {
            duration: 150,
            easing: "ease-in",
          });
          a.finished.then(done);
        }}
      >
        {props.isOpen && (
          <div class="fixed inset-0 bg-black/50 z-50" onClick={props.onClose} />
        )}
      </Transition>

      {/* Modal Dialog */}
      <PopupTransition>
        {props.isOpen && (
          <div class="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div
              class="bg-base-100 rounded-lg shadow-xl w-full max-w-md h-[500px] pointer-events-auto flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div class="flex items-center justify-between border-b border-base-300 px-4 py-3">
                <button
                  class="btn btn-ghost btn-sm btn-square"
                  onClick={props.onClose}
                  aria-label="Close"
                >
                  <X size={20} />
                </button>

                <h2 class="text-lg font-semibold flex-1 text-center">
                  Add a link
                </h2>

                <Button
                  size="sm"
                  color="primary"
                  onClick={handleInsert}
                  disabled={!selectedItem()}
                >
                  Insert
                </Button>
              </div>

              {/* Tabs */}
              <div class="border-b border-base-300">
                <Tabs style="border" role="tablist">
                  <Tabs.Tab
                    active={activeTab() === "notes"}
                    onClick={() => setActiveTab("notes")}
                  >
                    notes
                  </Tabs.Tab>
                  <Tabs.Tab
                    active={activeTab() === "external"}
                    onClick={() => setActiveTab("external")}
                  >
                    External site
                  </Tabs.Tab>
                </Tabs>
              </div>

              {/* Search Input */}
              <div class="p-4 border-b border-base-300">
                <div class="relative">
                  <div class="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50">
                    <Search size={16} />
                  </div>
                  <input
                    type="text"
                    placeholder="fo"
                    class="input input-bordered w-full pl-10 pr-10"
                    value={searchTerm()}
                    onInput={(e) => setSearchTerm(e.currentTarget.value)}
                  />
                  <Show when={searchTerm()}>
                    <button
                      class="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/50 hover:text-base-content"
                      onClick={handleClearSearch}
                      aria-label="Clear search"
                    >
                      <X size={16} />
                    </button>
                  </Show>
                </div>
              </div>

              {/* Results List */}
              <div class="flex-1 overflow-y-auto">
                <Show when={activeTab() === "notes"}>
                  <div class="p-2">
                    <For each={filteredNotes()}>
                      {(item) => (
                        <button
                          class={`w-full text-left px-3 py-2 rounded hover:bg-base-200 transition-colors ${
                            selectedItem()?.id === item.id
                              ? "bg-primary/10 text-primary"
                              : ""
                          }`}
                          onClick={() => setSelectedItem(item)}
                        >
                          <div class="font-medium text-sm">{item.title}</div>
                        </button>
                      )}
                    </For>
                  </div>
                </Show>

                <Show when={activeTab() === "external"}>
                  <div class="p-4 text-center text-base-content/60">
                    <p class="text-sm">External site linking coming soon</p>
                  </div>
                </Show>
              </div>
            </div>
          </div>
        )}
      </PopupTransition>
    </>
  );
};

const PopupTransition = (props: { children: JSXElement }) => {
  return (
    <Transition
      onEnter={(el, done) => {
        const a = el.animate(
          [
            { opacity: 0, transform: "scale(0.95)" },
            { opacity: 1, transform: "scale(1)" },
          ],
          { duration: 200, easing: "cubic-bezier(0.4, 0, 0.2, 1)" },
        );
        a.finished.then(done);
      }}
      onExit={(el, done) => {
        const a = el.animate(
          [
            { opacity: 1, transform: "scale(1)" },
            { opacity: 0, transform: "scale(0.95)" },
          ],
          { duration: 150, easing: "cubic-bezier(0.4, 0, 1, 1)" },
        );
        a.finished.then(done);
      }}
    >
      {props.children}
    </Transition>
  );
};
