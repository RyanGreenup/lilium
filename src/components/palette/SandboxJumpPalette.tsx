import { createAsync } from "@solidjs/router";
import { FileText, Folder, Search } from "lucide-solid";
import Fuse from "fuse.js";
import {
  For,
  Show,
  Suspense,
  createEffect,
  createMemo,
  createSignal,
  type Accessor,
} from "solid-js";
import { Kbd } from "~/solid-daisy-components/components/Kbd";
import {
  getTreeItemsForPaletteQuery,
  type TreePaletteItem,
} from "~/lib/db/api";
import { PaletteModal } from "./PaletteModal";

export interface SandboxJumpSelection {
  item: TreePaletteItem;
  ancestorFolderIds: string[];
}

export interface SandboxJumpPaletteProps {
  open: Accessor<boolean>;
  parentId: Accessor<string | null>;
  onClose: () => void;
  onSelect: (selection: SandboxJumpSelection) => void;
}

export function SandboxJumpPalette(props: SandboxJumpPaletteProps) {
  const [searchQuery, setSearchQuery] = createSignal("");
  const [selectedIndex, setSelectedIndex] = createSignal(0);

  let inputRef: HTMLInputElement | undefined;

  const items = createAsync(async () => {
    if (!props.open()) return [] as TreePaletteItem[];
    return await getTreeItemsForPaletteQuery(props.parentId());
  });

  const folderParentMap = createMemo(() => {
    const map = new Map<string, string | null>();
    for (const item of items() ?? []) {
      if (item.type === "folder") {
        map.set(item.id, item.parent_id ?? null);
      }
    }
    return map;
  });

  const fuse = createMemo(
    () =>
      new Fuse(items() ?? [], {
        keys: ["display_path", "title"],
        threshold: 0.4,
      }),
  );

  const filteredItems = createMemo(() => {
    const allItems = items() ?? [];
    const query = searchQuery().trim();
    if (!query) return allItems.slice(0, 200);
    return fuse()
      .search(query, { limit: 200 })
      .map((result) => result.item);
  });

  const buildAncestorPathToFolder = (targetFolderId: string | null) => {
    const baseFolderId = props.parentId();
    if (targetFolderId === baseFolderId) return [];

    const path: string[] = [];
    let cursor = targetFolderId;
    const seen = new Set<string>();

    while (cursor !== baseFolderId) {
      if (!cursor) return null;
      if (seen.has(cursor)) return null;
      seen.add(cursor);
      path.push(cursor);
      cursor = folderParentMap().get(cursor) ?? null;
    }

    path.reverse();
    return path;
  };

  const handleSelect = (item: TreePaletteItem) => {
    const targetParentFolderId = item.parent_id ?? null;
    const ancestorFolderIds = buildAncestorPathToFolder(targetParentFolderId);
    if (!ancestorFolderIds) return;

    props.onSelect({
      item,
      ancestorFolderIds,
    });
    props.onClose();
  };

  createEffect(() => {
    if (props.open() && inputRef) {
      inputRef.focus();
      inputRef.select();
    }
  });

  createMemo((prevQuery) => {
    const query = searchQuery();
    if (query !== prevQuery) setSelectedIndex(0);
    return query;
  }, "");

  createEffect(() => {
    if (props.open()) {
      setSearchQuery("");
      setSelectedIndex(0);
    }
  });

  const moveUp = () => setSelectedIndex((i) => Math.max(0, i - 1));
  const moveDown = () =>
    setSelectedIndex((i) => Math.min(filteredItems().length - 1, i + 1));

  const selectCurrent = () => {
    const item = filteredItems()[selectedIndex()];
    if (item) handleSelect(item);
  };

  const handleInputKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowUp" || (e.ctrlKey && e.key === "k")) {
      e.preventDefault();
      moveUp();
      return;
    }

    if (e.key === "ArrowDown" || (e.ctrlKey && e.key === "j")) {
      e.preventDefault();
      moveDown();
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      selectCurrent();
    }
  };

  return (
    <PaletteModal open={props.open} onClose={props.onClose}>
      <div class="w-[calc(100vw-2rem)] sm:w-full max-w-lg bg-base-100 rounded-lg shadow-2xl border border-base-content/10 overflow-hidden">
        <div class="flex items-center gap-3 px-4 py-3 border-b border-base-content/10">
          <Search size={20} class="text-base-content/50" />
          <input
            ref={(el) => (inputRef = el)}
            type="text"
            placeholder="Jump to item..."
            class="flex-1 bg-transparent outline-none text-base-content placeholder:text-base-content/40"
            value={searchQuery()}
            onInput={(e) => setSearchQuery(e.currentTarget.value)}
            onKeyDown={handleInputKeyDown}
            autofocus
          />
          <Kbd size="sm">esc</Kbd>
        </div>

        <Suspense
          fallback={
            <div class="px-4 py-8 text-center text-base-content/50">
              Loading items...
            </div>
          }
        >
          <div class="max-h-80 overflow-y-auto py-2">
            <Show
              when={filteredItems().length > 0}
              fallback={
                <div class="px-4 py-8 text-center text-base-content/50">
                  No items found
                </div>
              }
            >
              <For each={filteredItems()}>
                {(item, index) => {
                  const isSelected = () => index() === selectedIndex();
                  return (
                    <div
                      class={
                        isSelected()
                          ? "flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors bg-primary/10 text-primary"
                          : "flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors hover:bg-base-200"
                      }
                      onClick={() => handleSelect(item)}
                    >
                      <Show
                        when={item.type === "folder"}
                        fallback={
                          <FileText
                            size={18}
                            class={isSelected() ? "text-primary" : "text-base-content/60"}
                          />
                        }
                      >
                        <Folder
                          size={18}
                          class={isSelected() ? "text-primary" : "text-base-content/60"}
                        />
                      </Show>
                      <div class="flex-1 min-w-0">
                        <div class="font-medium truncate">{item.title}</div>
                        <div class="text-xs text-base-content/40 truncate">
                          {item.display_path}
                        </div>
                      </div>
                    </div>
                  );
                }}
              </For>
            </Show>
          </div>
        </Suspense>

        <div class="flex items-center justify-between px-4 py-2 border-t border-base-content/10 text-xs text-base-content/40">
          <div class="hidden sm:flex items-center gap-4">
            <span class="flex items-center gap-1">
              <Kbd size="xs">up</Kbd>
              <Kbd size="xs">down</Kbd>
              navigate
            </span>
            <span class="flex items-center gap-1">
              <Kbd size="xs">enter</Kbd>
              jump
            </span>
          </div>
          <span>{filteredItems().length} items</span>
        </div>
      </div>
    </PaletteModal>
  );
}
