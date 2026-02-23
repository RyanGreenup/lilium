# Ranger-Style File Browser

A three-column file browser for navigating notes and folders, inspired by the terminal file manager `ranger`. Located at `src/routes/(app)/sandbox.tsx`, accessible at the `/sandbox` route.

The browser shows the parent directory, current directory, and a preview simultaneously — navigating left/right moves through the hierarchy rather than scrolling a flat list.

## Layout

```
┌─────────────────────────────────────────────────────┐
│  Home > Notes > Projects                 (breadcrumb)│
├──────────────┬──────────────────┬───────────────────┤
│  Parent      │  Current (focus) │  Preview          │
│              │                  │                   │
│  Notes       │  > Projects      │  title: "API Spec"│
│  Archive     │    Drafts        │  syntax: markdown  │
│              │    Archive       │  Abstract: ...     │
│              │                  │  Open Note →       │
├──────────────┴──────────────────┴───────────────────┤
│  j/k navigate  l/Enter open  h/Backspace back  gg G  │
└─────────────────────────────────────────────────────┘
```

- **Left column** — siblings of the current folder (parent's children), with the current folder highlighted as selected
- **Middle column** — contents of the current folder; the focused item has a primary ring
- **Right column** — folder children (if focused item is a folder) or note metadata (if focused item is a note)
- **Breadcrumb** — clickable path from root to current folder
- **Keyboard hints bar** — always-visible reminder of keybindings

On mobile (`< md` breakpoint) only the middle column is shown; the three-column grid collapses to a single column.

## Keyboard Navigation

| Key(s) | Action |
|---|---|
| `j` / `ArrowDown` | Move focus down |
| `k` / `ArrowUp` | Move focus up |
| `l` / `ArrowRight` / `Enter` | Enter folder or open note |
| `h` / `ArrowLeft` / `Backspace` | Go to parent folder |
| `gg` (double tap within 500 ms) | Jump to first item |
| `G` | Jump to last item |

Keyboard events are suppressed when the cursor is inside an `<input>` or `<textarea>`.

Mouse interaction also works: hovering an item sets focus, clicking activates it (enter/open).

## Data Dependencies

The browser uses two query functions from `src/lib/db/api.ts`:

```typescript
import { getChildrenQuery, getFolderPathQuery } from "~/lib/db/api";
```

**`getChildrenQuery(parentId: string | null)`** — returns `ListItem[]` (folders first, then notes) for the given folder. Pass `null` for root.

**`getFolderPathQuery(folderId: string | null)`** — returns `{ id: string; title: string }[]` from root to the current folder (inclusive). Pass `null` to get an empty path (root level).

Both are `query()` wrappers (not `cache()`), so they participate in SolidStart's request deduplication.

### Preload

```typescript
export const route = {
  preload() {
    getUser();
    getChildrenQuery(null);
    getFolderPathQuery(null);
  },
} satisfies RouteDefinition;
```

The preload warms root-level data and enforces auth. It does not preload the currently focused folder because that is not known at load time.

## Reactive State

```typescript
const [currentFolderId, setCurrentFolderId] = createSignal<string | null>(null);
const [focusedIndex, setFocusedIndex] = createSignal(0);
const [gPressed, setGPressed] = createSignal(false); // tracks first 'g' of 'gg'

const folderPath  = createAsync(() => getFolderPathQuery(currentFolderId()));
const currentItems = createAsync(() => getChildrenQuery(currentFolderId()));

const parentId = createMemo(() => {
  const path = folderPath();
  if (!path || path.length < 2) return null;
  return path[path.length - 2]?.id ?? null;
});

const parentItems = createAsync(() => {
  // Root level: no parent items
  // One level deep: parent items are root children
  // Deeper: parent items are grandparent's children
});

const focusedItem = createMemo(() => {
  const items = currentItems();
  return items?.[Math.min(focusedIndex(), items.length - 1)];
});

const previewItems = createAsync(() => {
  const item = focusedItem();
  if (!item || item.type !== "folder") return Promise.resolve(null);
  return getChildrenQuery(item.id);
});
```

`focusedIndex` resets to `0` whenever `currentFolderId` changes (via `createEffect`).

The focused item stays within bounds even if the list shrinks — `Math.min(idx, items.length - 1)` guards against out-of-range access.

## Sub-components

All sub-components are file-local (not exported).

### `Breadcrumb`

```typescript
function Breadcrumb(props: {
  path: { id: string; title: string }[];
  onNavigate: (id: string | null) => void;
})
```

Renders a "Home" button followed by each folder in `path`, separated by chevrons. Clicking any segment calls `onNavigate` with that folder's ID. Clicking "Home" calls `onNavigate(null)` to return to root.

### `Column`

```typescript
function Column(props: { title: string; children: any })
```

A flex column with an optional header (`title` is hidden when empty string). The content area is `overflow-y-auto flex-1 min-h-0` so it scrolls independently without overflowing the grid. See [Sidebar Scroll Layout](./sidebar-scroll-layout.md) for why `min-h-0` is required.

### `ItemIcon`

```typescript
function ItemIcon(props: { item: ListItem })
```

Renders `FolderIcon` (warning colour) for folders, `FileText` (muted) for notes.

### `NotePreview`

```typescript
function NotePreview(props: { item: NoteListItem })
```

Shown in the right column when the focused item is a note. Displays:
- Title with file icon
- Syntax badge (`badge-outline`)
- Abstract (truncated at 6 lines with `line-clamp-6`), hidden if absent
- Created and updated timestamps (locale-formatted)
- "Open Note" button linking to `/note/:id`

## Styling

The component reuses variants from `src/components/layout/sidebar/tabs/listStyle.ts`:

```typescript
import { listItemVariants, listItemNameVariants } from "~/components/layout/sidebar/tabs/listStyle";
```

**`listItemVariants({ focused, selected })`** — applies `ring-2 ring-primary ring-inset` when `focused: true`, `bg-base-300` when `selected: true`.

**`listItemNameVariants({ focused, selected })`** — adjusts text colour and weight to match state.

In the middle column, `focused` tracks `focusedIndex`; `selected` is always `false` (items are activated, not persistently selected). In the left column, `focused` is always `false`; `selected` is `true` for the item whose ID matches `currentFolderId` (i.e., the folder you are currently inside).

## Scroll Tracking

The middle column uses a `ref` to scroll the focused item into view:

```typescript
let middleColumnRef: HTMLDivElement | undefined;

createEffect(() => {
  const idx = focusedIndex();
  if (!middleColumnRef) return;
  const el = middleColumnRef.children[idx] as HTMLElement | undefined;
  el?.scrollIntoView({ block: "nearest" });
});
```

This relies on children being direct `div` elements in index order with no intervening wrappers. If the middle column markup changes, verify this offset assumption still holds.

## Navigation Actions

| Function | Behaviour |
|---|---|
| `enterFolder(id)` | Sets `currentFolderId` to the given folder ID |
| `goToParent()` | Walks `folderPath` up one level; goes to root if at depth 1 |
| `openNote(id)` | Calls `navigate("/note/:id")` via `useNavigate` |
| `activateItem()` | Calls `enterFolder` or `openNote` depending on `focusedItem().type` |

## Gotchas

- **Root level left column is empty.** When `currentFolderId` is `null`, the parent column shows a "Root level" placeholder. This is intentional — there is no parent to display.
- **`gg` uses a 500 ms timeout.** The first `g` keypress sets `gPressed` and schedules a reset. Any non-`g` key also clears `gPressed`. If the user presses `g` then waits more than 500 ms, the second `g` starts a new sequence.
- **Keyboard handler is registered on `document`.** It fires for all keypresses on the page unless the target is an `input` or `textarea`. If other keyboard-driven components are added to this route, key conflicts may arise.
- **Mobile shows only the middle column.** The `grid-cols-1 md:grid-cols-[1fr_1.5fr_1.5fr]` grid collapses on small screens. The left and right columns are present in the DOM but invisible below `md`.
- **Auth is enforced via preload only.** The route sits inside `(app)/` which already wraps with auth layout, but `getUser()` in the preload is still required to trigger the redirect before data loads.

## Related

- `src/lib/db/api.ts` — `getChildrenQuery`, `getFolderPathQuery`
- `src/lib/db/types.ts` — `ListItem`, `NoteListItem`, `FolderListItem`
- `src/components/layout/sidebar/tabs/listStyle.ts` — shared Tailwind Variants
- [Sidebar Scroll Layout](./sidebar-scroll-layout.md) — flex chain pattern used by `Column`
- [Custom Hooks](./hooks.md) — `createAsync` and reactive data patterns
