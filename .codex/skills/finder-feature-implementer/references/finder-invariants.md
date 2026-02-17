# Finder Invariants

Use this reference when changing behavior in `src/routes/(app)/finder.tsx` and `src/components/finder`.

## State and Navigation

- Treat `columns` and `depth` as the core navigation model.
- Keep `depth = -1` as the uninitialized sentinel.
- Keep focus indexes valid after list changes by clamping to bounds.
- Keep navigation operations idempotent under repeated key presses.
- Keep async folder navigation guarded by `isNavigating`.

## Focus Memory and Persistence

- Preserve `focusMemory` updates whenever focused index changes.
- Preserve session key `sandbox2:list-state:v1` unless migrating data intentionally.
- Persist only serializable data: path folder IDs and focused index map.
- Restore persisted focus/path defensively:
  - Ignore malformed IDs/values.
  - Clamp restored indexes to current list lengths.

## Sliding and Transform Ownership

- Keep horizontal track transform writes centralized through `applyTrackTransform`.
- Keep `renderedTrackX` as source of truth for animation start/end state.
- Invalidate stale animation completions via `trackSlideId` checks.
- Stop prior animations before starting new slide animations.
- Snap, do not animate, when:
  - Initial sync
  - Width changes / resize path
  - Reduced motion is active
  - Animations are temporarily disabled

## Side-Effect Gating During Slides

- While `isSliding`, avoid side effects that compete for paint/composite:
  - Preview fetch/fade churn
  - `scrollIntoView` calls in columns
- Keep `disableAnimations` around click-driven multi-step updates.

## Input Semantics

- Ignore global key handler when focus is inside `input` or `textarea`.
- Ignore Finder keybindings while jump palette is open.
- Keep `gg` timing semantics consistent unless intentionally changed.
- Keep keyboard and mouse activation semantics aligned:
  - Folder => descend
  - Note => open route `/note/:id`

## Component Boundaries

- Keep orchestration/state transitions in `src/routes/(app)/finder.tsx`.
- Keep per-column row rendering in `Column`/`ColumnItem`.
- Keep preview container logic in `PreviewPanel`.
- Keep note-specific fetch/render logic in `NotePreview`.

## Regression Checklist

- Navigate quickly with `h`/`l` and arrow keys; verify no snap-back/jelly motion.
- Hover and click through active and ancestor columns; verify focus and selection states.
- Open and use jump palette; verify it reconstructs path and focuses target.
- Refresh page after drilling into folders; verify path/focus restore correctly.
- Resize viewport; verify layout re-measurement and stable track position.
- Test with reduced motion enabled; verify transitions snap as expected.
