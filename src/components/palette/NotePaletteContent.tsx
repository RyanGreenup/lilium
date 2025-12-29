/**
 * NotePaletteContent - Core palette UI for searching and selecting notes
 *
 * This is the shared content component used by both:
 * - LinkPalette (inserts a link to a note)
 * - OpenNotePalette (navigates to a note)
 *
 * Features:
 * - Fuzzy search using Fuse.js
 * - Keyboard navigation (up/down arrows, vim-style j/k)
 * - Toggle between searching full path vs title only
 * - Supports filtering by parent folder (for scoped searches)
 *
 * NOTE: The parentId prop allows scoping searches to a specific folder's
 * descendants. In large corpus this is required to reduce the number of notes.
 * FUTURE: This may be connected to a URL parameter for virtual root (see QML example)
 */

import {
  For,
  Show,
  Suspense,
  createSignal,
  createMemo,
  createEffect,
  type Accessor,
  type Setter,
} from "solid-js";
import { createAsync, query } from "@solidjs/router";
import { Search, FileText, Folder } from "lucide-solid";
import Fuse from "fuse.js";
import { tv } from "tailwind-variants";
import { Kbd } from "~/solid-daisy-components/components/Kbd";
import type { NoteWithPath } from "~/lib/db/notes/search";

// =============================================================================
// Styles
// =============================================================================

const paletteStyles = tv({
  slots: {
    wrapper:
      "w-[calc(100vw-2rem)] sm:w-full max-w-lg bg-base-100 rounded-lg shadow-2xl border border-base-content/10 overflow-hidden",
    searchContainer:
      "flex items-center gap-3 px-4 py-3 border-b border-base-content/10",
    searchIcon: "text-base-content/50",
    searchInput:
      "flex-1 bg-transparent outline-none text-base-content placeholder:text-base-content/40",
    list: "max-h-80 overflow-y-auto py-2",
    item: "flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors",
    itemIcon: "",
    itemContent: "flex-1 min-w-0",
    itemTitle: "font-medium truncate",
    itemPath: "text-xs text-base-content/40 truncate",
    empty: "px-4 py-8 text-center text-base-content/50",
    footer:
      "flex items-center justify-between px-4 py-2 border-t border-base-content/10 text-xs text-base-content/40",
    footerHints: "hidden sm:flex items-center gap-4",
    footerHint: "flex items-center gap-1",
    toggle: "flex items-center gap-2",
  },
  variants: {
    selected: {
      true: {
        item: "bg-primary/10 text-primary",
        itemIcon: "text-primary",
      },
      false: {
        item: "hover:bg-base-200",
        itemIcon: "text-base-content/60",
      },
    },
  },
});

const styles = paletteStyles();

// =============================================================================
// Server Query
// =============================================================================

/**
 * Server function to fetch notes for the palette.
 *
 * @param parentId - Optional parent folder ID to scope search to descendants.
 *                   Pass null for root-level (all notes).
 *                   FUTURE: This may be connected to a URL parameter for virtual root.
 */
const getNotesForPalette = query(async (parentId: string | null = null) => {
  "use server";
  const { searchNotesForPalette } = await import("~/lib/db/notes/search");
  return await searchNotesForPalette("", { parentId, limit: 500 });
}, "notes-for-palette");

// =============================================================================
// Sub-Components
// =============================================================================

interface SearchInputProps {
  query: Accessor<string>;
  setQuery: Setter<string>;
  searchFullPath: Accessor<boolean>;
  setSearchFullPath: Setter<boolean>;
  onKeyDown: (e: KeyboardEvent) => void;
  inputRef?: (el: HTMLInputElement) => void;
}

