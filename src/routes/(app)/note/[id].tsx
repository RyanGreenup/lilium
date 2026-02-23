import { createAsync, useParams } from "@solidjs/router";
import { createSignal, createEffect, on, onCleanup, Show, Suspense, Accessor } from "solid-js";
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

import { Toggle } from "~/solid-daisy-components/components/Toggle";
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
  // Tracks localNote().id so it fires after the copy-from-note effect
  // above has set localNote with the new note's data.
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
  // Returns the converted org content, or null if no conversion was needed.
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
      // If editing org in tiptap, convert markdown→org before diffing
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
    // Append 'Z' if missing to ensure UTC interpretation
    const utcString = isoString.endsWith("Z") ? isoString : isoString + "Z";
    return new Date(utcString).toLocaleString();
  };

  /** Core upload: sends file to server, returns URL + name or null on failure. */
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

  /** Upload handler for the plain-text textarea (prompts for filename). */
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

  /** Upload handler for tiptap — uploads directly without name prompt. */
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

    // Set cursor position after inserted text
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
    // Accept all file types - users are trusted developers
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleFileUpload(file);
      }
    };
    input.click();
  };

  // Switch to tiptap mode; for org notes, convert org→md via pandoc first
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

  // Switch to plain text mode; for org notes, convert md→org back first
  const switchToPlain = async () => {
    if (isOrgNote() && tiptapContent() !== null) {
      await syncOrgFromTiptap();
      setTiptapContent(null);
    }
    setEditorMode("plain");
  };

  // Modular keybinding functions
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
  // NOTE: parentId is null for global search. In the future, this may be
  // connected to a URL parameter for virtual root functionality.
  const linkPalette = useLinkPalette({
    syntax: () => currentNote()?.syntax ?? defaultSyntax,
    parentId: () => null, // Global search - FUTURE: may use URL param for virtual root
    onInsertLink: (linkText) => insertTextAtCursor(linkText),
    enabled: isEditing, // Only enable Ctrl+K when editing
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
          {/* Toolbar */}
          <div class="border-b border-base-300 bg-base-200 px-4 py-2">
            <div class="flex items-center justify-between gap-2">
              {/* Left: Title + metadata popover */}
              <div class="flex items-center gap-2 min-w-0 flex-1">
                <Popover
                  placement="bottom-start"
                  floatingOptions={{ offset: 8, flip: true, shift: true }}
                >
                  <Popover.Trigger
                    class="btn btn-ghost btn-sm btn-circle flex-shrink-0"
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
                            value={currentNote()?.title || ""}
                            onInput={(e) => updateNote("title", e.currentTarget.value)}
                            size="sm"
                            placeholder="Note title..."
                            class="w-full"
                          />
                        </div>

                        <div class="space-y-1.5">
                          <label class="block text-xs font-medium text-base-content/70">Abstract</label>
                          <Textarea
                            value={currentNote()?.abstract || ""}
                            onInput={(e) => updateNote("abstract", e.currentTarget.value)}
                            placeholder="Brief description..."
                            size="sm"
                            rows={3}
                            class="w-full resize-none"
                          />
                        </div>

                        <div class="space-y-1.5">
                          <label class="block text-xs font-medium text-base-content/70">Syntax</label>
                          <SingleCombobox
                            options={syntaxOptions}
                            optionValue="value"
                            optionLabel="label"
                            value={currentNote()?.syntax || defaultSyntax}
                            onChange={(val) => updateNote("syntax", val)}
                            triggerMode="focus"
                          />
                        </div>
                      </div>
                    </Popover.Content>
                  </Popover.Portal>
                </Popover>

                <div class="min-w-0 flex-1">
                  <h1 class="text-sm font-semibold truncate" title={currentNote()?.title || ""}>
                    {currentNote()?.title || "Untitled"}
                  </h1>
                </div>
              </div>

              {/* Right: Actions */}
              <div class="flex items-center gap-1.5 flex-shrink-0">
                <LinkButton
                  isEditing={isEditing}
                  openLinkPalette={linkPalette.open}
                />

                <UploadButton
                  isEditing={isEditing}
                  uploading={uploading}
                  onUpload={triggerFileUpload}
                />

                {/* Editor Mode Toggle (only when editing) */}
                <Show when={isEditing()}>
                  <div class="join">
                    <button
                      class={`btn btn-xs join-item gap-1 ${editorMode() === "plain" ? "btn-active" : "btn-ghost"}`}
                      onClick={switchToPlain}
                      title="Plain text editor"
                    >
                      <Type class="w-3 h-3" />
                      <span class="hidden sm:inline">Plain</span>
                    </button>
                    <button
                      class={`btn btn-xs join-item gap-1 ${editorMode() === "codemirror" ? "btn-active" : "btn-ghost"}`}
                      onClick={() => setEditorMode("codemirror")}
                      title="CodeMirror editor"
                    >
                      <Code class="w-3 h-3" />
                      <span class="hidden sm:inline">Code</span>
                    </button>
                    <button
                      class={`btn btn-xs join-item gap-1 ${editorMode() === "tiptap" ? "btn-active" : "btn-ghost"}`}
                      onClick={switchToTiptap}
                      title="Rich text editor"
                    >
                      <PenTool class="w-3 h-3" />
                      <span class="hidden sm:inline">Rich</span>
                    </button>
                  </div>
                </Show>

                {/* Edit Toggle */}
                <Toggle
                  size="sm"
                  checked={isEditing()}
                  onChange={() => toggleEditMode()}
                />

                {/* Save Button */}
                <button
                  onClick={saveNote}
                  class={`btn btn-sm ${unsavedChanges() ? "btn-primary" : "btn-ghost"} gap-1 h-8 min-h-8`}
                  disabled={!unsavedChanges()}
                >
                  <Save class="w-3.5 h-3.5" />
                  <span class="hidden sm:inline text-xs">
                    {unsavedChanges() ? "Save" : "Saved"}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div class="px-4 py-2 bg-base-100 border-b border-base-300">
            <div class="flex items-center justify-between text-xs text-base-content/60">
              <span class="font-mono truncate mr-4">
                {notePath() || currentNote()?.id || ""}
              </span>
              <span class="whitespace-nowrap text-xs">
                Modified{" "}
                {currentNote()?.updated_at
                  ? formatDate(currentNote()!.updated_at)
                  : "Unknown"}
              </span>
            </div>
          </div>

          {/* Content Area */}
          <div class="flex-1 flex min-h-0">
            <Show
              when={isEditing()}
              fallback={
                <NoteContentPreview
                  class="flex-1 p-6 overflow-auto"
                  content={currentNote()?.content}
                  syntax={currentNote()?.syntax || defaultSyntax}
                  defaultSyntax={defaultSyntax}
                  sanitize={HTML_SANITIZING}
                />
              }
            >
              <Show
                when={editorMode() === "tiptap"}
                fallback={
                  <Show
                    when={editorMode() === "codemirror"}
                    fallback={
                      <textarea
                        ref={textareaRef}
                        value={currentNote()?.content || ""}
                        onInput={(e) => updateNote("content", e.currentTarget.value)}
                        onPaste={handlePaste}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        class="flex-1 p-6 textarea textarea-ghost resize-none border-none focus:outline-none text-sm font-mono leading-relaxed"
                        placeholder="Start writing your note..."
                        style={{ "field-sizing": "content" } as any}
                      />
                    }
                  >
                    <CodeMirrorEditor
                      value={currentNote()?.content || ""}
                      onInput={(content) => updateNote("content", content)}
                      class="flex-1 overflow-hidden"
                    />
                  </Show>
                }
              >
                <Show
                  when={!convertingContent()}
                  fallback={
                    <div class="flex-1 flex items-center justify-center">
                      <div class="loading loading-spinner loading-md"></div>
                    </div>
                  }
                >
                  {/* keyed on noteId so the editor remounts with fresh
                      content when the user navigates to a different note */}
                  <Show when={noteId()} keyed>
                    {(_id) => (
                      <TiptapNoteEditor
                        content={isOrgNote() ? (tiptapContent() || "") : (currentNote()?.content || "")}
                        syntax={isOrgNote() ? "md" : (currentNote()?.syntax || defaultSyntax)}
                        onUpdate={isOrgNote()
                          ? (md) => { setTiptapContent(md); setUnsavedChanges(true); }
                          : (content) => updateNote("content", content)
                        }
                        onFileUpload={handleTiptapFileUpload}
                        placeholder="Start writing..."
                      />
                    )}
                  </Show>
                </Show>
              </Show>
            </Show>
          </div>

        </div>

        {/* Link Palette - triggered with Ctrl+K when editing */}
        <LinkPalette {...linkPalette.paletteProps} />
      </Show>
    </Show>
  );
}

