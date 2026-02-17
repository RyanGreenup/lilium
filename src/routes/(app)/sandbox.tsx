import { A, RouteDefinition, createAsync, useNavigate } from "@solidjs/router";
import ChevronRight from "lucide-solid/icons/chevron-right";
import FileText from "lucide-solid/icons/file-text";
import FolderIcon from "lucide-solid/icons/folder";
import Home from "lucide-solid/icons/home";
import {
  For,
  Show,
  Suspense,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
} from "solid-js";
import { getUser } from "~/lib/auth";
import { getChildrenQuery, getFolderPathQuery } from "~/lib/db/api";
import type { ListItem, NoteListItem } from "~/lib/db/types";
import {
  listItemVariants,
  listItemNameVariants,
} from "~/components/layout/sidebar/tabs/listStyle";

export const route = {
  preload() {
    getUser();
    getChildrenQuery(null);
    getFolderPathQuery(null);
  },
} satisfies RouteDefinition;

export default function Sandbox() {
  const navigate = useNavigate();

  // State
  const [currentFolderId, setCurrentFolderId] = createSignal<string | null>(
    null,
  );
  const [focusedIndex, setFocusedIndex] = createSignal(0);
  const [gPressed, setGPressed] = createSignal(false);

  // Data fetching
  const folderPath = createAsync(() =>
    getFolderPathQuery(currentFolderId() ?? null),
  );
  const currentItems = createAsync(() =>
    getChildrenQuery(currentFolderId() ?? null),
  );

  const parentId = createMemo(() => {
    const path = folderPath();
    if (!path || path.length < 2) return null;
    return path[path.length - 2]?.id ?? null;
  });

  // For root-level current folder, parentId is null but we're already at root
  // so parent column shows nothing meaningful. For non-root, show parent's siblings.
  const parentItems = createAsync(() => {
    const pid = parentId();
    const cfid = currentFolderId();
    // Only fetch parent items if we're inside a folder
    if (cfid === null) return Promise.resolve([] as ListItem[]);
    // Get siblings: children of parent's parent
    const path = folderPath();
    if (!path || path.length === 0) return getChildrenQuery(null);
    if (path.length === 1) return getChildrenQuery(null); // parent is root
    return getChildrenQuery(pid);
  });

  const focusedItem = createMemo(() => {
    const items = currentItems();
    const idx = focusedIndex();
    if (!items || items.length === 0) return undefined;
    return items[Math.min(idx, items.length - 1)];
  });

  const previewItems = createAsync(() => {
    const item = focusedItem();
    if (!item || item.type !== "folder") return Promise.resolve(null);
    return getChildrenQuery(item.id);
  });

  // Reset focus when folder changes
  createEffect(() => {
    currentFolderId();
    setFocusedIndex(0);
  });

  // Navigation helpers
  const enterFolder = (folderId: string) => {
    setCurrentFolderId(folderId);
  };

  const goToParent = () => {
    const path = folderPath();
    if (!path || path.length === 0) {
      setCurrentFolderId(null);
      return;
    }
    if (path.length === 1) {
      setCurrentFolderId(null);
    } else {
      setCurrentFolderId(path[path.length - 2]?.id ?? null);
    }
  };

  const openNote = (noteId: string) => {
    navigate(`/note/${noteId}`);
  };

  const activateItem = () => {
    const item = focusedItem();
    if (!item) return;
    if (item.type === "folder") {
      enterFolder(item.id);
    } else {
      openNote(item.id);
    }
  };

  // Keyboard handler
  const handleKeyDown = (e: KeyboardEvent) => {
    // Ignore if user is typing in an input
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement
    ) {
      return;
    }

    const items = currentItems();
    const len = items?.length ?? 0;

    switch (e.key) {
      case "j":
      case "ArrowDown":
        e.preventDefault();
        setGPressed(false);
        if (len > 0) {
          setFocusedIndex((i) => Math.min(i + 1, len - 1));
        }
        break;

      case "k":
      case "ArrowUp":
        e.preventDefault();
        setGPressed(false);
        if (len > 0) {
          setFocusedIndex((i) => Math.max(i - 1, 0));
        }
        break;

      case "h":
      case "ArrowLeft":
      case "Backspace":
        e.preventDefault();
        setGPressed(false);
        if (currentFolderId() !== null) {
          goToParent();
        }
        break;

      case "l":
      case "ArrowRight":
      case "Enter":
        e.preventDefault();
        setGPressed(false);
        activateItem();
        break;

      case "g":
        e.preventDefault();
        if (gPressed()) {
          // gg → jump to first
          setFocusedIndex(0);
          setGPressed(false);
        } else {
          setGPressed(true);
          // Reset after a short timeout
          setTimeout(() => setGPressed(false), 500);
        }
        break;

      case "G":
        e.preventDefault();
        setGPressed(false);
        if (len > 0) {
          setFocusedIndex(len - 1);
        }
        break;

      default:
        setGPressed(false);
        break;
    }
  };

  onMount(() => {
    document.addEventListener("keydown", handleKeyDown);
    onCleanup(() => {
      document.removeEventListener("keydown", handleKeyDown);
    });
  });

  // Scroll focused item into view
  let middleColumnRef: HTMLDivElement | undefined;
  createEffect(() => {
    const idx = focusedIndex();
    if (!middleColumnRef) return;
    const el = middleColumnRef.children[idx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  });

  return (
    <div class="flex flex-col h-full">
      {/* Breadcrumb */}
      <Breadcrumb
        path={folderPath() ?? []}
        onNavigate={(id) => setCurrentFolderId(id)}
      />

      {/* Three-column layout */}
      <div class="grid grid-cols-1 md:grid-cols-[1fr_1.5fr_1.5fr] flex-1 min-h-0 gap-px bg-base-300">
        {/* Left column: parent items */}
        <Column title={currentFolderId() === null ? "" : "Parent"}>
          <Show
            when={currentFolderId() !== null}
            fallback={
              <div class="flex items-center justify-center h-full text-base-content/40 text-sm">
                Root level
              </div>
            }
          >
            <Suspense>
              <For each={parentItems()}>
                {(item) => (
                  <div
                    class={listItemVariants({
                      focused: false,
                      selected: item.id === currentFolderId(),
                    })}
                    onClick={() => {
                      if (item.type === "folder") enterFolder(item.id);
                      else openNote(item.id);
                    }}
                  >
                    <ItemIcon item={item} />
                    <span
                      class={listItemNameVariants({
                        focused: false,
                        selected: item.id === currentFolderId(),
                      })}
                    >
                      {item.title}
                    </span>
                  </div>
                )}
              </For>
            </Suspense>
          </Show>
        </Column>

        {/* Middle column: current items (focused) */}
        <Column title={currentFolderId() === null ? "Root" : folderPath()?.at(-1)?.title ?? "..."}>
          <Suspense>
            <Show
              when={(currentItems()?.length ?? 0) > 0}
              fallback={
                <div class="flex items-center justify-center h-full text-base-content/40 text-sm">
                  Empty folder
                </div>
              }
            >
              <div ref={middleColumnRef} class="flex flex-col space-y-0.5">
                <For each={currentItems()}>
                  {(item, idx) => (
                    <div
                      class={listItemVariants({
                        focused: idx() === focusedIndex(),
                        selected: false,
                      })}
                      onClick={() => {
                        setFocusedIndex(idx());
                        activateItem();
                      }}
                      onMouseEnter={() => setFocusedIndex(idx())}
                    >
                      <ItemIcon item={item} />
                      <span
                        class={listItemNameVariants({
                          focused: idx() === focusedIndex(),
                          selected: false,
                        })}
                      >
                        {item.title}
                      </span>
                      <Show when={item.type === "note" && "syntax" in item}>
                        <span class="ml-auto text-xs text-base-content/50">
                          {(item as NoteListItem).syntax}
                        </span>
                      </Show>
                      <Show when={item.type === "folder"}>
                        <ChevronRight class="ml-auto w-4 h-4 text-base-content/30" />
                      </Show>
                    </div>
                  )}
                </For>
              </div>
            </Show>
          </Suspense>
        </Column>

        {/* Right column: preview */}
        <Column title="Preview">
          <Suspense>
            <Show
              when={focusedItem()}
              fallback={
                <div class="flex items-center justify-center h-full text-base-content/40 text-sm">
                  No selection
                </div>
              }
            >
              {(item) => (
                <Show
                  when={item().type === "folder"}
                  fallback={<NotePreview item={item() as NoteListItem} />}
                >
                  {/* Folder preview: show children */}
                  <Show
                    when={previewItems()}
                    fallback={
                      <div class="p-3 text-base-content/40 text-sm">
                        Loading...
                      </div>
                    }
                  >
                    {(children) => (
                      <Show
                        when={children().length > 0}
                        fallback={
                          <div class="flex items-center justify-center h-full text-base-content/40 text-sm">
                            Empty folder
                          </div>
                        }
                      >
                        <For each={children()}>
                          {(child) => (
                            <div class="flex items-center px-3 py-1.5 text-sm text-base-content/70">
                              <ItemIcon item={child} />
                              <span class="truncate">{child.title}</span>
                            </div>
                          )}
                        </For>
                      </Show>
                    )}
                  </Show>
                </Show>
              )}
            </Show>
          </Suspense>
        </Column>
      </div>

      {/* Keyboard hints */}
      <div class="flex items-center gap-4 px-4 py-2 bg-base-200 text-xs text-base-content/50 border-t border-base-300">
        <span>
          <kbd class="kbd kbd-xs">j</kbd>/<kbd class="kbd kbd-xs">k</kbd> navigate
        </span>
        <span>
          <kbd class="kbd kbd-xs">l</kbd>/<kbd class="kbd kbd-xs">Enter</kbd> open
        </span>
        <span>
          <kbd class="kbd kbd-xs">h</kbd>/<kbd class="kbd kbd-xs">Backspace</kbd> back
        </span>
        <span>
          <kbd class="kbd kbd-xs">gg</kbd> top
        </span>
        <span>
          <kbd class="kbd kbd-xs">G</kbd> bottom
        </span>
      </div>
    </div>
  );
}

