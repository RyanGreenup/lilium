# Notes List Viewer

`ListViewer` (`src/components/layout/sidebar/tabs/NotesListTabNew.tsx`) is the sidebar file/folder browser. It manages hierarchical folder navigation, keyboard-driven selection, index-note auto-selection, and URL-driven auto-expansion — all within a single SolidJS component using a store-backed state machine.

## Core State Flags

Two boolean flags coordinate navigation between the click path and the reactive effects. Getting them wrong produces ghost navigations or missed selections.

| Flag | Set to `true` | Reset to `false` |
|---|---|---|
| `autoSelectingIndex` | `handleListClick` after `navigateInto` | `applyNavigation` (always) and the auto-select effect |
| `skipNextAutoExpand` | Every path that calls `onNoteSelect` internally | The auto-expand effect when it skips |

### `autoSelectingIndex`

When the user clicks a folder, the component navigates into it and then waits for `indexNoteId` to resolve. The effect fires once `indexNoteId()` becomes truthy:

```typescript
// Auto-select effect
createEffect(() => {
  if (list.autoSelectingIndex && indexNoteId()) {
    update({ autoSelectingIndex: false, skipNextAutoExpand: true });
    selectIndex();
  }
});

// Click handler
const handleListClick = (index: number) => {
  // ...
  if (item.type === "folder" && navigateOnClick) {
    navigateInto(item);              // calls applyNavigation → resets autoSelectingIndex
    setList("autoSelectingIndex", true);  // set after; SolidJS batches within event handler
  }
};
```

**Key point:** `applyNavigation` always resets `autoSelectingIndex: false`. The click handler then sets it back to `true`. This is safe because SolidJS batches all synchronous signal updates within a single DOM event handler — effects don't run between `navigateInto` and `setList("autoSelectingIndex", true)`.

Without the reset in `applyNavigation`, a click on a folder with no index note leaves `autoSelectingIndex: true` permanently. The next folder that does have an index note would then auto-select it unexpectedly.

### `skipNextAutoExpand`

Every internal navigation that calls `onNoteSelect` must set `skipNextAutoExpand: true` first. This prevents the auto-expand effect from re-running when the URL changes as a result of the internal navigation.

All three paths that call `onNoteSelect` set this flag:

```typescript
// selectIndex — called by auto-select effect and keyboard "0" shortcut
const selectIndex = () => {
  setList("skipNextAutoExpand", true);
  props.onNoteSelect(noteId);
  // ...
};

// selectOrCreateIndex — called when creating a new index note
setList("skipNextAutoExpand", true);
props.onNoteSelect?.(newNote.id);

// selectFolderIndex — called by Enter on folder in keyboard nav
update({ skipNextAutoExpand: true, ... });
props.onNoteSelect?.(indexId);
```

If any of these forget the flag, the auto-expand effect fires, fetches the folder path for the note, and potentially overwrites the history with a conflicting navigation.

## Cancellable Async in `createEffect`

**This is a SolidJS-specific pitfall.** `createEffect` with an `async` callback does not cancel the in-flight promise when the reactive source changes. The promise keeps running and its `.then()` runs after the next tracking context is already active — overwriting navigation state with stale data.

The auto-expand effect fetches folder path data asynchronously. The correct pattern is synchronous entry with a cancellation flag checked inside `.then()`:

```typescript
createEffect(
  on(
    () => props.currentNoteId?.(),
    (noteId) => {
      // Guard: skip internal navigations
      if (list.skipNextAutoExpand) {
        setList("skipNextAutoExpand", false);
        return;
      }
      if (!noteId) return;

      // Set cancelled flag synchronously so onCleanup captures it
      let cancelled = false;
      onCleanup(() => {
        cancelled = true;
      });

      // Start async work — check cancelled before applying any result
      getNoteFolderPathQuery(noteId)
        .then((pathInfo) => {
          if (cancelled || !pathInfo) return;
          // safe to apply result
        })
        .catch((err) => {
          if (!cancelled) console.error("Failed to fetch folder path:", err);
        });
    },
  ),
);
```

`onCleanup` called inside a `createEffect` runs synchronously before the next effect execution (when the reactive source changes again). This means `cancelled` is set to `true` before any new `.then()` callback from the previous run can fire.

**Do not** write `async (noteId) => { await getNoteFolderPathQuery(noteId); ... }` inside `createEffect`. SolidJS cannot track dependencies or cancel work across `await` boundaries.

## Navigation Actions

The four navigation functions all flow through `applyNavigation`:

```
navigateInto(item)        → applyNavigation([...history, item.id], ...)
navigateBack()            → applyNavigation(history.slice(0,-1), ...)
navigateToFolder(id)      → applyNavigation(history.slice(0, idx+1), ...)
jumpToSelection()         → update({history: selectionHistory, ...})  (does not call applyNavigation)
```

`applyNavigation` is the single place that resets navigation-related flags. Any future navigation action that bypasses it must manually reset `autoSelectingIndex`.

## Focus Memory

The component remembers the focused item index for each folder visited:

```typescript
const saveFocus = () => {
  if (list.focusedIndex !== null) {
    setList("focusMemory", memoryKey(currentParent()), list.focusedIndex);
  }
};

const restoreFocus = (parentId: string | null): number | null =>
  list.focusMemory[memoryKey(parentId)] ?? null;
```

`saveFocus` is called before every navigation action. `restoreFocus` provides the initial `focusedIndex` when navigating to a previously visited folder. Both `history` and `focusMemory` are persisted to the parent via `onHistoryChange` and `onFocusMemoryChange` props so they survive tab switches.

## Key Conventions

- `update(changes)` wraps `batch()` around multiple store writes — always use it for multi-field updates to prevent intermediate reactive renders.
- `selectIndex` and `selectFolderIndex` are distinct: `selectIndex` opens the current folder's index note; `selectFolderIndex(i)` opens the index of a child folder without navigating into it (used by Enter-on-folder keyboard action).
- `onNoteSelect` is the single external navigation callback — it causes a URL change which drives `currentNoteId`, which drives selection state. Do not bypass it for note navigation.
- The `"0"` key (`INDEX_KEY`) triggers `selectOrCreateIndex`, which creates an index note if one doesn't exist.

## Gotchas

**Flag ordering with `handleListClick`:** The `setList("autoSelectingIndex", true)` call after `navigateInto` only works correctly because `navigateInto` runs synchronously and SolidJS batches within DOM event handlers. If either of those assumptions changes, the flag order must be re-evaluated.

**`selectFolderIndex` is async:** It calls `getIndexNoteIdQuery` directly (not via a reactive accessor). This is intentional — it fetches a specific folder's index without changing the sidebar's current folder context.

**Auto-expand runs on mount (no `defer`):** The `on(..., { defer: false })` on the auto-expand effect means it runs once when the component mounts. This handles the case where the tab was hidden during external navigation and needs to catch up on mount.

## Related

- [Sidebar Scroll Layout](./sidebar-scroll-layout.md) — flex chain and keyboard scroll behavior
- `src/lib/keybindings.ts` — `ITEM_KEYBINDINGS` and `LIST_KEYBINDINGS` constants
- `src/lib/db/api.ts` — `getChildrenQuery`, `getIndexNoteIdQuery`, `getNoteFolderPathQuery`, `getFolderPathQuery`