/**
 * LinkButton - Opens the link palette for inserting note links.
 * Provides mobile-friendly access to the Ctrl+K keyboard shortcut.
 */
const LinkButton = (props: {
  isEditing: Accessor<boolean>;
  openLinkPalette: () => void;
}) => (
  <Show when={props.isEditing()}>
    <button
      onClick={props.openLinkPalette}
      class="btn btn-sm btn-ghost gap-1 h-8 min-h-8"
      title="Insert link (Ctrl+K)"
    >
      <Link class="w-3.5 h-3.5" />
      <span class="hidden sm:inline text-xs">Link</span>
    </button>
  </Show>
);

/**
 * UploadButton - Triggers file upload for embedding in notes.
 * Provides mobile-friendly access to the Ctrl+U keyboard shortcut.
 */
const UploadButton = (props: {
  isEditing: Accessor<boolean>;
  uploading: Accessor<boolean>;
  onUpload: () => void;
}) => (
  <Show when={props.isEditing()}>
    <button
      onClick={props.onUpload}
      class={`btn btn-sm btn-ghost gap-1 h-8 min-h-8 ${props.uploading() ? "loading" : ""}`}
      disabled={props.uploading()}
      title="Upload file (Ctrl+U)"
    >
      <Show when={!props.uploading()}>
        <Upload class="w-3.5 h-3.5" />
      </Show>
      <span class="hidden sm:inline text-xs">
        {props.uploading() ? "Uploading..." : "Upload"}
      </span>
    </button>
  </Show>
);