const SearchInput = (props: SearchInputProps) => {
  return (
    <div class={styles.searchContainer()}>
      <Search size={20} class={styles.searchIcon()} />
      <input
        ref={props.inputRef}
        type="text"
        placeholder="Search notes..."
        class={styles.searchInput()}
        value={props.query()}
        onInput={(e) => props.setQuery(e.currentTarget.value)}
        onKeyDown={props.onKeyDown}
        autofocus
      />
      <label class={styles.toggle()}>
        <input
          type="checkbox"
          class="toggle toggle-xs"
          checked={props.searchFullPath()}
          onChange={(e) => props.setSearchFullPath(e.currentTarget.checked)}
        />
        <span class="text-xs whitespace-nowrap">Path</span>
      </label>
      <Kbd size="sm">esc</Kbd>
    </div>
  );
};

interface NoteItemProps {
  note: NoteWithPath;
  selected: boolean;
  onSelect: () => void;
  onClick: () => void;
  ref?: (el: HTMLDivElement) => void;
}

const NoteItem = (props: NoteItemProps) => {
  const itemStyles = () => paletteStyles({ selected: props.selected });
  const isFolder = () => props.note.title === "index";

  return (
    <div
      ref={props.ref}
      class={itemStyles().item()}
      onClick={props.onClick}
    >
      <Show
        when={isFolder()}
        fallback={<FileText size={18} class={itemStyles().itemIcon()} />}
      >
        <Folder size={18} class={itemStyles().itemIcon()} />
      </Show>
      <div class={styles.itemContent()}>
        <div class={styles.itemTitle()}>{props.note.display_title}</div>
        <div class={styles.itemPath()}>{props.note.display_path}</div>
      </div>
    </div>
  );
};

interface NoteListProps {
  notes: NoteWithPath[];
  selectedIndex: Accessor<number>;
  setSelectedIndex: Setter<number>;
  onItemSelect: (note: NoteWithPath) => void;
}

