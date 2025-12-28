import { For, createSignal, createMemo } from "solid-js";
import { Search, FileText, Settings, User, FolderOpen, Tag, Plus } from "lucide-solid";
import Fuse from "fuse.js";

const commands = [
  { id: 1, name: "New Note", shortcut: "⌘N", icon: Plus, category: "Notes" },
  { id: 2, name: "Open Note", shortcut: "⌘O", icon: FileText, category: "Notes" },
  { id: 3, name: "Open Folder", shortcut: "⌘⇧O", icon: FolderOpen, category: "Notes" },
  { id: 4, name: "Manage Tags", shortcut: "⌘T", icon: Tag, category: "Notes" },
  { id: 5, name: "Settings", shortcut: "⌘,", icon: Settings, category: "System" },
  { id: 6, name: "Profile", shortcut: "⌘P", icon: User, category: "System" },
];

const fuse = new Fuse(commands, {
  keys: ["name", "category"],
  threshold: 0.4,
});

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
      <div class="w-full max-w-lg bg-base-100 rounded-md shadow-2xl border border-base-content/10 overflow-hidden">
        {/* Search Input */}
        <div class="flex items-center gap-3 px-4 py-3 border-b border-base-content/10">
          <Search size={20} class="text-base-content/50" />
          <input
            type="text"
            placeholder="Type a command or search..."
            class="flex-1 bg-transparent outline-none text-base-content placeholder:text-base-content/40"
            value={query()}
            onInput={(e) => setQuery(e.currentTarget.value)}
          />
          <kbd class="kbd kbd-sm">esc</kbd>
        </div>

        {/* Command List */}
        <div class="max-h-80 overflow-y-auto py-2">
          <For each={filteredCommands()}>
            {(command, index) => (
              <div
                class={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                  index() === selectedIndex()
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-base-200"
                }`}
                onMouseEnter={() => setSelectedIndex(index())}
              >
                <command.icon
                  size={18}
                  class={index() === selectedIndex() ? "text-primary" : "text-base-content/60"}
                />
                <div class="flex-1">
                  <span class="font-medium">{command.name}</span>
                  <span class="ml-2 text-xs text-base-content/40">{command.category}</span>
                </div>
                <kbd class="kbd kbd-sm text-base-content/50">{command.shortcut}</kbd>
              </div>
            )}
          </For>

          {filteredCommands().length === 0 && (
            <div class="px-4 py-8 text-center text-base-content/50">
              No commands found
            </div>
          )}
        </div>

        {/* Footer */}
        <div class="flex items-center justify-between px-4 py-2 border-t border-base-content/10 text-xs text-base-content/40">
          <div class="flex items-center gap-4">
            <span class="flex items-center gap-1">
              <kbd class="kbd kbd-xs">↑</kbd>
              <kbd class="kbd kbd-xs">↓</kbd>
              to navigate
            </span>
            <span class="flex items-center gap-1">
              <kbd class="kbd kbd-xs">↵</kbd>
              to select
            </span>
          </div>
          <span>{filteredCommands().length} commands</span>
        </div>
      </div>
    </div>
  );
}
