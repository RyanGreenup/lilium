import { RouteDefinition, createAsync } from "@solidjs/router";
import {
  Show,
  For,
  createSignal,
  createEffect,
  onCleanup,
  type JSXElement,
  type Accessor,
} from "solid-js";
import { getUser } from "~/lib/auth";

// Tiptap
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "@tiptap/markdown";
import Placeholder from "@tiptap/extension-placeholder";
import Highlight from "@tiptap/extension-highlight";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import TextAlign from "@tiptap/extension-text-align";
import Typography from "@tiptap/extension-typography";

// solid-tiptap
import {
  createTiptapEditor,
  createEditorTransaction,
  useEditorHTML,
} from "solid-tiptap";

// Icons
import Bold from "lucide-solid/icons/bold";
import Italic from "lucide-solid/icons/italic";
import UnderlineIcon from "lucide-solid/icons/underline";
import Strikethrough from "lucide-solid/icons/strikethrough";
import HighlighterIcon from "lucide-solid/icons/highlighter";
import Code from "lucide-solid/icons/code";
import Heading1 from "lucide-solid/icons/heading-1";
import Heading2 from "lucide-solid/icons/heading-2";
import Heading3 from "lucide-solid/icons/heading-3";
import List from "lucide-solid/icons/list";
import ListOrdered from "lucide-solid/icons/list-ordered";
import ListTodo from "lucide-solid/icons/list-todo";
import Quote from "lucide-solid/icons/quote";
import CodeSquare from "lucide-solid/icons/square-code";
import Undo from "lucide-solid/icons/undo-2";
import Redo from "lucide-solid/icons/redo-2";
import AlignLeft from "lucide-solid/icons/align-left";
import AlignCenter from "lucide-solid/icons/align-center";
import AlignRight from "lucide-solid/icons/align-right";
import LinkIcon from "lucide-solid/icons/link";
import ImageIcon from "lucide-solid/icons/image";
import RemoveFormatting from "lucide-solid/icons/remove-formatting";
import Minus from "lucide-solid/icons/minus";
import Pilcrow from "lucide-solid/icons/pilcrow";
import Eye from "lucide-solid/icons/eye";
import EyeOff from "lucide-solid/icons/eye-off";

export const route = {
  preload() {
    getUser();
  },
} satisfies RouteDefinition;

// ─── Shared extensions ───────────────────────────────────────────────

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

const sampleHTML = `
<h1>Welcome to the Tiptap Editor Demo</h1>
<p>This is a <strong>rich text editor</strong> built with <a href="https://tiptap.dev">Tiptap</a> and <em>SolidJS</em>.</p>
<h2>Features</h2>
<ul>
  <li>Bold, italic, underline, strikethrough</li>
  <li><mark>Highlighted text</mark></li>
  <li>Links and images</li>
  <li>Code blocks and inline code</li>
</ul>
<h3>Task List</h3>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="true">Install Tiptap</li>
  <li data-type="taskItem" data-checked="true">Configure extensions</li>
  <li data-type="taskItem" data-checked="false">Build something amazing</li>
</ul>
<blockquote><p>Tiptap is a headless editor framework for the web.</p></blockquote>
<pre><code class="language-typescript">const editor = new Editor({
  extensions: [StarterKit],
  content: '&lt;p&gt;Hello World&lt;/p&gt;',
});</code></pre>
<p>Try editing this content!</p>
`.trim();

const sampleMarkdown = `# Markdown Editor Demo

This editor works with **Markdown** natively. Content is stored and retrieved as Markdown.

## Features

- Parse Markdown into rich text
- Serialize rich text back to Markdown
- Supports **bold**, *italic*, ~~strikethrough~~, and \`inline code\`

### Task List

- [x] Markdown parsing
- [x] Markdown serialization
- [ ] Custom extensions

> Markdown is a lightweight markup language for creating formatted text.

\`\`\`javascript
const markdown = editor.getMarkdown();
console.log(markdown);
\`\`\`

Try editing and watch the Markdown output update in real-time!
`;

// ─── Tab types ───────────────────────────────────────────────────────

type EditorTab = "html" | "markdown" | "mobile";

