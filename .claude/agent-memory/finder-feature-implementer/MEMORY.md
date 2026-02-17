# Finder Feature Implementer - Agent Memory

## Key File Paths

- Finder route: `src/routes/(app)/finder.tsx`
- DB API layer: `src/lib/db/api.ts` (file-level `"use server"` at line 9 covers all exports)
- DB types: `src/lib/db/types.ts`
- Column component: `src/components/finder/Column.tsx`
- ColumnItem component: `src/components/finder/ColumnItem.tsx`
- KeyboardHints: `src/components/finder/KeyboardHints.tsx`
- List styles (tv variants): `src/components/layout/sidebar/tabs/listStyle.ts`
- Constants + ColumnEntry type: `src/components/finder/constants.ts`

## Architecture Patterns

- `api.ts` uses file-level `"use server"` — all exported functions are server-side.
  `query()` wrappers also repeat `"use server"` inline. New async functions should do the same.
- DB access: import `db` from `~/lib/db/index`. Auth: `requireUser()` from `~/lib/auth`.
- `getChildrenQuery(parentId)` is the main way to reload column contents. It is a `query()` call.
- `ListItem` is `FolderListItem | NoteListItem` — both have `id`, `title`, `parent_id`, `type`.
- The `columns` store is a `createStore<ColumnEntry[]>`. Each entry has `folderId`, `items`, `focusedIndex`, `title`.
- `focusedItem()` derives from `currentColumn()` which derives from `depth()`.
- `cutItemSourceFolderId` uses `undefined` as "not set" sentinel (vs `null` = root folder).

## Keyboard Handling

- All key bindings are in a single `handleKeyDown` switch in `finder.tsx`.
- Jump palette open state (`isJumpPaletteOpen`) gates the handler — return early if open.
- Input/textarea targets also early-return to avoid swallowing typing.
- `Escape` was added as a key to cancel a pending cut; it does NOT currently close the jump palette (that has its own handler).

## Cut/Paste Move Feature (implemented)

- `cutItem` signal: holds the `ListItem` staged for move; null = nothing cut.
- `cutItemSourceFolderId`: the folderId the cut item lives in (for post-paste reload).
- `x` key → `cutFocusedItem()` — stores item + source folder.
- `p` key → `pasteItem()` — calls `moveItem()` server fn, then reloads source + dest columns.
- `Escape` key → cancels cut without moving.
- Visual feedback: `ColumnItem` receives `isCut: boolean` prop; applies `opacity-40 italic border border-dashed border-warning/60`.
- `KeyboardHints` receives `cutPending?: boolean` and shows a highlighted "paste here · Esc cancel" hint when active.

## Move Server Function (`moveItem` in api.ts)

- Signature: `moveItem(itemId, itemType: "note"|"folder", targetParentId: string|null): Promise<boolean>`
- Cycle guard: for folder moves, walks ancestor chain with recursive CTE to prevent self-parenting.
- Uses `UPDATE ... SET parent_id = NULL` (not parameterized NULL) for root-level moves — required because SQLite parameterized NULL in WHERE/SET context doesn't work well with `?`.
- Returns `false` on cycle or not-found; throws on auth failure.

## Column Reload Pattern

- `reloadColumn(colIdx)`: fetches fresh children via `getChildrenQuery`, writes to store, clamps focused index.
- After a move: reload destination column (current depth) + source column (may be a different colIdx).
- Source column lookup: `columns.findIndex(col => col.folderId === sourceFolderId)`.
- CRITICAL: Before calling `reloadColumn` after any mutation, you MUST call `await revalidate("list-children")` first.
  `getChildrenQuery` is a `query()` with an internal cache keyed to `"list-children"`. Without revalidating,
  `reloadColumn` fetches stale cached data and the UI will not reflect the mutation.
- The rest of the app (sidebar) uses the same `revalidate("list-children")` pattern — see `src/lib/hooks/useListItemActions.ts`.
- Import: `import { revalidate } from "@solidjs/router"`.

## Styling Notes

- `listItemVariants` from `listStyle.ts` handles focused/selected states via tailwind-variants.
- Cut state styling layered on top via plain Tailwind classes in the template string.
- DaisyUI `warning` color used for cut indicator (amber/yellow).
