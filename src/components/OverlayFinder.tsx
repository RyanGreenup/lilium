/**
 * Standalone finder for the overlay panel.
 *
 * Reuses existing sub-components (Column, Breadcrumb, etc.) but owns all of
 * its own navigation state — it is NOT connected to the route-based finder.
 *
 * Keyboard handling uses the capture phase so that events are intercepted
 * before the route-level finder (which listens in the bubble phase).
 */

import { useNavigate, revalidate } from "@solidjs/router";
import { animate } from "motion/mini";
import {
  Accessor,
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
import { getChildrenQuery, LIST_CHILDREN_KEY, moveItem, moveItems } from "~/lib/db/api";
import { createNewNote } from "~/lib/db/notes/create";
import { createNewFolder } from "~/lib/db/folders/create";
import { renameNote } from "~/lib/db/notes/update_rename";
import { renameFolder } from "~/lib/db/folders/update_rename";
import { deleteNote } from "~/lib/db/notes/delete";
import { deleteFolder } from "~/lib/db/folders/delete";
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
import DeleteConfirmDialog from "~/components/finder/DeleteConfirmDialog";
import PreviewSkeleton from "~/components/finder/PreviewSkeleton";
import {
  SandboxJumpPalette,
  type SandboxJumpSelection,
} from "~/components/palette/SandboxJumpPalette";

export interface OverlayFinderProps {
  open: Accessor<boolean>;
  onClose: () => void;
}

// ─── Helper ─────────────────────────────────────────────────────────────────
function deriveTabLabel(columns: ColumnEntry[], depth: number): string {
  if (depth < 0 || columns.length === 0) return "Home";
  const col = columns[depth];
  return col?.title ?? "Home";
}

const clampIndex = (idx: number, len: number): number => {
  if (len <= 0) return 0;
  return Math.min(Math.max(idx, 0), len - 1);
};

const memoryKey = (folderId: string | null): string => folderId ?? "root";

// ─── Component ──────────────────────────────────────────────────────────────
export default function OverlayFinder(props: OverlayFinderProps) {
  const navigate = useNavigate();
  const MAX_VISIBLE_COLUMNS = 7;
  const MIN_COLUMN_WIDTH_PX = 280;

  // ─── Tabs state ───────────────────────────────────────────────────────────
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

  const activeTab = createMemo(() => tabs[activeTabIndex()]);
  const columns = createMemo(() => activeTab()?.columns ?? []);
  const depth = createMemo(() => activeTab()?.depth ?? -1);

  // ─── Writers ──────────────────────────────────────────────────────────────
  const setDepth = (updater: number | ((prev: number) => number)) => {
    const tabIdx = activeTabIndex();
    const prev = tabs[tabIdx]?.depth ?? -1;
    const next = typeof updater === "function" ? updater(prev) : updater;
    setTabs(tabIdx, "depth", next);
    const newLabel = deriveTabLabel(tabs[tabIdx]?.columns ?? [], next);
    setTabs(tabIdx, "label", newLabel);
  };

  const setColumns = (
    ...args:
      | [ColumnEntry[]]
      | [(cols: ColumnEntry[]) => void]
      | [number, "items", ListItem[]]
      | [number, "focusedIndex", number]
  ) => {
    const tabIdx = activeTabIndex();
    if (args.length === 3) {
      const [colIdx, key, value] = args;
      setTabs(tabIdx, "columns", colIdx, key as never, value as never);
    } else if (typeof args[0] === "function") {
      const producer = args[0] as (cols: ColumnEntry[]) => void;
      setTabs(tabIdx, "columns", produce(producer));
    } else {
      setTabs(tabIdx, "columns", args[0] as ColumnEntry[]);
    }
    const d = tabs[tabIdx]?.depth ?? -1;
    const newLabel = deriveTabLabel(tabs[tabIdx]?.columns ?? [], d);
    setTabs(tabIdx, "label", newLabel);
  };

  const setFocusMemory = (
    updater:
      | Record<string, number>
      | ((prev: Record<string, number>) => Record<string, number>),
  ) => {
    const tabIdx = activeTabIndex();
    const prev = tabs[tabIdx]?.focusMemory ?? {};
    const next = typeof updater === "function" ? updater(prev) : updater;
    setTabs(tabIdx, "focusMemory", next);
  };

  const setPreviewItems = (items: ListItem[] | null) => {
    setTabs(activeTabIndex(), "previewItems", items);
  };

  // ─── Other state ──────────────────────────────────────────────────────────
  const [isNavigating, setIsNavigating] = createSignal(false);
  const [isSliding, setIsSliding] = createSignal(false);
  const [disableAnimations, setDisableAnimations] = createSignal(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = createSignal(false);
  const [gPressed, setGPressed] = createSignal(false);
  const [visibleColumns, setVisibleColumns] = createSignal(1);
  const [colWidthPx, setColWidthPx] = createSignal(0);
  const [layoutReady, setLayoutReady] = createSignal(false);
  const [isJumpPaletteOpen, setIsJumpPaletteOpen] = createSignal(false);
  const [jumpPaletteParentId, setJumpPaletteParentId] = createSignal<
    string | null
  >(null);
  const [jumpPaletteBaseDepth, setJumpPaletteBaseDepth] = createSignal(0);
  const [markedItems, setMarkedItems] = createSignal<Map<string, ListItem>>(
    new Map(),
  );
  const [isMarkMode, setIsMarkMode] = createSignal(false);
  const [cutItems, setCutItems] = createSignal<ListItem[]>([]);
  const [cutItemSourceFolderIds, setCutItemSourceFolderIds] = createSignal<
    Set<string | null>
  >(new Set());
  const [editingItemId, setEditingItemId] = createSignal<string | null>(null);
  const [itemPendingDelete, setItemPendingDelete] = createSignal<ListItem | null>(null);
  const [initialized, setInitialized] = createSignal(false);

  // Refs
  let viewportRef: HTMLDivElement | undefined;
  let trackRef: HTMLDivElement | undefined;
  let previewScrollRef: HTMLDivElement | undefined;
  let trackSlide: ReturnType<typeof animate> | null = null;
  let trackSlideId = 0;
  let renderedTrackX = 0;

  // ─── Derived state ────────────────────────────────────────────────────────
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

  const tabLabels = createMemo(() => tabs.map((t) => t.label));
  const cutItemIds = createMemo(() => new Set(cutItems().map((i) => i.id)));
  const markedItemIdSet = createMemo(() => new Set(markedItems().keys()));
  const markCount = createMemo(() => markedItems().size);

  // ─── Layout measurement ───────────────────────────────────────────────────
  const measureColWidth = () => {
    if (!viewportRef) return false;
    const viewportWidth = viewportRef.offsetWidth;
    if (viewportWidth <= 0) return false;
    const nextVisibleColumns = Math.max(
      1,
      Math.min(
        MAX_VISIBLE_COLUMNS,
        Math.floor(viewportWidth / MIN_COLUMN_WIDTH_PX),
      ),
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

  // ─── Tab operations ───────────────────────────────────────────────────────
  const createNewTab = async () => {
    const rootItems = await getChildrenQuery(null);
    const newTab: TabState = {
      label: "Home",
      columns: [
        { folderId: null, items: rootItems, focusedIndex: 0, title: "Home" },
      ],
      depth: 0,
      focusMemory: {},
      previewItems: null,
    };
    batch(() => {
      setTabs(produce((ts) => { ts.push(newTab); }));
      setActiveTabIndex(tabs.length - 1);
    });
    applyTrackTransform(trackOffset());
  };

  const closeTab = (tabIdx: number) => {
    if (tabs.length <= 1) return;
    const currentActive = activeTabIndex();
    batch(() => {
      setTabs(produce((ts) => { ts.splice(tabIdx, 1); }));
      if (tabIdx < currentActive) {
        setActiveTabIndex(currentActive - 1);
      } else if (tabIdx === currentActive) {
        setActiveTabIndex(Math.min(currentActive, tabs.length - 1));
      }
    });
    applyTrackTransform(trackOffset());
  };

  const switchToTab = (tabIdx: number) => {
    if (tabIdx < 0 || tabIdx >= tabs.length || tabIdx === activeTabIndex())
      return;
    batch(() => {
      setActiveTabIndex(tabIdx);
      setIsNavigating(false);
      setIsSliding(false);
    });
    applyTrackTransform(trackOffset());
  };

  // ─── Initialization ───────────────────────────────────────────────────────
  // Lazy: only fetch root data the first time the overlay opens.
  createEffect(
    on(
      () => props.open(),
      async (isOpen) => {
        if (!isOpen || initialized()) return;
        setInitialized(true);

        const rootItems = await getChildrenQuery(null);
        batch(() => {
          setTabs(0, "columns", [
            { folderId: null, items: rootItems, focusedIndex: 0, title: "Home" },
          ]);
          setTabs(0, "depth", 0);
          setTabs(0, "label", "Home");
        });
      },
    ),
  );

  // Measure layout once the panel is visible and data is loaded.
  createEffect(() => {
    if (!props.open() || depth() < 0) return;
    // Give the DOM a frame to settle after becoming visible.
    requestAnimationFrame(() => {
      if (measureColWidth()) setLayoutReady(true);
    });
  });

  onMount(() => {
    if (viewportRef) {
      const ro = new ResizeObserver(() => {
        if (measureColWidth() && !layoutReady()) setLayoutReady(true);
      });
      ro.observe(viewportRef);
      onCleanup(() => ro.disconnect());
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);
    const handleReduced = (e: MediaQueryListEvent) =>
      setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handleReduced);

    // ── Keyboard: capture phase to intercept before route finder ──
    document.addEventListener("keydown", handleKeyDown, true);
    onCleanup(() => {
      mediaQuery.removeEventListener("change", handleReduced);
      document.removeEventListener("keydown", handleKeyDown, true);
      trackSlide?.stop();
      trackSlide = null;
    });
  });

  // ─── Effects ──────────────────────────────────────────────────────────────
  // Fetch preview items when focused item is a folder.
  createEffect(
    on(
      () => [focusedItem()?.id, isSliding()] as const,
      ([focusedItemId, sliding]) => {
        if (sliding) return;
        const item = focusedItem();
        if (item?.type === "folder" && item.id === focusedItemId) {
          let cancelled = false;
          onCleanup(() => { cancelled = true; });
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

  // Slide the track on depth changes.
  let prevDepthForTrack = -1;
  let prevWidthForTrack = 0;
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

    if (
      prevDepthForTrack < 0 ||
      !depthChanged ||
      widthChanged ||
      reducedMotion ||
      tabChanged
    ) {
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

  // ─── Navigation ───────────────────────────────────────────────────────────
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
      const rememberedFocus =
        (activeTab()?.focusMemory ?? {})[memoryKey(item.id)] ?? 0;
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
    props.onClose();
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

  // ─── Jump palette ─────────────────────────────────────────────────────────
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

    const scopedColumns = cols
      .slice(0, baseDepth + 1)
      .map((col) => ({ ...col }));
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

    const targetIdx = parentCol.items.findIndex(
      (item) => item.id === selection.item.id,
    );
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

  // ─── Mark / Cut / Paste ───────────────────────────────────────────────────
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
        const newIdx = refreshedCol.items.findIndex(
          (item) => item.id === created.id,
        );
        if (newIdx >= 0) setFocusedIndex(newIdx);
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
      if (itemType === "note") await renameNote(itemId, newTitle);
      else await renameFolder(itemId, newTitle);
      const folderId = currentColumn()?.folderId ?? null;
      await revalidate(LIST_CHILDREN_KEY);
      await reloadFolderAcrossAllTabs(folderId);
    } catch (e) {
      console.error("Failed to rename item:", e);
    }
    setEditingItemId(null);
  };

  const cancelRename = () => setEditingItemId(null);

  const startRename = () => {
    const item = focusedItem();
    if (!item) return;
    setEditingItemId(item.id);
  };

  const deleteItem = async (item: ListItem) => {
    try {
      if (item.type === "note") {
        await deleteNote(item.id);
      } else {
        await deleteFolder(item.id);
      }
      setItemPendingDelete(null);
      await revalidate(LIST_CHILDREN_KEY);
      await reloadFolderAcrossAllTabs(currentColumn()?.folderId ?? null);
    } catch (e) {
      console.error("Failed to delete item:", e);
      setItemPendingDelete(null);
    }
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

    const affectedFolderIds = new Set<string | null>(sourceFolderIds);
    affectedFolderIds.add(targetParentId);
    await Promise.all(
      Array.from(affectedFolderIds).map((id) =>
        reloadFolderAcrossAllTabs(id),
      ),
    );
  };

  const scrollPreview = (direction: "up" | "down") => {
    if (!previewScrollRef) return false;
    const maxScroll =
      previewScrollRef.scrollHeight - previewScrollRef.clientHeight;
    if (maxScroll <= 0) return false;
    const amount = Math.max(
      80,
      Math.floor(previewScrollRef.clientHeight * 0.8),
    );
    const delta = direction === "down" ? amount : -amount;
    previewScrollRef.scrollBy({ top: delta, behavior: "auto" });
    return true;
  };

  const runWithoutAnimations = async (fn: () => void | Promise<void>) => {
    setDisableAnimations(true);
    try {
      await fn();
    } finally {
      requestAnimationFrame(() => setDisableAnimations(false));
    }
  };

  // ─── Click handlers ───────────────────────────────────────────────────────
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

  // ─── Keyboard (capture phase) ─────────────────────────────────────────────
  const handleKeyDown = (e: KeyboardEvent) => {
    // Let Ctrl+Shift+F pass through to the FinderOverlay toggle handler.
    if (e.ctrlKey && e.shiftKey && e.key === "F") return;

    // Only intercept when this overlay is open.
    if (!props.open()) return;

    // Don't intercept when typing in inputs (e.g. inline rename).
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement
    )
      return;

    if (isJumpPaletteOpen()) return;
    if (itemPendingDelete()) return;
    if (depth() < 0) return;

    // Stop the event from reaching the route-level finder.
    e.stopPropagation();

    const col = currentColumn();
    const len = col?.items.length ?? 0;
    const idx = col?.focusedIndex ?? 0;

    // ── Tab shortcuts ────────────────────────────────────────────────────
    if (e.key === "t" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      setGPressed(false);
      void createNewTab();
      return;
    }
    if (e.key === "[" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      setGPressed(false);
      const prevIdx = activeTabIndex() - 1;
      if (prevIdx >= 0) switchToTab(prevIdx);
      return;
    }
    if (e.key === "]" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      setGPressed(false);
      const nextIdx = activeTabIndex() + 1;
      if (nextIdx < tabs.length) switchToTab(nextIdx);
      return;
    }
    if (e.key === "c" && e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      setGPressed(false);
      closeTab(activeTabIndex());
      return;
    }

    // ── Create shortcuts ─────────────────────────────────────────────────
    if (
      e.key === "a" &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey &&
      !e.shiftKey
    ) {
      e.preventDefault();
      setGPressed(false);
      setIsMarkMode(false);
      void createItem("note");
      return;
    }
    if (e.key === "A" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      setGPressed(false);
      setIsMarkMode(false);
      void createItem("folder");
      return;
    }

    // `r` — rename focused item
    if (e.key === "r" && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
      e.preventDefault();
      setGPressed(false);
      setIsMarkMode(false);
      startRename();
      return;
    }

    // `D` (shift+d) — delete focused item (opens confirmation)
    if (e.key === "D" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      setGPressed(false);
      setIsMarkMode(false);
      const item = focusedItem();
      if (item) setItemPendingDelete(item);
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
        } else {
          props.onClose();
        }
        break;

      default:
        setGPressed(false);
        break;
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
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
        {/* Column viewport */}
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
              style={{ "will-change": "transform" }}
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
                    editingItemId={
                      colIdx() === depth() ? editingItemId() : null
                    }
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

      <DeleteConfirmDialog
        item={itemPendingDelete()}
        onConfirm={(item) => void deleteItem(item)}
        onCancel={() => setItemPendingDelete(null)}
      />
    </div>
  );
}
