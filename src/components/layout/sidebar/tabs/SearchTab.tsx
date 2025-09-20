import {
  createSignal,
  For,
  JSXElement,
  onMount,
  createEffect,
  createMemo,
  Show,
  Suspense,
  onCleanup,
  Accessor,
  Setter,
} from "solid-js";
import { useKeybinding } from "~/solid-daisy-components/utilities/useKeybinding";
import { createAsync } from "@solidjs/router";
import { useNavigate } from "@solidjs/router";
import { Collapsible } from "~/solid-daisy-components/components/Collapsible";
import { Fieldset } from "~/solid-daisy-components/components/Fieldset";
import { Radio } from "~/solid-daisy-components/components/Radio";
import { Toggle } from "~/solid-daisy-components/components/Toggle";
import { Select } from "~/solid-daisy-components/components/Select";
import { Kbd } from "~/solid-daisy-components/components/Kbd";
import { ContentItem, ContentItemData } from "../shared/ContentItem";
import { useFollowMode } from "~/lib/hooks/useFollowMode";
import { FollowModeToggle } from "~/components/shared/FollowModeToggle";
import {
  searchNotesQuery,
  searchNotesSimpleQuery,
  searchNotesAdvancedQuery,
} from "~/lib/db/notes/search";
import type { Note } from "~/lib/db/types";

interface SidebarSearchContentProps {
  focusTrigger?: () => string | null;
  searchTerm?: Accessor<string>;
  setSearchTerm?: Setter<string>;
}

