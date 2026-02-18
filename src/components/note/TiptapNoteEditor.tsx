import {
  Show,
  createEffect,
  onCleanup,
  type JSXElement,
  type Accessor,
} from "solid-js";
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

import {
  createTiptapEditor,
  createEditorTransaction,
} from "solid-tiptap";

import type { NoteSyntax } from "~/lib/db/types";

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

const baseExtensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
  }),
  Highlight.configure({ multicolor: true }),
  Underline,
  Link.configure({ openOnClick: false }),
  Image,
  TaskList,
  TaskItem.configure({ nested: true }),
  TextAlign.configure({ types: ["heading", "paragraph"] }),
  Typography,
];

// Syntaxes where tiptap uses the Markdown extension for serialization/deserialization.
// Org-mode notes are converted to/from markdown by pandoc in the route before
// reaching this component, so they arrive here with syntax="md".
const MARKDOWN_SYNTAXES: NoteSyntax[] = ["md"];

function useMarkdownMode(syntax: NoteSyntax): boolean {
  return MARKDOWN_SYNTAXES.includes(syntax);
}

interface TiptapNoteEditorProps {
  content: string;
  syntax: NoteSyntax;
  onUpdate: (content: string) => void;
  placeholder?: string;
}

export default function TiptapNoteEditor(props: TiptapNoteEditorProps) {
  let editorRef!: HTMLDivElement;

  // Capture initial values once — reading these reactively inside
  // createTiptapEditor would recreate the editor (and lose focus) on every
  // keystroke because onUpdate -> updateNote -> props.content changes.
  const initialContent = props.content;
  const markdown = useMarkdownMode(props.syntax);

  const editor = createTiptapEditor(() => ({
    element: editorRef,
    extensions: [
      ...baseExtensions,
      Placeholder.configure({
        placeholder: props.placeholder || "Start writing...",
      }),
      ...(markdown ? [Markdown.configure({ indentation: { size: 4 } })] : []),
    ],
    content: initialContent,
    // Tell tiptap to parse input content as markdown when appropriate
    ...(markdown ? { contentType: "markdown" as any } : {}),
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose-base max-w-none focus:outline-none min-h-[300px] p-4",
      },
    },
    onUpdate: ({ editor: ed }) => {
      // Serialize back to the same format the note was stored in
      props.onUpdate(markdown ? ed.getMarkdown() : ed.getHTML());
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
