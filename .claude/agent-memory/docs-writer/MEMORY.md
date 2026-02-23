# Docs Writer Memory

## Docs Location & Structure

- All docs live in `/home/ryan/Sync/Projects/solid-js/lilium_dev/docs/docs/src/`
- Book is mdBook — register every new file in `SUMMARY.md`
- Run `just check-links` and `just find-orphans` to validate after edits
- Style guide is in `docs/docs/CLAUDE.md`: active voice, omit needless words, link related pages

## Existing Doc Pages (what each covers)

- `index.md` — landing page
- `hooks.md` — custom hook pattern (`useXxx`), `createAsync`, server functions co-located with hooks
- `sidebar-scroll-layout.md` — flex chain for scrollable sidebar, keyboard scroll with `scrollIntoView`
- `asset-management.md` + `asset-streaming.md` — file/video asset serving
- `notes-list-viewer.md` — `ListViewer` component: navigation state flags, cancellable async in `createEffect`, focus memory
- `ranger-file-browser.md` — three-column ranger-style browser at `/sandbox`; keyboard nav, `getChildrenQuery`/`getFolderPathQuery`, `listItemVariants`, `NotePreview`

## Key SolidJS Patterns to Document

**Cancellable async in `createEffect`:** Never use `async/await` inside `createEffect` — SolidJS cannot cancel in-flight promises. Use synchronous entry + `.then()` + `onCleanup` cancellation flag. Document this whenever a `createEffect` does any async work.

**SolidJS batching in DOM event handlers:** All synchronous signal updates within a single DOM event handler are batched — effects don't run between them. This matters when flag ordering depends on batching (e.g., `applyNavigation` resetting a flag that `handleListClick` immediately re-sets).

**`update()` helper:** `ListViewer` uses a local `update(changes)` wrapper around `batch()` for multi-field store writes. Any component doing multi-field updates should follow this pattern.

## Project Conventions

- Hex IDs for all DB records; `requireUser()` scopes all DB operations
- `query()` preferred over `cache()` for server functions
- `createAsync` for reactive data; `createMemo` for derived state
- Route params via `useParams()`, search params via `useSearchParams()`
- Icons: `lucide-solid`, size 16 standard, size 14 for compact UI
