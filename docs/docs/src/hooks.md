# Custom Hooks

Custom hooks encapsulate reusable stateful logic — primarily data fetching and application state. They live in `src/lib/hooks/` and follow the `useXxx.ts` naming convention.

## Example: `useCurrentNote`

```typescript
import { createAsync, useParams, useSearchParams } from "@solidjs/router";

const getNoteById = async (noteId: string) => {
  "use server";
  const { getNoteById: dbGetNoteById } = await import("~/lib/db");
  return await dbGetNoteById(noteId);
};

export function useCurrentNote() {
  const params = useParams();
  const [searchParams] = useSearchParams();

  const rawId = params.id || searchParams.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  const note = createAsync(async () => {
    if (!id) return null;
    try {
      return await getNoteById(id);
    } catch (error) {
      console.error("Failed to fetch note:", error);
      return null;
    }
  });

  return { note, noteId: id };
}
```

## Conventions

**Co-locate server functions** in the same file as the hook that uses them.

**Handle both route and search params** — route params take precedence:

```typescript
const rawId = params.id || searchParams.id;
const id = Array.isArray(rawId) ? rawId[0] : rawId;
```

This lets the hook work with `/note/:id` and `?id=123` routes.

**Use `createAsync` for reactive fetching** — data re-fetches automatically when params change:

```typescript
const data = createAsync(async () => {
  if (!id) return null;
  try {
    return await fetchData(id);
  } catch (error) {
    console.error("Failed to fetch data:", error);
    return null;
  }
});
```

**Return a named object:**

```typescript
return {
  data,
  dataId: id,
};
```

## Usage in Components

```typescript
import { useCurrentNote } from "~/lib/hooks/useCurrentNote";

export default function MyComponent() {
  const { note, noteId } = useCurrentNote();

  return (
    <Show when={note()} fallback={<div>Loading...</div>}>
      {(noteData) => <h1>{noteData().title}</h1>}
    </Show>
  );
}
```

Inside a `Show` callback, `noteData` is a typed accessor — call it as `noteData()` to read properties.

## Composition Patterns

**Build on existing hooks** to avoid re-implementing parameter parsing:

```typescript
export function useNoteWithChildren() {
  const { noteId } = useCurrentNote();

  const children = createAsync(async () => {
    if (!noteId) return [];
    return await getChildNotes(noteId);
  });

  return { children, parentId: noteId };
}
```

**Derive state with `createMemo`** when transforming reactive data:

```typescript
export function useNoteBreadcrumb() {
  const { note } = useCurrentNote();

  const breadcrumb = createMemo(() => {
    const noteData = note();
    if (!noteData) return [];
    return buildBreadcrumbFromNote(noteData);
  });

  return { breadcrumb };
}
```

## Keybinding Hooks

When a hook manages a UI element that has a keybinding, register the keybinding **inside the hook** rather than in the caller. This prevents duplicate registration when multiple components use the same hook.

Pass an `enabled` accessor to gate the handler:

```typescript
export interface UseLinkPaletteOptions {
  onInsertLink: (linkText: string, note: NoteWithPath) => void;
  /** Controls whether Ctrl+K opens the palette (default: always enabled) */
  enabled?: Accessor<boolean>;
}

export function useLinkPalette(options: UseLinkPaletteOptions) {
  const [isOpen, setIsOpen] = createSignal(false);
  const open = () => setIsOpen(true);
  const enabled = options.enabled ?? (() => true);

  useKeybinding({ key: "k", ctrl: true }, () => {
    if (enabled()) open();
  });

  // ...
}
```

Usage — pass `enabled` to restrict the keybinding to the appropriate context:

```typescript
const linkPalette = useLinkPalette({
  onInsertLink: (text) => insertTextAtCursor(text),
  enabled: isEditing, // Ctrl+K only active when editing
});
```

**Don't** call `useKeybinding` separately in the component as well — that registers two listeners and fires the handler twice.

## Mocking in Tests

```typescript
vi.mock("~/lib/hooks/useCurrentNote", () => ({
  useCurrentNote: () => ({
    note: () => mockNoteData,
    noteId: "test-id",
  }),
}));
```
