import { A, useLocation } from "@solidjs/router";
import { createEffect, createMemo, createSignal, For, on, onCleanup, Show } from "solid-js";
import { Portal } from "solid-js/web";
import { Transition } from "solid-transition-group";
import History from "lucide-solid/icons/history";
import X from "lucide-solid/icons/x";
import { useKeybinding } from "~/solid-daisy-components/utilities/useKeybinding";
import {
  useRecentlyVisited,
  type VisitedPage,
} from "~/lib/hooks/useRecentlyVisited";

const PANEL_WIDTH = 320; // w-80

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function RecentlyVisited() {
  const { pages, clearHistory } = useRecentlyVisited();
  const location = useLocation();
  const [isOpen, setIsOpen] = createSignal(false);
  const [position, setPosition] = createSignal({ x: 0, y: 0 });

  let buttonRef: HTMLButtonElement | undefined;
  let panelRef: HTMLDivElement | undefined;

  const toggle = () => {
    if (isOpen()) {
      setIsOpen(false);
    } else {
      updatePosition();
      setIsOpen(true);
    }
  };

  const updatePosition = () => {
    if (!buttonRef) return;
    const rect = buttonRef.getBoundingClientRect();
    const x = Math.max(8, rect.right - PANEL_WIDTH);
    const y = rect.bottom + 4;
    setPosition({ x, y });
  };

  // Ctrl+H to toggle
  useKeybinding({ key: "h", ctrl: true }, toggle);

  // Close on click outside
  createEffect(() => {
    if (!isOpen()) return;

    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (panelRef?.contains(target) || buttonRef?.contains(target)) return;
      setIsOpen(false);
    };

    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handler);
    }, 0);

    onCleanup(() => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handler);
    });
  });

  // Close on Escape
  createEffect(() => {
    if (!isOpen()) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handler, true);
    onCleanup(() => document.removeEventListener("keydown", handler, true));
  });

  // Close on navigation
  createEffect(
    on(
      () => location.pathname,
      () => {
        if (isOpen()) setIsOpen(false);
      },
      { defer: true },
    ),
  );

  const visiblePages = createMemo(() =>
    pages().filter((p) => p.path !== location.pathname).slice(0, 8),
  );

  return (
    <>
      <button
        ref={buttonRef}
        class="btn btn-ghost btn-square"
        title="Recently Visited (Ctrl+H)"
        onClick={toggle}
      >
        <History class="w-5 h-5" />
      </button>

      <Show when={isOpen()}>
        <Portal>
          <Transition
            onEnter={(el, done) => {
              el.animate(
                [
                  { opacity: 0, transform: "translateY(-4px)" },
                  { opacity: 1, transform: "translateY(0)" },
                ],
                { duration: 100, easing: "ease-out" },
              ).finished.then(done);
            }}
            onExit={(el, done) => {
              el.animate(
                [
                  { opacity: 1, transform: "translateY(0)" },
                  { opacity: 0, transform: "translateY(-4px)" },
                ],
                { duration: 75, easing: "ease-in" },
              ).finished.then(done);
            }}
          >
            <div
              ref={panelRef}
              class="fixed z-50 w-72 sm:w-80 rounded-box bg-base-200 shadow-xl p-3"
              style={{
                left: `${position().x}px`,
                top: `${position().y}px`,
              }}
            >
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-semibold text-base-content/70">
                  Recently Visited
                </span>
                <Show when={pages().length > 1}>
                  <button
                    class="btn btn-ghost btn-xs"
                    onClick={clearHistory}
                    title="Clear history"
                  >
                    <X class="w-3 h-3" />
                  </button>
                </Show>
              </div>
              <Show
                when={visiblePages().length > 0}
                fallback={
                  <p class="text-sm text-base-content/50 py-2">
                    No recent pages yet
                  </p>
                }
              >
                <ul class="menu menu-sm p-0 gap-0.5">
                  <For each={visiblePages()}>
                    {(page) => <PageItem page={page} />}
                  </For>
                </ul>
              </Show>
            </div>
          </Transition>
        </Portal>
      </Show>
    </>
  );
}

function PageItem(props: { page: VisitedPage }) {
  return (
    <li>
      <A
        href={props.page.path}
        class="flex items-center justify-between rounded-md px-2 py-1.5"
      >
        <span class="truncate text-sm">{props.page.title}</span>
        <span class="text-xs text-base-content/50 shrink-0 ml-2">
          {timeAgo(props.page.visitedAt)}
        </span>
      </A>
    </li>
  );
}
