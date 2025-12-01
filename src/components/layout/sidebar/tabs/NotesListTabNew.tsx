import { createAsync } from "@solidjs/router";
import ArrowLeft from "lucide-solid/icons/arrow-left";
import ChevronLeft from "lucide-solid/icons/chevron-left";
import FileText from "lucide-solid/icons/file-text";
import Folder from "lucide-solid/icons/folder";
import HomeIcon from "lucide-solid/icons/home";
import {
  type Accessor,
  batch,
  createEffect,
  createMemo,
  createSignal,
  ErrorBoundary,
  For,
  on,
  Show,
  splitProps,
  Suspense,
} from "solid-js";
import { createStore } from "solid-js/store";
import {
  getChildrenQuery,
  getFolderPathQuery,
  getIndexNoteIdQuery,
  getNoteFolderPathQuery,
} from "~/lib/db_new/api";
import type { ListItem } from "~/lib/db_new/types";
import { ITEM_KEYBINDINGS, LIST_KEYBINDINGS, matchesKeybind } from "~/lib/keybindings";
import { KeybindingHelp } from "./KeybindingHelp";
import {
  dividerVariants,
  indexButtonVariants,
  jumpButtonVariants,
  listContainerVariants,
  listItemNameVariants,
  listItemVariants,
  pathContainerVariants,
  pathItemVariants,
  pathTextVariants,
} from "./listStyle";

// Selection as discriminated union
type Selection =
  | { type: "none" }
  | { type: "item"; index: number }
  | { type: "index" };

interface ListStore {
  history: string[];
  focusMemory: Record<string, number | undefined>;
  focusedIndex: number | null;
  selection: Selection;
  focusZone: "path" | "list";
  pathFocusIndex: number;
  indexButtonFocused: boolean;
  selectionHistory: string[] | null;
  autoSelectingIndex: boolean;
  /** When true, the next auto-expand from URL change will be skipped (used for internal navigation like Enter on folder) */
  skipNextAutoExpand: boolean;
}

interface ListViewerProps {
  onSelect?: (item: ListItem) => void;
  onSelectIndex?: (noteId: string) => void;
  onFocus?: (item: ListItem | null) => void;
  selectionFollowsFocus?: boolean;
  /** Because double touch on Mobile is bad form, and a small button is also bad*/
  navigateFoldersOnClick?: boolean;
  /** Current note ID from route - used to highlight and auto-navigate to folder */
  currentNoteId?: Accessor<string | undefined>;
  /** Called when user selects a note (for navigation) */
  onNoteSelect?: (noteId: string) => void;
  /** Called when user right-clicks an item */
  onContextMenu?: (item: ListItem, event: MouseEvent) => void;
  /** ID of item currently being renamed (controlled from parent) */
  editingItemId?: Accessor<string | null>;
  /** Called when rename is confirmed (Enter/blur) */
  onRename?: (item: ListItem, newTitle: string) => void;
  /** Called when rename is cancelled (Escape) */
  onCancelRename?: () => void;
  /** Called when user initiates rename (F2 key) */
  onStartEdit?: (item: ListItem) => void;
  /** Called when user creates a sibling item (Ctrl+N or Ctrl+Shift+N) */
  onCreateSibling?: (item: ListItem, type: "note" | "folder") => void;
  /** Called when user creates a child item (Shift+N or Alt+Shift+N) */
  onCreateChild?: (item: ListItem, type: "note" | "folder") => void;
  /** Called when user copies a link (y key) */
  onCopyLink?: (item: ListItem) => void;
  /** Called when user duplicates an item (Ctrl+D) */
  onDuplicate?: (item: ListItem) => void;
  /** ID of item currently cut (for visual feedback) */
  cutItemId?: Accessor<string | null>;
  /** Called when user cuts an item (Ctrl+X) */
  onCut?: (item: ListItem) => void;
  /** Called when user pastes (Ctrl+V) */
  onPaste?: (item: ListItem) => void;
  /** Called when user pastes as child (Ctrl+Shift+V) */
  onPasteChild?: (item: ListItem) => Promise<void>;
  /** Called when user deletes (Delete key) */
  onDelete?: (item: ListItem) => Promise<void>;
  /** Called when user converts note to folder (Ctrl+Shift+F) */
  onMakeFolder?: (item: ListItem) => Promise<void>;
  /** Called when user converts folder to note (Ctrl+Shift+G) */
  onMakeNote?: (item: ListItem) => Promise<void>;
}