const NoteList = (props: NoteListProps) => {
  const itemRefs: HTMLDivElement[] = [];

  createEffect(() => {
    const idx = props.selectedIndex();
    const el = itemRefs[idx];
    if (el) {
      el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  });

  return (
    <div class={styles.list()}>
      <For each={props.notes}>
        {(note, index) => (
          <NoteItem
            note={note}
            selected={index() === props.selectedIndex()}
            onSelect={() => props.setSelectedIndex(index())}
            onClick={() => props.onItemSelect(note)}
            ref={(el) => (itemRefs[index()] = el)}
          />
        )}
      </For>

      {props.notes.length === 0 && (
        <div class={styles.empty()}>No notes found</div>
      )}
    </div>
  );
};

interface PaletteFooterProps {
  count: number;
  /** Optional hint text to display (e.g., "Insert link" or "Open note") */
  actionHint?: string;
}

const PaletteFooter = (props: PaletteFooterProps) => {
  return (
    <div class={styles.footer()}>
      <div class={styles.footerHints()}>
        <span class={styles.footerHint()}>
          <Kbd size="xs">↑</Kbd>
          <Kbd size="xs">↓</Kbd>
          navigate
        </span>
        <span class={styles.footerHint()}>
          <Kbd size="xs">↵</Kbd>
          {props.actionHint ?? "select"}
        </span>
        <span class={styles.footerHint()}>
          <Kbd size="xs">^.</Kbd>
          path
        </span>
      </div>
      <span>{props.count} notes</span>
    </div>
  );
};

// =============================================================================
// Main Component
// =============================================================================

export interface NotePaletteContentProps {
  /** Notes data (from createAsync) */
  notes: NoteWithPath[];
  /** Called when user selects a note (Enter key or click) */
  onSelect: (note: NoteWithPath) => void;
  /** Optional hint text for footer (e.g., "Insert link") */
  actionHint?: string;
}

/**
 * The main palette content component - handles search, navigation, and selection.
 */
export function NotePaletteContent(props: NotePaletteContentProps) {
  const [searchQuery, setSearchQuery] = createSignal("");
  const [selectedIndex, setSelectedIndex] = createSignal(0);
  const [searchFullPath, setSearchFullPath] = createSignal(true);

  let inputRef: HTMLInputElement | undefined;

  // Create fuse instance that updates when searchFullPath changes
  const fuse = createMemo(() => {
    const keys = searchFullPath() ? ["display_path", "title"] : ["title"];
    return new Fuse(props.notes, {
      keys,
      threshold: 0.4,
    });
  });

  const filteredNotes = createMemo(() => {
    const q = searchQuery();
    if (!q) return props.notes.slice(0, 25);
    return fuse()
      .search(q, { limit: 25 })
      .map((result) => result.item);
  });

  // Reset selection when query changes
  createMemo((prevQuery) => {
    const q = searchQuery();
    if (q !== prevQuery) {
      setSelectedIndex(0);
    }
    return q;
  }, "");

  // Auto-focus input on mount
  createEffect(() => {
    if (inputRef) {
      inputRef.focus();
    }
  });

  const moveUp = () => {
    setSelectedIndex((i) => Math.max(0, i - 1));
  };

  const moveDown = () => {
    setSelectedIndex((i) => Math.min(filteredNotes().length - 1, i + 1));
  };

  const selectCurrent = () => {
    const notes = filteredNotes();
    const note = notes[selectedIndex()];
    if (note) {
      props.onSelect(note);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    // Ctrl+. to toggle path search
    if (e.ctrlKey && e.key === ".") {
      e.preventDefault();
      setSearchFullPath((v) => !v);
      return;
    }

    // Up: ArrowUp, Ctrl+K, Ctrl+P
    if (
      e.key === "ArrowUp" ||
      (e.ctrlKey && e.key === "k") ||
      (e.ctrlKey && e.key === "p")
    ) {
      e.preventDefault();
      moveUp();
      return;
    }

    // Down: ArrowDown, Ctrl+J, Ctrl+N
    if (
      e.key === "ArrowDown" ||
      (e.ctrlKey && e.key === "j") ||
      (e.ctrlKey && e.key === "n")
    ) {
      e.preventDefault();
      moveDown();
      return;
    }

    // Enter to select
    if (e.key === "Enter") {
      e.preventDefault();
      selectCurrent();
      return;
    }
  };

  return (
    <>
      <SearchInput
        query={searchQuery}
        setQuery={setSearchQuery}
        searchFullPath={searchFullPath}
        setSearchFullPath={setSearchFullPath}
        onKeyDown={handleKeyDown}
        inputRef={(el) => (inputRef = el)}
      />

      <NoteList
        notes={filteredNotes()}
        selectedIndex={selectedIndex}
        setSelectedIndex={setSelectedIndex}
        onItemSelect={props.onSelect}
      />

      <PaletteFooter
        count={filteredNotes().length}
        actionHint={props.actionHint}
      />
    </>
  );
}

// =============================================================================
// Wrapper with Data Fetching
// =============================================================================

export interface NotePaletteProps {
  /**
   * Parent folder ID to scope the search.
   * - null: Search all notes (root level)
   * - string: Search only descendants of this folder
   *
   * FUTURE: This may be connected to a URL parameter for virtual root.
   */
  parentId: string | null;
  /** Called when user selects a note */
  onSelect: (note: NoteWithPath) => void;
  /** Optional hint text for footer */
  actionHint?: string;
}

/**
 * NotePalette - Full palette with data fetching.
 *
 * Wraps NotePaletteContent with Suspense and data loading.
 */
export function NotePalette(props: NotePaletteProps) {
  const notes = createAsync(() => getNotesForPalette(props.parentId));

  return (
    <div class={styles.wrapper()}>
      <Suspense
        fallback={
          <div class="px-4 py-8 text-center text-base-content/50">
            Loading notes...
          </div>
        }
      >
        <Show when={notes()}>
          {(loadedNotes) => (
            <NotePaletteContent
              notes={loadedNotes()}
              onSelect={props.onSelect}
              actionHint={props.actionHint}
            />
          )}
        </Show>
      </Suspense>
    </div>
  );
}

export { styles as paletteStyles };
