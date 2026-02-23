import { createAsync, useParams } from "@solidjs/router";
import { createSignal, createEffect, on, onCleanup, Show, For, Suspense, Accessor, Component } from "solid-js";
import Popover from "corvu/popover";
import { useCurrentNote, useNoteById } from "~/lib/hooks/useCurrentNote";
import NoteContentPreview from "~/components/note/NoteContentPreview";
import TiptapNoteEditor from "~/components/note/TiptapNoteEditor";
import { updateNoteQuery } from "~/lib/db/notes/update";
import { SYNTAX_OPTIONS, type Note, type NoteSyntax } from "~/lib/db/types";
import {
  convertOrgToMarkdownQuery,
  convertMarkdownToOrgQuery,
} from "~/lib/pandoc";
import Save from "lucide-solid/icons/save";
import Eye from "lucide-solid/icons/eye";
import NotebookPen from "lucide-solid/icons/notebook-pen";
import Upload from "lucide-solid/icons/upload";
import Link from "lucide-solid/icons/link";
import Type from "lucide-solid/icons/type";
import PenTool from "lucide-solid/icons/pen-tool";
import Code from "lucide-solid/icons/code";
import EllipsisVertical from "lucide-solid/icons/ellipsis-vertical";

import { SingleCombobox } from "~/solid-daisy-components/components/Combobox/SingleCombobox";
import { Textarea } from "~/solid-daisy-components/components/Textarea";
import { Input } from "~/solid-daisy-components/components/Input";
import { useKeybinding } from "~/solid-daisy-components/utilities/useKeybinding";
import NoteBreadcrumbs from "~/components/NoteBreadcrumbs";
import CodeMirrorEditor from "~/components/CodeMirrorEditor";
import { getNotePathQuery } from "~/lib/db/notes/path";
import { LinkPalette, useLinkPalette } from "~/components/palette";
import { createProtectedRoute } from "~/lib/auth";
import { useStatusBar } from "~/context/StatusBarContext";
import { useAppSettings } from "~/context/AppSettingsContext";

const HTML_SANITIZING = false;

const uploadMarkup = (mimeType: string, url: string, name: string): string => {
  if (mimeType.startsWith("image/")) {
    return [
      `<div class="markdown-thumb-right">`,
      `  <img src="${url}" alt="${name}">`,
      `  <div class="thumb-caption">`,
      `    <p>${name}</p>`,
      `  </div>`,
      `</div>`,
    ].join("\n");
  }
  if (mimeType.startsWith("video/")) {
    return [
      `<video controls style="width: 10rem">`,
      `  <source src="${url}" type="${mimeType}">`,
      `  Your browser does not support the video tag.`,
      `</video>`,
    ].join("\n");
  }
  return `[${name}](${url})`;
};

interface NoteEditorProps {
  noteId?: string | null;
}

