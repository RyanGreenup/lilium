
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