// --- Sub-components ---

function Breadcrumb(props: {
  path: { id: string; title: string }[];
  onNavigate: (id: string | null) => void;
}) {
  return (
    <div class="flex items-center gap-1 px-4 py-2 bg-base-200 text-sm border-b border-base-300 overflow-x-auto">
      <button
        class="flex items-center gap-1 hover:text-primary transition-colors shrink-0"
        onClick={() => props.onNavigate(null)}
      >
        <Home class="w-4 h-4" />
        <span>Home</span>
      </button>
      <For each={props.path}>
        {(folder) => (
          <>
            <ChevronRight class="w-3 h-3 text-base-content/40 shrink-0" />
            <button
              class="hover:text-primary transition-colors truncate max-w-[12rem]"
              onClick={() => props.onNavigate(folder.id)}
            >
              {folder.title}
            </button>
          </>
        )}
      </For>
    </div>
  );
}

function Column(props: { title: string; children: any }) {
  return (
    <div class="flex flex-col bg-base-100 min-h-0 overflow-hidden">
      <Show when={props.title}>
        <div class="px-3 py-1.5 text-xs font-semibold text-base-content/50 uppercase tracking-wider border-b border-base-300 shrink-0">
          {props.title}
        </div>
      </Show>
      <div class="flex-1 overflow-y-auto min-h-0">{props.children}</div>
    </div>
  );
}

