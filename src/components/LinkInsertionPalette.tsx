/**
 * LinkInsertionPalette - A flexible, keyboard-driven selection component
 *
 * Architecture:
 * - Data-agnostic: Component manages UI state only (search term, focused index, animations)
 * - Action-agnostic: Parent decides what to do with selected items (navigate, insert, etc.)
 * - Format-aware: Supports both markdown and org-mode link formats
 * - Flexible data sources: Accept callbacks for both sync and async data fetching
 * - Rendered via Portal: Modal is rendered at document.body level for proper z-index behavior
 * - Dual-mode operation:
 *   1. Notes tab: Search through notes/content using provided callback
 *   2. External tab: Manual entry of display name + URL (auto-formatted)
 *
 * Link Formats:
 * - Markdown: [title](url)
 * - Org-mode: [[url][title]]
 *
 * Use cases:
 *   1. Navigate to note: onSelect receives item, navigates to `/note/${item.value}`
 *   2. Insert link: Use formatLink() helper to format and insert
 *   3. Copy to clipboard: onSelect copies item details
 *   4. Any custom action
 *
 * Example Usage:
 *
 * // Client-side filtering (synchronous)
 * const searchNotes = (term: string): LinkItem[] => {
 *   return allNotes
 *     .filter(n => n.title.toLowerCase().includes(term.toLowerCase()))
 *     .map(n => ({
 *       id: n.id,
 *       title: n.title,
 *       value: n.id,  // Could be UUID, file path, etc.
 *       subtitle: n.path  // Optional: show full path
 *     }));
 * };
 *
 * // Use case 1: Navigate to note
 * const handleNavigate = (item: LinkItem) => {
 *   navigate(`/note/${item.value}`);
 * };
 *
 * // Use case 2: Insert formatted link
 * const handleInsertLink = (item: LinkItem) => {
 *   const formattedLink = formatLink(item, linkFormat);
 *   insertAtCursor(formattedLink);
 * };
 *
 * <LinkInsertionPalette
 *   isOpen={isOpen()}
 *   onClose={() => setIsOpen(false)}
 *   onSelect={handleInsertLink}
 *   searchNotes={searchNotes}
 *   linkFormat="markdown"  // or "org"
 * />
 */

import {
  createSignal,
  For,
  Show,
  onCleanup,
  createEffect,
  JSXElement,
} from "solid-js";
import { Portal } from "solid-js/web";
import { Transition } from "solid-transition-group";
import { Tabs } from "~/solid-daisy-components/components/Tabs";
import { Button } from "~/solid-daisy-components/components/Button";
import { Search, X } from "lucide-solid";
import { Loading } from "~/solid-daisy-components/components/Loading";

export interface LinkItem {
  id: string;
  title: string;
  value: string; // The identifier (UUID, file path, etc.)
  subtitle?: string; // Optional secondary info to display (e.g., full path)
}

export type LinkFormat = "markdown" | "org";

interface LinkInsertionPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: LinkItem) => void;  // Parent decides what to do with selected item

  // Data provider for notes tab - supports both sync and async
  searchNotes: (searchTerm: string) => Promise<LinkItem[]> | LinkItem[];

  // Optional: for external sites (if not provided, shows placeholder)
  searchExternalSites?: (
    searchTerm: string,
  ) => Promise<LinkItem[]> | LinkItem[];

  // Link format for external links (notes are handled by parent)
  linkFormat?: LinkFormat;
}

/**
 * Format a link item according to the specified format
 *
 * @param item - The link item to format
 * @param format - "markdown" for [title](url) or "org" for [[url][title]]
 * @returns Formatted link string
 */
export function formatLink(item: LinkItem, format: LinkFormat = "markdown"): string {
  if (format === "org") {
    return `[[${item.value}][${item.title}]]`;
  }
  // markdown (default)
  return `[${item.title}](${item.value})`;
}