export const SidebarSearchContent = (props: SidebarSearchContentProps = {}) => {
  const navigate = useNavigate();
  const [useFtsSearch, setUseFtsSearch] = createSignal(true);
  const [syntaxFilter, setSyntaxFilter] = createSignal<string>("");
  const [hasAbstractFilter, setHasAbstractFilter] = createSignal<
    boolean | undefined
  >(undefined);
  const [pathDisplay, setPathDisplay] = createSignal(0); // 0: Absolute, 1: Relative, 2: Title
  const [settingsExpanded, setSettingsExpanded] = createSignal(false);
  
  // Use external search term if provided, otherwise local state
  const localSearchSignal = createSignal("");
  const searchTerm = props.searchTerm || localSearchSignal[0];
  const setSearchTerm = props.setSearchTerm || localSearchSignal[1];

  // Create ref for search input
  let searchInputRef: HTMLInputElement | undefined;
  
  // Virtual focus for results navigation (keeps input focused)
  const [virtualFocusIndex, setVirtualFocusIndex] = createSignal(-1);

  // Follow mode hook
  const { followMode, setFollowMode } = useFollowMode({
    getFocusedItem: () => {
      const results = formattedResults();
      const index = virtualFocusIndex();
      return index >= 0 && index < results.length ? results[index] : null;
    },
    shouldNavigate: () => true, // Always navigate for search results
  });

  // Handle external focus requests
  createEffect(() => {
    const trigger = props.focusTrigger?.();
    if (trigger && searchInputRef) {
      // Focus on next tick after render
      setTimeout(() => {
        searchInputRef.focus();
      }, 0);
    }
  });

  // Reset virtual focus when results change
  createEffect(() => {
    const results = formattedResults();
    const currentIndex = virtualFocusIndex();
    // If current index is beyond results, reset
    if (currentIndex >= results.length) {
      setVirtualFocusIndex(-1);
    }
  });


  const pathDisplayOptions = [
    { id: 0, label: "Absolute" },
    { id: 1, label: "Relative" },
    { id: 2, label: "Title" },
  ];

  const syntaxOptions = [
    { value: "", label: "All" },
    { value: "markdown", label: "Markdown" },
    { value: "org", label: "Org Mode" },
    { value: "html", label: "HTML" },
    { value: "jsx", label: "JSX" },
  ];

  const abstractFilterOptions = [
    { value: undefined, label: "All" },
    { value: true, label: "With Abstract" },
    { value: false, label: "Without Abstract" },
  ];

  // Separate search execution from reactive search term
  const [searchQuery, setSearchQuery] = createSignal("");
  const [searchResults, setSearchResults] = createSignal<Note[]>([]);

  // Debounced search effect
  createEffect(() => {
    const term = searchTerm();
    
    if (!term || term.length < 2) {
      setSearchQuery("");
      setSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(() => {
      setSearchQuery(term);
    }, 300);

    onCleanup(() => clearTimeout(timeoutId));
  });

  // Execute search when debounced query changes
  createEffect(async () => {
    const query = searchQuery();
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const results = await searchNotesQuery(query);
      setSearchResults(results || []);
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    }
  });

  // Convert Note objects to ContentItemData format
  const formattedResults = createMemo(() => {
    const results = searchResults();
    if (!results) return [];

    return results.map(
      (note: Note): ContentItemData => ({
        id: note.id,
        title: note.title,
        abstract: note.abstract || "",
        path: `/note/${note.id}`,
      }),
    );
  });

  const handleSearchInput = (e: Event) => {
    const target = e.currentTarget as HTMLInputElement;
    const value = target.value;
    setSearchTerm(value);
    // Clear virtual focus when user types (reset selection)
    setVirtualFocusIndex(-1);
  };

  // Handle navigation keys from search input (virtual focus)
  const handleSearchKeyDown = (e: KeyboardEvent) => {
    const results = formattedResults();
    const hasResults = results.length > 0;
    
    if (!hasResults) return;
    
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const currentIndex = virtualFocusIndex();
      const nextIndex = currentIndex + 1;
      if (nextIndex < results.length) {
        setVirtualFocusIndex(nextIndex);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const currentIndex = virtualFocusIndex();
      const nextIndex = currentIndex - 1;
      if (nextIndex >= 0) {
        setVirtualFocusIndex(nextIndex);
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      const currentIndex = virtualFocusIndex();
      if (currentIndex >= 0 && currentIndex < results.length) {
        const item = results[currentIndex];
        // Navigate to the selected result
        navigate(`/note/${item.id}`);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setVirtualFocusIndex(-1);
    } else if (e.key === "," && e.ctrlKey) {
      e.preventDefault();
      console.log("Toggling settings:", !settingsExpanded());
      setSettingsExpanded(!settingsExpanded());
    }
  };

  return (
    <div class="space-y-4">
      <div class="p-4 space-y-4">
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search..."
          class="input input-bordered w-full"
          value={searchTerm()}
          onInput={handleSearchInput}
          onKeyDown={handleSearchKeyDown}
        />

        <Collapsible 
          class="p-0" 
          title={<>Search Settings <Kbd size="xs">Ctrl+,</Kbd></>}
          expanded={settingsExpanded()}
          onToggle={setSettingsExpanded}
        >
          <Fieldset class="bg-base-200 border-base-300 rounded-box border p-4 space-y-3">
            <Fieldset.Legend>Search Type</Fieldset.Legend>

            <VStack label={<>Use FTS5 Search</>}>
              <Toggle
                size="sm"
                color="primary"
                checked={useFtsSearch()}
                onChange={(e) => setUseFtsSearch(e.currentTarget.checked)}
              />
              <span class="text-xs text-base-content/60 mt-1">
                {useFtsSearch()
                  ? "Full-text search with ranking"
                  : "Simple LIKE search"}
              </span>
            </VStack>

            <VStack label={<>Follow Mode <Kbd size="xs">Ctrl+F</Kbd></>}>
              <Toggle
                size="sm"
                color="primary"
                checked={followMode()}
                onChange={(e) => setFollowMode(e.currentTarget.checked)}
              />
              <span class="text-xs text-base-content/60 mt-1">
                {followMode()
                  ? "Navigate to notes as you browse results"
                  : "Navigate only on Enter"}
              </span>
            </VStack>
          </Fieldset>

          <Fieldset class="bg-base-200 border-base-300 rounded-box border p-4 space-y-3">
            <Fieldset.Legend>Filters</Fieldset.Legend>

            <VStack label={<>Syntax Type</>}>
              <Select
                size="sm"
                value={syntaxFilter()}
                onChange={(e) => setSyntaxFilter(e.currentTarget.value)}
              >
                <For each={syntaxOptions}>
                  {(option) => (
                    <option value={option.value}>{option.label}</option>
                  )}
                </For>
              </Select>
            </VStack>

            <VStack label={<>Abstract</>}>
              <Select
                size="sm"
                value={hasAbstractFilter()?.toString() ?? ""}
                onChange={(e) => {
                  const value = e.currentTarget.value;
                  setHasAbstractFilter(
                    value === "" ? undefined : value === "true",
                  );
                }}
              >
                <For each={abstractFilterOptions}>
                  {(option) => (
                    <option value={option.value?.toString() ?? ""}>
                      {option.label}
                    </option>
                  )}
                </For>
              </Select>
            </VStack>
          </Fieldset>

          <Fieldset class="bg-base-200 border-base-300 rounded-box border p-4 space-y-3">
            <Fieldset.Legend>Path Display</Fieldset.Legend>
            <For each={pathDisplayOptions}>
              {(option) => (
                <div class="form-control">
                  <label class="label cursor-pointer justify-start gap-2">
                    <Radio
                      name="path-display"
                      size="sm"
                      checked={pathDisplay() === option.id}
                      onChange={() => setPathDisplay(option.id)}
                    />
                    <span class="label-text text-sm">{option.label}</span>
                  </label>
                </div>
              )}
            </For>
          </Fieldset>
        </Collapsible>
      </div>

      {/* Search Results */}
      <Show when={searchTerm().length >= 2}>
        <div>
          <div class="px-4 pb-2">
            <h3 class="text-sm font-medium text-base-content/70">
              Results for "{searchTerm()}"
              <Show when={formattedResults().length > 0}>
                <span class="text-xs text-base-content/50 ml-2">
                  ({formattedResults().length} found)
                </span>
              </Show>
            </h3>
          </div>
          <Suspense
            fallback={
              <div class="px-4 py-8 text-center">
                <div class="loading loading-spinner loading-sm"></div>
                <div class="text-sm text-base-content/60 mt-2">
                  Searching...
                </div>
              </div>
            }
          >
            <div class="p-4 space-y-3">
              <Show 
                when={formattedResults().length === 0}
                fallback={
                  <div class="space-y-2">
                    <For each={formattedResults()}>
                      {(item, index) => (
                        <ContentItem 
                          item={item} 
                          showPath={pathDisplay() !== 2} 
                          isFocused={virtualFocusIndex() === index()}
                        />
                      )}
                    </For>
                  </div>
                }
              >
                <div class="text-center text-base-content/60 text-sm py-8">
                  No search results found
                </div>
              </Show>
            </div>
          </Suspense>
        </div>
      </Show>

      <Show when={searchTerm().length > 0 && searchTerm().length < 2}>
        <div class="px-4 py-8 text-center">
          <div class="text-sm text-base-content/60">
            Enter at least 2 characters to search
          </div>
        </div>
      </Show>
    </div>
  );
};

export const VStack = (props: { children: any; label: JSXElement }) => (
  <div class="form-control">
    <label class="label">
      <span class="label-text text-sm font-medium">{props.label}</span>
    </label>
    <div class="space-y-1">{props.children}</div>
  </div>
);
