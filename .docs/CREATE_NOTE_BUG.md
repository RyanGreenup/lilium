# Bug: Creating Multiple Notes Consecutively Fails

## Problem Description

When a user creates a new note and names it, then creates another note immediately after, the second note:
1. Does NOT appear in the list
2. The inline edit input appears on the FIRST note instead of the new one

After a page refresh, the second note IS visible (with title "Untitled"), confirming:
- The note IS being created in the database
- The issue is with the UI not updating to show the new item

## Reproduction Steps

1. Open the Notes sidebar tab
2. Focus on an existing note
3. Press `N` to create a new sibling note
4. Inline edit appears on the new note - type a name and press Enter
5. Press `N` again to create another new note
6. **Expected**: New note appears with inline edit focused on it
7. **Actual**: Nothing appears, inline edit focuses on the first note created in step 3
8. Refresh the page - the second note now appears with title "Untitled"

## Technical Context

### Data Flow

1. `handleCreateSibling` in `useListItemActions.ts` creates the note via `createNewNote()`
2. `revalidate("list-children")` is called to refresh the cached query
3. `setEditingItemId(newItem.id)` is called to trigger inline editing
4. `NotesListTabNew.tsx` renders items from `createAsync(() => getChildrenQuery(currentParent()))`
5. The `<Show when={editingItemId() === item.id}>` conditional renders the inline edit input

### Key Files

- `src/lib/hooks/useListItemActions.ts` - Contains create/rename handlers
- `src/components/layout/sidebar/tabs/NotesListTabNew.tsx` - List component with inline editing
- `src/components/layout/sidebar/SidebarContent.tsx` - Parent component, passes props to ListViewer
- `src/lib/db_new/api.ts` - Query definition with `query()` wrapper

## Attempted Fixes

### Attempt 1: Await revalidate()

**Hypothesis**: `revalidate()` wasn't being awaited, so `setEditingItemId()` ran before data was fetched.

**Change**:
```typescript
// Before
revalidate("list-children");
setEditingItemId(newItem.id);

// After
await revalidate("list-children");
setEditingItemId(newItem.id);
```

**Result**: Did not fix the issue.

**Learning**: `revalidate()` returns a promise that resolves when data is *fetched*, but this doesn't mean the SolidJS reactive system has propagated the update to components and re-rendered the DOM.

### Attempt 2: Pending Edit Pattern with createEffect

**Hypothesis**: We need to coordinate between the data layer and UI layer - only set `editingItemId` after the new item actually appears in the `items()` list.

**Change**:
1. Added `pendingEditId` signal to track intent to edit
2. After creation, set `pendingEditId` (not `editingItemId`)
3. Added `createEffect` in `NotesListTabNew.tsx` that watches both `items()` and `pendingEditId`
4. When the pending item appears in items, trigger `setEditingItemId`

```typescript
// In useListItemActions.ts
setPendingEditId(newItem.id);
revalidate("list-children");

// In NotesListTabNew.tsx
createEffect(() => {
  const pendingId = props.pendingEditId?.();
  const currentItems = items();
  if (pendingId && currentItems) {
    const found = currentItems.find(item => item.id === pendingId);
    if (found) {
      props.onPendingEditResolved?.(pendingId);
    }
  }
});
```

**Result**: Did not fix the issue.

**Learning**: The effect may not be re-running when `items()` updates after revalidation. This could be due to:
- `createAsync` resources not triggering effect re-runs reliably during revalidation
- Some reactivity tracking issue with the resource

### Attempt 3: requestAnimationFrame delay

**Hypothesis**: Wait for the browser's next paint cycle (which happens after SolidJS updates the DOM) before setting `editingItemId`.

**Change**:
```typescript
await revalidate("list-children");
await new Promise(resolve => requestAnimationFrame(resolve));
setEditingItemId(newItem.id);
```

**Result**: Did not fix the issue.

**Learning**: Even waiting for the next animation frame isn't sufficient. The issue may be deeper in how `createAsync` and `revalidate` interact.

## Observations

1. **First note creation works** - The issue only manifests on subsequent creations without a page refresh.

2. **Refresh fixes the issue** - After refresh, creating a note works correctly again (until you create a second one).

3. **Edit appears on wrong item** - The inline edit DOES appear, just on the wrong item (the first created note). This means `editingItemId` is being set to *something*, but either:
   - It's being set to the wrong ID
   - The list hasn't updated so the new item's ID doesn't match anything, but somehow the first item is getting edit mode

4. **New note doesn't appear in list** - This suggests `revalidate()` isn't causing the `items()` resource to update, OR the component isn't re-rendering with the new data.

## Hypotheses to Investigate

### 1. Query caching issue
The `query()` wrapper with key `"list-children"` is shared across all `parentId` values. Maybe there's a caching issue where:
- The query for the current parent is cached
- `revalidate("list-children")` invalidates it
- But the component still receives stale data

### 2. createAsync behavior during revalidation
`createAsync` may have specific behavior where:
- During revalidation, it returns the old cached value
- The "update" to new data doesn't trigger reactive subscribers
- Effects that depend on the resource don't re-run

### 3. Suspense boundary interference
The `ListViewer` is wrapped in `<Suspense>`. During revalidation:
- The resource may enter a "pending" state
- Suspense may show fallback briefly
- When it resolves, some state may be lost or reset

### 4. Signal timing / batching
SolidJS batches updates. The sequence of:
1. `revalidate()` completing
2. `items()` resource updating
3. Effect running
4. `setEditingItemId()` being called

...may have unexpected ordering due to batching.

### 5. Stale closure in effect
The effect may be capturing stale values due to closure issues, though this seems unlikely given how we're reading signals.

## Debugging Suggestions

1. **Add console.logs** to trace the exact sequence of events:
   ```typescript
   console.log('Creating note with ID:', newItem.id);
   console.log('Before revalidate, items:', items()?.map(i => i.id));
   await revalidate("list-children");
   console.log('After revalidate, items:', items()?.map(i => i.id));
   ```

2. **Check if items() actually updates** after revalidation by logging in the component's render or an effect.

3. **Try using createResource instead of createAsync** to see if the behavior differs.

4. **Remove Suspense boundary** temporarily to see if it affects the behavior.

5. **Try setTimeout instead of requestAnimationFrame** with longer delays (100ms, 500ms) to isolate timing issues.

6. **Check SolidJS Router version** and look for known issues with `revalidate()` and `createAsync`.

## Current State

The code currently uses the `requestAnimationFrame` approach (Attempt 3), which still doesn't work. The pending edit pattern code was removed after it also failed.

## Related Files for Reference

- Query definition: `src/lib/db_new/api.ts:82-85`
- List rendering: `src/components/layout/sidebar/tabs/NotesListTabNew.tsx:697-801`
- Create handlers: `src/lib/hooks/useListItemActions.ts:115-167`
