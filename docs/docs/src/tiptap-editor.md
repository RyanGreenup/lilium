# Tiptap WYSIWYG Editor

[Tiptap](https://tiptap.dev) is a headless, extensible rich-text editor built on ProseMirror. Because it ships no UI of its own, it pairs naturally with SolidJS and TailwindCSS/DaisyUI -- you own every pixel of the toolbar while Tiptap handles the document model, input rules, and serialization.

This guide walks through the full editor setup used in Lilium, from a bare `<div>` to a mobile-optimized Markdown editor with a floating selection toolbar.

**Source files:**

| File | Purpose |
|---|---|
| `src/routes/(app)/editor-demo.tsx` | Three-tab demo (HTML, Markdown, Mobile) |
| `src/components/note/TiptapNoteEditor.tsx` | Reusable editor component |

---

## Installation

Tiptap v3 ships as many small packages. Install the core, the SolidJS binding, and every extension you plan to use:

```bash
npm install @tiptap/core @tiptap/pm @tiptap/starter-kit solid-tiptap
```

**StarterKit** bundles the essentials (paragraphs, headings, lists, code blocks, bold/italic/strike, blockquote, horizontal rule, history). For anything beyond that, add individual extensions:

```bash
npm install \
  @tiptap/extension-placeholder \
  @tiptap/extension-highlight \
  @tiptap/extension-underline \
  @tiptap/extension-link \
  @tiptap/extension-image \
  @tiptap/extension-task-list \
  @tiptap/extension-task-item \
  @tiptap/extension-text-align \
  @tiptap/extension-typography \
  @tiptap/markdown
```

For icons the project uses [lucide-solid](https://lucide.dev) with per-icon tree-shakeable imports:

```typescript
import Bold from "lucide-solid/icons/bold";
import Italic from "lucide-solid/icons/italic";
```

---

## Basic Editor

Three things make a Tiptap editor work:

1. A `<div>` to mount into
2. An array of extensions
3. `createTiptapEditor` from `solid-tiptap`

```typescript
import { createTiptapEditor } from "solid-tiptap";
import StarterKit from "@tiptap/starter-kit";

function BasicEditor() {
  let editorRef!: HTMLDivElement;

  const editor = createTiptapEditor(() => ({
    element: editorRef,
    extensions: [StarterKit],
    content: "<p>Hello World</p>",
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[300px] p-4",
      },
    },
  }));

  return <div ref={editorRef} />;
}
```

`createTiptapEditor` returns an `Accessor<Editor | undefined>`. The accessor is `undefined` until the DOM element mounts and Tiptap finishes initialization -- always guard access with `editor()` or a `<Show>` block.

The `editorProps.attributes.class` property applies Tailwind classes directly to the contenteditable element. The `prose` classes from `@tailwindcss/typography` give sensible defaults to all rendered HTML elements.

---

## Extensions

Extensions add every capability beyond raw text input. They fall into three categories:

| Type | Examples | What they do |
|---|---|---|
| **Nodes** | Heading, Image, TaskList, TaskItem | Block-level or inline document elements |
| **Marks** | Bold, Italic, Underline, Highlight, Link | Inline formatting applied to text ranges |
| **Extensions** | StarterKit, Typography, TextAlign, Placeholder | Behavior, input rules, or plugin bundles |

### Configuring extensions

Most extensions accept a `.configure()` call:

```typescript
const baseExtensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
  }),
  Placeholder.configure({ placeholder: "Start writing..." }),
  Highlight.configure({ multicolor: true }),
  Underline,
  Link.configure({ openOnClick: false }),
  Image,
  TaskList,
  TaskItem.configure({ nested: true }),
  TextAlign.configure({ types: ["heading", "paragraph"] }),
  Typography,
];
```

Key points:

- **StarterKit** is a meta-extension. Pass an object to configure its child extensions (e.g., `heading: { levels: [1, 2, 3] }`) or set one to `false` to disable it entirely.
- **TextAlign** must declare which node types it operates on via `types`.
- **TaskItem** supports nesting when `nested: true`.
- **Link** with `openOnClick: false` prevents the editor from navigating away on click -- you can still open links from a tooltip or toolbar action.
- **Typography** converts ASCII sequences into typographic characters (`--` to `--`, `"` to smart quotes, etc.).
- Extensions without configuration (e.g., `Underline`, `Image`) pass directly as values, no `.configure()` needed.

---

## Toolbar

The toolbar is a plain SolidJS component that calls editor commands. Two patterns make it work:

### Command chaining

Every command uses the same fluent API:

```typescript
editor.chain().focus().toggleBold().run();
```

- `chain()` starts a command chain
- `focus()` returns focus to the editor (critical -- without it toolbar clicks steal focus)
- The action method (e.g., `toggleBold()`, `toggleHeading({ level: 2 })`, `setTextAlign("center")`)
- `run()` executes the chain

Common commands:

```typescript
// Marks
ed.chain().focus().toggleBold().run();
ed.chain().focus().toggleItalic().run();
ed.chain().focus().toggleUnderline().run();
ed.chain().focus().toggleStrike().run();
ed.chain().focus().toggleHighlight().run();
ed.chain().focus().toggleCode().run();

// Nodes
ed.chain().focus().toggleHeading({ level: 1 }).run();
ed.chain().focus().toggleBulletList().run();
ed.chain().focus().toggleOrderedList().run();
ed.chain().focus().toggleTaskList().run();
ed.chain().focus().toggleBlockquote().run();
ed.chain().focus().toggleCodeBlock().run();
ed.chain().focus().setHorizontalRule().run();
ed.chain().focus().setParagraph().run();

// Alignment
ed.chain().focus().setTextAlign("left").run();
ed.chain().focus().setTextAlign("center").run();
ed.chain().focus().setTextAlign("right").run();

// Insert
ed.chain().focus().setLink({ href: url }).run();
ed.chain().focus().setImage({ src: url }).run();

// History
ed.chain().focus().undo().run();
ed.chain().focus().redo().run();

// Clear
ed.chain().focus().clearNodes().unsetAllMarks().run();
```

### Reactive active states with `createEditorTransaction`

Toolbar buttons should visually reflect the current formatting. `createEditorTransaction` from `solid-tiptap` creates a reactive accessor that re-evaluates on every editor transaction (keystroke, selection change, command):

```typescript
import { createEditorTransaction } from "solid-tiptap";

function Toolbar(props: { editor: Editor }) {
  const ed = () => props.editor;

  const isActive = (name: string, attrs?: Record<string, any>) =>
    createEditorTransaction(
      ed,
      (e) => e?.isActive(name, attrs) ?? false,
    );

  return (
    <div class="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-base-300 bg-base-200">
      <TbBtn
        onClick={() => ed().chain().focus().toggleBold().run()}
        active={isActive("bold")}
        title="Bold (Ctrl+B)"
      >
        <Bold size={16} />
      </TbBtn>
      <TbBtn
        onClick={() => ed().chain().focus().toggleHeading({ level: 2 }).run()}
        active={isActive("heading", { level: 2 })}
        title="Heading 2"
      >
        <Heading2 size={16} />
      </TbBtn>
      {/* ... */}
    </div>
  );
}
```

`isActive` returns an `Accessor<boolean>`, so the button component needs to handle both accessors and plain booleans.

### Toolbar button component

```typescript
function TbBtn(props: {
  onClick: () => void;
  active?: Accessor<boolean> | boolean;
  title: string;
  children: JSXElement;
}) {
  const isActive = () =>
    typeof props.active === "function" ? props.active() : (props.active ?? false);

  return (
    <button
      class={`p-1.5 rounded transition-colors ${
        isActive()
          ? "bg-primary text-primary-content"
          : "hover:bg-base-300 text-base-content/70 hover:text-base-content"
      }`}
      onMouseDown={(e) => {
        e.preventDefault();
        props.onClick();
      }}
      title={props.title}
    >
      {props.children}
    </button>
  );
}
```

Use `onMouseDown` with `e.preventDefault()` instead of `onClick`. This prevents the browser from moving focus from the editor to the button, which would collapse the selection.

---

## HTML Output

`solid-tiptap` provides `useEditorHTML` -- a reactive accessor that updates whenever the document changes:

```typescript
import { useEditorHTML } from "solid-tiptap";

const editor = createTiptapEditor(() => ({ /* ... */ }));
const html = useEditorHTML(editor);

// In JSX:
<pre>{html()}</pre>
```

For an `onUpdate` callback pattern (e.g., to persist content), pass it directly in the editor config:

```typescript
const editor = createTiptapEditor(() => ({
  element: editorRef,
  extensions: baseExtensions,
  content: props.content,
  onUpdate: ({ editor: ed }) => {
    props.onUpdate(ed.getHTML());
  },
}));
```

---

## Markdown Integration

The `@tiptap/markdown` extension enables bidirectional Markdown conversion. Add it to the extensions array and set `contentType` to `"markdown"`:

```typescript
import { Markdown } from "@tiptap/markdown";

const editor = createTiptapEditor(() => ({
  element: editorRef,
  extensions: [...baseExtensions, Markdown],
  content: markdownString,
  contentType: "markdown" as any,
  editorProps: {
    attributes: {
      class: "prose prose-sm max-w-none focus:outline-none min-h-[300px] p-4",
    },
  },
}));
```

The `as any` cast on `contentType` works around a type definition gap in `solid-tiptap` -- the runtime supports it but the types don't declare it.

### Reading Markdown back

The Markdown extension adds a `getMarkdown()` method to the editor instance. Track it reactively with `createEffect`:

```typescript
const [markdownOutput, setMarkdownOutput] = createSignal("");

createEffect(() => {
  const ed = editor();
  if (!ed) return;

  const update = () => setMarkdownOutput(ed.getMarkdown());
  ed.on("update", update);
  update(); // initial value
  onCleanup(() => ed.off("update", update));
});
```

This pattern:
1. Waits for the editor to initialize
2. Registers an `update` event listener
3. Calls the handler immediately for the initial value
4. Cleans up the listener when the component unmounts

---

## Mobile-Optimized Editing

Mobile editors need two adaptations: larger touch targets and grouped toolbar controls to save horizontal space.

### Touch-friendly button

The minimum recommended touch target is 44x44px:

```typescript
function ToolBtn(props: {
  onClick: () => void;
  active?: boolean;
  label: string;
  children: JSXElement;
}) {
  return (
    <button
      class={`flex flex-col items-center justify-center min-w-[44px] min-h-[44px] rounded-lg transition-colors ${
        props.active
          ? "bg-primary text-primary-content"
          : "hover:bg-base-300 active:bg-base-300 text-base-content"
      }`}
      onClick={props.onClick}
      title={props.label}
    >
      {props.children}
      <span class="text-[10px] mt-0.5 leading-none">{props.label}</span>
    </button>
  );
}
```

### Grouped toolbar

Instead of showing every button at once, group related controls (headings, lists, alignment) behind sub-menus:

```typescript
function MobileToolbar(props: { editor: Editor }) {
  const [activeGroup, setActiveGroup] = createSignal<
    "main" | "heading" | "list" | "align"
  >("main");

  const ed = () => props.editor;

  return (
    <div class="border-t border-base-300 bg-base-200 safe-area-bottom">
      <Show when={activeGroup() !== "main"}>
        <div class="flex items-center gap-1 px-2 pt-1">
          <button
            class="btn btn-ghost btn-xs"
            onClick={() => setActiveGroup("main")}
          >
            Back
          </button>
          <span class="text-xs text-base-content/50 capitalize">
            {activeGroup()}
          </span>
        </div>
      </Show>

      <div class="flex items-center gap-0.5 px-2 py-2 overflow-x-auto">
        <Show when={activeGroup() === "main"}>
          {/* Inline formatting buttons */}
          <ToolBtn
            onClick={() => ed().chain().focus().toggleBold().run()}
            active={ed().isActive("bold")}
            label="Bold"
          >
            <Bold size={18} />
          </ToolBtn>
          {/* ... more inline buttons ... */}

          <div class="divider divider-horizontal mx-0.5 w-px" />

          {/* Group entry points */}
          <ToolBtn
            onClick={() => setActiveGroup("heading")}
            active={ed().isActive("heading")}
            label="Headings"
          >
            <Heading1 size={18} />
          </ToolBtn>
          <ToolBtn
            onClick={() => setActiveGroup("list")}
            active={
              ed().isActive("bulletList") ||
              ed().isActive("orderedList") ||
              ed().isActive("taskList")
            }
            label="Lists"
          >
            <List size={18} />
          </ToolBtn>
        </Show>

        <Show when={activeGroup() === "heading"}>
          <ToolBtn
            onClick={() => {
              ed().chain().focus().toggleHeading({ level: 1 }).run();
              setActiveGroup("main");
            }}
            active={ed().isActive("heading", { level: 1 })}
            label="H1"
          >
            <Heading1 size={18} />
          </ToolBtn>
          {/* H2, H3, Paragraph ... */}
        </Show>
        {/* Similar blocks for "list" and "align" groups */}
      </div>
    </div>
  );
}
```

The pattern: select a sub-action, apply it, then return to `"main"` automatically.

---

## Selection / Bubble Toolbar

A floating toolbar that appears over selected text provides quick formatting without scrolling to the top toolbar. This uses Tiptap's ProseMirror view API to position a fixed `<div>` at the selection coordinates.

```typescript
function SelectionToolbar(props: { editor: Editor }) {
  const [visible, setVisible] = createSignal(false);
  const [position, setPosition] = createSignal({ top: 0, left: 0 });

  createEffect(() => {
    const ed = props.editor;

    const onSelectionUpdate = () => {
      const { from, to } = ed.state.selection;
      if (from === to) {
        setVisible(false); // collapsed cursor, no selection
        return;
      }

      const view = ed.view;
      const start = view.coordsAtPos(from);
      const end = view.coordsAtPos(to);

      setPosition({
        top: start.top - 48,              // above the selection
        left: (start.left + end.right) / 2, // centered horizontally
      });
      setVisible(true);
    };

    ed.on("selectionUpdate", onSelectionUpdate);
    ed.on("blur", () => setVisible(false));
    onCleanup(() => ed.off("selectionUpdate", onSelectionUpdate));
  });

  return (
    <Show when={visible()}>
      <div
        class="fixed z-50 flex items-center gap-0.5 bg-neutral text-neutral-content rounded-lg shadow-lg px-1 py-0.5 -translate-x-1/2"
        style={{
          top: `${position().top}px`,
          left: `${position().left}px`,
        }}
      >
        <MiniBtn
          onClick={() => props.editor.chain().focus().toggleBold().run()}
          active={props.editor.isActive("bold")}
        >
          <Bold size={14} />
        </MiniBtn>
        <MiniBtn
          onClick={() => props.editor.chain().focus().toggleItalic().run()}
          active={props.editor.isActive("italic")}
        >
          <Italic size={14} />
        </MiniBtn>
        {/* ... more inline formatting buttons */}
      </div>
    </Show>
  );
}
```

Key details:

- `view.coordsAtPos(pos)` returns `{ top, bottom, left, right }` in viewport coordinates -- use `position: fixed` and the values directly.
- The `-translate-x-1/2` class centers the toolbar on the computed `left` value.
- The toolbar hides on `blur` so it doesn't linger when the editor loses focus.
- Use `onMouseDown` + `e.preventDefault()` on toolbar buttons (as shown in `MiniBtn`) to prevent the click from stealing focus and collapsing the selection.

### MiniBtn component

```typescript
function MiniBtn(props: {
  onClick: () => void;
  active?: boolean;
  children: JSXElement;
}) {
  return (
    <button
      class={`p-1.5 rounded ${
        props.active
          ? "bg-primary text-primary-content"
          : "hover:bg-neutral-focus"
      }`}
      onMouseDown={(e) => {
        e.preventDefault();
        props.onClick();
      }}
    >
      {props.children}
    </button>
  );
}
```

---

## Styling

### Tailwind Typography plugin

The `prose` class from `@tailwindcss/typography` provides sensible defaults for all rendered HTML:

```typescript
editorProps: {
  attributes: {
    class: "prose prose-sm sm:prose-base max-w-none focus:outline-none min-h-[300px] p-4",
  },
},
```

- `prose-sm` on mobile, `sm:prose-base` on larger screens
- `max-w-none` removes the default max-width so the editor fills its container
- `focus:outline-none` removes the contenteditable focus ring
- `min-h-[300px]` gives the editor a comfortable minimum height

### DaisyUI integration

Toolbar styling uses DaisyUI semantic colors (`bg-base-200`, `text-base-content`, `bg-primary`, `text-primary-content`) and components (`btn`, `divider`). This means the editor automatically adapts to any DaisyUI theme, including dark mode.

### Tiptap-specific styles

The Placeholder extension requires CSS to display its text. Add to your global stylesheet:

```css
.tiptap p.is-editor-empty:first-child::before {
  color: oklch(var(--bc) / 0.4);
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
}
```

---

## Reusable Component

The `TiptapNoteEditor` component (`src/components/note/TiptapNoteEditor.tsx`) wraps the editor setup for use across routes:

```typescript
interface TiptapNoteEditorProps {
  content: string;
  onUpdate: (html: string) => void;
  placeholder?: string;
}

export default function TiptapNoteEditor(props: TiptapNoteEditorProps) {
  let editorRef!: HTMLDivElement;

  const editor = createTiptapEditor(() => ({
    element: editorRef,
    extensions: [
      ...baseExtensions,
      Placeholder.configure({
        placeholder: props.placeholder || "Start writing...",
      }),
    ],
    content: props.content,
    editorProps: {
      attributes: {
        class: "prose prose-sm sm:prose-base max-w-none focus:outline-none min-h-[300px] p-4",
      },
    },
    onUpdate: ({ editor: ed }) => {
      props.onUpdate(ed.getHTML());
    },
  }));

  return (
    <div class="flex-1 flex flex-col min-h-0">
      <Show when={editor()}>
        {(ed) => <Toolbar editor={ed()} />}
      </Show>
      <div class="flex-1 min-h-0 overflow-auto bg-base-100">
        <div ref={editorRef} />
      </div>
    </div>
  );
}
```

Usage:

```tsx
<TiptapNoteEditor
  content={note().body}
  onUpdate={(html) => saveNote(html)}
  placeholder="Write your note..."
/>
```

---

## Dependency versions

All `@tiptap/*` packages: `^3.19.0`
SolidJS binding: `solid-tiptap@^0.8.0`
