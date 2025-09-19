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
} from "solid-js";
import { createAsync, useSearchParams } from "@solidjs/router";
import { Collapsible } from "~/solid-daisy-components/components/Collapsible";
import { Fieldset } from "~/solid-daisy-components/components/Fieldset";
import { Radio } from "~/solid-daisy-components/components/Radio";
import { Toggle } from "~/solid-daisy-components/components/Toggle";
import { Select } from "~/solid-daisy-components/components/Select";
import { ContentList, ContentItemData } from "../shared/ContentItem";
import {
  searchNotesQuery,
  searchNotesSimpleQuery,
  searchNotesAdvancedQuery,
} from "~/lib/db/notes/search";
import type { Note } from "~/lib/db/types";

export const SidebarSearchContent = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [useFtsSearch, setUseFtsSearch] = createSignal(true);
  const [syntaxFilter, setSyntaxFilter] = createSignal<string>("");
  const [hasAbstractFilter, setHasAbstractFilter] = createSignal<
    boolean | undefined
  >(undefined);
  const [pathDisplay, setPathDisplay] = createSignal(0); // 0: Absolute, 1: Relative, 2: Title
  const [searchTerm, setSearchTerm] = createSignal(searchParams.q || "");

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

  // Update URL params (debounced) - separate from search execution
  createEffect(() => {
    const term = searchTerm();
    
    const timeoutId = setTimeout(() => {
      if (term && term.length >= 2) {
        setSearchParams({ q: term }, { replace: true });
      } else if (searchParams.q) {
        setSearchParams({ q: undefined }, { replace: true });
      }
    }, 500); // Longer delay for URL updates

    onCleanup(() => clearTimeout(timeoutId));
  });

  // Debounced search execution
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

  // Handle URL search param changes (when user navigates with URL)
  createEffect(() => {
    const urlQuery = searchParams.q;
    if (urlQuery && urlQuery !== searchTerm()) {
      setSearchTerm(urlQuery);
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
  };

  return (
    <div class="space-y-4">
      <div class="p-4 space-y-4">
        <input
          type="text"
          placeholder="Search..."
          class="input input-bordered w-full"
          value={searchTerm()}
          onInput={handleSearchInput}
        />

        <Collapsible class="p-0" title="Search Settings">
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
            <ContentList
              items={formattedResults()}
              showPath={pathDisplay() !== 2}
              emptyMessage="No search results found"
            />
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
