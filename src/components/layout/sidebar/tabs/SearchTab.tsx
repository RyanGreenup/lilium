import { createSignal, For, JSXElement, onMount, createEffect, createMemo, Show, Suspense } from "solid-js";
import { useSearchParams, createAsync } from "@solidjs/router";
import { Collapsible } from "~/solid-daisy-components/components/Collapsible";
import { Fieldset } from "~/solid-daisy-components/components/Fieldset";
import { Radio } from "~/solid-daisy-components/components/Radio";
import { Toggle } from "~/solid-daisy-components/components/Toggle";
import { Select } from "~/solid-daisy-components/components/Select";
import { ContentList, ContentItemData } from "../shared/ContentItem";
import { searchNotesQuery, searchNotesSimpleQuery, searchNotesAdvancedQuery } from "~/lib/db/notes/search";
import type { Note } from "~/lib/db/types";

export const SidebarSearchContent = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [useFtsSearch, setUseFtsSearch] = createSignal(true);
  const [syntaxFilter, setSyntaxFilter] = createSignal<string>("");
  const [hasAbstractFilter, setHasAbstractFilter] = createSignal<boolean | undefined>(undefined);
  const [pathDisplay, setPathDisplay] = createSignal(0); // 0: Absolute, 1: Relative, 2: Title
  const [searchTerm, setSearchTerm] = createSignal("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = createSignal("");

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

  // Debounce search term to avoid excessive API calls
  createEffect(() => {
    const term = searchTerm();
    const timeoutId = setTimeout(() => {
      setDebouncedSearchTerm(term);
    }, 300);
    
    return () => clearTimeout(timeoutId);
  });

  // Perform search based on current settings
  const searchResults = createAsync(() => {
    const term = debouncedSearchTerm();
    if (!term || term.length < 2) return Promise.resolve([]);

    const syntax = syntaxFilter();
    const hasAbstract = hasAbstractFilter();

    // Use advanced search if filters are applied, otherwise use simple/FTS search
    if (syntax || hasAbstract !== undefined) {
      return searchNotesAdvancedQuery({
        query: term,
        syntax: syntax || undefined,
        hasAbstract,
        limit: 50
      });
    } else if (useFtsSearch()) {
      return searchNotesQuery(term);
    } else {
      return searchNotesSimpleQuery(term);
    }
  });

  // Convert Note objects to ContentItemData format
  const formattedResults = createMemo(() => {
    const results = searchResults();
    if (!results) return [];
    
    return results.map((note: Note): ContentItemData => ({
      id: note.id,
      title: note.title,
      abstract: note.abstract || "",
      path: `/note/${note.id}`,
    }));
  });

  // Initialize search term from URL parameters
  onMount(() => {
    if (searchParams.q) {
      setSearchTerm(searchParams.q);
    }
  });

  // Update URL when search term changes
  createEffect(() => {
    const term = searchTerm();
    if (term && term.length > 0) {
      setSearchParams({ q: term });
    } else {
      setSearchParams({ q: undefined });
    }
  });

  const handleSearchInput = (e: Event) => {
    const target = e.currentTarget as HTMLInputElement;
    setSearchTerm(target.value);
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
                {useFtsSearch() ? "Full-text search with ranking" : "Simple LIKE search"}
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
                    value === "" ? undefined : value === "true"
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
          <Suspense fallback={
            <div class="px-4 py-8 text-center">
              <div class="loading loading-spinner loading-sm"></div>
              <div class="text-sm text-base-content/60 mt-2">Searching...</div>
            </div>
          }>
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
      <span class="label-text text-sm font-medium">
        {props.label}
      </span>
    </label>
    <div class="space-y-1">
      {props.children}
    </div>
  </div>
);