const memoryKey = (parentId: string | null): string => parentId ?? "root";
const INDEX_KEY = "0";
const INDENT_PX = 12;

export function ListViewer(props: ListViewerProps) {
  const [local] = splitProps(props, ["navigateFoldersOnClick", "selectionFollowsFocus"]);
  const navigateOnClick = local.navigateFoldersOnClick ?? true;

  // Follow mode: arrow keys select items as you navigate
  const [followMode, setFollowMode] = createSignal(local.selectionFollowsFocus ?? false);

  const [list, setList] = createStore<ListStore>({
    history: [],
    focusMemory: {},
    focusedIndex: null,
    selection: { type: "none" },
    focusZone: "list",
    pathFocusIndex: 0,
    indexButtonFocused: false,
    selectionHistory: null,
    autoSelectingIndex: false,
    skipNextAutoExpand: false,
  });

  // Batch update helper
  const update = (changes: Partial<ListStore>) => {
    batch(() => {
      Object.entries(changes).forEach(([k, v]) => setList(k as keyof ListStore, v as never));
    });
  };

  let containerRef!: HTMLDivElement;
  const itemRefs: (HTMLDivElement | undefined)[] = [];
  const pathItemRefs: (HTMLDivElement | undefined)[] = [];

  // Derived state
  const currentParent = createMemo(() => list.history.at(-1) ?? null);
  const selectedIndex = () =>
    list.selection.type === "item" ? list.selection.index : null;
  // Derive index selection from URL - index note is selected if its ID matches current route
  const indexSelected = () => {
    const currentIndexId = indexNoteId();
    if (currentIndexId && props.currentNoteId) {
      return props.currentNoteId() === currentIndexId;
    }
    return list.selection.type === "index";
  };

  // Data fetching
  const items = createAsync(() => getChildrenQuery(currentParent()));
  const folderPath = createAsync(() => getFolderPathQuery(currentParent()));
  const indexNoteId = createAsync(() => getIndexNoteIdQuery(currentParent()));

  const pathItemCount = createMemo(() => 1 + (folderPath()?.length ?? 0));

  const isOnCurrentFolder = createMemo(
    () => list.pathFocusIndex === (folderPath()?.length ?? 0),
  );

  const hasNavigatedFromSelection = createMemo(() => {
    const ctx = list.selectionHistory;
    return ctx !== null && JSON.stringify(ctx) !== JSON.stringify(list.history);
  });

  // Refocus container after navigation
  createEffect(on(currentParent, () => containerRef.focus(), { defer: false }));

  // Auto-select index note after navigating into a folder (when clicking a folder)
  createEffect(() => {
    if (list.autoSelectingIndex && indexNoteId()) {
      selectIndex();
      setList("autoSelectingIndex", false);
    }
  });

  // Auto-expand to note's folder when URL changes (external navigation)
  createEffect(
    on(
      () => props.currentNoteId?.(),
      async (noteId) => {
        // Skip if this was triggered by internal folder index selection (Enter on folder)
        if (list.skipNextAutoExpand) {
          setList("skipNextAutoExpand", false);
          return;
        }

        if (!noteId) return;

        // Fetch the note's folder path to know where to navigate
        const pathInfo = await getNoteFolderPathQuery(noteId);
        if (!pathInfo) return;

        // Build the history array (folder IDs from root to parent)
        // folderPath now includes the parent folder itself (inclusive)
        const newHistory = pathInfo.folderPath.map((f) => f.id);

        // Only update if we need to navigate to a different folder
        const currentHistoryStr = JSON.stringify(list.history);
        const newHistoryStr = JSON.stringify(newHistory);
        if (currentHistoryStr !== newHistoryStr) {
          update({
            history: newHistory,
            pathFocusIndex: newHistory.length,
          });
        }
      },
      { defer: true },
    ),
  );

  // Scroll focused item into view
  createEffect(() => {
    const focusIndex = list.focusedIndex;
    if (focusIndex !== null && itemRefs[focusIndex]) {
      itemRefs[focusIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  });

  // Scroll focused path item into view
  createEffect(() => {
    if (list.focusZone === "path" && !list.indexButtonFocused) {
      const pathIndex = list.pathFocusIndex;
      if (pathItemRefs[pathIndex]) {
        pathItemRefs[pathIndex]?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      }
    }
  });

  // Focus memory
  const saveFocus = () => {
    if (list.focusedIndex !== null) {
      setList("focusMemory", memoryKey(currentParent()), list.focusedIndex);
    }
  };

  const restoreFocus = (parentId: string | null): number | null =>
    list.focusMemory[memoryKey(parentId)] ?? null;

  // Navigation actions
  const applyNavigation = (history: string[], focusedIndex: number | null) => {
    update({ history, focusedIndex, pathFocusIndex: history.length, indexButtonFocused: false });
  };

  const navigateToFolder = (folderId: string | null) => {
    if (folderId === null) {
      saveFocus();
      applyNavigation([], restoreFocus(null));
    } else {
      const idx = list.history.indexOf(folderId);
      if (idx !== -1) {
        saveFocus();
        const newHistory = list.history.slice(0, idx + 1);
        applyNavigation(newHistory, restoreFocus(folderId));
      }
    }
  };

  const navigateInto = (item: ListItem) => {
    if (item.type !== "folder") return;
    saveFocus();
    applyNavigation([...list.history, item.id], restoreFocus(item.id));
  };

  const navigateBack = () => {
    if (list.history.length === 0) return;
    saveFocus();
    const newHistory = list.history.slice(0, -1);
    applyNavigation(newHistory, restoreFocus(newHistory.at(-1) ?? null));
  };

  const jumpToSelection = () => {
    const ctx = list.selectionHistory;
    if (!ctx) return;
    saveFocus();
    update({
      history: [...ctx],
      focusedIndex: list.selection.type === "item" ? list.selection.index : null,
      pathFocusIndex: ctx.length,
      indexButtonFocused: false,
      focusZone: "list",
    });
  };

  // Focus navigation
  const navigateFocus = (direction: "up" | "down") => {
    const currentItems = items();
    if (!currentItems?.length) return;

    const curr = list.focusedIndex ?? -1;
    const len = currentItems.length;
    const newIndex = direction === "up"
      ? (curr <= 0 ? len - 1 : curr - 1)
      : (curr >= len - 1 ? 0 : curr + 1);

    const item = currentItems[newIndex] ?? null;

    if (followMode() && item) {
      if (item.type === "folder") {
        // Same behavior as Enter on folder - select its index note
        setList("focusedIndex", newIndex);
        selectFolderIndex(newIndex);
      } else {
        update({
          focusedIndex: newIndex,
          selection: { type: "item", index: newIndex },
          selectionHistory: [...list.history],
        });
        props.onNoteSelect?.(item.id);
        props.onSelect?.(item);
      }
    } else {
      setList("focusedIndex", newIndex);
    }
    props.onFocus?.(item);
  };

  const navigatePathFocus = (direction: "up" | "down") => {
    const count = pathItemCount();
    const curr = list.pathFocusIndex;
    const newIndex = direction === "up"
      ? (curr <= 0 ? count - 1 : curr - 1)
      : (curr >= count - 1 ? 0 : curr + 1);
    update({ indexButtonFocused: false, pathFocusIndex: newIndex });
  };

  // Selection actions
  const selectItem = (index: number) => {
    const item = items()?.[index];
    if (!item) return;

    // For notes, trigger navigation callback - URL change will drive selection state
    if (item.type === "note" && props.onNoteSelect) {
      props.onNoteSelect(item.id);
      // Still call onSelect for any other listeners
      props.onSelect?.(item);
      return;
    }

    // For folders (when navigateFoldersOnClick is false), keep old behavior
    update({ selection: { type: "item", index }, selectionHistory: [...list.history] });
    props.onSelect?.(item);
  };

  const selectIndex = () => {
    const noteId = indexNoteId();
    if (!noteId) return;

    // Trigger navigation for index notes - URL change will drive selection state
    if (props.onNoteSelect) {
      props.onNoteSelect(noteId);
      props.onSelectIndex?.(noteId);
      return;
    }

    update({ selection: { type: "index" }, selectionHistory: [...list.history] });
    props.onSelectIndex?.(noteId);
  };

  // Select a folder's index note without changing the sidebar view
  // This allows "Enter on folder" to select its index while staying in current folder
  const selectFolderIndex = async (index: number) => {
    const item = items()?.[index];
    if (!item || item.type !== "folder") return;

    // Fetch the index note ID for this folder
    const indexId = await getIndexNoteIdQuery(item.id);
    if (!indexId) return;

    // Batch update: mark folder as selected + set skip flag to prevent auto-expand
    update({
      selection: { type: "item", index },
      selectionHistory: [...list.history],
      skipNextAutoExpand: true,
    });

    // Navigate to the index note (triggers auto-expand effect, which will skip due to flag)
    props.onNoteSelect?.(indexId);
  };

  // Event handlers
  const handleListClick = (index: number) => {
    update({ focusZone: "list", focusedIndex: index });
    const item = items()?.[index];
    if (!item) return;

    // Navigate into folders if prop enabled (default behavior)
    if (item.type === "folder" && navigateOnClick) {
      navigateInto(item);
      setList("autoSelectingIndex", true);
    } else {
      // Select folders/notes when navigation disabled or item is note
      selectItem(index);
    }
  };

  const handlePathClick = (index: number) => {
    update({ focusZone: "path", pathFocusIndex: index, indexButtonFocused: false });
    activatePathItem(index);
    // Ensure container has focus for keyboard navigation (clicking current folder won't trigger the effect)
    containerRef.focus();
  };

  const activatePathItem = (index: number) => {
    const path = folderPath() ?? [];
    if (index === 0) {
      navigateToFolder(null);
    } else if (index <= path.length) {
      navigateToFolder(path[index - 1].id);
    }
  };

  const enterFocusedFolder = () => {
    const currentItems = items();
    if (list.focusedIndex !== null && currentItems) {
      const item = currentItems[list.focusedIndex];
      if (item) navigateInto(item);
    }
  };

  // Keyboard handlers using key maps
  const listKeyActions: Record<string, () => void> = {
    ArrowUp: () => navigateFocus("up"),
    k: () => navigateFocus("up"),
    ArrowDown: () => navigateFocus("down"),
    j: () => navigateFocus("down"),
    l: enterFocusedFolder,
    h: navigateBack,
    Backspace: navigateBack,
    Escape: () => setList("focusZone", "path"),
    [LIST_KEYBINDINGS.followMode.key]: () => setFollowMode((prev) => !prev),
    Enter: () => {
      if (list.focusedIndex === null) return;
      const item = items()?.[list.focusedIndex];
      if (item?.type === "folder") {
        selectFolderIndex(list.focusedIndex);
      } else {
        selectItem(list.focusedIndex);
      }
    },
  };

  // Handle item-level keybindings (rename, etc.) using centralized config
  const handleItemKeybind = (e: KeyboardEvent): boolean => {
    const currentItems = items();
    if (list.focusedIndex === null || !currentItems) return false;

    const item = currentItems[list.focusedIndex];
    if (!item) return false;

    if (matchesKeybind(e, ITEM_KEYBINDINGS.rename.key)) {
      props.onStartEdit?.(item);
      return true;
    }

    // Create sibling/child - infer type from selected item
    if (matchesKeybind(e, ITEM_KEYBINDINGS.createSibling.key)) {
      props.onCreateSibling?.(item, item.type);
      return true;
    }

    if (matchesKeybind(e, ITEM_KEYBINDINGS.createChild.key)) {
      props.onCreateChild?.(item, item.type);
      return true;
    }

    if (matchesKeybind(e, ITEM_KEYBINDINGS.copyLink.key)) {
      props.onCopyLink?.(item);
      return true;
    }

    if (matchesKeybind(e, ITEM_KEYBINDINGS.duplicate.key)) {
      props.onDuplicate?.(item);
      return true;
    }

    if (matchesKeybind(e, ITEM_KEYBINDINGS.cut.key)) {
      props.onCut?.(item);
      return true;
    }

    if (matchesKeybind(e, ITEM_KEYBINDINGS.paste.key)) {
      props.onPaste?.(item);
      return true;
    }

    if (matchesKeybind(e, ITEM_KEYBINDINGS.pasteChild.key)) {
      props.onPasteChild?.(item);
      return true;
    }

    if (matchesKeybind(e, ITEM_KEYBINDINGS.delete.key)) {
      props.onDelete?.(item);
      return true;
    }

    if (matchesKeybind(e, ITEM_KEYBINDINGS.makeFolder.key)) {
      props.onMakeFolder?.(item);
      return true;
    }

    if (matchesKeybind(e, ITEM_KEYBINDINGS.makeNote.key)) {
      props.onMakeNote?.(item);
      return true;
    }

    return false;
  };

  const pathKeyActions: Record<string, () => void> = {
    ArrowUp: () => navigatePathFocus("up"),
    k: () => navigatePathFocus("up"),
    ArrowDown: () => navigatePathFocus("down"),
    j: () => navigatePathFocus("down"),
    ArrowRight: handlePathRight,
    l: handlePathRight,
    ArrowLeft: () => list.indexButtonFocused
      ? setList("indexButtonFocused", false)
      : setList("focusZone", "list"),
    h: () => list.indexButtonFocused
      ? setList("indexButtonFocused", false)
      : setList("focusZone", "list"),
    Escape: () => update({ indexButtonFocused: false, focusZone: "list" }),
    Enter: () => list.indexButtonFocused
      ? selectIndex()
      : activatePathItem(list.pathFocusIndex),
  };

  function handlePathRight() {
    if (list.indexButtonFocused) selectIndex();
    else if (isOnCurrentFolder() && indexNoteId()) setList("indexButtonFocused", true);
    else activatePathItem(list.pathFocusIndex);
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    // Global shortcuts
    if (e.key === INDEX_KEY) {
      e.preventDefault();
      selectIndex();
      return;
    }
    if (e.ctrlKey && e.key === "ArrowUp") {
      e.preventDefault();
      setList("focusZone", "path");
      return;
    }
    if (e.ctrlKey && e.key === "ArrowDown") {
      e.preventDefault();
      setList("focusZone", "list");
      return;
    }

    // Item-level keybindings (rename, etc.) - check before zone handlers
    if (list.focusZone === "list" && handleItemKeybind(e)) {
      e.preventDefault();
      return;
    }

    // Zone-specific handlers
    const actions = list.focusZone === "path" ? pathKeyActions : listKeyActions;
    const action = actions[e.key];
    if (action) {
      e.preventDefault();
      action();
    }
  };

  // Render helpers
  const isPathItemFocused = (index: number) =>
    list.focusZone === "path" &&
    list.pathFocusIndex === index &&
    !list.indexButtonFocused;

  const isIndexButtonFocused = () =>
    list.focusZone === "path" && list.indexButtonFocused;

  const IndexButton = (btnProps: { pathIndex: number }) => (
    <button
      class={indexButtonVariants({
        focused: isIndexButtonFocused(),
        selected: indexSelected(),
      })}
      onClick={(e) => {
        e.stopPropagation();
        update({ focusZone: "path", pathFocusIndex: btnProps.pathIndex, indexButtonFocused: true });
        selectIndex();
        // Return focus to container (button click steals focus)
        containerRef.focus();
      }}
      title={`View folder index (press ${INDEX_KEY})`}
      aria-label="View folder index"
    >
      <FileText size={14} aria-hidden="true" />
    </button>
  );

  return (
    <div
      class="h-full flex flex-col outline-none"
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <nav aria-label="Folder path">
        <div class={pathContainerVariants()} role="list">
          <div class="w-max min-w-full">
            <Show when={hasNavigatedFromSelection()}>
              <button
                class={jumpButtonVariants()}
                onClick={(e) => {
                  e.stopPropagation();
                  jumpToSelection();
                  // Return focus to container (button click steals focus)
                  containerRef.focus();
                }}
              >
                <ArrowLeft size={14} />
                <span>Back to selection</span>
              </button>
            </Show>

            <div
              ref={(el) => pathItemRefs[0] = el}
              role="listitem"
              aria-current={list.history.length === 0 ? "location" : undefined}
              class={pathItemVariants({
                focused: isPathItemFocused(0),
                current: list.history.length === 0,
              })}
              onClick={() => handlePathClick(0)}
            >
              <HomeIcon size={16} />
              <span class={pathTextVariants()}>Home</span>
              <Show when={list.history.length === 0 && indexNoteId()}>
                <IndexButton pathIndex={0} />
              </Show>
            </div>

            <Suspense>
              <For each={folderPath() ?? []}>
                {(crumb, index) => {
                  const pathIndex = () => 1 + index();
                  const isLast = () =>
                    index() === (folderPath()?.length ?? 0) - 1;

                  return (
                    <div
                      ref={(el) => pathItemRefs[pathIndex()] = el}
                      role="listitem"
                      aria-current={isLast() ? "location" : undefined}
                      class={pathItemVariants({
                        focused: isPathItemFocused(pathIndex()),
                        current: isLast(),
                      })}
                      style={{ "padding-left": `${(index() + 2) * INDENT_PX}px` }}
                      onClick={() => handlePathClick(pathIndex())}
                    >
                      <ChevronLeft size={12} class="rotate-180 opacity-40" />
                      <Folder size={14} />
                      <span class={pathTextVariants()}>{crumb.title}</span>
                      <Show when={isLast() && indexNoteId()}>
                        <IndexButton pathIndex={pathIndex()} />
                      </Show>
                    </div>
                  );
                }}
              </For>
            </Suspense>
          </div>
        </div>
      </nav>

      <div class="flex items-center gap-2">
        <div class={dividerVariants() + " flex-1"} />
        <KeybindingHelp followModeActive={followMode} />
      </div>

      <div
        class={listContainerVariants()}
        role="listbox"
        aria-label="Files and folders"
        aria-activedescendant={
          list.focusZone === "list" && list.focusedIndex !== null
            ? `listitem-${list.focusedIndex}`
            : undefined
        }
      >
        <ErrorBoundary fallback={<p>Error loading items</p>}>
          <Suspense fallback={<p>...</p>}>
            <For each={items() ?? []}>
              {(item, index) => {
                const isFocused = () =>
                  list.focusZone === "list" && list.focusedIndex === index();
                // Derive selection from URL for notes, fall back to internal state for folders
                const isSelected = () => {
                  if (item.type === "note") {
                    return props.currentNoteId?.() === item.id;
                  }
                  return selectedIndex() === index();
                };
                const isCut = () => props.cutItemId?.() === item.id;

                return (
                  <div
                    ref={(el) => itemRefs[index()] = el}
                    id={`listitem-${index()}`}
                    role="option"
                    aria-selected={isSelected()}
                    class={`${listItemVariants({
                      focused: isFocused(),
                      selected: isSelected(),
                    })} ${isCut() ? "opacity-50" : ""}`}
                    onClick={() => handleListClick(index())}
                    onDblClick={() => navigateInto(item)}
                    onContextMenu={(e) => {
                      if (props.onContextMenu) {
                        e.preventDefault();
                        props.onContextMenu(item, e);
                      }
                    }}
                  >
                    {item.type === "folder" ? (
                      <Folder size={16} class="inline mr-2 flex-shrink-0" />
                    ) : (
                      <FileText size={16} class="inline mr-2 flex-shrink-0" />
                    )}
                    <Show
                      when={props.editingItemId?.() === item.id}
                      fallback={
                        <span
                          class={listItemNameVariants({
                            focused: isFocused(),
                            selected: isSelected(),
                          })}
                        >
                          {item.title}
                        </span>
                      }
                    >
                      {(() => {
                        const [editValue, setEditValue] = createSignal(item.title);
                        let inputRef: HTMLInputElement | undefined;

                        const handleSave = () => {
                          const newTitle = editValue().trim();
                          if (newTitle && newTitle !== item.title) {
                            props.onRename?.(item, newTitle);
                          } else {
                            props.onCancelRename?.();
                          }
                          // Restore focus to container for keyboard navigation
                          containerRef.focus();
                        };

                        const handleKeyDown = (e: KeyboardEvent) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleSave();
                          } else if (e.key === "Escape") {
                            e.preventDefault();
                            props.onCancelRename?.();
                            // Restore focus to container for keyboard navigation
                            containerRef.focus();
                          }
                          // Stop propagation to prevent list keyboard handlers
                          e.stopPropagation();
                        };

                        // Auto-focus when mounted
                        createEffect(() => {
                          if (inputRef) {
                            inputRef.focus();
                            inputRef.select();
                          }
                        });

                        return (
                          <input
                            ref={inputRef}
                            type="text"
                            value={editValue()}
                            onInput={(e) => setEditValue(e.currentTarget.value)}
                            onBlur={handleSave}
                            onKeyDown={handleKeyDown}
                            class="flex-1 px-1 py-0 text-sm bg-base-100 border border-primary rounded outline-none focus:ring-1 focus:ring-primary"
                            onClick={(e) => e.stopPropagation()}
                          />
                        );
                      })()}
                    </Show>
                  </div>
                );
              }}
            </For>
          </Suspense>
        </ErrorBoundary>
      </div>
    </div>
  );
}
