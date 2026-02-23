# Finder Route Overview

`src/routes/(app)/finder.tsx` implements a Finder-style hierarchical browser using a horizontally sliding column track plus a preview panel.

The route-level file owns orchestration state, keyboard navigation, persistence, animation sequencing, and data loading. UI rendering is split into focused components under `src/components/finder`.

## What It Renders

The screen has four regions:

1. `Breadcrumb` (`src/components/finder/Breadcrumb.tsx`) at the top
2. Main grid: left `Column` track + right `PreviewPanel`
3. `KeyboardHints` footer
4. `SandboxJumpPalette` modal for scoped jump navigation

Core layout in `finder.tsx`:

- Left pane: a viewport (`overflow-hidden`) containing a `trackRef` flex row of all visited columns
- Right pane: preview content for the currently focused item
- Bottom: keybinding hints

## Component Responsibilities

- `finder.tsx` (`src/routes/(app)/finder.tsx`)
  - Source of truth for columns, current depth, focus memory, layout measurement, sliding animation state, and keyboard handlers
  - Reads/writes persisted view state in `sessionStorage`
  - Handles all navigation actions (`goDeeper`, `goShallower`, `goToDepth`, `jumpToSelection`, `openNote`)
- `Column` (`src/components/finder/Column.tsx`)
  - Renders a single folder level
  - Scrolls focused row into view when active and not sliding
- `ColumnItem` (`src/components/finder/ColumnItem.tsx`)
  - Renders one row (icon + title + syntax badge for notes + chevron for folders)
- `PreviewPanel` (`src/components/finder/PreviewPanel.tsx`)
  - Shows folder children list preview or delegates to `NotePreview`
  - Fades on selection changes unless motion is disabled
- `NotePreview` (`src/components/finder/NotePreview.tsx`)
  - Loads full note content, backlinks, forward links; renders metadata + open-note action
- `PreviewSkeleton` (`src/components/finder/PreviewSkeleton.tsx`)
  - Loading skeleton for panel/content states
- `KeyboardHints` (`src/components/finder/KeyboardHints.tsx`)
  - Static keybinding legend
- `ItemIcon` (`src/components/finder/ItemIcon.tsx`)
  - Folder vs note icon rendering
- `constants.ts` (`src/components/finder/constants.ts`)
  - Shared animation timings/easing and `ColumnEntry` type

## State Model In `finder.tsx`

Primary route state:

- `columns: ColumnEntry[]`
  - Stack of loaded folder columns from root to current depth
- `depth: number`
  - Active column index (`-1` during init)
- `focusMemory: Record<string, number>`
  - Last focused row per folder (including root)
- `previewItems: ListItem[] | null`
  - Children of currently focused folder for right-panel preview
- `isNavigating`
  - Prevents overlapping async navigation actions
- `isSliding`
  - Transition lock while horizontal track animation is in flight
- `disableAnimations`
  - Temporary guard for click-driven multi-step updates
- `prefersReducedMotion`
  - From media query `(prefers-reduced-motion: reduce)`
- `visibleColumns`, `colWidthPx`, `layoutReady`
  - Responsive layout measurement for sliding track math

Derived values:

- `currentColumn`, `focusedItem`, `breadcrumb`
- `trackOffset = (visibleColumns - 1 - depth) * colWidthPx`

## Data Flow

Initial load:

1. `route.preload()` warms auth + root children (`getUser`, `getChildrenQuery(null)`)
2. `onMount` measures viewport, fetches root items, restores persisted state, builds initial column stack
3. Restored path is replayed by fetching children for each persisted folder ID in order

Runtime fetches:

- Entering a folder calls `getChildrenQuery(folderId)`
- Focusing a folder fetches its children for preview (unless sliding)
- `NotePreview` fetches note content + link metadata independently

## Persistence

Session key: `sandbox2:list-state:v1`

Stored shape:

```typescript
{
  path: string[];                // folder IDs from root to current depth
  focusedByFolder: Record<string, number>; // focused row index per folder key
}
```

Persistence behavior:

- Every relevant state change writes path + focused indices to `sessionStorage`
- Root folder uses key `"root"`; non-root uses folder ID
- Rehydration clamps indices to current list lengths to avoid out-of-range focus

## Navigation Semantics

- `j` / `k` / arrows: move focus within active column
- `l` / `Enter` / right arrow: activate focused item
  - folder => descend (`goDeeper`)
  - note => navigate to `/note/:id`
- `h` / `Backspace` / left arrow: ascend one depth
- `gg` / `G`: jump to first / last item
- `z`: open `SandboxJumpPalette`
- `u` / `PageUp` and `d` / `PageDown`: scroll preview panel up/down

Mouse behavior:

- Hovering row in active column updates focus
- Clicking a row runs navigation/open behavior with animations temporarily disabled

Jump palette behavior:

- Opened relative to current column (`parentId`, `baseDepth`)
- Selection contains ancestor folder chain + target item
- Route reconstructs columns from base depth through ancestors, then focuses target

## Animation and Jitter Guards

This route intentionally centralizes transform writes and gates side effects to avoid compositing jitter:

- Single transform writer: `applyTrackTransform`
- `renderedTrackX` tracks authoritative current X
- `trackSlideId` invalidates stale `finished` callbacks
- No track animation when:
  - first sync
  - width changes
  - reduced motion
  - animations temporarily disabled
- `isSliding` pauses:
  - preview fetch/fade churn
  - `scrollIntoView` in columns

Shared constants from `constants.ts`:

- `SLIDE_DURATION`, `FADE_DURATION`, `EASE_OUT`, `CSS_EASE`

## Extension Points

Common changes and where to make them:

- Add keybindings: `handleKeyDown` in `src/routes/(app)/finder.tsx`
- Change column sizing policy: `MAX_VISIBLE_COLUMNS`, `MIN_COLUMN_WIDTH_PX`, `measureColWidth`
- Adjust slide/fade timing: `src/components/finder/constants.ts`
- Change row visuals/states: `src/components/finder/ColumnItem.tsx` and shared list variants
- Alter preview strategy: `src/components/finder/PreviewPanel.tsx` / `src/components/finder/NotePreview.tsx`

## Related Files

- `src/routes/(app)/finder.tsx`
- `src/components/finder/constants.ts`
- `src/components/finder/Column.tsx`
- `src/components/finder/ColumnItem.tsx`
- `src/components/finder/PreviewPanel.tsx`
- `src/components/finder/NotePreview.tsx`
- `src/components/finder/Breadcrumb.tsx`
- `src/components/finder/KeyboardHints.tsx`
- `src/components/finder/PreviewSkeleton.tsx`
