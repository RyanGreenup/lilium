import {
  For,
  Show,
  Suspense,
  createSignal,
  createMemo,
  createEffect,
  Accessor,
  Setter,
} from "solid-js";
import { createAsync, query } from "@solidjs/router";
import { Search, FileText, Folder } from "lucide-solid";
import Fuse from "fuse.js";
import { tv } from "tailwind-variants";
import { Kbd } from "~/solid-daisy-components/components/Kbd";
import type { NoteWithPath } from "~/lib/db/notes/search";

const paletteStyles = tv({
  slots: {
    wrapper:
      "w-full max-w-lg bg-base-100 rounded-lg shadow-2xl border border-base-content/10 overflow-hidden",
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
    footerHints: "flex items-center gap-4",
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

// Server function to fetch notes
const getNotesForPalette = query(async (parentId: string | null = null) => {
  "use server";
  const { searchNotesForPalette } = await import("~/lib/db/notes/search");
  return await searchNotesForPalette("", { parentId, limit: 500 });
}, "notes-for-palette");

const SearchInput = (props: {
  query: Accessor<string>;
  setQuery: Setter<string>;
  searchFullPath: Accessor<boolean>;
  setSearchFullPath: Setter<boolean>;
  onKeyDown: (e: KeyboardEvent) => void;
}) => {
  return (
    <div class={styles.searchContainer()}>
      <Search size={20} class={styles.searchIcon()} />
      <input
        type="text"
        placeholder="Search notes..."
        class={styles.searchInput()}
        value={props.query()}
        onInput={(e) => props.setQuery(e.currentTarget.value)}
        onKeyDown={props.onKeyDown}
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

const NoteItem = (props: {
  note: NoteWithPath;
  selected: boolean;
  onSelect: () => void;
  ref?: (el: HTMLDivElement) => void;
}) => {
  const itemStyles = () => paletteStyles({ selected: props.selected });
  const isFolder = () => props.note.title === "index";

  return (
    <div
      ref={props.ref}
      class={itemStyles().item()}
      onMouseEnter={props.onSelect}
    >
      <Show
        when={isFolder()}
        fallback={<FileText size={18} class={itemStyles().itemIcon()} />}
      >
        <Folder size={18} class={itemStyles().itemIcon()} />
      </Show>
      <div class={styles.itemContent()}>
        <div class={styles.itemTitle()}>{props.note.title}</div>
        <div class={styles.itemPath()}>{props.note.display_path}</div>
      </div>
    </div>
  );
};

const NoteList = (props: {
  notes: NoteWithPath[];
  selectedIndex: Accessor<number>;
  setSelectedIndex: Setter<number>;
}) => {
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

const PaletteFooter = (props: { count: number }) => {
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
          select
        </span>
        <span class={styles.footerHint()}>
          <Kbd size="xs">^/</Kbd>
          path
        </span>
      </div>
      <span>{props.count} notes</span>
    </div>
  );
};

function NotePaletteContent(props: { notes: NoteWithPath[] }) {
  const [query, setQuery] = createSignal("");
  const [selectedIndex, setSelectedIndex] = createSignal(0);
  const [searchFullPath, setSearchFullPath] = createSignal(true);

  // Create fuse instance that updates when searchFullPath changes
  const fuse = createMemo(() => {
    const keys = searchFullPath() ? ["display_path", "title"] : ["title"];
    return new Fuse(props.notes, {
      keys,
      threshold: 0.4,
    });
  });

  const filteredNotes = createMemo(() => {
    const q = query();
    if (!q) return props.notes.slice(0, 25);
    return fuse()
      .search(q, { limit: 25 })
      .map((result) => result.item);
  });

  // Reset selection when query changes (not when search mode toggles)
  createMemo((prevQuery) => {
    const q = query();
    if (q !== prevQuery) {
      setSelectedIndex(0);
    }
    return q;
  }, "");

  const moveUp = () => {
    setSelectedIndex((i) => Math.max(0, i - 1));
  };

  const moveDown = () => {
    setSelectedIndex((i) => Math.min(filteredNotes().length - 1, i + 1));
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    // Ctrl+/ to toggle path search
    if (e.ctrlKey && e.key === "/") {
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
  };

  return (
    <>
      <SearchInput
        query={query}
        setQuery={setQuery}
        searchFullPath={searchFullPath}
        setSearchFullPath={setSearchFullPath}
        onKeyDown={handleKeyDown}
      />

      <NoteList
        notes={filteredNotes()}
        selectedIndex={selectedIndex}
        setSelectedIndex={setSelectedIndex}
      />

      <PaletteFooter count={filteredNotes().length} />
    </>
  );
}

export default function NotePalette() {
  // For testing, we use null parentId (root level, all notes)
  const notes = createAsync(() => getNotesForPalette(null));

  return (
    <div class="min-h-screen bg-base-300 flex items-center justify-center p-4">
      <div class={styles.wrapper()}>
        <Suspense
          fallback={
            <div class="px-4 py-8 text-center text-base-content/50">
              Loading notes...
            </div>
          }
        >
          <Show when={notes()}>
            {(loadedNotes) => <NotePaletteContent notes={loadedNotes()} />}
          </Show>
        </Suspense>
      </div>
    </div>
  );
}