function ItemIcon(props: { item: ListItem }) {
  return (
    <span class="mr-2 shrink-0">
      <Show
        when={props.item.type === "folder"}
        fallback={<FileText class="w-4 h-4 text-base-content/60" />}
      >
        <FolderIcon class="w-4 h-4 text-warning" />
      </Show>
    </span>
  );
}

function NotePreview(props: { item: NoteListItem }) {
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div class="p-4 space-y-4">
      <div>
        <div class="flex items-center gap-2 mb-2">
          <FileText class="w-5 h-5 text-base-content/60" />
          <h3 class="font-semibold text-lg">{props.item.title}</h3>
        </div>
        <span class="badge badge-outline badge-sm">{props.item.syntax}</span>
      </div>

      <Show when={props.item.abstract}>
        <div>
          <h4 class="text-xs font-semibold text-base-content/50 uppercase mb-1">
            Abstract
          </h4>
          <p class="text-sm text-base-content/80 line-clamp-6">
            {props.item.abstract}
          </p>
        </div>
      </Show>

      <div class="text-xs text-base-content/50 space-y-1">
        <div>Created: {formatDate(props.item.created_at)}</div>
        <div>
          Updated: {formatDate(props.item.updated_at)}{" "}
          {formatTime(props.item.updated_at)}
        </div>
      </div>

      <A
        href={`/note/${props.item.id}`}
        class="btn btn-primary btn-sm btn-block"
      >
        Open Note
      </A>
    </div>
  );
}
