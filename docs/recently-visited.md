# Recently Visited Pages

## Purpose

Users navigate between many notes in a session. The browser's back/forward buttons provide linear history but no overview. This feature adds a floating popup in the navbar that shows the user's most recent page visits with titles and timestamps. It persists across sessions via localStorage.

This differs from the existing `RecentNotesTab` in the sidebar, which shows recently *modified* notes (server-side, from the database). Recently Visited tracks *navigation* history (client-side, from the browser).

## Architecture

```
src/
├── lib/
│   ├── hooks/
│   │   └── useRecentlyVisited.ts   # Client-side navigation tracker
│   └── db/notes/
│       └── read.ts                  # getNoteTitle / getNoteTitleQuery (added)
├── components/
│   └── RecentlyVisited.tsx          # Portal-based floating popup
└── routes/
    └── (app).tsx                    # Mounts <RecentlyVisited /> in navbar-end
```

### Why No Context Provider

The component mounts once in `(app).tsx` and stays mounted for the session lifetime. Only one consumer exists. The `useKeybinding` hook handles global shortcuts without needing shared state. A context provider would add indirection with no benefit.

### Why Not `src/app.tsx`

`src/app.tsx` lacks auth context. The trigger button belongs in the navbar, which lives inside the `(app)` layout. The Portal renders to `document.body` regardless of where the component sits in the tree — file location is about code organization, not DOM placement.

## Data Model

```typescript
interface VisitedPage {
  path: string;       // e.g. "/note/abc123"
  title: string;      // resolved display title
  visitedAt: number;  // Date.now() timestamp
}
```

Stored in localStorage under key `"recently-visited"` as a JSON array. Maximum 20 entries.

## Implementation

### 1. Server Function: `getNoteTitleQuery`

**File:** `src/lib/db/notes/read.ts`

A lightweight query that returns only the title string for a given note ID. Scoped to the authenticated user.

```typescript
export async function getNoteTitle(id: string): Promise<string | null> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }
  const stmt = db.prepare(`
    SELECT title FROM notes WHERE id = ? AND user_id = ?
  `);
  const row = stmt.get(id, user.id) as { title: string } | undefined;
  return row?.title || null;
}

export const getNoteTitleQuery = query(async (noteId: string) => {
  "use server";
  return await getNoteTitle(noteId);
}, "note-title");
```

This avoids fetching full note content just to resolve a title for the navigation history.

### 2. Hook: `useRecentlyVisited`

**File:** `src/lib/hooks/useRecentlyVisited.ts`

**Behavior:**

1. On mount, loads existing history from localStorage.
2. Watches `useLocation().pathname` via `createEffect(on(...))`.
3. On each navigation:
   - Assigns an immediate title using `titleFromPath()` (static mapping: `/` -> "Dashboard", `/about` -> "About", `/note/*` -> "Note", others -> capitalized path segments).
   - Deduplicates by path (moves revisited pages to the top).
   - Caps the list at 20 entries.
   - Saves to localStorage.
   - For note paths, calls `getNoteTitleQuery(noteId)` to resolve the real title asynchronously, then calls `updateTitle()` to patch it in.

**Exports:**

| Name | Type | Description |
|------|------|-------------|
| `pages` | `Accessor<VisitedPage[]>` | Reactive list, most recent first |
| `updateTitle` | `(path, title) => void` | Patch the title for a stored path |
| `clearHistory` | `() => void` | Wipe all entries from signal and localStorage |

**Constants:**

| Name | Value | Purpose |
|------|-------|---------|
| `STORAGE_KEY` | `"recently-visited"` | localStorage key |
| `MAX_ENTRIES` | `20` | Maximum stored pages |

### 3. Component: `RecentlyVisited`

**File:** `src/components/RecentlyVisited.tsx`

A Portal-based floating panel triggered from the navbar.

**Structure:**

```
RecentlyVisited
├── Trigger button (in normal DOM flow, inside navbar)
│   └── History icon, onClick toggles open state
└── <Show when={isOpen()}>
    └── <Portal>  (renders to document.body)
        └── <Transition enter/exit>
            └── Floating panel (fixed, z-50, anchored below button)
                ├── Header: "Recently Visited" + clear button
                └── <For> PageItem list (up to 8 entries)
```

**Open/Close state:** Explicit `createSignal<boolean>`. No DaisyUI dropdown behavior.

