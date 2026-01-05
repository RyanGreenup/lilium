import {
  createSignal,
  For,
  JSXElement,
  createEffect,
  Show,
  Suspense,
  onCleanup,
  onMount,
  Accessor,
  Setter,
} from "solid-js";
import { useNavigate } from "@solidjs/router";
import { Collapsible } from "~/solid-daisy-components/components/Collapsible";
import { Fieldset } from "~/solid-daisy-components/components/Fieldset";
import { Radio } from "~/solid-daisy-components/components/Radio";
import { Toggle } from "~/solid-daisy-components/components/Toggle";
import { Select } from "~/solid-daisy-components/components/Select";
import { Kbd } from "~/solid-daisy-components/components/Kbd";
import { ContentItem, ContentItemData } from "../shared/ContentItem";
import { useFollowMode } from "~/lib/hooks/useFollowMode";
import { searchNotesWithDisplayTitlesQuery } from "~/lib/db/notes/search";

interface SidebarSearchContentProps {
  focusTrigger?: () => string | null;
  searchTerm?: Accessor<string>;
  setSearchTerm?: Setter<string>;
}

// Client-only wrapper - defers rendering until after hydration
export const SidebarSearchContent = (props: SidebarSearchContentProps) => {
  const [mounted, setMounted] = createSignal(false);
  onMount(() => setMounted(true));

  return (
    <Show
      when={mounted()}
      fallback={
        <div class="p-4">
          <div class="input input-bordered w-full h-12" />
        </div>
      }
    >
      <SearchContentInner {...props} />
    </Show>
  );
};

const SearchContentInner = (props: SidebarSearchContentProps) => {
  const navigate = useNavigate();
  const [useFtsSearch, setUseFtsSearch] = createSignal(true);
  const [syntaxFilter, setSyntaxFilter] = createSignal<string>("");
  const [hasAbstractFilter, setHasAbstractFilter] = createSignal<
    boolean | undefined
  >(undefined);
  const [pathDisplay, setPathDisplay] = createSignal(0);
  const [settingsExpanded, setSettingsExpanded] = createSignal(false);

  const localSearchSignal = createSignal("");
  const searchTerm = props.searchTerm || localSearchSignal[0];
  const setSearchTerm = props.setSearchTerm || localSearchSignal[1];

  let searchInputRef: HTMLInputElement | undefined;
  const [virtualFocusIndex, setVirtualFocusIndex] = createSignal(-1);

  let resultsContainerRef: HTMLDivElement | undefined;
  const itemRefs: (HTMLDivElement | undefined)[] = [];

  const { followMode, setFollowMode } = useFollowMode({
    getFocusedItem: () => {
      const results = formattedResults();
      const index = virtualFocusIndex();
      return index >= 0 && index < results.length ? results[index] : null;
    },
    shouldNavigate: () => true,
  });

  createEffect(() => {
    const trigger = props.focusTrigger?.();
    if (trigger && searchInputRef) {
      setTimeout(() => searchInputRef?.focus(), 0);
    }
  });

  createEffect(() => {
    const results = formattedResults();
    if (virtualFocusIndex() >= results.length) {
      setVirtualFocusIndex(-1);
    }
  });

  createEffect(() => {
    const focusIndex = virtualFocusIndex();
    if (focusIndex >= 0 && itemRefs[focusIndex]) {
      itemRefs[focusIndex]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
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

  const [searchQuery, setSearchQuery] = createSignal("");
  const [searchResults, setSearchResults] = createSignal<ContentItemData[]>([]);

  createEffect(() => {
    const term = searchTerm();
    if (!term || term.length < 2) {
      setSearchQuery("");
      setSearchResults([]);
      return;
    }
    const timeoutId = setTimeout(() => setSearchQuery(term), 300);
    onCleanup(() => clearTimeout(timeoutId));
  });

  createEffect(async () => {
    const query = searchQuery();
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const results = await searchNotesWithDisplayTitlesQuery(query);
      setSearchResults(results || []);
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    }
  });

  const formattedResults = () => searchResults();

  const handleSearchInput = (e: Event) => {
    const target = e.currentTarget as HTMLInputElement;
    setSearchTerm(target.value);
    setVirtualFocusIndex(-1);
  };

  const handleSearchKeyDown = (e: KeyboardEvent) => {
    const results = formattedResults();
    if (!results.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = virtualFocusIndex() + 1;
      if (next < results.length) setVirtualFocusIndex(next);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const next = virtualFocusIndex() - 1;
      if (next >= 0) setVirtualFocusIndex(next);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const idx = virtualFocusIndex();
      if (idx >= 0 && idx < results.length) {
        navigate(`/note/${results[idx].id}`);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setVirtualFocusIndex(-1);
    } else if (e.key === "," && e.ctrlKey) {
      e.preventDefault();
      setSettingsExpanded(!settingsExpanded());
    }
  };

  return (
    <div class="flex flex-col h-full">
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
          title="Search Settings"
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
            <VStack
              label={
                <>
                  Follow Mode <Kbd size="xs">Alt+F</Kbd>
                </>
              }
            >
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

      <Show when={searchTerm().length >= 2}>
        <div class="flex-1 min-h-0 flex flex-col">
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
                <div class="loading loading-spinner loading-sm" />
                <div class="text-sm text-base-content/60 mt-2">
                  Searching...
                </div>
              </div>
            }
          >
            <div
              ref={resultsContainerRef}
              class="p-4 space-y-3 flex-1 min-h-0 overflow-y-auto"
            >
              <Show
                when={formattedResults().length === 0}
                fallback={
                  <div class="space-y-2">
                    <For each={formattedResults()}>
                      {(item, index) => (
                        <div ref={(el) => (itemRefs[index()] = el)}>
                          <ContentItem
                            item={item}
                            showPath={pathDisplay() !== 2}
                            isFocused={virtualFocusIndex() === index()}
                          />
                        </div>
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
