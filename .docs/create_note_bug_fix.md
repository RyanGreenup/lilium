# Fix: Creating Multiple Notes Consecutively

## Problem

When creating multiple notes consecutively:
1. First note creates and displays correctly
2. Second note creation: note IS created in DB, but doesn't appear in list
3. Inline editing focuses on the WRONG item (the first note)
4. After refresh, the second note appears with title "Untitled"

## Root Cause

The `createNewNote` and `createNewFolder` functions were wrapped in `query()` from `@solidjs/router`:

```typescript
// WRONG - query() caches results based on arguments
export const createNewNote = query(
  async (title: string, content: string, parentId?: string) => {
    "use server";
    return await createNote(title, content, "md", undefined, parentId);
  },
  "create-note",
);
```

**The `query()` wrapper is designed for data fetching and caches results based on the function arguments.** When creating notes with the same arguments (`"Untitled"`, `""`, `parentId`), it returned the cached result from the first creation instead of calling the server again.

### Debug Evidence

Server log showed only ONE creation:
```
[CNB-SERVER] createNote called: { title: 'Untitled', parent_id: '...' }
[CNB-SERVER] Note inserted with ID: ff1642d22217e4bb197f26e34d0022f0
```

Client log showed the SAME ID being returned for the "new" note:
```
[CNB-2] Item created: { newItemId: "ff1642d22217e4bb197f26e34d0022f0", title: "Untitled" }
```

This was the ID of the first note (`note_1`), proving that `query()` returned the cached result.

## Fix

Convert mutation functions from `query()` wrappers to plain `async` server functions:

```typescript
// CORRECT - plain server function, no caching
export async function createNewNote(title: string, content: string, parentId?: string) {
  "use server";
  return await createNote(title, content, "md", undefined, parentId);
}
```

### Files Modified

- `src/lib/db_new/notes/create.ts`:
  - `createNewNote`
  - `duplicateNoteQuery`
  - `duplicateNoteByTitleAndContentQuery`

- `src/lib/db_new/folders/create.ts`:
  - `createNewFolder`
  - `createFolderWithIndexQuery`
  - `duplicateFolderQuery`

## Key Lesson

**In SolidJS Router:**
- `query()` - Use for **read operations** that benefit from caching (fetching data)
- Plain `async` server functions - Use for **mutations** (create, update, delete)

The `query()` function caches results based on arguments and query key. This is great for avoiding redundant fetches but completely wrong for mutations where each call should execute independently.
