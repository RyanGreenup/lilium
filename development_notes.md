# Development Notes

## Suspense Boundary Issues with Tab Switching (Fixed)

**Date:** 2025-01-27  
**Issue:** Page-wide blank screen when switching between sidebar tabs  
**Root Cause:** Async resources accessed outside local Suspense boundaries

### Problem Description

When switching between sidebar tabs (especially Notes and Recent Notes tabs), the entire page would go blank during data loading, creating a poor user experience. This was particularly noticeable when network throttling was enabled.

### Root Cause Analysis

The issue was caused by async resources being accessed outside of proper Suspense boundaries:

1. **Tab switching triggered search parameter updates:**
   ```tsx
   setSearchParams({ sidebar: tab.key });
   ```

2. **This caused reactivity in `useCurrentNote()` hook:**
   - The hook depends on `searchParams.id` 
   - Changes to search params triggered re-execution of async resources

3. **Async resources were accessed outside Suspense boundaries:**
   ```tsx
   // PROBLEMATIC CODE
   const { note, noteId } = useCurrentNote();     // async resource
   const parents = useNoteParents(noteId);        // async resource
   
   return (
     <div>
       <Show when={note()}>                       // ← OUTSIDE SUSPENSE
         <p>{note().title}</p>
         <Show when={parents()}>                  // ← OUTSIDE SUSPENSE
           {/* render parents */}
         </Show>
       </Show>
       
       <Suspense fallback={<spinner />}>          // ← ONLY COVERS PART OF CONTENT
         {/* other content */}
       </Suspense>
     </div>
   );
   ```

4. **Global Suspense activation:**
   - When async resources entered loading state, SolidJS looked for nearest Suspense boundary
   - No local boundary existed for the problematic code
   - Loading state bubbled up to the global app-level Suspense
   - Entire page went blank until data loaded

### Solution

Wrapped all async-dependent content in local Suspense boundaries:

```tsx
// FIXED CODE
return (
  <Suspense fallback={
    <div class="w-full h-full bg-base-200 rounded flex items-center justify-center">
      <div class="loading loading-spinner loading-md"></div>
    </div>
  }>
    <div>
      <Show when={note()}>                        // ← NOW INSIDE SUSPENSE
        <p>{note().title}</p>
        <Show when={parents()}>                   // ← NOW INSIDE SUSPENSE
          {/* render parents */}
        </Show>
      </Show>
      
      {/* all other async-dependent content */}
    </div>
  </Suspense>
);
```

### Key Lessons

1. **Always wrap async-dependent content in local Suspense boundaries**
2. **Global Suspense should be a last resort, not the primary loading mechanism**
3. **Search parameter changes can trigger unexpected async resource re-execution**
4. **Test with network throttling to expose timing-related UI issues**

### Files Modified

- `src/components/layout/sidebar/tabs/NotesTab.tsx` - Added comprehensive Suspense boundary
- `src/components/layout/sidebar/tabs/RecentNotesTab.tsx` - Added comprehensive Suspense boundary  
- `src/lib/hooks/useCurrentNote.ts` - Improved search parameter isolation (attempted optimization)

### Pattern to Follow

For any component that uses async resources (`createAsync`, hooks that return async data):

```tsx
function MyTabComponent() {
  const asyncData = createAsync(...);
  const { someAsyncResource } = useSomeHook();
  
  return (
    <Suspense fallback={<LocalLoadingSpinner />}>
      {/* ALL content that depends on async resources goes here */}
      <Show when={asyncData()}>
        {/* content using asyncData */}
      </Show>
      <Show when={someAsyncResource()}>
        {/* content using someAsyncResource */}
      </Show>
    </Suspense>
  );
}
```

**Avoid:**
- Accessing async resources outside Suspense boundaries
- Relying on global Suspense for component-level loading states
- Partial Suspense coverage that leaves some async dependencies unprotected