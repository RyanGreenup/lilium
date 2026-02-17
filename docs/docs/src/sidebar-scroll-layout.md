# Sidebar Scroll Layout

Getting a scrollable list inside a flex sidebar requires every ancestor in the chain to have a bounded height. The pattern is: `flex flex-col h-full` at each level, `flex-1 min-h-0` on the growing container, and `overflow-y-auto` only on the terminal scrollable element.

## SidebarTabs Flex Chain

```
SidebarTabs (flex flex-col h-full)
├── Tabs (takes needed space)
└── Content Area (flex-1 min-h-0)
    └── Tab Content (h-full)
        └── RecentNotesTab (flex flex-col h-full)
            ├── Current Note (flex-shrink-0)
            └── ContentList (flex-1)
                └── Scrollable Area (overflow-y-auto)
```

## NotesTab Flex Chain

```
NotesTab (flex flex-col h-full)
├── Follow Mode (flex-shrink-0)
├── Main Content (flex-1 min-h-0)
│   ├── Cut/Up Button (flex-shrink-0)
│   └── Notes List (flex-1 overflow-y-auto)
└── Breadcrumbs (flex-shrink-0)
```

The key rules:
- `min-h-0` on any `flex-1` container that itself contains a scrollable child — without it, flexbox allows the element to grow beyond its parent and the scroll never triggers
- `flex-shrink-0` on fixed-height siblings (buttons, breadcrumbs, headers) so they don't compress

## Keyboard-Driven Scroll

When keyboard navigation is active, the scrollable container must keep the focused item visible. Use a `createEffect` that checks visibility and calls `scrollIntoView` only when the element is outside the viewport:

```tsx
createEffect(() => {
  if (!props.enableKeyboardNav) return;

  const focusIndex = focusedIndex();
  if (focusIndex >= 0 && itemRefs[focusIndex] && containerRef) {
    const focusedElement = itemRefs[focusIndex];
    const container = containerRef;

    if (focusedElement) {
      const containerRect = container.getBoundingClientRect();
      const elementRect = focusedElement.getBoundingClientRect();

      const isAboveViewport = elementRect.top < containerRect.top;
      const isBelowViewport = elementRect.bottom > containerRect.bottom;

      if (isAboveViewport || isBelowViewport) {
        focusedElement.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "nearest",
        });
      }
    }
  }
});
```

`block: "nearest"` avoids jarring full-page jumps — it scrolls the minimum distance needed to bring the element into view.
