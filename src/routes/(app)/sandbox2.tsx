import { RouteDefinition, createAsync, useNavigate } from "@solidjs/router";
import { animate } from "motion/mini";
import {
  For,
  Show,
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
import { getChildrenQuery } from "~/lib/db/api";
import type { ListItem } from "~/lib/db/types";
import {
  type ColumnEntry,
  EASE_OUT,
  SLIDE_DURATION,
} from "~/components/sandbox2/constants";
import Breadcrumb from "~/components/sandbox2/Breadcrumb";
import Column from "~/components/sandbox2/Column";
import KeyboardHints from "~/components/sandbox2/KeyboardHints";
import PreviewPanel from "~/components/sandbox2/PreviewPanel";

export const route = {
  preload() {
    getUser();
    getChildrenQuery(null);
  },
} satisfies RouteDefinition;

export default function Sandbox2() {
  const navigate = useNavigate();

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
  const [colWidthPx, setColWidthPx] = createSignal(0);
  const [layoutReady, setLayoutReady] = createSignal(false);
  const [previewItems, setPreviewItems] = createSignal<ListItem[] | null>(null);

  // Refs
  let viewportRef: HTMLDivElement | undefined;
  let trackRef: HTMLDivElement | undefined;
  // Keep a handle so we can stop previous slide before starting a new one.
  let trackSlide: ReturnType<typeof animate> | null = null;
  // Monotonic token guarding async finished() callbacks from stale/canceled animations.
  // Footgun: canceled animations can still resolve later and write old transforms.
  let trackSlideId = 0;
  // Single source of truth for current track X used as the next animation start.
  // Footgun: reading/writing transform from multiple places introduced snap-back artifacts.
  let renderedTrackX = 0;

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
    return (1 - d) * colWidthPx();
  });

  const measureColWidth = () => {
    if (!viewportRef) return false;
    const nextWidth = Math.floor(viewportRef.offsetWidth / 2);
    if (nextWidth <= 0) return false;
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
    batch(() => {
      setColumns([
        { folderId: null, items: rootItems, focusedIndex: 0, title: "Home" },
      ]);
      setDepth(0);
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
  const setFocusedIndex = (idx: number) => {
    const d = depth();
    if (d < 0 || d >= columns.length) return;
    setColumns(d, "focusedIndex", idx);
  };

  const goDeeper = async (item: ListItem) => {
    if (item.type !== "folder" || isNavigating()) return;
    setIsNavigating(true);
    try {
      const children = await getChildrenQuery(item.id);

      // Critical sequencing:
      // update columns + depth in one batch so we do not render an intermediate
      // "new column data with old depth" frame. That frame was the main right-nav jitter.
      batch(() => {
        setColumns(
          produce((cols) => {
            cols.splice(depth() + 1, Infinity, {
              folderId: item.id,
              items: children,
              focusedIndex: 0,
              title: item.title,
            });
          }),
        );
        setDepth((d) => d + 1);
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
        setColumns(colIdx, "focusedIndex", itemIdx);
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
    if (depth() < 0) return;

    const col = currentColumn();
    const len = col?.items.length ?? 0;
    const idx = col?.focusedIndex ?? 0;

    switch (e.key) {
      case "j":
      case "ArrowDown":
        e.preventDefault();
        setGPressed(false);
        if (len > 0) setFocusedIndex(Math.min(idx + 1, len - 1));
        break;

      case "k":
      case "ArrowUp":
        e.preventDefault();
        setGPressed(false);
        if (len > 0) setFocusedIndex(Math.max(idx - 1, 0));
        break;

      case "h":
      case "ArrowLeft":
      case "Backspace":
        e.preventDefault();
        setGPressed(false);
        goShallower();
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

        <PreviewPanel
          focusedItem={focusedItem()}
          previewItems={previewItems()}
          isSliding={isSliding()}
          prefersReducedMotion={prefersReducedMotion()}
          disableAnimations={disableAnimations()}
        />
      </div>

      <KeyboardHints />
    </div>
  );
}
