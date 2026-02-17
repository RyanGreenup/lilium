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
import type { ListItem } from "~/lib/db/types";
import {
  type ColumnEntry,
  EASE_OUT,
  SLIDE_DURATION,
} from "~/components/finder/constants";
import Breadcrumb from "~/components/finder/Breadcrumb";
import Column from "~/components/finder/Column";
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

export default function Sandbox2() {
  const navigate = useNavigate();
  const MAX_VISIBLE_COLUMNS = 7;
  const MIN_COLUMN_WIDTH_PX = 280;
  const SANDBOX2_STATE_KEY = "sandbox2:list-state:v1";

  // Route guard — deferStream blocks SSR until auth resolves
  createAsync(() => getUser(), { deferStream: true });

  // ─── State ───────────────────────────────────────────────
  const [columns, setColumns] = createStore<ColumnEntry[]>([]);
  const [depth, setDepth] = createSignal(-1); // -1 = not yet initialized
  const [isNavigating, setIsNavigating] = createSignal(false);
  // Global "transition lock" for side effects that can fight horizontal track motion.
  // Footgun: preview fades/fetches and scrollIntoView during track movement caused visible jitter.
  const [isSliding, setIsSliding] = createSignal(false);
  // Click interactions can trigger multiple state updates in quick succession.
  // We disable motion for click-driven nav to avoid perceived jitter.
  const [disableAnimations, setDisableAnimations] = createSignal(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = createSignal(false);
  const [gPressed, setGPressed] = createSignal(false);
  const [visibleColumns, setVisibleColumns] = createSignal(1);
  const [colWidthPx, setColWidthPx] = createSignal(0);
  const [layoutReady, setLayoutReady] = createSignal(false);
  const [previewItems, setPreviewItems] = createSignal<ListItem[] | null>(null);
  const [focusMemory, setFocusMemory] = createSignal<Record<string, number>>({});
  const [isJumpPaletteOpen, setIsJumpPaletteOpen] = createSignal(false);
  const [jumpPaletteParentId, setJumpPaletteParentId] = createSignal<string | null>(
    null,
  );
  const [jumpPaletteBaseDepth, setJumpPaletteBaseDepth] = createSignal(0);
  // Mark state: items selected for bulk operations.
  const [markedItems, setMarkedItems] = createSignal<Map<string, ListItem>>(new Map());
  const [isMarkMode, setIsMarkMode] = createSignal(false);
  // Cut/paste state: tracks items staged for a move operation.
  const [cutItems, setCutItems] = createSignal<ListItem[]>([]);
  // The folderIds the cut items currently live in (so we can reload those columns after paste).
  const [cutItemSourceFolderIds, setCutItemSourceFolderIds] = createSignal<Set<string | null>>(new Set());

  // Refs
  let viewportRef: HTMLDivElement | undefined;
  let trackRef: HTMLDivElement | undefined;
  let previewScrollRef: HTMLDivElement | undefined;
  // Keep a handle so we can stop previous slide before starting a new one.
  let trackSlide: ReturnType<typeof animate> | null = null;
  // Monotonic token guarding async finished() callbacks from stale/canceled animations.
  // Footgun: canceled animations can still resolve later and write old transforms.
  let trackSlideId = 0;
  // Single source of truth for current track X used as the next animation start.
  // Footgun: reading/writing transform from multiple places introduced snap-back artifacts.
  let renderedTrackX = 0;

  const memoryKey = (folderId: string | null): string => folderId ?? "root";

  interface PersistedSandbox2State {
    path: string[];
    focusedByFolder: Record<string, number>;
  }

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

      // Keep the active path visibly selected in ancestor columns.
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
    if (d < 0 || d >= columns.length) return undefined;
    return columns[d];
  });

  const focusedItem = createMemo(() => {
    const col = currentColumn();
    if (!col || col.items.length === 0) return undefined;
    const idx = Math.min(col.focusedIndex, col.items.length - 1);
    return col.items[idx];
  });

  const breadcrumb = createMemo(() => {
    const d = depth();
    if (d < 0) return [];
    return columns.slice(1, d + 1).map((col) => ({
      id: col.folderId!,
      title: col.title,
    }));
  });

  const trackOffset = createMemo(() => {
    const d = depth();
    if (d < 0) return 0;
    return (visibleColumns() - 1 - d) * colWidthPx();
  });

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

  // Centralized transform writer. Keep all track position writes here.
  const applyTrackTransform = (x: number) => {
    renderedTrackX = x;
    if (trackRef) trackRef.style.transform = `translateX(${x}px)`;
  };

  // ─── Initialization ──────────────────────────────────────
  onMount(async () => {
    const hasInitialMeasurement = measureColWidth();

    const rootItems = await getChildrenQuery(null);
    const persisted = readPersistedState();
    setFocusMemory(persisted?.focusedByFolder ?? {});
    const initialColumns = await buildInitialColumns(rootItems, persisted);
    batch(() => {
      setColumns(initialColumns);
      setDepth(initialColumns.length - 1);
      if (hasInitialMeasurement || measureColWidth()) {
        setLayoutReady(true);
      }
    });

    if (viewportRef) {
      const ro = new ResizeObserver(() => {
        // Resize path intentionally snaps to the new X instead of animating:
        // avoids width-change + slide overlap jitter.
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

  createEffect(() => {
    const d = depth();
    if (d < 0 || columns.length === 0) return;

    const limitedCols = columns.slice(0, d + 1);
    const path = limitedCols
      .slice(1)
      .map((col) => col.folderId)
      .filter((id): id is string => !!id);
    const focusedByFolder: Record<string, number> = { ...focusMemory() };
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
        // Freeze preview churn while the track is sliding.
        // Footgun: preview updates/fades during horizontal slide caused paint contention.
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
  createEffect(() => {
    if (!layoutReady() || !trackRef) return;

    const d = depth();
    const width = colWidthPx();
    if (d < 0 || width <= 0) return;

    const targetX = trackOffset();
    const depthChanged = d !== prevDepthForTrack;
    const widthChanged = width !== prevWidthForTrack;
    const reducedMotion = prefersReducedMotion() || disableAnimations();

    if (prevDepthForTrack < 0 || !depthChanged || widthChanged || reducedMotion) {
      // Snap path:
      // - first sync after mount
      // - no-op depth updates
      // - width changes (resize)
      // - reduced motion preference
      // Never animate these or we reintroduce "jelly" movement.
      trackSlide?.stop();
      trackSlide = null;
      applyTrackTransform(targetX);
      setIsSliding(false);
    } else if (renderedTrackX !== targetX) {
      // Animate from our tracked X value, never from computed style.
      // This avoids stale reads when rapid nav cancels/restarts the slide.
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
        // Ignore stale completions from canceled/replaced animations.
        if (animationId !== trackSlideId) return;
        applyTrackTransform(targetX);
        setIsSliding(false);
        if (trackSlide) trackSlide = null;
      });
    }

    prevDepthForTrack = d;
    prevWidthForTrack = width;
  });

  // ─── Navigation ──────────────────────────────────────────
  const setFocusedIndexForColumn = (colIdx: number, idx: number) => {
    if (colIdx < 0 || colIdx >= columns.length) return;
    const folderId = columns[colIdx]?.folderId ?? null;
    const key = memoryKey(folderId);
    batch(() => {
      setColumns(colIdx, "focusedIndex", idx);
      setFocusMemory((prev) => ({ ...prev, [key]: idx }));
    });
  };

  const setFocusedIndex = (idx: number) => {
    const d = depth();
    if (d < 0 || d >= columns.length) return;
    setFocusedIndexForColumn(d, idx);
  };

  const goDeeper = async (item: ListItem) => {
    if (item.type !== "folder" || isNavigating()) return;
    const fromDepth = depth();
    setIsNavigating(true);
    try {
      const children = await getChildrenQuery(item.id);
      const rememberedFocus = focusMemory()[memoryKey(item.id)] ?? 0;
      const restoredFocus = clampIndex(rememberedFocus, children.length);

      // Critical sequencing:
      // update columns + depth in one batch so we do not render an intermediate
      // "new column data with old depth" frame. That frame was the main right-nav jitter.
      const targetDepth = fromDepth + 1;
      batch(() => {
        setColumns(
          produce((cols) => {
            cols.splice(depth() + 1, Infinity, {
              folderId: item.id,
              items: children,
              focusedIndex: restoredFocus,
              title: item.title,
            });
          }),
        );
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
    if (targetDepth < 0 || targetDepth >= columns.length || isNavigating())
      return;
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
    if (baseDepth < 0 || baseDepth >= columns.length) return;

    const scopedColumns = columns.slice(0, baseDepth + 1).map((col) => ({ ...col }));
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
      // Collect source folder IDs from each marked item's parent_id.
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

  /**
   * Reload a single column by fetching fresh children for its folderId.
   * If the column is no longer in the columns store, this is a no-op.
   */
  const reloadColumn = async (colIdx: number) => {
    const col = columns[colIdx];
    if (!col) return;
    const freshItems = await getChildrenQuery(col.folderId);
    setColumns(colIdx, "items", freshItems);
    // Clamp focused index in case items were removed.
    const clampedFocus = clampIndex(col.focusedIndex, freshItems.length);
    if (clampedFocus !== col.focusedIndex) {
      setColumns(colIdx, "focusedIndex", clampedFocus);
    }
  };

  const pasteItems = async () => {
    const items = cutItems();
    if (items.length === 0) return;

    const destCol = currentColumn();
    const d = depth();
    if (!destCol || d < 0) return;

    const targetParentId = destCol.folderId;

    // Filter out items already in the destination.
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

    // Collect source column indices to reload.
    const sourceFolderIds = cutItemSourceFolderIds();
    const sourceColIndices = new Set<number>();
    for (const folderId of sourceFolderIds) {
      const idx = columns.findIndex((col) => col.folderId === folderId);
      if (idx >= 0 && idx !== d) sourceColIndices.add(idx);
    }

    // Clear cut state before refreshing so UI updates atomically.
    setCutItems([]);
    setCutItemSourceFolderIds(new Set<string | null>());

    await revalidate(LIST_CHILDREN_KEY);

    const refreshPromises: Promise<void>[] = [reloadColumn(d)];
    for (const colIdx of sourceColIndices) {
      refreshPromises.push(reloadColumn(colIdx));
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
        // No-op for notes: Right/l should not navigate to a note.
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
        console.log("Page Down Pressed at line 624 of ~/Sync/Projects/solid-js/lilium_dev/src/routes/(app)/finder.tsx");
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          console.log("About to call scrollPreview(\"down\");");
          const didScroll = scrollPreview("down");
          console.log("Called");
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
        // Clear marks first, then cut state.
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
      <Breadcrumb crumbs={breadcrumb()} onNavigate={goToDepth} />

      <div class="flex-1 min-h-0 grid grid-cols-[2fr_1fr] gap-px bg-base-300">
        {/* Stack viewport — columns slide within this container */}
        <div
          ref={viewportRef}
          // isolate/z-index contain the viewport in its own paint/stack context.
          // Footgun: preview fade could composite over left columns without this.
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
              <For each={columns}>
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
                        ? columns[colIdx() + 1]?.folderId
                        : undefined
                    }
                    cutItemIds={cutItemIds()}
                    markedItemIds={markedItemIdSet()}
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

        <Suspense
          fallback={<PreviewSkeleton />}
        >
          <PreviewPanel
            focusedItem={focusedItem()}
            previewItems={previewItems()}
            isSliding={isSliding()}
            prefersReducedMotion={prefersReducedMotion()}
            disableAnimations={disableAnimations()}
            onScrollContainerRef={(el) => {
              previewScrollRef = el;
            }}
          />
        </Suspense>
      </div>

      <KeyboardHints cutPending={cutItems().length > 0} cutCount={cutItems().length} markCount={markCount()} isMarkMode={isMarkMode()} />

      <SandboxJumpPalette
        open={isJumpPaletteOpen}
        onClose={closeJumpPalette}
        parentId={jumpPaletteParentId}
        onSelect={(selection) => void jumpToSelection(selection)}
      />
    </div>
  );
}
