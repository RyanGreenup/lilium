---
name: finder-feature-implementer
description: Implement features and refactors for the Finder-style browser in src/routes/(app)/finder.tsx and src/components/finder. Use when adding UI behavior, keyboard shortcuts, navigation flows, animation changes, preview behavior, persistence logic, or jump-palette integration for this route.
---

# Finder Feature Implementer

Implement features on the Finder route without breaking navigation sequencing, focus memory, and anti-jitter animation guards.

Read `references/finder-invariants.md` before editing behavior that touches navigation, depth, focus, preview fetching, or motion.

## Workflow

1. Inspect current behavior in:
   - `src/routes/(app)/finder.tsx`
   - `src/components/finder/*.tsx`
   - `src/components/finder/constants.ts`
2. Identify whether the change affects:
   - Navigation state (`columns`, `depth`, `focusMemory`, `isNavigating`)
   - Motion state (`isSliding`, `disableAnimations`, `prefersReducedMotion`)
   - Persistence (`sandbox2:list-state:v1`)
   - Keyboard/mouse semantics
   - Preview data flow
3. Implement with minimal surface area:
   - Keep route-level orchestration in `finder.tsx`
   - Keep rendering details in subcomponents
4. Preserve invariants from `references/finder-invariants.md`
5. Validate:
   - Typecheck and run relevant tests if available
   - Perform a manual interaction pass for keyboard and click flows
   - Confirm no jitter regressions on rapid left/right navigation
6. Update docs when user-visible behavior changes:
   - `docs/docs/src/finder-route-overview.md`

## Edit Rules

- Batch related state updates (`batch` / `produce`) when the update would otherwise create transient frames.
- Keep track transform writes centralized through `applyTrackTransform`.
- Do not trigger preview fade/fetch or `scrollIntoView` during track slides.
- Gate global key handling when inputs are focused and when jump palette is open.
- Clamp focused indexes to valid bounds when list sizes change.
- Prefer extending existing helpers over adding parallel code paths.

## Implementation Patterns

### Add a keybinding
1. Update `handleKeyDown` in `src/routes/(app)/finder.tsx`.
2. Prevent default for handled keys.
3. Reset `gPressed` for non-`g` paths if needed.
4. Update `src/components/finder/KeyboardHints.tsx` if the binding is user-facing.
5. Verify no conflict with jump palette and text input behavior.

### Add or modify navigation behavior
1. Prefer routing through `goDeeper`, `goShallower`, `goToDepth`, or `jumpToSelection`.
2. Preserve `isNavigating` guardrails for async transitions.
3. Keep `focusMemory` updates aligned with focus changes.
4. Verify persisted path/focus restoration still works after refresh.

### Change animation behavior
1. Update timings/easing in `src/components/finder/constants.ts` when possible.
2. Keep reduced-motion and disable-animation fast paths intact.
3. Ensure canceled animations cannot write stale transforms.
4. Manually test rapid repeated navigation and window resize.

### Change preview behavior
1. Keep route-level preview data fetching in `finder.tsx`.
2. Keep panel rendering logic in `src/components/finder/PreviewPanel.tsx`.
3. Keep note-specific data loading in `src/components/finder/NotePreview.tsx`.
4. Avoid introducing preview updates during `isSliding`.

## Done Criteria

- The new behavior works for both keyboard and mouse paths when applicable.
- No new transient jitter appears during horizontal column motion.
- Focus and selected-path visuals remain coherent across columns.
- State persists/restores without invalid indices.
- Related docs are updated when behavior changed.

## Resources

- `references/finder-invariants.md`: Required invariants and regression checklist for this route.