**Position calculation:** Reads `buttonRef.getBoundingClientRect()` when opening. Panel appears below the button, right-aligned (`left = rect.right - PANEL_WIDTH`), clamped to viewport.

**Close triggers:**

| Trigger | Mechanism |
|---------|-----------|
| Click outside | `mousedown` listener on `document` (added on open, ignores clicks inside panel/button) |
| Escape key | `keydown` listener in capture phase (only when open) |
| Navigation | `createEffect` on `location.pathname` |
| Button re-click | Toggle behavior |

**Keyboard shortcut:** `Ctrl+H` toggles the popup via `useKeybinding({ key: "h", ctrl: true }, toggle)`.

**Animation:** `solid-transition-group` Transition with Web Animations API:
- Enter: opacity 0→1, translateY(-4px→0), 100ms ease-out
- Exit: opacity 1→0, translateY(0→-4px), 75ms ease-in

**Panel content:** Same as before — header row with clear button, list of `PageItem` entries (title + relative time), empty state fallback.

### 4. Integration Point

**File:** `src/routes/(app).tsx`

```typescript
import RecentlyVisited from "~/components/RecentlyVisited";
```

Placed in the `navbar-end` div, before `<UserDropdown />`:

```tsx
<div class="navbar-end">
  <RecentlyVisited />
  <UserDropdown />
  <ToggleButton id={CheckboxId.RIGHT_DRAWER} class="btn btn-square btn-ghost">
    <BookOpen class="w-5 h-5" />
  </ToggleButton>
</div>
```

## Responsive Behavior

| Viewport | Panel width | Behavior |
|----------|-------------|----------|
| Mobile (< 640px) | `w-72` (288px) | Left-clamped to 8px from edge |
| Desktop (>= 640px) | `w-80` (320px) | Right-aligned with button |

The Portal renders to `document.body` with `fixed` positioning and `z-50`, escaping all parent stacking contexts (navbar, sidebar, drawer overlays).

## Data Flow

```
User navigates to /note/abc123
        │
        ▼
useLocation().pathname changes
        │
        ▼
createEffect fires
        │
        ├──► Immediate: insert { path: "/note/abc123", title: "Note", visitedAt: now }
        │    into signal + localStorage
        │
        └──► Async: getNoteTitleQuery("abc123")
                     │
                     ▼
               Server returns "My Note Title"
                     │
                     ▼
               updateTitle("/note/abc123", "My Note Title")
                     │
                     ▼
               Signal + localStorage updated with real title
                     │
                     ▼
               UI reactively re-renders with "My Note Title"
```

## Dependencies

| Package | Usage |
|---------|-------|
| `@solidjs/router` | `useLocation`, `A`, `query` |
| `solid-js` | `createEffect`, `createSignal`, `createMemo`, `on`, `onCleanup`, `For`, `Show` |
| `solid-js/web` | `Portal` |
| `solid-transition-group` | `Transition` |
| `lucide-solid` | `history` and `x` icons |

No new packages required. `solid-transition-group` and `solid-js/web` are already used by PaletteModal and ContextMenu.

## Edge Cases

- **localStorage unavailable** (private browsing, quota exceeded): Silently catches errors. History works for the session but does not persist.
- **Deleted notes**: The title remains as last resolved. Clicking the link navigates to the note route, which handles missing notes with its own error state.
- **Unauthenticated requests to `getNoteTitleQuery`**: The server function calls `requireUser()`, which redirects to `/login`. The `.then()` in the hook does not execute if the promise rejects.
- **Rapid navigation**: Each navigation overwrites the previous entry for the same path. The deduplication filter runs synchronously before the async title fetch.
- **Window resize while open**: Position is calculated once on open. If the button moves (e.g., sidebar toggle), the panel stays at the original position until closed and reopened.

## Extending

- **Add more route titles**: Extend `titleFromPath()` in the hook with additional static mappings.
- **Show more items**: Change the `.slice(0, 8)` in `RecentlyVisited.tsx` or the `MAX_ENTRIES` constant in the hook.
- **Add icons per page type**: Modify `PageItem` to inspect `page.path` and render a matching lucide icon.
- **Context provider**: If multiple components need to open the popup, wrap the app in a `RecentlyVisitedProvider` that exposes `open()`/`close()` functions via context.
