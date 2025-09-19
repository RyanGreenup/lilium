# Custom Hooks in Lilium

This document outlines the conventions and patterns for creating and using custom hooks in the Lilium notes application.

## Overview

Custom hooks in Lilium follow SolidJS patterns and are used to encapsulate reusable stateful logic, especially for data fetching and common application state management.

## Directory Structure

```
src/
├── lib/
│   └── hooks/
│       ├── useCurrentNote.ts
│       └── ...other hooks
```

All custom hooks are placed in `src/lib/hooks/` and follow the naming convention `useXxx.ts`.

## Hook Patterns

### 1. Data Fetching Hooks

Data fetching hooks combine route/search parameter parsing with server-side data fetching using `createAsync`.

#### Example: `useCurrentNote`

```typescript
import { createAsync, useParams, useSearchParams } from "@solidjs/router";

// Server function to get note by ID
const getNoteById = async (noteId: string) => {
  "use server";
  const { getNoteById: dbGetNoteById } = await import("~/lib/db");
  return await dbGetNoteById(noteId);
};

export function useCurrentNote() {
  const params = useParams();
  const [searchParams] = useSearchParams();

  // Handle both route params and search params
  const rawId = params.id || searchParams.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  // Reactive data fetching
  const note = createAsync(async () => {
    if (!id) return null;
    try {
      return await getNoteById(id);
    } catch (error) {
      console.error("Failed to fetch note:", error);
      return null;
    }
  });

  return {
    note,
    noteId: id,
  };
}
```

### Key Principles

#### 1. Server Function Co-location

Server functions are defined within the hook file to keep related logic together:

```typescript
// ✅ Good: Server function in same file as hook
const getDataById = async (id: string) => {
  "use server";
  const { getDataById: dbGetData } = await import("~/lib/db");
  return await dbGetData(id);
};

export function useData() {
  // Hook implementation
}
```

#### 2. Parameter Handling

Always handle both route parameters and search parameters, with route parameters taking precedence:

```typescript
const rawId = params.id || searchParams.id;
const id = Array.isArray(rawId) ? rawId[0] : rawId;
```

This ensures the hook works whether the ID comes from:
- Route parameters: `/note/:id`
- Search parameters: `?id=123`

#### 3. Reactive Data Fetching

Use `createAsync` for reactive data fetching that responds to parameter changes:

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

#### 4. Error Handling

Always include proper error handling with console logging for debugging:

```typescript
try {
  return await fetchData(id);
} catch (error) {
  console.error("Failed to fetch data:", error);
  return null;
}
```

#### 5. Return Object Structure

Return an object with descriptive property names:

```typescript
return {
  data,           // The fetched data
  dataId: id,     // The ID being used
  isLoading: !data(), // Optional: loading state
};
```

## Usage in Components

### Basic Usage

```typescript
import { useCurrentNote } from "~/lib/hooks/useCurrentNote";

export default function MyComponent() {
  const { note, noteId } = useCurrentNote();

  return (
    <div>
      <Show when={note()} fallback={<div>Loading...</div>}>
        {(noteData) => (
          <h1>{noteData().title}</h1>
        )}
      </Show>
    </div>
  );
}
```

### Conditional Rendering

Use SolidJS `Show` component for conditional rendering based on data availability:

```typescript
<Show when={note()} fallback="Loading...">
  {(noteData) => (
    <div>{noteData().title}</div>
  )}
</Show>
```

### Accessing Data Properties

When using `Show`, the callback provides a typed accessor function:

```typescript
<Show when={note()}>
  {(noteData) => (
    <div>
      <h1>{noteData().title}</h1>
      <p>{noteData().abstract}</p>
    </div>
  )}
</Show>
```

## Benefits of This Approach

### 1. Reusability

The same hook can be used across multiple components:

```typescript
// In NotesTab.tsx
const { note, noteId } = useCurrentNote();

// In NoteBreadcrumb.tsx  
const { note, noteId } = useCurrentNote();

// In NoteEditor.tsx
const { note, noteId } = useCurrentNote();
```

### 2. Consistency

All components using the hook get the same behavior for:
- Parameter parsing logic
- Error handling
- Loading states
- Data fetching patterns

### 3. Maintainability

Changes to data fetching logic only need to be made in one place. For example, if we need to add caching or change the parameter parsing logic, we only update the hook.

### 4. Type Safety

Hooks provide proper TypeScript types for the returned data, ensuring type safety across components.

### 5. Reactivity

The hook automatically re-fetches data when route parameters change, ensuring components stay in sync with navigation.

## Testing Hooks

When testing components that use custom hooks, you can mock the hook:

```typescript
// In tests
vi.mock("~/lib/hooks/useCurrentNote", () => ({
  useCurrentNote: () => ({
    note: () => mockNoteData,
    noteId: "test-id"
  })
}));
```

## Best Practices

### 1. Single Responsibility

Each hook should have a single, clear responsibility. Don't combine unrelated logic in one hook.

### 2. Naming Convention

- Use the `useXxx` naming convention
- Be descriptive: `useCurrentNote` not `useNote`
- Indicate the data being managed: `useUserProfile`, `useNotesList`

### 3. Documentation

Include JSDoc comments explaining the hook's purpose and return values:

```typescript
/**
 * Hook to get the current note based on route params or search params
 * @returns Object containing the note data and note ID
 */
export function useCurrentNote() {
  // Implementation
}
```

### 4. Graceful Degradation

Always handle cases where data might not be available:

```typescript
const data = createAsync(async () => {
  if (!id) return null; // Handle missing ID
  // Handle fetch errors
  // Return sensible defaults
});
```

### 5. Performance Considerations

- Use `createAsync` for reactive data that should update with navigation
- Consider memoization for expensive computations
- Avoid unnecessary re-renders by structuring return objects carefully

## Common Patterns

### Multi-Parameter Hooks

For hooks that need multiple parameters:

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

### Derived State

For hooks that derive state from other hooks:

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

This approach creates a maintainable, type-safe, and reusable system for managing application state and data fetching in Lilium.