export default function NoteEditor(props: NoteEditorProps = {}) {
    createProtectedRoute();
  // Use useNoteById directly when given a fixed ID, otherwise use route-aware useCurrentNote
  const { note, noteId, noteExists, noteLoaded } = props.noteId
    ? useNoteById(() => props.noteId)
    : useCurrentNote();

  // Fetch note path reactively
  const notePath = createAsync(() => {
    const id = noteId();
    return id ? getNotePathQuery(id) : Promise.resolve(null);
  });

  const [isEditing, setIsEditing] = createSignal(false);
  const [unsavedChanges, setUnsavedChanges] = createSignal(false);
  const [localNote, setLocalNote] = createSignal<Note | null>(null);
  const [uploading, setUploading] = createSignal(false);
  const [editorMode, setEditorMode] = createSignal<"plain" | "tiptap" | "codemirror">("plain");

  // Org-mode pandoc conversion state: tiptap edits org notes as markdown,
  // converting org→md on entry and md→org on save/exit.
  const [tiptapContent, setTiptapContent] = createSignal<string | null>(null);
  const [convertingContent, setConvertingContent] = createSignal(false);
  const isOrgNote = () => (currentNote()?.syntax ?? defaultSyntax) === "org";

  let textareaRef: HTMLTextAreaElement | undefined;

  // Initialize local note when note loads
  createEffect(() => {
    const currentNote = note();
    if (currentNote) {
      setLocalNote(currentNote);
    }
  });

  // When a different note is loaded, clear stale tiptap state and
  // re-convert if still in tiptap mode with an org note.
  createEffect(
    on(
      () => localNote()?.id,
      (id) => {
        if (!id) return;
        setTiptapContent(null);
        const local = localNote();
        if (editorMode() === "tiptap" && local?.syntax === "org") {
          setConvertingContent(true);
          convertOrgToMarkdownQuery(local.content || "").then((md) => {
            setTiptapContent(md);
            setConvertingContent(false);
          });
        }
      },
      { defer: true },
    ),
  );

  // Get current note data or fallback to local note
  const currentNote = () => localNote() || note();

  const syntaxOptions = SYNTAX_OPTIONS;
  const defaultSyntax: NoteSyntax = "md";

  const updateNote = (field: keyof Note, value: any) => {
    setLocalNote((prev) => (prev ? { ...prev, [field]: value } : null));
    setUnsavedChanges(true);
  };

  // Convert tiptap markdown back to org and sync into localNote.
  const syncOrgFromTiptap = async (): Promise<string | null> => {
    const md = tiptapContent();
    if (!isOrgNote() || md === null) return null;
    const org = await convertMarkdownToOrgQuery(md);
    setLocalNote((prev) => (prev ? { ...prev, content: org } : null));
    return org;
  };

  const saveNote = async () => {
    const id = noteId();
    const original = note();

    if (!id || !original) return;

    try {
      if (editorMode() === "tiptap" && tiptapContent() !== null && isOrgNote()) {
        await syncOrgFromTiptap();
      }

      const local = localNote();
      if (!local) return;

      const updates: any = {};
      if (local.title !== original.title) updates.title = local.title;
      if (local.abstract !== original.abstract)
        updates.abstract = local.abstract;
      if (local.content !== original.content) updates.content = local.content;
      if (local.syntax !== original.syntax) updates.syntax = local.syntax;

      if (Object.keys(updates).length > 0) {
        await updateNoteQuery(id, updates);
        setUnsavedChanges(false);
      }
    } catch (error) {
      console.error("Failed to save note:", error);
    }
  };

  const formatDate = (isoString: string) => {
    const utcString = isoString.endsWith("Z") ? isoString : isoString + "Z";
    return new Date(utcString).toLocaleString();
  };

  const uploadFile = async (
    file: File,
    customName?: string,
  ): Promise<{ url: string; name: string } | null> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("customName", customName || file.name);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });
    const result = await response.json();

    if (result.success) {
      return { url: result.url, name: result.originalName };
    }
    console.error("Upload failed:", result.error);
    alert(`Upload failed: ${result.error}`);
    return null;
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    const customName = window.prompt("Enter filename for upload:", file.name);
    if (customName === null) return;

    setUploading(true);
    try {
      const result = await uploadFile(file, customName);
      if (result) {
        insertTextAtCursor(uploadMarkup(file.type, result.url, result.name));
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Upload failed: Network error");
    } finally {
      setUploading(false);
    }
  };

  const handleTiptapFileUpload = async (
    file: File,
  ): Promise<{ url: string; name: string } | null> => {
    setUploading(true);
    try {
      return await uploadFile(file);
    } catch (error) {
      console.error("Upload error:", error);
      alert("Upload failed: Network error");
      return null;
    } finally {
      setUploading(false);
    }
  };

  const insertTextAtCursor = (text: string) => {
    const textarea = textareaRef;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentContent = currentNote()?.content || "";

    const newContent =
      currentContent.substring(0, start) + text + currentContent.substring(end);
    updateNote("content", newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + text.length, start + text.length);
    }, 0);
  };

  const handlePaste = (e: ClipboardEvent) => {
    const file = e.clipboardData?.files?.[0];
    if (!file) return;
    e.preventDefault();
    handleFileUpload(file);
  };

  const handleDrop = (e: DragEvent) => {
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    e.preventDefault();
    handleFileUpload(file);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
  };

  const triggerFileUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleFileUpload(file);
      }
    };
    input.click();
  };

  const switchToTiptap = async () => {
    setEditorMode("tiptap");
    if (isOrgNote()) {
      setConvertingContent(true);
      const md = await convertOrgToMarkdownQuery(
        currentNote()?.content || "",
      );
      setTiptapContent(md);
      setConvertingContent(false);
    }
  };

  const switchToPlain = async () => {
    if (isOrgNote() && tiptapContent() !== null) {
      await syncOrgFromTiptap();
      setTiptapContent(null);
    }
    setEditorMode("plain");
  };

  const toggleEditMode = async () => {
    if (isEditing() && editorMode() === "tiptap" && isOrgNote() && tiptapContent() !== null) {
      await syncOrgFromTiptap();
      setTiptapContent(null);
    }
    setIsEditing(!isEditing());
  };

  const focusTextarea = () => {
    if (isEditing() && textareaRef) {
      textareaRef.focus();
    }
  };

  const handleUploadKeybind = () => {
    if (isEditing()) {
      triggerFileUpload();
    }
  };

  // Global keybindings
  useKeybinding({ key: "e", ctrl: true }, toggleEditMode);
  useKeybinding({ key: "s", ctrl: true }, saveNote);
  useKeybinding({ key: "/", ctrl: true }, focusTextarea);
  useKeybinding({ key: "u", ctrl: true }, handleUploadKeybind);

  // Push stats into app-level status bar
  const setStatusItems = useStatusBar();
  const { editor: editorSettings } = useAppSettings();
  createEffect(() => {
    const n = currentNote();
    const content = n?.content || "";
    const lines = content.split("\n").length;
    const chars = content.length;
    const words = content.split(/\s+/).filter((w) => w.length > 0).length;
    const syntaxLabel = syntaxOptions.find((opt) => opt.value === n?.syntax)?.label;
    setStatusItems({
      left: [`${lines}L`, `${chars}C`, `${words}W`],
      right: { unsaved: unsavedChanges(), syntaxLabel },
    });
  });
  onCleanup(() => setStatusItems(null));

  // Link palette for inserting links to notes (Ctrl+K when editing)
  const linkPalette = useLinkPalette({
    syntax: () => currentNote()?.syntax ?? defaultSyntax,
    parentId: () => null,
    onInsertLink: (linkText) => insertTextAtCursor(linkText),
    enabled: isEditing,
  });

  return (
    <Show
      when={noteLoaded()}
      fallback={
        <div class="h-full flex items-center justify-center">
          <div class="loading loading-spinner loading-lg"></div>
        </div>
      }
    >
      <Show
        when={noteExists()}
        fallback={
          <div class="h-full flex items-center justify-center">
            <div class="text-center">
              <h1 class="text-2xl font-bold text-base-content/60 mb-2">
                Note Not Found
              </h1>
              <p class="text-base-content/40">
                The requested note could not be found.
              </p>
            </div>
          </div>
        }
      >
        <div class="h-full flex flex-col">
          <NoteToolbar
            currentNote={currentNote}
            isEditing={isEditing}
            unsavedChanges={unsavedChanges}
            uploading={uploading}
            editorMode={editorMode}
            syntaxOptions={syntaxOptions}
            defaultSyntax={defaultSyntax}
            onToggleEdit={toggleEditMode}
            onSave={saveNote}
            onSwitchToPlain={switchToPlain}
            onSwitchToCodemirror={() => setEditorMode("codemirror")}
            onSwitchToTiptap={switchToTiptap}
            onUpload={triggerFileUpload}
            onOpenLinkPalette={linkPalette.open}
            onUpdateNote={updateNote}
          />                              {/* shrink-0 */}
          <NoteMetadataBar
            notePath={notePath}
            currentNote={currentNote}
            formatDate={formatDate}
          />                              {/* shrink-0 */}
          <NoteContent
            isEditing={isEditing}
            editorMode={editorMode}
            currentNote={currentNote}
            defaultSyntax={defaultSyntax}
            convertingContent={convertingContent}
            isOrgNote={isOrgNote}
            tiptapContent={tiptapContent}
            noteId={noteId}
            textareaRef={textareaRef}
            onSetTextareaRef={(el) => { textareaRef = el; }}
            onUpdateNote={updateNote}
            onPaste={handlePaste}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onTiptapUpdate={isOrgNote()
              ? (md: string) => { setTiptapContent(md); setUnsavedChanges(true); }
              : (content: string) => updateNote("content", content)
            }
            onTiptapFileUpload={handleTiptapFileUpload}
            setTiptapContent={setTiptapContent}
            setUnsavedChanges={setUnsavedChanges}
            vimMode={editorSettings.vimMode}
            disableVimOnTouch={editorSettings.disableVimOnTouch}
            setVimMode={editorSettings.setVimMode}
          />                              {/* flex-1 min-h-0 */}
        </div>

        <LinkPalette {...linkPalette.paletteProps} />
      </Show>
    </Show>
  );
}

