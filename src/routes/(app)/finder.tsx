import { RouteDefinition, createAsync, revalidate, useNavigate } from "@solidjs/router";
import { animate } from "motion/mini";
import {
  For,
  Show,
  Suspense,
  batch,
  createEffect,
  createMemo,
  createSignal,
  on,
  onCleanup,
  onMount,
} from "solid-js";
import { createStore, produce } from "solid-js/store";
import { getUser } from "~/lib/auth";
import { getChildrenQuery, LIST_CHILDREN_KEY, moveItem, moveItems } from "~/lib/db/api";
import { createNewNote } from "~/lib/db/notes/create";
import { createNewFolder } from "~/lib/db/folders/create";
import { renameNote } from "~/lib/db/notes/update_rename";
import { renameFolder } from "~/lib/db/folders/update_rename";
import type { ListItem } from "~/lib/db/types";
import {
  type ColumnEntry,
  type TabState,
  EASE_OUT,
  SLIDE_DURATION,
} from "~/components/finder/constants";
import Breadcrumb from "~/components/finder/Breadcrumb";
import Column from "~/components/finder/Column";
import FinderTabBar from "~/components/finder/FinderTabBar";
import KeyboardHints from "~/components/finder/KeyboardHints";
import PreviewPanel from "~/components/finder/PreviewPanel";
import PreviewSkeleton from "~/components/finder/PreviewSkeleton";
import {
  SandboxJumpPalette,
  type SandboxJumpSelection,
} from "~/components/palette/SandboxJumpPalette";

export const route = {
  preload() {
    getUser();
    getChildrenQuery(null);
  },
} satisfies RouteDefinition;

// ─── Helper: derive a tab label from its column stack ────────────────────────
function deriveTabLabel(columns: ColumnEntry[], depth: number): string {
  if (depth < 0 || columns.length === 0) return "Home";
  // Use the deepest column's title. The root column is "Home"; deeper columns
  // carry the folder name that was navigated into.
  const col = columns[depth];
  return col?.title ?? "Home";
}

