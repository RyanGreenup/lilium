import { For, createSignal, createMemo, Accessor, Setter } from "solid-js";
import {
  Search,
  FileText,
  Settings,
  User,
  FolderOpen,
  Tag,
  Plus,
} from "lucide-solid";
import Fuse from "fuse.js";
import { tv } from "tailwind-variants";
import { Kbd } from "~/solid-daisy-components/components/Kbd";

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
    itemContent: "flex-1",
    itemName: "font-medium",
    itemCategory: "ml-2 text-xs text-base-content/40",
    itemShortcut: "text-base-content/50",
    empty: "px-4 py-8 text-center text-base-content/50",
    footer:
      "flex items-center justify-between px-4 py-2 border-t border-base-content/10 text-xs text-base-content/40",
    footerHints: "flex items-center gap-4",
    footerHint: "flex items-center gap-1",
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

const commands = [
  { id: 1, name: "New Note", shortcut: "⌘N", icon: Plus, category: "Notes" },
  {
    id: 2,
    name: "Open Note",
    shortcut: "⌘O",
    icon: FileText,
    category: "Notes",
  },
  {
    id: 3,
    name: "Open Folder",
    shortcut: "⌘⇧O",
    icon: FolderOpen,
    category: "Notes",
  },
  { id: 4, name: "Manage Tags", shortcut: "⌘T", icon: Tag, category: "Notes" },
  {
    id: 5,
    name: "Settings",
    shortcut: "⌘,",
    icon: Settings,
    category: "System",
  },
  { id: 6, name: "Profile", shortcut: "⌘P", icon: User, category: "System" },
];

const fuse = new Fuse(commands, {
  keys: ["name", "category"],
  threshold: 0.4,
});

type Command = (typeof commands)[number];

const SearchInput = (props: {
  query: Accessor<string>;
  setQuery: Setter<string>;
}) => {
  return (
    <div class={styles.searchContainer()}>
      <Search size={20} class={styles.searchIcon()} />
      <input
        type="text"
        placeholder="Type a command or search..."
        class={styles.searchInput()}
        value={props.query()}
        onInput={(e) => props.setQuery(e.currentTarget.value)}
      />
      <Kbd size="sm">esc</Kbd>
    </div>
  );
};

const CommandItem = (props: {
  command: Command;
  selected: boolean;
  onSelect: () => void;
}) => {
  const itemStyles = () => paletteStyles({ selected: props.selected });
  return (
    <div class={itemStyles().item()} onMouseEnter={props.onSelect}>
      <props.command.icon size={18} class={itemStyles().itemIcon()} />
      <div class={styles.itemContent()}>
        <span class={styles.itemName()}>{props.command.name}</span>
        <span class={styles.itemCategory()}>{props.command.category}</span>
      </div>
      <Kbd size="sm" class={styles.itemShortcut()}>
        {props.command.shortcut}
      </Kbd>
    </div>
  );
};

const CommandList = (props: {
  commands: Command[];
  selectedIndex: Accessor<number>;
  setSelectedIndex: Setter<number>;
}) => {
  return (
    <div class={styles.list()}>
      <For each={props.commands}>
        {(command, index) => (
          <CommandItem
            command={command}
            selected={index() === props.selectedIndex()}
            onSelect={() => props.setSelectedIndex(index())}
          />
        )}
      </For>

      {props.commands.length === 0 && (
        <div class={styles.empty()}>No commands found</div>
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
          to navigate
        </span>
        <span class={styles.footerHint()}>
          <Kbd size="xs">↵</Kbd>
          to select
        </span>
      </div>
      <span>{props.count} commands</span>
    </div>
  );
};

export default function CommandPalette() {
  const [query, setQuery] = createSignal("");
  const [selectedIndex, setSelectedIndex] = createSignal(0);

  const filteredCommands = createMemo(() => {
    const q = query();
    if (!q) return commands;
    return fuse.search(q).map((result) => result.item);
  });

  return (
    <div class="min-h-screen bg-base-300 flex items-center justify-center p-4">
      <div class={styles.wrapper()}>
        {/* Search Input */}
        <SearchInput query={query} setQuery={setQuery} />

        <CommandList
          commands={filteredCommands()}
          selectedIndex={selectedIndex}
          setSelectedIndex={setSelectedIndex}
        />

        <PaletteFooter count={filteredCommands().length} />
      </div>
    </div>
  );
}