// ---------------------------------------------------------------------------
// NoteToolbar — shrink-0, responsive navbar
// ---------------------------------------------------------------------------

interface NoteToolbarProps {
  currentNote: Accessor<Note | undefined | null>;
  isEditing: Accessor<boolean>;
  unsavedChanges: Accessor<boolean>;
  uploading: Accessor<boolean>;
  editorMode: Accessor<"plain" | "tiptap" | "codemirror">;
  syntaxOptions: typeof SYNTAX_OPTIONS;
  defaultSyntax: NoteSyntax;
  onToggleEdit: () => void;
  onSave: () => void;
  onSwitchToPlain: () => void;
  onSwitchToCodemirror: () => void;
  onSwitchToTiptap: () => void;
  onUpload: () => void;
  onOpenLinkPalette: () => void;
  onUpdateNote: (field: keyof Note, value: any) => void;
}

const NoteToolbar: Component<NoteToolbarProps> = (props) => (
  <div class="shrink-0 border-b border-base-300 bg-base-200 px-3 py-1.5">
    <div class="flex items-center gap-2">
      {/* Left: Metadata popover + title */}
      <div class="flex items-center gap-2 min-w-0 flex-1">
        <MetadataPopover
          currentNote={props.currentNote}
          syntaxOptions={props.syntaxOptions}
          defaultSyntax={props.defaultSyntax}
          onUpdateNote={props.onUpdateNote}
        />

        <div class="min-w-0 flex-1">
          <h1 class="text-sm font-semibold truncate" title={props.currentNote()?.title || ""}>
            {props.currentNote()?.title || "Untitled"}
          </h1>
        </div>
      </div>

      {/* Right: Desktop inline actions (hidden on mobile) */}
      <div class="hidden sm:flex items-center gap-3 shrink-0">
        <Show when={props.isEditing()}>
          <EditorModeToggle
            editorMode={props.editorMode}
            onSwitchToPlain={props.onSwitchToPlain}
            onSwitchToCodemirror={props.onSwitchToCodemirror}
            onSwitchToTiptap={props.onSwitchToTiptap}
          />

          <LinkButton
            onOpenLinkPalette={props.onOpenLinkPalette}
          />

          <UploadButton
            uploading={props.uploading}
            onUpload={props.onUpload}
          />
        </Show>

        <label class="label cursor-pointer gap-2">
          <span class="label-text text-sm">Edit</span>
          <input
            type="checkbox"
            class="toggle toggle-primary toggle-sm"
            checked={props.isEditing()}
            onInput={() => props.onToggleEdit()}
          />
        </label>

        <button
          type="button"
          class="btn btn-sm gap-1 h-8 min-h-8"
          classList={{
            'btn-primary': props.unsavedChanges(),
            'btn-ghost': !props.unsavedChanges(),
          }}
          disabled={!props.unsavedChanges()}
          onClick={props.onSave}
        >
          <Save class="w-3.5 h-3.5" />
          <span class="text-xs">
            {props.unsavedChanges() ? "Save" : "Saved"}
          </span>
        </button>
      </div>

      {/* Right: Mobile actions (visible only on mobile) */}
      <div class="flex sm:hidden items-center gap-1 shrink-0">
        <label class="label cursor-pointer gap-1">
          <input
            type="checkbox"
            class="toggle toggle-primary toggle-sm"
            checked={props.isEditing()}
            onInput={() => props.onToggleEdit()}
          />
        </label>

        <button
          type="button"
          class="btn btn-sm gap-1 h-8 min-h-8"
          classList={{
            'btn-primary': props.unsavedChanges(),
            'btn-ghost': !props.unsavedChanges(),
          }}
          disabled={!props.unsavedChanges()}
          onClick={props.onSave}
        >
          <Save class="w-3.5 h-3.5" />
        </button>

        {/* Overflow menu */}
        <Popover
          placement="bottom-end"
          floatingOptions={{ offset: 8, flip: true, shift: true }}
        >
          <Popover.Trigger
            class="btn btn-ghost btn-sm btn-circle"
            title="More actions"
          >
            <EllipsisVertical class="w-4 h-4" />
          </Popover.Trigger>

          <Popover.Portal>
            <Popover.Content class="z-50 rounded-xl border border-base-300 bg-base-100 shadow-xl p-2 data-open:animate-in data-open:fade-in-50 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-50 data-closed:zoom-out-95">
              <ul class="menu menu-sm w-48">
                <Show when={props.isEditing()}>
                  <li class="menu-title text-xs">Editor Mode</li>
                  <li>
                    <button
                      classList={{ active: props.editorMode() === "plain" }}
                      onClick={props.onSwitchToPlain}
                    >
                      <Type class="w-4 h-4" /> Plain
                    </button>
                  </li>
                  <li>
                    <button
                      classList={{ active: props.editorMode() === "codemirror" }}
                      onClick={props.onSwitchToCodemirror}
                    >
                      <Code class="w-4 h-4" /> Code
                    </button>
                  </li>
                  <li>
                    <button
                      classList={{ active: props.editorMode() === "tiptap" }}
                      onClick={props.onSwitchToTiptap}
                    >
                      <PenTool class="w-4 h-4" /> Rich
                    </button>
                  </li>
                  <li class="divider"></li>
                  <li>
                    <button onClick={props.onOpenLinkPalette}>
                      <Link class="w-4 h-4" /> Insert Link
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={props.onUpload}
                      disabled={props.uploading()}
                    >
                      <Upload class="w-4 h-4" />
                      {props.uploading() ? "Uploading..." : "Upload File"}
                    </button>
                  </li>
                </Show>
              </ul>
            </Popover.Content>
          </Popover.Portal>
        </Popover>
      </div>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// NoteMetadataBar — shrink-0
// ---------------------------------------------------------------------------

interface NoteMetadataBarProps {
  notePath: Accessor<string | null | undefined>;
  currentNote: Accessor<Note | undefined | null>;
  formatDate: (iso: string) => string;
}

const NoteMetadataBar: Component<NoteMetadataBarProps> = (props) => (
  <div class="shrink-0 px-4 py-2 bg-base-100 border-b border-base-300">
    <div class="flex items-center justify-between text-xs text-base-content/60">
      <span class="font-mono truncate mr-4">
        {props.notePath() || props.currentNote()?.id || ""}
      </span>
      <span class="whitespace-nowrap text-xs">
        Modified{" "}
        {props.currentNote()?.updated_at
          ? props.formatDate(props.currentNote()!.updated_at)
          : "Unknown"}
      </span>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// NoteContent — flex-1 min-h-0
// ---------------------------------------------------------------------------

interface NoteContentProps {
  isEditing: Accessor<boolean>;
  editorMode: Accessor<"plain" | "tiptap" | "codemirror">;
  currentNote: Accessor<Note | undefined | null>;
  defaultSyntax: NoteSyntax;
  convertingContent: Accessor<boolean>;
  isOrgNote: Accessor<boolean>;
  tiptapContent: Accessor<string | null>;
  noteId: Accessor<string | undefined>;
  textareaRef: HTMLTextAreaElement | undefined;
  onSetTextareaRef: (el: HTMLTextAreaElement) => void;
  onUpdateNote: (field: keyof Note, value: any) => void;
  onPaste: (e: ClipboardEvent) => void;
  onDrop: (e: DragEvent) => void;
  onDragOver: (e: DragEvent) => void;
  onTiptapUpdate: (content: string) => void;
  onTiptapFileUpload: (file: File) => Promise<{ url: string; name: string } | null>;
  setTiptapContent: (v: string | null) => void;
  setUnsavedChanges: (v: boolean) => void;
  vimMode: Accessor<boolean>;
  disableVimOnTouch: Accessor<boolean>;
  setVimMode: (v: boolean) => void;
}

const NoteContent: Component<NoteContentProps> = (props) => (
  <div class="flex-1 flex min-h-0">
    <Show
      when={props.isEditing()}
      fallback={
        <NoteContentPreview
          class="flex-1 p-6 overflow-auto"
          content={props.currentNote()?.content}
          syntax={props.currentNote()?.syntax || props.defaultSyntax}
          defaultSyntax={props.defaultSyntax}
          sanitize={HTML_SANITIZING}
        />
      }
    >
      <Show
        when={props.editorMode() === "tiptap"}
        fallback={
          <Show
            when={props.editorMode() === "codemirror"}
            fallback={
              <textarea
                ref={(el) => props.onSetTextareaRef(el)}
                value={props.currentNote()?.content || ""}
                onInput={(e) => props.onUpdateNote("content", e.currentTarget.value)}
                onPaste={props.onPaste}
                onDrop={props.onDrop}
                onDragOver={props.onDragOver}
                class="flex-1 p-6 textarea textarea-ghost resize-none border-none focus:outline-none text-sm font-mono leading-relaxed"
                placeholder="Start writing your note..."
                style={{ "field-sizing": "content" } as any}
              />
            }
          >
            <CodeMirrorEditor
              value={props.currentNote()?.content || ""}
              onInput={(content) => props.onUpdateNote("content", content)}
              vim={props.vimMode()}
              onTouch={() => {
                if (props.disableVimOnTouch()) props.setVimMode(false);
              }}
              class="flex-1 overflow-hidden"
            />
          </Show>
        }
      >
        <Show
          when={!props.convertingContent()}
          fallback={
            <div class="flex-1 flex items-center justify-center">
              <div class="loading loading-spinner loading-md"></div>
            </div>
          }
        >
          <Show when={props.noteId()} keyed>
            {(_id) => (
              <TiptapNoteEditor
                content={props.isOrgNote() ? (props.tiptapContent() || "") : (props.currentNote()?.content || "")}
                syntax={props.isOrgNote() ? "md" : (props.currentNote()?.syntax || props.defaultSyntax)}
                onUpdate={props.isOrgNote()
                  ? (md) => { props.setTiptapContent(md); props.setUnsavedChanges(true); }
                  : (content) => props.onUpdateNote("content", content)
                }
                onFileUpload={props.onTiptapFileUpload}
                placeholder="Start writing..."
              />
            )}
          </Show>
        </Show>
      </Show>
    </Show>
  </div>
);

// ---------------------------------------------------------------------------
// Helper components
// ---------------------------------------------------------------------------

interface MetadataPopoverProps {
  currentNote: Accessor<Note | undefined | null>;
  syntaxOptions: typeof SYNTAX_OPTIONS;
  defaultSyntax: NoteSyntax;
  onUpdateNote: (field: keyof Note, value: any) => void;
}

const MetadataPopover: Component<MetadataPopoverProps> = (props) => (
  <Popover
    placement="bottom-start"
    floatingOptions={{ offset: 8, flip: true, shift: true }}
  >
    <Popover.Trigger
      class="btn btn-ghost btn-sm btn-circle shrink-0"
      title="Edit metadata"
    >
      <NotebookPen class="w-4 h-4" />
    </Popover.Trigger>

    <Popover.Portal>
      <Popover.Content class="z-50 w-80 rounded-xl border border-base-300 bg-base-100 p-4 shadow-xl data-open:animate-in data-open:fade-in-50 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-50 data-closed:zoom-out-95">
        <div class="flex items-start justify-between gap-2 mb-3">
          <Popover.Label class="text-sm font-semibold">Note Metadata</Popover.Label>
          <Popover.Close class="btn btn-ghost btn-xs">Close</Popover.Close>
        </div>

        <div class="space-y-4">
          <div class="space-y-1.5">
            <label class="block text-xs font-medium text-base-content/70">Title</label>
            <Input
              type="text"
              value={props.currentNote()?.title || ""}
              onInput={(e) => props.onUpdateNote("title", e.currentTarget.value)}
              size="sm"
              placeholder="Note title..."
              class="w-full"
            />
          </div>

          <div class="space-y-1.5">
            <label class="block text-xs font-medium text-base-content/70">Abstract</label>
            <Textarea
              value={props.currentNote()?.abstract || ""}
              onInput={(e) => props.onUpdateNote("abstract", e.currentTarget.value)}
              placeholder="Brief description..."
              size="sm"
              rows={3}
              class="w-full resize-none"
            />
          </div>

          <div class="space-y-1.5">
            <label class="block text-xs font-medium text-base-content/70">Syntax</label>
            <SingleCombobox
              options={props.syntaxOptions}
              optionValue="value"
              optionLabel="label"
              value={props.currentNote()?.syntax || props.defaultSyntax}
              onChange={(val) => props.onUpdateNote("syntax", val)}
              triggerMode="focus"
            />
          </div>
        </div>
      </Popover.Content>
    </Popover.Portal>
  </Popover>
);

const editorModeOptions = [
  { value: "plain" as const, label: "Plain", icon: Type, title: "Plain text editor" },
  { value: "codemirror" as const, label: "Code", icon: Code, title: "CodeMirror editor" },
  { value: "tiptap" as const, label: "Rich", icon: PenTool, title: "Rich text editor" },
];

interface EditorModeToggleProps {
  editorMode: Accessor<"plain" | "tiptap" | "codemirror">;
  onSwitchToPlain: () => void;
  onSwitchToCodemirror: () => void;
  onSwitchToTiptap: () => void;
}

const editorModeSwitchers = {
  plain: "onSwitchToPlain",
  codemirror: "onSwitchToCodemirror",
  tiptap: "onSwitchToTiptap",
} as const;

const EditorModeToggle: Component<EditorModeToggleProps> = (props) => (
  <div class="join">
    <For each={editorModeOptions}>
      {(option) => (
        <button
          type="button"
          class="btn btn-xs join-item gap-1"
          classList={{
            'btn-primary': props.editorMode() === option.value,
            'btn-ghost': props.editorMode() !== option.value,
          }}
          onClick={props[editorModeSwitchers[option.value]]}
          title={option.title}
        >
          <option.icon class="w-3 h-3" />
          {option.label}
        </button>
      )}
    </For>
  </div>
);

const LinkButton: Component<{ onOpenLinkPalette: () => void }> = (props) => (
  <button
    onClick={props.onOpenLinkPalette}
    class="btn btn-sm btn-ghost gap-1 h-8 min-h-8"
    title="Insert link (Ctrl+K)"
  >
    <Link class="w-3.5 h-3.5" />
    <span class="text-xs">Link</span>
  </button>
);

const UploadButton: Component<{
  uploading: Accessor<boolean>;
  onUpload: () => void;
}> = (props) => (
  <button
    type="button"
    onClick={props.onUpload}
    class="btn btn-sm btn-ghost gap-1 h-8 min-h-8"
    classList={{ loading: props.uploading() }}
    disabled={props.uploading()}
    title="Upload file (Ctrl+U)"
  >
    <Show when={!props.uploading()}>
      <Upload class="w-3.5 h-3.5" />
    </Show>
    <span class="text-xs">
      {props.uploading() ? "Uploading..." : "Upload"}
    </span>
  </button>
);
