/**
 * FinderSearchPalette - Full-text search palette for the finder / overlay finder.
 *
 * Triggered by the `/` key. Uses the FTS5-backed searchNotesWithDisplayTitlesQuery
 * to find notes across the entire vault and navigate to them.
 *
 * Keyboard:
 *   ArrowUp / k   — move selection up
 *   ArrowDown / j — move selection down
 *   Enter         — open selected note
 *   Escape        — close palette
 */

import { createAsync } from "@solidjs/router";
import { FileText, Search } from "lucide-solid";
import {
  For,
  Show,
  Suspense,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  type Accessor,
} from "solid-js";
import { Kbd } from "~/solid-daisy-components/components/Kbd";
import { searchNotesWithDisplayTitlesQuery } from "~/lib/db/notes/search";
import { PaletteModal } from "./PaletteModal";

export interface FinderSearchPaletteProps {
  open: Accessor<boolean>;
  onClose: () => void;
  /** Called when the user selects a note — receives the note ID. */
  onSelectNote: (noteId: string) => void;
}

export function FinderSearchPalette(props: FinderSearchPaletteProps) {
  const [rawQuery, setRawQuery] = createSignal("");
  const [debouncedQuery, setDebouncedQuery] = createSignal("");
  const [selectedIndex, setSelectedIndex] = createSignal(0);

  let inputRef: HTMLInputElement | undefined;
  let listRef: HTMLDivElement | undefined;

  // ── Debounce raw query → debouncedQuery (200 ms) ─────────────────────────
  createEffect(() => {
    const q = rawQuery().trim();
    if (!q) {
      setDebouncedQuery("");
      return;
    }
    const id = setTimeout(() => setDebouncedQuery(q), 200);
    onCleanup(() => clearTimeout(id));
  });

  // ── Server query (FTS5) ───────────────────────────────────────────────────
  const results = createAsync(async () => {
    const q = debouncedQuery();
    if (!q || q.length < 2) return [];
    return await searchNotesWithDisplayTitlesQuery(q);
  });

  // Flatten accessor with safe default.
  const items = createMemo(() => results() ?? []);

  // ── Reset state when palette opens ───────────────────────────────────────
  createEffect(() => {
    if (props.open()) {
      setRawQuery("");
      setDebouncedQuery("");
      setSelectedIndex(0);
      // Auto-focus input after the DOM has settled.
      requestAnimationFrame(() => inputRef?.focus());
    }
  });

  // Clamp selectedIndex when results change.
  createEffect(() => {
    const len = items().length;
    if (selectedIndex() >= len) setSelectedIndex(Math.max(0, len - 1));
  });

  // Scroll selected item into view.
  createEffect(() => {
    if (!props.open() || !listRef) return;
    const idx = selectedIndex();
    const el = listRef.querySelector(
      `[data-search-index="${idx}"]`,
    ) as HTMLElement | null;
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });

  // ── Actions ───────────────────────────────────────────────────────────────
  const selectCurrent = () => {
    const list = items();
    const item = list[selectedIndex()];
    if (!item) return;
    props.onSelectNote(item.id);
    props.onClose();
  };

  const handleInputKeyDown = (e: KeyboardEvent) => {
    const list = items();

    if (e.key === "ArrowUp" || (e.ctrlKey && e.key === "k")) {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(0, i - 1));
      return;
    }

    if (e.key === "ArrowDown" || (e.ctrlKey && e.key === "j")) {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(list.length - 1, i + 1));
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      selectCurrent();
      return;
    }

    // Escape is handled by PaletteModal, but we also reset query here.
    if (e.key === "Escape") {
      setRawQuery("");
      setDebouncedQuery("");
    }
  };

  const isSearching = createMemo(
    () => rawQuery().trim().length >= 2 && rawQuery().trim() !== debouncedQuery(),
  );

  return (
    <PaletteModal open={props.open} onClose={props.onClose}>
      <div class="w-[calc(100vw-2rem)] sm:w-full max-w-lg bg-base-100 rounded-lg shadow-2xl border border-base-content/10 overflow-hidden">
        {/* Search input row */}
        <div class="flex items-center gap-3 px-4 py-3 border-b border-base-content/10">
          <Search size={20} class="text-base-content/50 shrink-0" />
          <input
            ref={(el) => (inputRef = el)}
            type="text"
            placeholder="Search notes..."
            class="flex-1 bg-transparent outline-none text-base-content placeholder:text-base-content/40"
            value={rawQuery()}
            onInput={(e) => {
              setRawQuery(e.currentTarget.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleInputKeyDown}
            autofocus
          />
          <Show when={isSearching()}>
            <span class="loading loading-spinner loading-xs text-base-content/40" />
          </Show>
          <Kbd size="sm">esc</Kbd>
        </div>

        {/* Results list */}
        <Suspense
          fallback={
            <div class="px-4 py-8 text-center text-base-content/50">
              <span class="loading loading-spinner loading-sm" />
            </div>
          }
        >
          <div ref={listRef} class="max-h-80 overflow-y-auto py-2">
            <Show
              when={rawQuery().trim().length >= 2}
              fallback={
                <div class="px-4 py-6 text-center text-sm text-base-content/50">
                  Type at least 2 characters to search
                </div>
              }
            >
              <Show
                when={items().length > 0}
                fallback={
                  <Show when={!isSearching()}>
                    <div class="px-4 py-8 text-center text-base-content/50 text-sm">
                      No notes found for "{debouncedQuery()}"
                    </div>
                  </Show>
                }
              >
                <For each={items()}>
                  {(item, index) => {
                    const isSelected = () => index() === selectedIndex();
                    return (
                      <div
                        data-search-index={index()}
                        class={
                          isSelected()
                            ? "flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors bg-primary/10 text-primary"
                            : "flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors hover:bg-base-200"
                        }
                        onClick={() => {
                          setSelectedIndex(index());
                          selectCurrent();
                        }}
                        onMouseMove={() => setSelectedIndex(index())}
                      >
                        <FileText
                          size={18}
                          class={
                            isSelected()
                              ? "text-primary shrink-0"
                              : "text-base-content/60 shrink-0"
                          }
                        />
                        <div class="flex-1 min-w-0">
                          <div class="font-medium truncate">{item.title}</div>
                          <Show when={item.path}>
                            <div class="text-xs text-base-content/40 truncate">
                              {item.path}
                            </div>
                          </Show>
                        </div>
                      </div>
                    );
                  }}
                </For>
              </Show>
            </Show>
          </div>
        </Suspense>

        {/* Footer */}
        <div class="flex items-center justify-between px-4 py-2 border-t border-base-content/10 text-xs text-base-content/40">
          <div class="hidden sm:flex items-center gap-4">
            <span class="flex items-center gap-1">
              <Kbd size="xs">up</Kbd>
              <Kbd size="xs">down</Kbd>
              navigate
            </span>
            <span class="flex items-center gap-1">
              <Kbd size="xs">enter</Kbd>
              open
            </span>
          </div>
          <Show when={items().length > 0}>
            <span>{items().length} result{items().length !== 1 ? "s" : ""}</span>
          </Show>
        </div>
      </div>
    </PaletteModal>
  );
}