// ─── Main Route ──────────────────────────────────────────────────────

export default function EditorDemo() {
  createAsync(() => getUser(), { deferStream: true });

  const [activeTab, setActiveTab] = createSignal<EditorTab>("html");

  const tabs: { id: EditorTab; label: string; description: string }[] = [
    { id: "html", label: "HTML Editor", description: "Full toolbar, HTML output" },
    { id: "markdown", label: "Markdown Editor", description: "Markdown in/out" },
    { id: "mobile", label: "Mobile Editor", description: "Touch-optimized" },
  ];

  return (
    <div class="flex flex-col h-full">
      {/* Tab bar */}
      <div class="bg-base-200 border-b border-base-300 px-4 pt-3">
        <div role="tablist" class="tabs tabs-bordered">
          <For each={tabs}>
            {(tab) => (
              <button
                role="tab"
                class={`tab ${activeTab() === tab.id ? "tab-active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span class="font-medium">{tab.label}</span>
                <span class="hidden sm:inline text-xs text-base-content/50 ml-2">
                  {tab.description}
                </span>
              </button>
            )}
          </For>
        </div>
      </div>

      {/* Editor panels */}
      <div class="flex-1 min-h-0 overflow-hidden">
        <Show when={activeTab() === "html"}>
          <HTMLEditor />
        </Show>
        <Show when={activeTab() === "markdown"}>
          <MarkdownEditor />
        </Show>
        <Show when={activeTab() === "mobile"}>
          <MobileEditor />
        </Show>
      </div>
    </div>
  );
}

// ─── HTML Editor ─────────────────────────────────────────────────────

function HTMLEditor() {
  let editorRef!: HTMLDivElement;

  const editor = createTiptapEditor(() => ({
    element: editorRef,
    extensions: baseExtensions,
    content: sampleHTML,
    editorProps: {
      attributes: {
        class: "prose prose-sm sm:prose-base max-w-none focus:outline-none min-h-[300px] p-4",
      },
    },
  }));

  const html = useEditorHTML(editor);
  const [showOutput, setShowOutput] = createSignal(false);

  return (
    <div class="flex flex-col h-full">
      <Show when={editor()}>
        {(ed) => <Toolbar editor={ed()} />}
      </Show>

      <div class="flex-1 min-h-0 overflow-auto bg-base-100">
        <div ref={editorRef} />
      </div>

      {/* Output toggle */}
      <div class="border-t border-base-300 bg-base-200">
        <button
          class="btn btn-ghost btn-sm gap-2 m-2"
          onClick={() => setShowOutput(!showOutput())}
        >
          {showOutput() ? <EyeOff size={14} /> : <Eye size={14} />}
          {showOutput() ? "Hide" : "Show"} HTML Output
        </button>
        <Show when={showOutput()}>
          <div class="px-4 pb-4">
            <pre class="bg-base-300 rounded-lg p-3 text-xs overflow-auto max-h-48 font-mono whitespace-pre-wrap">
              {html()}
            </pre>
          </div>
        </Show>
      </div>
    </div>
  );
}

// ─── Markdown Editor ─────────────────────────────────────────────────

function MarkdownEditor() {
  let editorRef!: HTMLDivElement;

  const editor = createTiptapEditor(() => ({
    element: editorRef,
    extensions: [...baseExtensions, Markdown],
    content: sampleMarkdown,
    contentType: "markdown" as any,
    editorProps: {
      attributes: {
        class: "prose prose-sm sm:prose-base max-w-none focus:outline-none min-h-[300px] p-4",
      },
    },
  }));

  const [markdownOutput, setMarkdownOutput] = createSignal("");
  const [showOutput, setShowOutput] = createSignal(false);

  // Reactively get markdown output
  createEffect(() => {
    const ed = editor();
    if (!ed) return;

    const update = () => {
      setMarkdownOutput(ed.getMarkdown());
    };

    ed.on("update", update);
    // Initial
    update();

    onCleanup(() => ed.off("update", update));
  });

  return (
    <div class="flex flex-col h-full">
      <Show when={editor()}>
        {(ed) => <Toolbar editor={ed()} />}
      </Show>

      <div class="flex-1 min-h-0 overflow-auto bg-base-100">
        <div ref={editorRef} />
      </div>

      {/* Markdown output */}
      <div class="border-t border-base-300 bg-base-200">
        <button
          class="btn btn-ghost btn-sm gap-2 m-2"
          onClick={() => setShowOutput(!showOutput())}
        >
          {showOutput() ? <EyeOff size={14} /> : <Eye size={14} />}
          {showOutput() ? "Hide" : "Show"} Markdown Output
        </button>
        <Show when={showOutput()}>
          <div class="px-4 pb-4">
            <pre class="bg-base-300 rounded-lg p-3 text-xs overflow-auto max-h-48 font-mono whitespace-pre-wrap">
              {markdownOutput()}
            </pre>
          </div>
        </Show>
      </div>
    </div>
  );
}

// ─── Mobile Editor ───────────────────────────────────────────────────

function MobileEditor() {
  let editorRef!: HTMLDivElement;

  const editor = createTiptapEditor(() => ({
    element: editorRef,
    extensions: [
      ...baseExtensions,
      Markdown,
    ],
    content: sampleMarkdown,
    contentType: "markdown" as any,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none min-h-[200px] p-4",
      },
    },
  }));

  const [showOutput, setShowOutput] = createSignal(false);
  const [markdownOutput, setMarkdownOutput] = createSignal("");

  createEffect(() => {
    const ed = editor();
    if (!ed) return;

    const update = () => setMarkdownOutput(ed.getMarkdown());
    ed.on("update", update);
    update();
    onCleanup(() => ed.off("update", update));
  });

  return (
    <div class="flex flex-col h-full max-w-lg mx-auto bg-base-100 border-x border-base-300">
      {/* Mobile header */}
      <div class="flex items-center justify-between px-3 py-2 border-b border-base-300 bg-base-200">
        <span class="text-sm font-semibold">Mobile Editor</span>
        <button
          class="btn btn-ghost btn-xs gap-1"
          onClick={() => setShowOutput(!showOutput())}
        >
          {showOutput() ? <EyeOff size={12} /> : <Eye size={12} />}
          {showOutput() ? "Editor" : "Preview"}
        </button>
      </div>

      {/* Content area */}
      <div class="flex-1 min-h-0 overflow-auto">
        <Show
          when={!showOutput()}
          fallback={
            <pre class="p-4 text-xs font-mono whitespace-pre-wrap text-base-content/80">
              {markdownOutput()}
            </pre>
          }
        >
          <div ref={editorRef} />
        </Show>
      </div>

      {/* Bubble-style selection toolbar */}
      <Show when={editor()}>
        {(ed) => <SelectionToolbar editor={ed()} />}
      </Show>

      {/* Bottom mobile toolbar */}
      <Show when={editor() && !showOutput()}>
        {(_) => <MobileToolbar editor={editor()!} />}
      </Show>
    </div>
  );
}

// ─── Selection Toolbar (appears on text selection, for mobile) ───────

function SelectionToolbar(props: { editor: Editor }) {
  const [visible, setVisible] = createSignal(false);
  const [position, setPosition] = createSignal({ top: 0, left: 0 });

  createEffect(() => {
    const ed = props.editor;

    const onSelectionUpdate = () => {
      const { from, to } = ed.state.selection;
      if (from === to) {
        setVisible(false);
        return;
      }

      // Get position from the DOM
      const view = ed.view;
      const start = view.coordsAtPos(from);
      const end = view.coordsAtPos(to);

      // Position above selection
      setPosition({
        top: start.top - 48,
        left: (start.left + end.right) / 2,
      });
      setVisible(true);
    };

    ed.on("selectionUpdate", onSelectionUpdate);
    ed.on("blur", () => setVisible(false));

    onCleanup(() => {
      ed.off("selectionUpdate", onSelectionUpdate);
    });
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
        <MiniBtn
          onClick={() => props.editor.chain().focus().toggleUnderline().run()}
          active={props.editor.isActive("underline")}
        >
          <UnderlineIcon size={14} />
        </MiniBtn>
        <MiniBtn
          onClick={() => props.editor.chain().focus().toggleHighlight().run()}
          active={props.editor.isActive("highlight")}
        >
          <HighlighterIcon size={14} />
        </MiniBtn>
        <MiniBtn
          onClick={() => props.editor.chain().focus().toggleCode().run()}
          active={props.editor.isActive("code")}
        >
          <Code size={14} />
        </MiniBtn>
      </div>
    </Show>
  );
}

function MiniBtn(props: {
  onClick: () => void;
  active?: boolean;
  children: JSXElement;
}) {
  return (
    <button
      class={`p-1.5 rounded ${props.active ? "bg-primary text-primary-content" : "hover:bg-neutral-focus"}`}
      onMouseDown={(e) => {
        e.preventDefault();
        props.onClick();
      }}
    >
      {props.children}
    </button>
  );
}

// ─── Mobile Bottom Toolbar ───────────────────────────────────────────

function MobileToolbar(props: { editor: Editor }) {
  const [activeGroup, setActiveGroup] = createSignal<
    "main" | "heading" | "list" | "align"
  >("main");

  const ed = () => props.editor;

  return (
    <div class="border-t border-base-300 bg-base-200 safe-area-bottom">
      {/* Group selector */}
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
          <ToolBtn
            onClick={() => ed().chain().focus().toggleBold().run()}
            active={ed().isActive("bold")}
            label="Bold"
          >
            <Bold size={18} />
          </ToolBtn>
          <ToolBtn
            onClick={() => ed().chain().focus().toggleItalic().run()}
            active={ed().isActive("italic")}
            label="Italic"
          >
            <Italic size={18} />
          </ToolBtn>
          <ToolBtn
            onClick={() => ed().chain().focus().toggleUnderline().run()}
            active={ed().isActive("underline")}
            label="Underline"
          >
            <UnderlineIcon size={18} />
          </ToolBtn>
          <ToolBtn
            onClick={() => ed().chain().focus().toggleStrike().run()}
            active={ed().isActive("strike")}
            label="Strikethrough"
          >
            <Strikethrough size={18} />
          </ToolBtn>

          <div class="divider divider-horizontal mx-0.5 w-px" />

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
          <ToolBtn
            onClick={() => setActiveGroup("align")}
            label="Align"
          >
            <AlignLeft size={18} />
          </ToolBtn>

          <div class="divider divider-horizontal mx-0.5 w-px" />

          <ToolBtn
            onClick={() => ed().chain().focus().toggleBlockquote().run()}
            active={ed().isActive("blockquote")}
            label="Quote"
          >
            <Quote size={18} />
          </ToolBtn>
          <ToolBtn
            onClick={() => ed().chain().focus().toggleCodeBlock().run()}
            active={ed().isActive("codeBlock")}
            label="Code Block"
          >
            <CodeSquare size={18} />
          </ToolBtn>
          <ToolBtn
            onClick={() => ed().chain().focus().setHorizontalRule().run()}
            label="Divider"
          >
            <Minus size={18} />
          </ToolBtn>

          <div class="divider divider-horizontal mx-0.5 w-px" />

          <ToolBtn
            onClick={() => ed().chain().focus().undo().run()}
            label="Undo"
          >
            <Undo size={18} />
          </ToolBtn>
          <ToolBtn
            onClick={() => ed().chain().focus().redo().run()}
            label="Redo"
          >
            <Redo size={18} />
          </ToolBtn>
        </Show>

        <Show when={activeGroup() === "heading"}>
          <ToolBtn
            onClick={() => {
              ed().chain().focus().setParagraph().run();
              setActiveGroup("main");
            }}
            active={ed().isActive("paragraph")}
            label="Paragraph"
          >
            <Pilcrow size={18} />
          </ToolBtn>
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
          <ToolBtn
            onClick={() => {
              ed().chain().focus().toggleHeading({ level: 2 }).run();
              setActiveGroup("main");
            }}
            active={ed().isActive("heading", { level: 2 })}
            label="H2"
          >
            <Heading2 size={18} />
          </ToolBtn>
          <ToolBtn
            onClick={() => {
              ed().chain().focus().toggleHeading({ level: 3 }).run();
              setActiveGroup("main");
            }}
            active={ed().isActive("heading", { level: 3 })}
            label="H3"
          >
            <Heading3 size={18} />
          </ToolBtn>
        </Show>

        <Show when={activeGroup() === "list"}>
          <ToolBtn
            onClick={() => {
              ed().chain().focus().toggleBulletList().run();
              setActiveGroup("main");
            }}
            active={ed().isActive("bulletList")}
            label="Bullet List"
          >
            <List size={18} />
          </ToolBtn>
          <ToolBtn
            onClick={() => {
              ed().chain().focus().toggleOrderedList().run();
              setActiveGroup("main");
            }}
            active={ed().isActive("orderedList")}
            label="Ordered List"
          >
            <ListOrdered size={18} />
          </ToolBtn>
          <ToolBtn
            onClick={() => {
              ed().chain().focus().toggleTaskList().run();
              setActiveGroup("main");
            }}
            active={ed().isActive("taskList")}
            label="Task List"
          >
            <ListTodo size={18} />
          </ToolBtn>
        </Show>

        <Show when={activeGroup() === "align"}>
          <ToolBtn
            onClick={() => {
              ed().chain().focus().setTextAlign("left").run();
              setActiveGroup("main");
            }}
            active={ed().isActive({ textAlign: "left" })}
            label="Left"
          >
            <AlignLeft size={18} />
          </ToolBtn>
          <ToolBtn
            onClick={() => {
              ed().chain().focus().setTextAlign("center").run();
              setActiveGroup("main");
            }}
            active={ed().isActive({ textAlign: "center" })}
            label="Center"
          >
            <AlignCenter size={18} />
          </ToolBtn>
          <ToolBtn
            onClick={() => {
              ed().chain().focus().setTextAlign("right").run();
              setActiveGroup("main");
            }}
            active={ed().isActive({ textAlign: "right" })}
            label="Right"
          >
            <AlignRight size={18} />
          </ToolBtn>
        </Show>
      </div>
    </div>
  );
}

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

// ─── Desktop Toolbar ─────────────────────────────────────────────────

function Toolbar(props: { editor: Editor }) {
  const ed = () => props.editor;

  const isActive = (name: string, attrs?: Record<string, any>) =>
    createEditorTransaction(
      ed,
      (e) => e?.isActive(name, attrs) ?? false,
    );

  const addLink = () => {
    const url = window.prompt("Enter URL:");
    if (url) {
      ed().chain().focus().setLink({ href: url }).run();
    }
  };

  const addImage = () => {
    const url = window.prompt("Enter image URL:");
    if (url) {
      ed().chain().focus().setImage({ src: url }).run();
    }
  };

  return (
    <div class="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-base-300 bg-base-200">
      {/* Text formatting */}
      <TbBtn
        onClick={() => ed().chain().focus().toggleBold().run()}
        active={isActive("bold")}
        title="Bold (Ctrl+B)"
      >
        <Bold size={16} />
      </TbBtn>
      <TbBtn
        onClick={() => ed().chain().focus().toggleItalic().run()}
        active={isActive("italic")}
        title="Italic (Ctrl+I)"
      >
        <Italic size={16} />
      </TbBtn>
      <TbBtn
        onClick={() => ed().chain().focus().toggleUnderline().run()}
        active={isActive("underline")}
        title="Underline (Ctrl+U)"
      >
        <UnderlineIcon size={16} />
      </TbBtn>
      <TbBtn
        onClick={() => ed().chain().focus().toggleStrike().run()}
        active={isActive("strike")}
        title="Strikethrough"
      >
        <Strikethrough size={16} />
      </TbBtn>
      <TbBtn
        onClick={() => ed().chain().focus().toggleHighlight().run()}
        active={isActive("highlight")}
        title="Highlight"
      >
        <HighlighterIcon size={16} />
      </TbBtn>
      <TbBtn
        onClick={() => ed().chain().focus().toggleCode().run()}
        active={isActive("code")}
        title="Inline Code"
      >
        <Code size={16} />
      </TbBtn>

      <div class="divider divider-horizontal mx-0.5 w-px h-6" />

      {/* Headings */}
      <TbBtn
        onClick={() => ed().chain().focus().toggleHeading({ level: 1 }).run()}
        active={isActive("heading", { level: 1 })}
        title="Heading 1"
      >
        <Heading1 size={16} />
      </TbBtn>
      <TbBtn
        onClick={() => ed().chain().focus().toggleHeading({ level: 2 }).run()}
        active={isActive("heading", { level: 2 })}
        title="Heading 2"
      >
        <Heading2 size={16} />
      </TbBtn>
      <TbBtn
        onClick={() => ed().chain().focus().toggleHeading({ level: 3 }).run()}
        active={isActive("heading", { level: 3 })}
        title="Heading 3"
      >
        <Heading3 size={16} />
      </TbBtn>

      <div class="divider divider-horizontal mx-0.5 w-px h-6" />

      {/* Lists */}
      <TbBtn
        onClick={() => ed().chain().focus().toggleBulletList().run()}
        active={isActive("bulletList")}
        title="Bullet List"
      >
        <List size={16} />
      </TbBtn>
      <TbBtn
        onClick={() => ed().chain().focus().toggleOrderedList().run()}
        active={isActive("orderedList")}
        title="Ordered List"
      >
        <ListOrdered size={16} />
      </TbBtn>
      <TbBtn
        onClick={() => ed().chain().focus().toggleTaskList().run()}
        active={isActive("taskList")}
        title="Task List"
      >
        <ListTodo size={16} />
      </TbBtn>

      <div class="divider divider-horizontal mx-0.5 w-px h-6" />

      {/* Block elements */}
      <TbBtn
        onClick={() => ed().chain().focus().toggleBlockquote().run()}
        active={isActive("blockquote")}
        title="Blockquote"
      >
        <Quote size={16} />
      </TbBtn>
      <TbBtn
        onClick={() => ed().chain().focus().toggleCodeBlock().run()}
        active={isActive("codeBlock")}
        title="Code Block"
      >
        <CodeSquare size={16} />
      </TbBtn>
      <TbBtn
        onClick={() => ed().chain().focus().setHorizontalRule().run()}
        title="Horizontal Rule"
      >
        <Minus size={16} />
      </TbBtn>

      <div class="divider divider-horizontal mx-0.5 w-px h-6" />

      {/* Alignment */}
      <TbBtn
        onClick={() => ed().chain().focus().setTextAlign("left").run()}
        active={isActive("paragraph", { textAlign: "left" })}
        title="Align Left"
      >
        <AlignLeft size={16} />
      </TbBtn>
      <TbBtn
        onClick={() => ed().chain().focus().setTextAlign("center").run()}
        active={isActive("paragraph", { textAlign: "center" })}
        title="Align Center"
      >
        <AlignCenter size={16} />
      </TbBtn>
      <TbBtn
        onClick={() => ed().chain().focus().setTextAlign("right").run()}
        active={isActive("paragraph", { textAlign: "right" })}
        title="Align Right"
      >
        <AlignRight size={16} />
      </TbBtn>

      <div class="divider divider-horizontal mx-0.5 w-px h-6" />

      {/* Insert */}
      <TbBtn onClick={addLink} title="Insert Link">
        <LinkIcon size={16} />
      </TbBtn>
      <TbBtn onClick={addImage} title="Insert Image">
        <ImageIcon size={16} />
      </TbBtn>

      <div class="divider divider-horizontal mx-0.5 w-px h-6" />

      {/* Undo/Redo */}
      <TbBtn
        onClick={() => ed().chain().focus().undo().run()}
        title="Undo (Ctrl+Z)"
      >
        <Undo size={16} />
      </TbBtn>
      <TbBtn
        onClick={() => ed().chain().focus().redo().run()}
        title="Redo (Ctrl+Shift+Z)"
      >
        <Redo size={16} />
      </TbBtn>

      {/* Clear formatting */}
      <TbBtn
        onClick={() =>
          ed().chain().focus().clearNodes().unsetAllMarks().run()
        }
        title="Clear Formatting"
      >
        <RemoveFormatting size={16} />
      </TbBtn>
    </div>
  );
}

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
