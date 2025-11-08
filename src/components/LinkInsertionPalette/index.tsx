/**
 * LinkInsertionPalette - A flexible, keyboard-driven selection component
 *
 * Architecture:
 * - Data-agnostic: Accepts callbacks for data fetching
 * - Action-agnostic: Parent decides what to do with selected items
 * - Format-aware: Supports markdown and org-mode link formats
 * - Portal-rendered: Avoids CSS containment issues
 *
 * Dual-mode operation:
 *   1. Notes tab: Search through notes using provided callback
 *   2. External tab: Manual URL entry with auto-formatting
 *
 * Example Usage:
 *
 * ```tsx
 * import { LinkInsertionPalette, formatLink } from "~/components/LinkInsertionPalette";
 *
 * // Navigate to note
 * const handleNavigate = (item: LinkItem) => {
 *   navigate(`/note/${item.value}`);
 * };
 *
 * // Insert formatted link
 * const handleInsertLink = (item: LinkItem) => {
 *   const formattedLink = formatLink(item, "markdown");
 *   insertAtCursor(formattedLink);
 * };
 *
 * <LinkInsertionPalette
 *   isOpen={isOpen()}
 *   onClose={() => setIsOpen(false)}
 *   onSelect={handleInsertLink}
 *   searchNotes={searchNotes}
 *   linkFormat="markdown"
 * />
 * ```
 */

import { createSignal, createEffect, For, Show, createMemo } from "solid-js";
import { Portal } from "solid-js/web";
import { Tabs } from "~/solid-daisy-components/components/Tabs";
import { Button } from "~/solid-daisy-components/components/Button";
import { Loading } from "~/solid-daisy-components/components/Loading";
import { Search, X } from "lucide-solid";

import { useDebouncedSearch, useKeyboardNavigation, useScrollIntoView } from "./hooks";
import { PopupTransition, BackdropTransition } from "./transitions";
import type { LinkItem, LinkFormat, TabType, ExternalLinkState } from "./types";
import { formatLink } from "./types";

// Re-export types and utilities
export type { LinkItem, LinkFormat, TabType, ExternalLinkState };
export { formatLink };

interface LinkInsertionPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: LinkItem) => void;
  searchNotes: (searchTerm: string) => Promise<LinkItem[]> | LinkItem[];
  searchExternalSites?: (searchTerm: string) => Promise<LinkItem[]> | LinkItem[];
  linkFormat?: LinkFormat;
}

export const LinkInsertionPalette = (props: LinkInsertionPaletteProps) => {
  // Tab and search state
  const [activeTab, setActiveTab] = createSignal<TabType>("notes");
  const [searchTerm, setSearchTerm] = createSignal("");
  const [focusedIndex, setFocusedIndex] = createSignal(0);

  // External link state
  const [externalLink, setExternalLink] = createSignal<ExternalLinkState>({
    displayName: "",
    url: "",
  });

  // Search with debouncing
  const notesSearch = useDebouncedSearch(
    searchTerm,
    props.searchNotes
  );

  const externalSearch = props.searchExternalSites
    ? useDebouncedSearch(searchTerm, props.searchExternalSites)
    : null;

  // Computed current results based on active tab
  const currentResults = createMemo(() =>
    activeTab() === "notes"
      ? notesSearch.results()
      : externalSearch?.results() || []
  );

  const isLoading = createMemo(() =>
    activeTab() === "notes"
      ? notesSearch.isLoading()
      : externalSearch?.isLoading() || false
  );

  // Refs
  let searchInputRef: HTMLInputElement | undefined;
  let resultsContainerRef: HTMLDivElement | undefined;
  const itemRefs = new Map<number, HTMLElement>();

  // Reset focused index when search term or tab changes
  createEffect(() => {
    searchTerm();
    activeTab();
    setFocusedIndex(0);
  });

  // Auto-focus search input when modal opens
  createEffect(() => {
    if (props.isOpen && searchInputRef) {
      setTimeout(() => searchInputRef?.focus(), 50);
    }
  });

  // Keyboard navigation
  useKeyboardNavigation(() => props.isOpen, {
    onClose: props.onClose,
    onSelect: handleSelect,
    onToggleTab: () => setActiveTab((prev) => (prev === "notes" ? "external" : "notes")),
    onMoveDown: () => {
      const results = currentResults();
      setFocusedIndex((prev) => Math.min(prev + 1, results.length - 1));
    },
    onMoveUp: () => {
      setFocusedIndex((prev) => Math.max(prev - 1, 0));
    },
  });

  // Auto-scroll focused item
  useScrollIntoView(
    () => props.isOpen,
    focusedIndex,
    () => resultsContainerRef,
    itemRefs
  );

  // Handlers
  function handleSelect() {
    if (activeTab() === "notes") {
      const results = currentResults();
      const selectedItem = results[focusedIndex()];
      if (selectedItem) {
        props.onSelect(selectedItem);
      }
    } else {
      // External link - format and return
      const { displayName, url } = externalLink();
      if (displayName.trim() && url.trim()) {
        const format = props.linkFormat || "markdown";
        const formattedLink = formatLink(
          { id: "external", title: displayName, value: url },
          format
        );
        props.onSelect({
          id: "external",
          title: displayName,
          value: formattedLink,
          subtitle: url,
        });
      }
    }
  }

  const canSelect = createMemo(() => {
    if (activeTab() === "notes") {
      return currentResults().length > 0 && !isLoading();
    }
    const { displayName, url } = externalLink();
    return displayName.trim() !== "" && url.trim() !== "";
  });

  return (
    <Portal>
      <BackdropTransition>
        {props.isOpen && (
          <div class="fixed inset-0 bg-black/50 z-50" onClick={props.onClose} />
        )}
      </BackdropTransition>

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

              {/* Input Area */}
              <div class="p-4 border-b border-base-300">
                <Show
                  when={activeTab() === "notes"}
                  fallback={
                    <div class="space-y-2">
                      <input
                        type="text"
                        placeholder="Display name"
                        class="input input-bordered w-full"
                        value={externalLink().displayName}
                        onInput={(e) =>
                          setExternalLink((prev) => ({
                            ...prev,
                            displayName: e.currentTarget.value,
                          }))
                        }
                      />
                      <input
                        type="url"
                        placeholder="https://example.com"
                        class="input input-bordered w-full"
                        value={externalLink().url}
                        onInput={(e) =>
                          setExternalLink((prev) => ({
                            ...prev,
                            url: e.currentTarget.value,
                          }))
                        }
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
                        onClick={() => setSearchTerm("")}
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
                          <p class="text-sm">
                            {searchTerm().length > 0
                              ? "No results found"
                              : "Start typing to search..."}
                          </p>
                        </div>
                      }
                    >
                      <div class="p-2">
                        <For each={currentResults()}>
                          {(item, index) => (
                            <button
                              ref={(el) => itemRefs.set(index(), el)}
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