export const LinkInsertionPalette = (props: LinkInsertionPaletteProps) => {
  const [activeTab, setActiveTab] = createSignal<"notes" | "external">("notes");
  const [searchTerm, setSearchTerm] = createSignal("");
  const [focusedIndex, setFocusedIndex] = createSignal(0);
  const [notesResults, setNotesResults] = createSignal<LinkItem[]>([]);
  const [externalResults, setExternalResults] = createSignal<LinkItem[]>([]);
  const [isLoading, setIsLoading] = createSignal(false);

  // External link state
  const [externalDisplayName, setExternalDisplayName] = createSignal("");
  const [externalUrl, setExternalUrl] = createSignal("");

  let searchInputRef: HTMLInputElement | undefined;
  let resultsContainerRef: HTMLDivElement | undefined;
  const itemRefs: (HTMLButtonElement | undefined)[] = [];

  // Get current results based on active tab
  const currentResults = () => {
    return activeTab() === "notes" ? notesResults() : externalResults();
  };

  // Handle keyboard navigation
  createEffect(() => {
    if (props.isOpen) {
      const handleKeyDown = (e: KeyboardEvent) => {
        const results = currentResults();

        if (e.key === "Escape") {
          props.onClose();
        } else if (e.key === "Tab") {
          e.preventDefault();
          // Toggle between tabs
          setActiveTab((prev) => (prev === "notes" ? "external" : "notes"));
        } else if (
          e.key === "ArrowDown" ||
          (e.altKey && e.key === "n") ||
          (e.ctrlKey && e.key === "j") ||
          (e.altKey && e.key === "j")
        ) {
          e.preventDefault();
          setFocusedIndex((prev) => Math.min(prev + 1, results.length - 1));
        } else if (
          e.key === "ArrowUp" ||
          (e.altKey && e.key === "p") ||
          (e.ctrlKey && e.key === "k") ||
          (e.altKey && e.key === "k")
        ) {
          e.preventDefault();
          setFocusedIndex((prev) => Math.max(prev - 1, 0));
        } else if (e.key === "Enter") {
          e.preventDefault();
          handleSelect();
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      onCleanup(() => window.removeEventListener("keydown", handleKeyDown));
    }
  });

  // Scroll focused item into view
  createEffect(() => {
    const index = focusedIndex();
    if (props.isOpen && itemRefs[index] && resultsContainerRef) {
      const focusedElement = itemRefs[index];
      const container = resultsContainerRef;

      if (focusedElement) {
        const containerRect = container.getBoundingClientRect();
        const elementRect = focusedElement.getBoundingClientRect();

        const isAboveViewport = elementRect.top < containerRect.top;
        const isBelowViewport = elementRect.bottom > containerRect.bottom;

        if (isAboveViewport || isBelowViewport) {
          focusedElement.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
            inline: "nearest",
          });
        }
      }
    }
  });

  // Reset focused index when search term changes
  createEffect(() => {
    searchTerm();
    setFocusedIndex(0);
  });

  // Auto-focus search input when modal opens
  createEffect(() => {
    if (props.isOpen && searchInputRef) {
      setTimeout(() => searchInputRef?.focus(), 50);
    }
  });

  // Debounced search effect
  createEffect(() => {
    const term = searchTerm();
    const tab = activeTab();

    // Clear results immediately when search term changes for better UX
    if (tab === "notes") {
      setNotesResults([]);
    } else {
      setExternalResults([]);
    }

    const timeoutId = setTimeout(async () => {
      if (!term || term.length < 1) {
        // Optionally, you can still call with empty string to get all results
        // For now, just clear results
        if (tab === "notes") {
          setNotesResults([]);
        } else {
          setExternalResults([]);
        }
        return;
      }

      setIsLoading(true);

      try {
        if (tab === "notes") {
          const result = props.searchNotes(term);
          // Handle both sync and async results
          const items = result instanceof Promise ? await result : result;
          setNotesResults(items);
        } else if (tab === "external" && props.searchExternalSites) {
          const result = props.searchExternalSites(term);
          const items = result instanceof Promise ? await result : result;
          setExternalResults(items);
        }
      } catch (error) {
        console.error("Search error:", error);
        // On error, set empty results
        if (tab === "notes") {
          setNotesResults([]);
        } else {
          setExternalResults([]);
        }
      } finally {
        setIsLoading(false);
      }
    }, 300);

    onCleanup(() => clearTimeout(timeoutId));
  });

  const handleSelect = () => {
    if (activeTab() === "notes") {
      const results = currentResults();
      const selectedItem = results[focusedIndex()];
      if (selectedItem) {
        props.onSelect(selectedItem);
      }
    } else {
      // External link - create item with formatted link as value
      const displayName = externalDisplayName();
      const url = externalUrl();
      if (displayName && url) {
        const format = props.linkFormat || "markdown";
        const formattedLink = formatLink(
          { id: "external", title: displayName, value: url },
          format
        );
        props.onSelect({
          id: "external",
          title: displayName,
          value: formattedLink,  // For external, value IS the formatted link
          subtitle: url,
        });
      }
    }
  };

  const handleClearSearch = () => {
    setSearchTerm("");
  };

  const canSelect = () => {
    if (activeTab() === "notes") {
      return currentResults().length > 0 && !isLoading();
    } else {
      return externalDisplayName().trim() !== "" && externalUrl().trim() !== "";
    }
  };

  return (
    <Portal>
      {/* Backdrop */}
      <BackdropTransition>
        {props.isOpen && (
          <div class="fixed inset-0 bg-black/50 z-50" onClick={props.onClose} />
        )}
      </BackdropTransition>

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
                  onClick={handleSelect}
                  disabled={!canSelect()}
                >
                  Select
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

              {/* Search Input / URL Input */}
              <div class="p-4 border-b border-base-300">
                <Show
                  when={activeTab() === "notes"}
                  fallback={
                    <div class="space-y-2">
                      <input
                        type="text"
                        placeholder="Display name"
                        class="input input-bordered w-full"
                        value={externalDisplayName()}
                        onInput={(e) => setExternalDisplayName(e.currentTarget.value)}
                      />
                      <input
                        type="url"
                        placeholder="https://example.com"
                        class="input input-bordered w-full"
                        value={externalUrl()}
                        onInput={(e) => setExternalUrl(e.currentTarget.value)}
                      />
                    </div>
                  }
                >
                  <div class="relative">
                    <div class="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50">
                      <Search size={16} />
                    </div>
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search notes..."
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
                </Show>
              </div>

              {/* Results List */}
              <div class="flex-1 overflow-y-auto" ref={resultsContainerRef}>
                <Show when={activeTab() === "notes"}>
                  <Show
                    when={!isLoading()}
                    fallback={
                      <div class="p-4 text-center">
                        <Loading variant="dots" />
                        <div class="text-sm text-base-content/60 mt-2">
                          Searching...
                        </div>
                      </div>
                    }
                  >
                    <Show
                      when={currentResults().length > 0}
                      fallback={
                        <div class="p-4 text-center text-base-content/60">
                          <Show
                            when={searchTerm().length > 0}
                            fallback={
                              <p class="text-sm">Start typing to search...</p>
                            }
                          >
                            <p class="text-sm">No results found</p>
                          </Show>
                        </div>
                      }
                    >
                      <div class="p-2">
                        <For each={currentResults()}>
                          {(item, index) => (
                            <button
                              ref={(el) => (itemRefs[index()] = el)}
                              class={`w-full text-left px-3 py-2 rounded hover:bg-base-200 transition-colors ${
                                focusedIndex() === index()
                                  ? "bg-primary/10 text-primary"
                                  : ""
                              }`}
                              onClick={() => {
                                setFocusedIndex(index());
                                handleSelect();
                              }}
                            >
                              <div class="font-medium text-sm">{item.title}</div>
                              <Show when={item.subtitle}>
                                <div class="text-xs text-base-content/60 mt-0.5">
                                  {item.subtitle}
                                </div>
                              </Show>
                            </button>
                          )}
                        </For>
                      </div>
                    </Show>
                  </Show>
                </Show>
              </div>
            </div>
          </div>
        )}
      </PopupTransition>
    </Portal>
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

const BackdropTransition = (props: { children: JSXElement }) => {
  return (
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
      {props.children}
    </Transition>
  );
};