export default function Sandbox2() {
  const navigate = useNavigate();
  const MAX_VISIBLE_COLUMNS = 7;
  const MIN_COLUMN_WIDTH_PX = 280;
  const SANDBOX2_STATE_KEY = "sandbox2:list-state:v1";

  // Route guard — deferStream blocks SSR until auth resolves
  createAsync(() => getUser(), { deferStream: true });

  // ─── Tabs state ──────────────────────────────────────────────────────────
  // Each tab owns its own navigation state. We start with one empty-shell tab
  // and populate it during onMount.
  const [tabs, setTabs] = createStore<TabState[]>([
    {
      label: "Home",
      columns: [],
      depth: -1,
      focusMemory: {},
      previewItems: null,
    },
  ]);
  const [activeTabIndex, setActiveTabIndex] = createSignal(0);

  // ─── Convenience accessors into the active tab ──────────────────────────
  // These memos mirror what was previously individual top-level signals/stores,
  // so the rest of the logic below can largely remain unchanged.

  const activeTab = createMemo(() => tabs[activeTabIndex()]);

  // Derived: columns array for the active tab (reactive).
  // We use a function wrapper so callers get a reactive read.
  const columns = createMemo(() => activeTab()?.columns ?? []);
  const depth = createMemo(() => activeTab()?.depth ?? -1);

  // ─── Writers into active tab ─────────────────────────────────────────────
  // All mutations go through these helpers so they always target the correct
  // tab even if activeTabIndex changes between async operations.

  /** Set depth for the currently active tab. */
  const setDepth = (updater: number | ((prev: number) => number)) => {
    const tabIdx = activeTabIndex();
    const prev = tabs[tabIdx]?.depth ?? -1;
    const next = typeof updater === "function" ? updater(prev) : updater;
    setTabs(tabIdx, "depth", next);
    // Update label whenever depth changes.
    const newLabel = deriveTabLabel(tabs[tabIdx]?.columns ?? [], next);
    setTabs(tabIdx, "label", newLabel);
  };

  /**
   * Write columns for the active tab using a producer or direct value.
   * Supports the same `produce()` pattern used below.
   */
  const setColumns = (
    ...args:
      | [ColumnEntry[]]
      | [(cols: ColumnEntry[]) => void]
      | [number, "items", ListItem[]]
      | [number, "focusedIndex", number]
  ) => {
    const tabIdx = activeTabIndex();
    if (args.length === 3) {
      // setColumns(colIdx, "items"|"focusedIndex", value)
      const [colIdx, key, value] = args;
      setTabs(tabIdx, "columns", colIdx, key as never, value as never);
    } else if (typeof args[0] === "function") {
      // setColumns(produce(fn))
      const producer = args[0] as (cols: ColumnEntry[]) => void;
      setTabs(
        tabIdx,
        "columns",
        produce(producer),
      );
    } else {
      // setColumns(newArray)
      setTabs(tabIdx, "columns", args[0] as ColumnEntry[]);
    }
    // Keep label in sync whenever columns change.
    const d = tabs[tabIdx]?.depth ?? -1;
    const newLabel = deriveTabLabel(tabs[tabIdx]?.columns ?? [], d);
    setTabs(tabIdx, "label", newLabel);
  };

  const setFocusMemory = (
    updater: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>),
  ) => {
    const tabIdx = activeTabIndex();
    const prev = tabs[tabIdx]?.focusMemory ?? {};
    const next = typeof updater === "function" ? updater(prev) : updater;
    setTabs(tabIdx, "focusMemory", next);
  };

  const setPreviewItems = (items: ListItem[] | null) => {
    setTabs(activeTabIndex(), "previewItems", items);
  };

  // ─── Other (non-per-tab) state ───────────────────────────────────────────
  const [isNavigating, setIsNavigating] = createSignal(false);
  // Global "transition lock" for side effects that can fight horizontal track motion.
  const [isSliding, setIsSliding] = createSignal(false);
  // Click interactions can trigger multiple state updates in quick succession.
  const [disableAnimations, setDisableAnimations] = createSignal(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = createSignal(false);
  const [gPressed, setGPressed] = createSignal(false);
  const [visibleColumns, setVisibleColumns] = createSignal(1);
  const [colWidthPx, setColWidthPx] = createSignal(0);
  const [layoutReady, setLayoutReady] = createSignal(false);
  const [isJumpPaletteOpen, setIsJumpPaletteOpen] = createSignal(false);
  const [jumpPaletteParentId, setJumpPaletteParentId] = createSignal<string | null>(null);
  const [jumpPaletteBaseDepth, setJumpPaletteBaseDepth] = createSignal(0);
  // Mark state: items selected for bulk operations.
  const [markedItems, setMarkedItems] = createSignal<Map<string, ListItem>>(new Map());
  const [isMarkMode, setIsMarkMode] = createSignal(false);
  // Cut/paste state: tracks items staged for a move operation.
  const [cutItems, setCutItems] = createSignal<ListItem[]>([]);
  const [cutItemSourceFolderIds, setCutItemSourceFolderIds] = createSignal<Set<string | null>>(
    new Set(),
  );
  // Inline rename state: the ID of the item currently being renamed.
  const [editingItemId, setEditingItemId] = createSignal<string | null>(null);

  // Refs
  let viewportRef: HTMLDivElement | undefined;
  let trackRef: HTMLDivElement | undefined;
  let previewScrollRef: HTMLDivElement | undefined;
  let trackSlide: ReturnType<typeof animate> | null = null;
  let trackSlideId = 0;
  let renderedTrackX = 0;

  const memoryKey = (folderId: string | null): string => folderId ?? "root";

  interface PersistedSandbox2State {
    path: string[];
    focusedByFolder: Record<string, number>;
  }

  // ─── Persisted state (only for tab 0 / first tab) ────────────────────────
  // We persist only the active navigation path so that reloading the page
  // restores the user's position. Tabs themselves are not persisted (they are
  // ephemeral session state).

  const clampIndex = (idx: number, len: number): number => {
    if (len <= 0) return 0;
    return Math.min(Math.max(idx, 0), len - 1);
  };

  const readPersistedState = (): PersistedSandbox2State | null => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.sessionStorage.getItem(SANDBOX2_STATE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<PersistedSandbox2State>;
      if (!parsed || typeof parsed !== "object") return null;
      const path = Array.isArray(parsed.path)
        ? parsed.path.filter((id): id is string => typeof id === "string")
        : [];
      const focusedByFolder =
        parsed.focusedByFolder &&
        typeof parsed.focusedByFolder === "object" &&
        !Array.isArray(parsed.focusedByFolder)
          ? Object.fromEntries(
              Object.entries(parsed.focusedByFolder)
                .filter(([, value]) => Number.isInteger(value))
                .map(([key, value]) => [key, value as number]),
            )
          : {};
      return { path, focusedByFolder };
    } catch (error) {
      console.warn("Failed to parse persisted sandbox2 state:", error);
      return null;
    }
  };

  const writePersistedState = (state: PersistedSandbox2State) => {
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem(SANDBOX2_STATE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn("Failed to persist sandbox2 state:", error);
    }
  };

  const buildInitialColumns = async (
    rootItems: ListItem[],
    persisted: PersistedSandbox2State | null,
  ): Promise<ColumnEntry[]> => {
    const rootCol: ColumnEntry = {
      folderId: null,
      items: rootItems,
      focusedIndex: 0,
      title: "Home",
    };

    if (!persisted) return [rootCol];

    const columnsFromState: ColumnEntry[] = [rootCol];
    const rootSavedFocus = persisted.focusedByFolder[memoryKey(null)];
    if (Number.isInteger(rootSavedFocus)) {
      columnsFromState[0]!.focusedIndex = clampIndex(rootSavedFocus, rootItems.length);
    }

    for (const folderId of persisted.path) {
      const parentCol = columnsFromState[columnsFromState.length - 1];
      if (!parentCol) break;

      const folderIdx = parentCol.items.findIndex(
        (item) => item.type === "folder" && item.id === folderId,
      );
      if (folderIdx < 0) break;

      parentCol.focusedIndex = folderIdx;

      const folderItem = parentCol.items[folderIdx];
      if (!folderItem || folderItem.type !== "folder") break;

      const children = await getChildrenQuery(folderItem.id);
      const savedFocus = persisted.focusedByFolder[memoryKey(folderItem.id)] ?? 0;
      const appliedFocus = clampIndex(savedFocus, children.length);
      columnsFromState.push({
        folderId: folderItem.id,
        items: children,
        focusedIndex: appliedFocus,
        title: folderItem.title,
      });
    }

    return columnsFromState;
  };

  // ─── Derived state ───────────────────────────────────────
  const currentColumn = createMemo(() => {
    const d = depth();
    const cols = columns();
    if (d < 0 || d >= cols.length) return undefined;
    return cols[d];
  });

  const focusedItem = createMemo(() => {
    const col = currentColumn();
    if (!col || col.items.length === 0) return undefined;
    const idx = Math.min(col.focusedIndex, col.items.length - 1);
    return col.items[idx];
  });

  const breadcrumb = createMemo(() => {
    const d = depth();
    const cols = columns();
    if (d < 0) return [];
    return cols.slice(1, d + 1).map((col) => ({
      id: col.folderId!,
      title: col.title,
    }));
  });

  const trackOffset = createMemo(() => {
    const d = depth();
    if (d < 0) return 0;
    return (visibleColumns() - 1 - d) * colWidthPx();
  });

  // Derived tab labels for the tab bar.
  const tabLabels = createMemo(() => tabs.map((t) => t.label));

  const measureColWidth = () => {
    if (!viewportRef) return false;
    const viewportWidth = viewportRef.offsetWidth;
    if (viewportWidth <= 0) return false;
    const nextVisibleColumns = Math.max(
      1,
      Math.min(MAX_VISIBLE_COLUMNS, Math.floor(viewportWidth / MIN_COLUMN_WIDTH_PX)),
    );
    const nextWidth = Math.floor(viewportWidth / nextVisibleColumns);
    if (nextWidth <= 0) return false;
    setVisibleColumns(nextVisibleColumns);
    setColWidthPx(nextWidth);
    return true;
  };

  const applyTrackTransform = (x: number) => {
    renderedTrackX = x;
    if (trackRef) trackRef.style.transform = `translateX(${x}px)`;
  };

  // ─── Tab operations ──────────────────────────────────────────────────────

  /**
   * Create a new tab starting at the root (Home).
   * The new tab is initialized with the root items already loaded.
   */
  const createNewTab = async () => {
    const rootItems = await getChildrenQuery(null);
    const newTab: TabState = {
      label: "Home",
      columns: [
        {
          folderId: null,
          items: rootItems,
          focusedIndex: 0,
          title: "Home",
        },
      ],
      depth: 0,
      focusMemory: {},
      previewItems: null,
    };
    batch(() => {
      setTabs(produce((ts) => { ts.push(newTab); }));
      setActiveTabIndex(tabs.length - 1);
    });
    // Snap track to the new tab's initial position (no animation — new tab).
    applyTrackTransform(trackOffset());
  };

  /**
   * Close the tab at index. Won't close the last remaining tab.
   */
  const closeTab = (tabIdx: number) => {
    if (tabs.length <= 1) return;
    const currentActive = activeTabIndex();
    batch(() => {
      setTabs(produce((ts) => { ts.splice(tabIdx, 1); }));
      // If we closed a tab before or at the current active, shift index down.
      if (tabIdx < currentActive) {
        setActiveTabIndex(currentActive - 1);
      } else if (tabIdx === currentActive) {
        // Clamp to the new last tab if needed.
        setActiveTabIndex(Math.min(currentActive, tabs.length - 1));
      }
    });
    // Snap track after tab switch.
    applyTrackTransform(trackOffset());
  };

  /** Switch to the tab at index. */
  const switchToTab = (tabIdx: number) => {
    if (tabIdx < 0 || tabIdx >= tabs.length || tabIdx === activeTabIndex()) return;
    batch(() => {
      setActiveTabIndex(tabIdx);
      // Reset transient UI state on tab switch.
      setIsNavigating(false);
      setIsSliding(false);
    });
    // Snap track to new tab's position without animation.
    applyTrackTransform(trackOffset());
  };

  // ─── Initialization ──────────────────────────────────────
  onMount(async () => {
    const hasInitialMeasurement = measureColWidth();

    const rootItems = await getChildrenQuery(null);
    const persisted = readPersistedState();
    const initialFocusMemory = persisted?.focusedByFolder ?? {};
    const initialColumns = await buildInitialColumns(rootItems, persisted);

    batch(() => {
      // Initialize tab 0 with the restored state.
      setTabs(0, "columns", initialColumns);
      setTabs(0, "depth", initialColumns.length - 1);
      setTabs(0, "focusMemory", initialFocusMemory);
      setTabs(0, "label", deriveTabLabel(initialColumns, initialColumns.length - 1));
      if (hasInitialMeasurement || measureColWidth()) {
        setLayoutReady(true);
      }
    });

    if (viewportRef) {
      const ro = new ResizeObserver(() => {
        if (measureColWidth() && !layoutReady()) setLayoutReady(true);
      });
      ro.observe(viewportRef);
      onCleanup(() => ro.disconnect());
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleReducedMotionChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    setPrefersReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleReducedMotionChange);

    document.addEventListener("keydown", handleKeyDown);
    onCleanup(() => {
      mediaQuery.removeEventListener("change", handleReducedMotionChange);
      document.removeEventListener("keydown", handleKeyDown);
      trackSlide?.stop();
      trackSlide = null;
      setIsSliding(false);
    });
  });

  // Persist state for the active tab (tab 0 path is what we restore on load).
  createEffect(() => {
    const d = depth();
    const cols = columns();
    const fm = activeTab()?.focusMemory ?? {};
    if (d < 0 || cols.length === 0) return;

    const limitedCols = cols.slice(0, d + 1);
    const path = limitedCols
      .slice(1)
      .map((col) => col.folderId)
      .filter((id): id is string => !!id);
    const focusedByFolder: Record<string, number> = { ...fm };
    for (const col of limitedCols) {
      focusedByFolder[memoryKey(col.folderId)] = col.focusedIndex;
    }
    writePersistedState({ path, focusedByFolder });
  });

  // ─── Effects ─────────────────────────────────────────────

  // Fetch preview items when focused item is a folder
  createEffect(
    on(
      () => [focusedItem()?.id, isSliding()] as const,
      ([focusedItemId, sliding]) => {
        if (sliding) return;
        const item = focusedItem();
        if (item?.type === "folder" && item.id === focusedItemId) {
          let cancelled = false;
          onCleanup(() => {
            cancelled = true;
          });
          getChildrenQuery(item.id).then((children) => {
            if (!cancelled) setPreviewItems(children);
          });
        } else {
          setPreviewItems(null);
        }
      },
      { defer: true },
    ),
  );

  // Slide the whole track with Motion One on depth changes; snap on width changes.
  let prevDepthForTrack = -1;
  let prevWidthForTrack = 0;
  // Also track tab switches so we always snap (never animate) on tab change.
  let prevTabIndexForTrack = -1;

  createEffect(() => {
    if (!layoutReady() || !trackRef) return;

    const d = depth();
    const width = colWidthPx();
    const tabIdx = activeTabIndex();
    if (d < 0 || width <= 0) return;

    const targetX = trackOffset();
    const depthChanged = d !== prevDepthForTrack;
    const widthChanged = width !== prevWidthForTrack;
    const tabChanged = tabIdx !== prevTabIndexForTrack;
    const reducedMotion = prefersReducedMotion() || disableAnimations();

    if (prevDepthForTrack < 0 || !depthChanged || widthChanged || reducedMotion || tabChanged) {
      trackSlide?.stop();
      trackSlide = null;
      applyTrackTransform(targetX);
      setIsSliding(false);
    } else if (renderedTrackX !== targetX) {
      trackSlide?.stop();
      const animationId = ++trackSlideId;
      setIsSliding(true);
      trackSlide = animate(
        trackRef,
        {
          transform: [
            `translateX(${renderedTrackX}px)`,
            `translateX(${targetX}px)`,
          ],
        },
        { duration: SLIDE_DURATION, ease: EASE_OUT },
      );
      trackSlide.finished.finally(() => {
        if (animationId !== trackSlideId) return;
        applyTrackTransform(targetX);
        setIsSliding(false);
        if (trackSlide) trackSlide = null;
      });
    }

    prevDepthForTrack = d;
    prevWidthForTrack = width;
    prevTabIndexForTrack = tabIdx;
  });

  // ─── Navigation ──────────────────────────────────────────
  const setFocusedIndexForColumn = (colIdx: number, idx: number) => {
    const cols = columns();
    if (colIdx < 0 || colIdx >= cols.length) return;
    const folderId = cols[colIdx]?.folderId ?? null;
    const key = memoryKey(folderId);
    batch(() => {
      setColumns(colIdx, "focusedIndex", idx);
      setFocusMemory((prev) => ({ ...prev, [key]: idx }));
    });
  };

  const setFocusedIndex = (idx: number) => {
    const d = depth();
    const cols = columns();
    if (d < 0 || d >= cols.length) return;
    setFocusedIndexForColumn(d, idx);
  };

  const goDeeper = async (item: ListItem) => {
    if (item.type !== "folder" || isNavigating()) return;
    const fromDepth = depth();
    setIsNavigating(true);
    try {
      const children = await getChildrenQuery(item.id);
      const rememberedFocus = (activeTab()?.focusMemory ?? {})[memoryKey(item.id)] ?? 0;
      const restoredFocus = clampIndex(rememberedFocus, children.length);

      const targetDepth = fromDepth + 1;
      batch(() => {
        setColumns((cols) => {
          cols.splice(depth() + 1, Infinity, {
            folderId: item.id,
            items: children,
            focusedIndex: restoredFocus,
            title: item.title,
          });
        });
        setFocusMemory((prev) => ({
          ...prev,
          [memoryKey(item.id)]: restoredFocus,
        }));
        setDepth(targetDepth);
      });
    } catch (e) {
      console.error("Failed to navigate deeper:", e);
    } finally {
      setIsNavigating(false);
    }
  };

  const goShallower = () => {
    if (depth() <= 0 || isNavigating()) return;
    setDepth((d) => d - 1);
  };

  const goToDepth = (targetDepth: number) => {
    const cols = columns();
    if (targetDepth < 0 || targetDepth >= cols.length || isNavigating()) return;
    setDepth(targetDepth);
  };

  const openNote = (noteId: string) => {
    navigate(`/note/${noteId}`);
  };

  const openJumpPalette = () => {
    const col = currentColumn();
    const d = depth();
    if (!col || d < 0) return;
    setJumpPaletteParentId(col.folderId);
    setJumpPaletteBaseDepth(d);
    setIsJumpPaletteOpen(true);
  };

  const closeJumpPalette = () => {
    setIsJumpPaletteOpen(false);
  };

  const jumpToSelection = async (selection: SandboxJumpSelection) => {
    const baseDepth = jumpPaletteBaseDepth();
    const cols = columns();
    if (baseDepth < 0 || baseDepth >= cols.length) return;

    const scopedColumns = cols.slice(0, baseDepth + 1).map((col) => ({ ...col }));
    let parentCol = scopedColumns[scopedColumns.length - 1];
    if (!parentCol) return;

    const memoryUpdates: Record<string, number> = {};

    for (const folderId of selection.ancestorFolderIds) {
      const folderIdx = parentCol.items.findIndex(
        (item) => item.type === "folder" && item.id === folderId,
      );
      if (folderIdx < 0) return;

      parentCol.focusedIndex = folderIdx;
      memoryUpdates[memoryKey(parentCol.folderId)] = folderIdx;

      const folderItem = parentCol.items[folderIdx];
      if (!folderItem || folderItem.type !== "folder") return;

      const children = await getChildrenQuery(folderItem.id);
      const nextCol: ColumnEntry = {
        folderId: folderItem.id,
        items: children,
        focusedIndex: 0,
        title: folderItem.title,
      };
      scopedColumns.push(nextCol);
      parentCol = nextCol;
    }

    const targetIdx = parentCol.items.findIndex((item) => item.id === selection.item.id);
    if (targetIdx < 0) return;

    parentCol.focusedIndex = targetIdx;
    memoryUpdates[memoryKey(parentCol.folderId)] = targetIdx;

    batch(() => {
      setColumns(scopedColumns);
      setDepth(scopedColumns.length - 1);
      setFocusMemory((prev) => ({ ...prev, ...memoryUpdates }));
      closeJumpPalette();
    });
  };

  const runWithoutAnimations = async (fn: () => void | Promise<void>) => {
    setDisableAnimations(true);
    try {
      await fn();
    } finally {
      requestAnimationFrame(() => setDisableAnimations(false));
    }
  };

  const activateItem = () => {
    const item = focusedItem();
    if (!item) return;
    if (item.type === "folder") {
      goDeeper(item);
    } else {
      openNote(item.id);
    }
  };

  // ─── Derived mark/cut state ─────────────────────────────
  const cutItemIds = createMemo(() => new Set(cutItems().map((i) => i.id)));
  const markedItemIdSet = createMemo(() => new Set(markedItems().keys()));
  const markCount = createMemo(() => markedItems().size);

  // ─── Mark / Cut / Paste (move) ─────────────────────────

  const markFocusedItem = () => {
    const item = focusedItem();
    if (!item) return;
    setMarkedItems((prev) => {
      if (prev.has(item.id)) return prev;
      const next = new Map(prev);
      next.set(item.id, item);
      return next;
    });
  };

  const toggleMarkOnFocusedItem = () => {
    const item = focusedItem();
    if (!item) return;
    setMarkedItems((prev) => {
      const next = new Map(prev);
      if (next.has(item.id)) {
        next.delete(item.id);
      } else {
        next.set(item.id, item);
      }
      return next;
    });
  };

  const cutMarkedOrFocusedItems = () => {
    const marked = markedItems();
    const col = currentColumn();
    if (marked.size > 0) {
      const sourceFolderIds = new Set<string | null>();
      for (const item of marked.values()) {
        sourceFolderIds.add(item.parent_id ?? null);
      }
      setCutItems(Array.from(marked.values()));
      setCutItemSourceFolderIds(sourceFolderIds);
      setMarkedItems(new Map());
    } else {
      const item = focusedItem();
      if (!item) return;
      setCutItems([item]);
      setCutItemSourceFolderIds(new Set([col?.folderId ?? null]));
    }
  };

  /** Reload a specific column in a specific tab. */
  const reloadColumnInTab = async (tabIdx: number, colIdx: number) => {
    const col = tabs[tabIdx]?.columns[colIdx];
    if (!col) return;
    const freshItems = await getChildrenQuery(col.folderId);
    setTabs(tabIdx, "columns", colIdx, "items", freshItems);
    const clampedFocus = clampIndex(col.focusedIndex, freshItems.length);
    if (clampedFocus !== col.focusedIndex) {
      setTabs(tabIdx, "columns", colIdx, "focusedIndex", clampedFocus);
    }
  };

  /** Reload every column across ALL tabs that displays the given folder. */
  const reloadFolderAcrossAllTabs = async (folderId: string | null) => {
    const promises: Promise<void>[] = [];
    for (let tabIdx = 0; tabIdx < tabs.length; tabIdx++) {
      const tab = tabs[tabIdx];
      if (!tab) continue;
      for (let colIdx = 0; colIdx < tab.columns.length; colIdx++) {
        if (tab.columns[colIdx]?.folderId === folderId) {
          promises.push(reloadColumnInTab(tabIdx, colIdx));
        }
      }
    }
    await Promise.all(promises);
  };

  /** Shorthand: reload a column index in the active tab. */
  const reloadColumn = async (colIdx: number) => {
    await reloadColumnInTab(activeTabIndex(), colIdx);
  };

  const createItem = async (type: "note" | "folder") => {
    const col = currentColumn();
    const d = depth();
    if (!col || d < 0) return;

    const parentId = col.folderId ?? undefined;
    try {
      const created =
        type === "note"
          ? await createNewNote("Untitled Note", "", parentId)
          : await createNewFolder("New Folder", parentId);

      await revalidate(LIST_CHILDREN_KEY);
      await reloadFolderAcrossAllTabs(col.folderId);

      const refreshedCol = columns()[d];
      if (refreshedCol) {
        const newIdx = refreshedCol.items.findIndex((item) => item.id === created.id);
        if (newIdx >= 0) {
          setFocusedIndex(newIdx);
        }
      }
      setEditingItemId(created.id);
    } catch (e) {
      console.error("Failed to create item:", e);
    }
  };

  const confirmRename = async (
    itemId: string,
    itemType: "note" | "folder",
    newTitle: string,
  ) => {
    try {
      if (itemType === "note") {
        await renameNote(itemId, newTitle);
      } else {
        await renameFolder(itemId, newTitle);
      }
      const folderId = currentColumn()?.folderId ?? null;
      await revalidate(LIST_CHILDREN_KEY);
      await reloadFolderAcrossAllTabs(folderId);
    } catch (e) {
      console.error("Failed to rename item:", e);
    }
    setEditingItemId(null);
  };

  const cancelRename = () => {
    setEditingItemId(null);
  };

  const pasteItems = async () => {
    const items = cutItems();
    if (items.length === 0) return;

    const destCol = currentColumn();
    const d = depth();
    if (!destCol || d < 0) return;

    const targetParentId = destCol.folderId;

    const toMove = items.filter((item) => {
      if (item.parent_id === targetParentId) return false;
      if (!item.parent_id && targetParentId === null) return false;
      return true;
    });

    if (toMove.length === 0) {
      setCutItems([]);
      setCutItemSourceFolderIds(new Set<string | null>());
      return;
    }

    try {
      if (toMove.length === 1) {
        const item = toMove[0]!;
        const success = await moveItem(item.id, item.type, targetParentId);
        if (!success) {
          setCutItems([]);
          setCutItemSourceFolderIds(new Set<string | null>());
          return;
        }
      } else {
        const result = await moveItems(
          toMove.map((i) => ({ id: i.id, type: i.type })),
          targetParentId,
        );
        if (result.moved.length === 0) {
          setCutItems([]);
          setCutItemSourceFolderIds(new Set<string | null>());
          return;
        }
      }
    } catch (e) {
      console.error("Failed to move items:", e);
      setCutItems([]);
      setCutItemSourceFolderIds(new Set<string | null>());
      return;
    }

    const sourceFolderIds = cutItemSourceFolderIds();

    setCutItems([]);
    setCutItemSourceFolderIds(new Set<string | null>());

    await revalidate(LIST_CHILDREN_KEY);

    // Reload destination + all source folders across every tab.
    const affectedFolderIds = new Set<string | null>(sourceFolderIds);
    affectedFolderIds.add(targetParentId);
    const refreshPromises: Promise<void>[] = [];
    for (const folderId of affectedFolderIds) {
      refreshPromises.push(reloadFolderAcrossAllTabs(folderId));
    }
    await Promise.all(refreshPromises);
  };

  const scrollPreview = (direction: "up" | "down") => {
    if (!previewScrollRef) return false;
    const maxScroll = previewScrollRef.scrollHeight - previewScrollRef.clientHeight;
    if (maxScroll <= 0) return false;
    const amount = Math.max(80, Math.floor(previewScrollRef.clientHeight * 0.8));
    const delta = direction === "down" ? amount : -amount;
    previewScrollRef.scrollBy({ top: delta, behavior: "auto" });
    return true;
  };

  const handleColumnItemClick = (
    colIdx: number,
    itemIdx: number,
    item: ListItem,
  ) => {
    void runWithoutAnimations(async () => {
      if (colIdx === depth()) {
        setFocusedIndex(itemIdx);
        if (item.type === "folder") await goDeeper(item);
        else openNote(item.id);
      } else if (colIdx < depth()) {
        setFocusedIndexForColumn(colIdx, itemIdx);
        goToDepth(colIdx);
        if (item.type === "folder") await goDeeper(item);
        else openNote(item.id);
      }
    });
  };

  const handleColumnItemMouseMove = (colIdx: number, itemIdx: number) => {
    if (colIdx === depth()) setFocusedIndex(itemIdx);
  };

  // ─── Keyboard ────────────────────────────────────────────
  const handleKeyDown = (e: KeyboardEvent) => {
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement
    )
      return;
    if (isJumpPaletteOpen()) return;
    if (depth() < 0) return;

    const col = currentColumn();
    const len = col?.items.length ?? 0;
    const idx = col?.focusedIndex ?? 0;

    // ── Tab shortcuts ─────────────────────────────────────
    // `t` — create new tab
    if (e.key === "t" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      setGPressed(false);
      void createNewTab();
      return;
    }

    // `[` — previous tab
    if (e.key === "[" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      setGPressed(false);
      const prevIdx = activeTabIndex() - 1;
      if (prevIdx >= 0) switchToTab(prevIdx);
      return;
    }

    // `]` — next tab
    if (e.key === "]" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      setGPressed(false);
      const nextIdx = activeTabIndex() + 1;
      if (nextIdx < tabs.length) switchToTab(nextIdx);
      return;
    }

    // `Ctrl+c` — close current tab
    if (e.key === "c" && e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      setGPressed(false);
      closeTab(activeTabIndex());
      return;
    }

    // `a` — create new note
    if (e.key === "a" && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
      e.preventDefault();
      setGPressed(false);
      setIsMarkMode(false);
      void createItem("note");
      return;
    }
    // `A` (shift+a) — create new folder
    if (e.key === "A" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      setGPressed(false);
      setIsMarkMode(false);
      void createItem("folder");
      return;
    }

    switch (e.key) {
      case "j":
      case "ArrowDown":
        e.preventDefault();
        setGPressed(false);
        if (len > 0) {
          setFocusedIndex(Math.min(idx + 1, len - 1));
          if (isMarkMode()) markFocusedItem();
        }
        break;

      case "k":
      case "ArrowUp":
        e.preventDefault();
        setGPressed(false);
        if (len > 0) {
          setFocusedIndex(Math.max(idx - 1, 0));
          if (isMarkMode()) markFocusedItem();
        }
        break;

      case "h":
      case "ArrowLeft":
      case "Backspace":
        e.preventDefault();
        setGPressed(false);
        setIsMarkMode(false);
        goShallower();
        break;

      case "l":
      case "ArrowRight": {
        const item = focusedItem();
        if (item?.type === "folder") {
          e.preventDefault();
          setGPressed(false);
          setIsMarkMode(false);
          goDeeper(item);
        }
        break;
      }

      case "Enter":
        e.preventDefault();
        setGPressed(false);
        setIsMarkMode(false);
        activateItem();
        break;

      case "g":
        e.preventDefault();
        if (gPressed()) {
          setIsMarkMode(false);
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
        setIsMarkMode(false);
        if (len > 0) setFocusedIndex(len - 1);
        break;

      case "z":
        e.preventDefault();
        setGPressed(false);
        setIsMarkMode(false);
        openJumpPalette();
        break;

      case "PageDown":
      case "d":
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          const didScroll = scrollPreview("down");
          if (didScroll) e.preventDefault();
        }
        setGPressed(false);
        break;

      case "PageUp":
      case "u":
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          const didScroll = scrollPreview("up");
          if (didScroll) e.preventDefault();
        }
        setGPressed(false);
        break;

      case "v":
        e.preventDefault();
        setGPressed(false);
        if (isMarkMode()) {
          setIsMarkMode(false);
        } else {
          setIsMarkMode(true);
          markFocusedItem();
        }
        break;

      case "x":
        e.preventDefault();
        setGPressed(false);
        setIsMarkMode(false);
        cutMarkedOrFocusedItems();
        break;

      case "p":
        e.preventDefault();
        setGPressed(false);
        void pasteItems();
        break;

      case "Escape":
        e.preventDefault();
        setGPressed(false);
        setIsMarkMode(false);
        if (markedItems().size > 0) {
          setMarkedItems(new Map());
        } else if (cutItems().length > 0) {
          setCutItems([]);
          setCutItemSourceFolderIds(new Set<string | null>());
        }
        break;

      default:
        setGPressed(false);
        break;
    }
  };

  // ─── Render ──────────────────────────────────────────────
  return (
    <div class="flex flex-col h-full">
      <FinderTabBar
        labels={tabLabels()}
        activeIndex={activeTabIndex()}
        onSwitch={switchToTab}
        onClose={closeTab}
      />

      <Breadcrumb crumbs={breadcrumb()} onNavigate={goToDepth} />

      <div class="flex-1 min-h-0 grid grid-cols-[2fr_1fr] gap-px bg-base-300">
        {/* Stack viewport — columns slide within this container */}
        <div
          ref={viewportRef}
          class="overflow-hidden relative bg-base-100 z-10 isolate"
        >
          <Show
            when={depth() >= 0 && layoutReady()}
            fallback={
              <div class="flex items-center justify-center h-full">
                <span class="loading loading-spinner" />
              </div>
            }
          >
            <div
              ref={trackRef}
              class="flex h-full"
              style={{
                "will-change": "transform",
              }}
            >
              <For each={columns()}>
                {(col, colIdx) => (
                  <Column
                    title={col.title}
                    items={col.items}
                    focusedIndex={col.focusedIndex}
                    width={colWidthPx()}
                    isActive={colIdx() === depth()}
                    isSliding={isSliding()}
                    nextColumnFolderId={
                      colIdx() < depth()
                        ? columns()[colIdx() + 1]?.folderId
                        : undefined
                    }
                    cutItemIds={cutItemIds()}
                    markedItemIds={markedItemIdSet()}
                    editingItemId={colIdx() === depth() ? editingItemId() : null}
                    onRenameConfirm={(itemId, itemType, newTitle) =>
                      void confirmRename(itemId, itemType, newTitle)
                    }
                    onRenameCancel={cancelRename}
                    onItemClick={(itemIdx, item) =>
                      handleColumnItemClick(colIdx(), itemIdx, item)
                    }
                    onItemMouseMove={(itemIdx) =>
                      handleColumnItemMouseMove(colIdx(), itemIdx)
                    }
                  />
                )}
              </For>
            </div>
          </Show>
        </div>

        <Suspense fallback={<PreviewSkeleton />}>
          <PreviewPanel
            focusedItem={focusedItem()}
            previewItems={activeTab()?.previewItems ?? null}
            isSliding={isSliding()}
            prefersReducedMotion={prefersReducedMotion()}
            disableAnimations={disableAnimations()}
            onScrollContainerRef={(el) => {
              previewScrollRef = el;
            }}
          />
        </Suspense>
      </div>

      <KeyboardHints
        cutPending={cutItems().length > 0}
        cutCount={cutItems().length}
        markCount={markCount()}
        isMarkMode={isMarkMode()}
        tabCount={tabs.length}
      />

      <SandboxJumpPalette
        open={isJumpPaletteOpen}
        onClose={closeJumpPalette}
        parentId={jumpPaletteParentId}
        onSelect={(selection) => void jumpToSelection(selection)}
      />
    </div>
  );
}
