import { useLocation } from "@solidjs/router";
import { createEffect, createSignal, on } from "solid-js";
import { getNoteTitleQuery } from "~/lib/db/notes/read";

export interface VisitedPage {
  path: string;
  title: string;
  visitedAt: number;
}

const STORAGE_KEY = "recently-visited";
const MAX_ENTRIES = 20;

function loadFromStorage(): VisitedPage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as VisitedPage[];
  } catch {
    return [];
  }
}

function saveToStorage(pages: VisitedPage[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pages));
  } catch {
    // localStorage may be unavailable
  }
}

function titleFromPath(path: string): string {
  if (path === "/") return "Dashboard";
  if (path === "/about") return "About";
  if (path.startsWith("/note/")) {
    return "Note";
  }
  // Strip leading slash, capitalize segments
  return path
    .replace(/^\//, "")
    .split("/")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" / ");
}

/**
 * Tracks pages the user visits client-side.
 * Stores history in localStorage for persistence across sessions.
 */
export function useRecentlyVisited() {
  const location = useLocation();
  const [pages, setPages] = createSignal<VisitedPage[]>(loadFromStorage());

  createEffect(
    on(
      () => location.pathname,
      (pathname) => {
        if (!pathname) return;

        const title = titleFromPath(pathname);
        const entry: VisitedPage = {
          path: pathname,
          title,
          visitedAt: Date.now(),
        };

        setPages((prev) => {
          // Remove existing entry for same path
          const filtered = prev.filter((p) => p.path !== pathname);
          // Prepend new entry, limit size
          const updated = [entry, ...filtered].slice(0, MAX_ENTRIES);
          saveToStorage(updated);
          return updated;
        });

        // Resolve note titles asynchronously
        if (pathname.startsWith("/note/")) {
          const noteId = pathname.replace("/note/", "");
          if (noteId) {
            getNoteTitleQuery(noteId).then((title) => {
              if (title) updateTitle(pathname, title);
            });
          }
        }
      },
    ),
  );

  /**
   * Update the title for a given path (e.g. when note title loads)
   */
  const updateTitle = (path: string, title: string) => {
    setPages((prev) => {
      const updated = prev.map((p) =>
        p.path === path ? { ...p, title } : p,
      );
      saveToStorage(updated);
      return updated;
    });
  };

  const clearHistory = () => {
    setPages([]);
    saveToStorage([]);
  };

  return { pages, updateTitle, clearHistory };
}
