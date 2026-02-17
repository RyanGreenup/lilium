import { A, RouteDefinition, createAsync, useNavigate } from "@solidjs/router";
import ChevronRight from "lucide-solid/icons/chevron-right";
import FileText from "lucide-solid/icons/file-text";
import FolderIcon from "lucide-solid/icons/folder";
import Home from "lucide-solid/icons/home";
import {
  For,
  JSXElement,
  Show,
  Suspense,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
  startTransition,
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

  // Route guard — deferStream blocks SSR until auth resolves
  createAsync(() => getUser(), { deferStream: true });

  // State
  const [currentFolderId, setCurrentFolderId] = createSignal<string | null>(
    null,
  );
  const [focusedIndex, setFocusedIndex] = createSignal(0);
  const [gPressed, setGPressed] = createSignal(false);

  // Derived parent ID signal — decoupled from async folderPath so that
  // parentItems fetcher never reads a suspended createAsync directly.
  const [resolvedParentId, setResolvedParentId] = createSignal<string | null>(
    null,
  );

  // Data fetching — no deferStream, each streams independently
  const folderPath = createAsync(() =>
    getFolderPathQuery(currentFolderId() ?? null),
  );
  const currentItems = createAsync(() =>
    getChildrenQuery(currentFolderId() ?? null),
  );

  // When folderPath resolves, derive the parent ID into a plain signal.
  // This breaks the async chain: parentItems reads a signal, not a createAsync.
  createEffect(() => {
    const path = folderPath();
    if (!path) return;
    if (path.length < 2) {
      setResolvedParentId(null);
    } else {
      setResolvedParentId(path[path.length - 2]?.id ?? null);
    }
  });

  // parentItems depends only on plain signals — no async reads in fetcher
  const parentItems = createAsync(() => {
    const cfid = currentFolderId();
    if (cfid === null) return Promise.resolve([] as ListItem[]);
    return getChildrenQuery(resolvedParentId());
  });

  const focusedItem = createMemo(() => {
    const items = currentItems();
    const idx = focusedIndex();
    if (!items || items.length === 0) return undefined;
    return items[Math.min(idx, items.length - 1)];
  });

  // Derived focused folder ID signal — decoupled from async currentItems
  // so previewItems fetcher never reads a suspended memo/createAsync.
  const [resolvedFocusedFolderId, setResolvedFocusedFolderId] = createSignal<
    string | null
  >(null);

  createEffect(() => {
    const item = focusedItem();
    if (item?.type === "folder") {
      setResolvedFocusedFolderId(item.id);
    } else {
      setResolvedFocusedFolderId(null);
    }
  });

  // previewItems depends only on a plain signal
  const previewItems = createAsync(() => {
    const fid = resolvedFocusedFolderId();
    if (!fid) return Promise.resolve(null);
    return getChildrenQuery(fid);
  });

  // Reset focus when folder changes
  createEffect(() => {
    currentFolderId();
    setFocusedIndex(0);
  });

  // Navigation helpers — wrapped in startTransition to keep old UI
  // visible while new data loads, preventing Suspense re-trigger.
  const navigateToFolder = (folderId: string | null) => {
    startTransition(() => setCurrentFolderId(folderId));
  };

  const goToParent = () => {
    const path = folderPath();
    if (!path || path.length <= 1) {
      navigateToFolder(null);
    } else {
      navigateToFolder(path[path.length - 2]?.id ?? null);
    }
  };

  const openNote = (noteId: string) => {
    navigate(`/note/${noteId}`);
  };

  const activateItem = () => {
    const item = focusedItem();
    if (!item) return;
    if (item.type === "folder") {
      navigateToFolder(item.id);
    } else {
      openNote(item.id);
    }
  };

  // Keyboard handler
  const handleKeyDown = (e: KeyboardEvent) => {
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
        if (len > 0) setFocusedIndex((i) => Math.min(i + 1, len - 1));
        break;

      case "k":
      case "ArrowUp":
        e.preventDefault();
        setGPressed(false);
        if (len > 0) setFocusedIndex((i) => Math.max(i - 1, 0));
        break;

      case "h":
      case "ArrowLeft":
      case "Backspace":
        e.preventDefault();
        setGPressed(false);
        if (currentFolderId() !== null) goToParent();
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
          setFocusedIndex(0);
          setGPressed(false);
        } else {
          setGPressed(true);
          setTimeout(() => setGPressed(false), 500);
        }
        break;

      case "G":
        e.preventDefault();
        setGPressed(false);
        if (len > 0) setFocusedIndex(len - 1);
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
      {/* Breadcrumb — own Suspense around folderPath() read */}
      <Suspense
        fallback={
          <div class="flex items-center gap-1 px-4 py-2 bg-base-200 text-sm border-b border-base-300">
            <Home class="w-4 h-4" />
            <span>Home</span>
          </div>
        }
      >
        <Breadcrumb
          path={folderPath() ?? []}
          onNavigate={(id) => navigateToFolder(id)}
        />
      </Suspense>

      {/* Three-column layout — grid is static, each column streams independently */}
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
                      if (item.type === "folder") navigateToFolder(item.id);
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

        {/* Middle column — inlined so title and content get separate Suspense */}
        <div class="flex flex-col bg-base-100 min-h-0 overflow-hidden">
          {/* Column title — Suspense only when reading async folderPath */}
          <Show
            when={currentFolderId() !== null}
            fallback={<ColumnHeader>Root</ColumnHeader>}
          >
            <Suspense fallback={<ColumnHeader>...</ColumnHeader>}>
              <ColumnHeader>
                {folderPath()?.at(-1)?.title ?? "..."}
              </ColumnHeader>
            </Suspense>
          </Show>

          {/* Column content — Suspense around currentItems() read */}
          <div class="flex-1 overflow-y-auto min-h-0">
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
          </div>
        </div>

        {/* Right column: preview */}
        <Column title="Preview">
          {/* Outer Suspense — catches focusedItem() which depends on currentItems() */}
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
                  {/* Inner Suspense — previewItems() is an independent fetch */}
                  <Suspense>
                    <Show
                      when={previewItems()}
                      fallback={
                        <div class="flex items-center justify-center h-full text-base-content/40 text-sm">
                          Empty folder
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
                  </Suspense>
                </Show>
              )}
            </Show>
          </Suspense>
        </Column>
      </div>

      {/* Keyboard hints — fully static, no Suspense needed */}
      <div class="flex items-center gap-4 px-4 py-2 bg-base-200 text-xs text-base-content/50 border-t border-base-300">
        <span>
          <kbd class="kbd kbd-xs">j</kbd>/<kbd class="kbd kbd-xs">k</kbd>{" "}
          navigate
        </span>
        <span>
          <kbd class="kbd kbd-xs">l</kbd>/<kbd class="kbd kbd-xs">Enter</kbd>{" "}
          open
        </span>
        <span>
          <kbd class="kbd kbd-xs">h</kbd>/
          <kbd class="kbd kbd-xs">Backspace</kbd> back
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

function ColumnHeader(props: { children: JSXElement }) {
  return (
    <div class="px-3 py-1.5 text-xs font-semibold text-base-content/50 uppercase tracking-wider border-b border-base-300 shrink-0">
      {props.children}
    </div>
  );
}

function Column(props: { title: string; children: JSXElement }) {
  return (
    <div class="flex flex-col bg-base-100 min-h-0 overflow-hidden">
      <Show when={props.title}>
        <ColumnHeader>{props.title}</ColumnHeader>
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
