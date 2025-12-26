# Context Menu & Keybindings Architecture

Quick guide for implementing context menu actions in the sidebar list.

## Overview

```
┌─────────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│  keybindings.ts     │────▶│  SidebarContent.tsx  │────▶│  ListViewer     │
│  (config)           │     │  (context menu)      │     │  (keyboard)     │
└─────────────────────┘     └──────────────────────┘     └─────────────────┘
                                      │                          │
                                      ▼                          ▼
                            ┌──────────────────────────────────────────┐
                            │           API Functions                   │
                            │  src/lib/db_new/notes/*.ts                │
                            │  src/lib/db_new/folders/*.ts              │
                            └──────────────────────────────────────────┘
```

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/keybindings.ts` | Single source of truth for keybindings |
| `src/components/layout/sidebar/SidebarContent.tsx` | Context menu definition & handlers |
| `src/components/layout/sidebar/tabs/NotesListTabNew.tsx` | Keyboard handlers & list UI |
| `src/lib/db_new/notes/*.ts` | Note API functions (create, read, update, delete) |
| `src/lib/db_new/folders/*.ts` | Folder API functions |

## Keybindings Config

All keybindings are defined in `src/lib/keybindings.ts`:

```typescript
export const ITEM_KEYBINDINGS = {
  rename: { key: "F2", label: "Rename", description: "Rename the focused item" },
  createSibling: { key: "Ctrl+N", label: "New sibling", description: "Create note at same level" },
  // ... etc
} as const;
```

- `key` - Used for keyboard matching and context menu display
- `label` - Menu item text
- `description` - Help popup text

## Context Menu (SidebarContent.tsx)

The context menu is defined in `getContextMenuItems()`:

```typescript
const getContextMenuItems = (): ContextMenuItem[] => {
  const item = contextItem();  // The right-clicked item
  if (!item) return [];

  return [
    {
      id: "rename",
      label: ITEM_KEYBINDINGS.rename.label,
      keybind: ITEM_KEYBINDINGS.rename.key,
      onClick: () => setEditingItemId(item.id),  // ← Action handler
    },
    // ... more items
  ];
};
```

Each menu item needs:
- `id` - Unique identifier
- `label` / `keybind` - From `ITEM_KEYBINDINGS`
- `onClick` - Handler function

## Keyboard Handlers (NotesListTabNew.tsx)

Keyboard shortcuts are handled in `handleItemKeybind()`:

```typescript
const handleItemKeybind = (e: KeyboardEvent): boolean => {
  const item = currentItems[list.focusedIndex];
  if (!item) return false;

  if (matchesKeybind(e, ITEM_KEYBINDINGS.rename.key)) {
    props.onStartEdit?.(item);
    return true;
  }
  // Add more keybindings here...
  return false;
};
```

## How Rename Was Implemented

### 1. API Layer (`src/lib/db_new/notes/update_rename.ts`)

```typescript
"use server";

export async function renameNote(noteId: string, newTitle: string) {
  const user = await requireUser();
  const stmt = db.prepare(`UPDATE notes SET title = ?, updated_at = ? WHERE id = ? AND user_id = ?`);
  stmt.run(newTitle, new Date().toISOString(), noteId, user.id);
}

export const renameNoteQuery = query(renameNote, "rename-note");
```

### 2. Props Chain

```
SidebarContent.tsx
    │
    ├── editingItemId signal (tracks which item is being renamed)
    ├── handleRename(item, newTitle) - calls API, revalidates
    ├── handleStartEdit(item) - sets editingItemId
    │
    └──▶ ListViewer props:
           ├── editingItemId={editingItemId}
           ├── onRename={handleRename}
           ├── onCancelRename={() => setEditingItemId(null)}
           └── onStartEdit={handleStartEdit}
```

### 3. Inline Edit UI (NotesListTabNew.tsx)

```tsx
<Show when={props.editingItemId?.() === item.id} fallback={<span>{item.title}</span>}>
  <input
    value={editValue()}
    onInput={(e) => setEditValue(e.currentTarget.value)}
    onBlur={handleSave}
    onKeyDown={(e) => {
      if (e.key === "Enter") handleSave();
      if (e.key === "Escape") props.onCancelRename?.();
    }}
  />
</Show>
```

### 4. Triggering Rename

**Via context menu:**
```typescript
onClick: () => setEditingItemId(item.id)
```

**Via keyboard (F2):**
```typescript
if (matchesKeybind(e, ITEM_KEYBINDINGS.rename.key)) {
  props.onStartEdit?.(item);  // → setEditingItemId(item.id)
}
```

## Implementing a New Action (e.g., Delete)

### Step 1: Create API function

```typescript
// src/lib/db_new/notes/delete.ts
"use server";

import { query } from "@solidjs/router";
import { requireUser } from "../../auth";
import { db } from "../index";

export async function deleteNote(noteId: string) {
  const user = await requireUser();
  const stmt = db.prepare(`DELETE FROM notes WHERE id = ? AND user_id = ?`);
  stmt.run(noteId, user.id);
}

export const deleteNoteQuery = query(deleteNote, "delete-note");
```

### Step 2: Add handler in SidebarContent.tsx

```typescript
import { deleteNoteQuery } from "~/lib/db_new/notes/delete";
import { deleteFolderQuery } from "~/lib/db_new/folders/delete";

const handleDelete = async (item: ListItem) => {
  if (!confirm(`Delete "${item.title}"?`)) return;

  if (item.type === "folder") {
    await deleteFolderQuery(item.id);
  } else {
    await deleteNoteQuery(item.id);
  }
  revalidate("list-children");
};
```

### Step 3: Update context menu onClick

```typescript
{
  id: "delete",
  label: ITEM_KEYBINDINGS.delete.label,
  keybind: ITEM_KEYBINDINGS.delete.key,
  onClick: () => handleDelete(item),  // ← Replace alert()
},
```

### Step 4: Add keyboard handler (optional)

In `NotesListTabNew.tsx`, add to `handleItemKeybind()`:

```typescript
if (matchesKeybind(e, ITEM_KEYBINDINGS.delete.key)) {
  props.onDelete?.(item);
  return true;
}
```

And add the prop to `ListViewerProps`:
```typescript
onDelete?: (item: ListItem) => void;
```

## How "Make Folder" Was Implemented

This is a complete example of adding a context menu action that uses an existing API function.

### What It Does

Converts a note into a folder. The note becomes an "index" note inside a new folder that inherits the note's original title and parent location.

```
Before:                     After:
├── My Note                 ├── My Note/
                                └── index (was "My Note")
```

### 1. The API Already Existed

`src/lib/db_new/notes/convert.ts` already had `convertNoteToFolderQuery`:

```typescript
export async function convertNoteToFolder(noteId: string): Promise<{ folder: Folder; note: Note }> {
  // Transaction:
  // 1. Create folder with note's title and parent_id
  // 2. Move note into the new folder
  // 3. Rename note to "index"
}

export const convertNoteToFolderQuery = query(convertNoteToFolder, "convert-note-to-folder");
```

### 2. Add Keybinding (`src/lib/keybindings.ts`)

```typescript
export const ITEM_KEYBINDINGS = {
  // ... existing
  makeFolder: { key: "Ctrl+Shift+F", label: "Make folder", description: "Convert note to folder" },
} as const;
```

### 3. Add Handler (`src/lib/hooks/useListItemActions.ts`)

Import the API function:
```typescript
import { convertNoteToFolderQuery } from "~/lib/db_new/notes/convert";
```

Add to interface:
```typescript
handleMakeFolder: (item: ListItem) => Promise<void>;
```

Implement handler:
```typescript
const handleMakeFolder = async (item: ListItem) => {
  // Guard: only works on notes
  if (item.type === "folder") {
    alert("Item is already a folder");
    return;
  }

  try {
    await convertNoteToFolderQuery(item.id);
    revalidate("list-children");
  } catch (error) {
    console.error("Failed to convert to folder:", error);
    alert(error instanceof Error ? error.message : "Failed to convert to folder");
  }
};
```

Add to return object:
```typescript
return {
  // ... existing
  handleMakeFolder,
};
```

### 4. Wire Up Context Menu (`SidebarContent.tsx`)

Destructure from hook:
```typescript
const { handleMakeFolder, /* ... */ } = useListItemActions();
```

Add menu item:
```typescript
{
  id: "make-folder",
  label: ITEM_KEYBINDINGS.makeFolder.label,
  keybind: ITEM_KEYBINDINGS.makeFolder.key,
  onClick: () => handleMakeFolder(item),
},
```

Pass prop to ListViewer:
```typescript
<ListViewer onMakeFolder={handleMakeFolder} /* ... */ />
```

### 5. Add Keyboard Handler (`NotesListTabNew.tsx`)

Add prop:
```typescript
onMakeFolder?: (item: ListItem) => Promise<void>;
```

Add to `handleItemKeybind()`:
```typescript
if (matchesKeybind(e, ITEM_KEYBINDINGS.makeFolder.key)) {
  props.onMakeFolder?.(item);
  return true;
}
```

### Summary: Files Changed

| File | Change |
|------|--------|
| `src/lib/keybindings.ts` | Add `makeFolder` keybinding |
| `src/lib/hooks/useListItemActions.ts` | Add `handleMakeFolder` handler |
| `src/components/layout/sidebar/SidebarContent.tsx` | Add context menu item + pass prop |
| `src/components/layout/sidebar/tabs/NotesListTabNew.tsx` | Add keyboard handler + prop |

## Implemented Actions

| Action | Keybinding | Notes |
|--------|------------|-------|
| `rename` | `F2` | Inline edit |
| `createSibling` | `N` | Note at same level |
| `createSiblingFolder` | `Ctrl+Shift+N` | Folder at same level |
| `createChild` | `Shift+N` | Note inside folder |
| `createChildFolder` | `Alt+Shift+N` | Folder inside folder |
| `copyLink` | `y` | Copies `[title](id)` to clipboard |
| `duplicate` | `Ctrl+D` | Copy with "(copy)" suffix |
| `cut` | `Ctrl+X` | Visual feedback (50% opacity) |
| `paste` | `Ctrl+V` | Paste as sibling |
| `pasteChild` | `Ctrl+Shift+V` | Paste inside folder |
| `delete` | `Delete` | Confirm dialog, cascade for folders |
| `makeFolder` | `Ctrl+Shift+F` | Convert note to folder |

## Tips

1. **Revalidation**: After mutations, call `revalidate("list-children")` to refresh the list
2. **Type checking**: Use `item.type === "folder"` to handle folders vs notes differently
3. **Error handling**: Wrap API calls in try/catch, show user-friendly errors
4. **Confirmation**: Use `confirm()` or a modal for destructive actions
