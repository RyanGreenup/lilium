import { RouteDefinition, createAsync, useNavigate } from "@solidjs/router";
import { animate } from "motion/mini";
import { stagger } from "motion";
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
  STAGGER_DELAY,
  STAGGER_DURATION,
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
  const [gPressed, setGPressed] = createSignal(false);
  const [colWidthPx, setColWidthPx] = createSignal(300);
  const [previewItems, setPreviewItems] = createSignal<ListItem[] | null>(null);

  // Refs
  let viewportRef: HTMLDivElement | undefined;
  let trackRef: HTMLDivElement | undefined;

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

  // ─── Initialization ──────────────────────────────────────
  onMount(async () => {
    if (viewportRef) {
      setColWidthPx(viewportRef.offsetWidth / 2);
    }

    const rootItems = await getChildrenQuery(null);
    batch(() => {
      setColumns([
        { folderId: null, items: rootItems, focusedIndex: 0, title: "Home" },
      ]);
      setDepth(0);
    });

    requestAnimationFrame(() => {
      if (trackRef) {
        const items = trackRef.querySelectorAll("[data-list-item]");
        if (items.length > 0) {
          animate(
            Array.from(items),
            { opacity: [0, 1], transform: ["translateY(4px)", "translateY(0)"] },
            {
              delay: stagger(STAGGER_DELAY),
              duration: STAGGER_DURATION,
              ease: EASE_OUT,
            },
          );
        }
      }
    });

    if (viewportRef) {
      const ro = new ResizeObserver(() => {
        if (!viewportRef) return;
        setColWidthPx(viewportRef.offsetWidth / 2);
      });
      ro.observe(viewportRef);
      onCleanup(() => ro.disconnect());
    }

    document.addEventListener("keydown", handleKeyDown);
    onCleanup(() => document.removeEventListener("keydown", handleKeyDown));
  });

  // ─── Effects ─────────────────────────────────────────────

  // Fetch preview items when focused item is a folder
  createEffect(() => {
    const item = focusedItem();
    if (item?.type === "folder") {
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
  });

  // Stagger-animate new column items when going deeper
  let prevDepth = -1;
  createEffect(
    on(
      () => depth(),
      (d) => {
        if (d < 0 || !trackRef) {
          prevDepth = d;
          return;
        }
        const wentDeeper = d > prevDepth && prevDepth >= 0;
        prevDepth = d;

        if (wentDeeper) {
          const colEl = trackRef.children[d] as HTMLElement | undefined;
          if (colEl) {
            const items = colEl.querySelectorAll("[data-list-item]");
            if (items.length > 0) {
              animate(
                Array.from(items),
                {
                  opacity: [0, 1],
                  transform: ["translateX(8px)", "translateX(0)"],
                },
                {
                  delay: stagger(STAGGER_DELAY),
                  duration: STAGGER_DURATION,
                  ease: EASE_OUT,
                },
              );
            }
          }
        }
      },
      { defer: true },
    ),
  );

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

      setPreviewItems(null);
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

      await new Promise((r) => requestAnimationFrame(r));
      setDepth((d) => d + 1);
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
    if (colIdx === depth()) {
      setFocusedIndex(itemIdx);
      activateItem();
    } else if (colIdx < depth()) {
      setColumns(colIdx, "focusedIndex", itemIdx);
      goToDepth(colIdx);
      if (item.type === "folder") goDeeper(item);
      else openNote(item.id);
    }
  };

  const handleColumnItemHover = (colIdx: number, itemIdx: number) => {
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
        <div ref={viewportRef} class="overflow-hidden relative bg-base-100">
          <Show
            when={depth() >= 0}
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
                transform: `translateX(${trackOffset()}px)`,
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
                    nextColumnFolderId={
                      colIdx() < depth()
                        ? columns[colIdx() + 1]?.folderId
                        : undefined
                    }
                    onItemClick={(itemIdx, item) =>
                      handleColumnItemClick(colIdx(), itemIdx, item)
                    }
                    onItemHover={(itemIdx) =>
                      handleColumnItemHover(colIdx(), itemIdx)
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
        />
      </div>

      <KeyboardHints />
    </div>
  );
}
