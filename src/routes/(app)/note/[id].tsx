import { createAsync, useParams } from "@solidjs/router";
import { createSignal, createEffect, Show, Suspense, Accessor } from "solid-js";
import { useCurrentNote, useNoteById } from "~/lib/hooks/useCurrentNote";
import { MarkdownRenderer } from "~/components/MarkdownRenderer";
import { updateNoteQuery } from "~/lib/db/notes/update";
import { SYNTAX_OPTIONS, type Note, type NoteSyntax } from "~/lib/db/types";
import Save from "lucide-solid/icons/save";
import Eye from "lucide-solid/icons/eye";
import ChevronUp from "lucide-solid/icons/chevron-up";
import NotebookPen from "lucide-solid/icons/notebook-pen";
import Upload from "lucide-solid/icons/upload";
import Link from "lucide-solid/icons/link";

import { Toggle } from "~/solid-daisy-components/components/Toggle";
import { Collapsible } from "~/solid-daisy-components/components/Collapsible";
import { Select } from "~/solid-daisy-components/components/Select";
import { Fieldset } from "~/solid-daisy-components/components/Fieldset";
import { Textarea } from "~/solid-daisy-components/components/Textarea";
import { Input } from "~/solid-daisy-components/components/Input";
import { useKeybinding } from "~/solid-daisy-components/utilities/useKeybinding";
import NoteBreadcrumbs from "~/components/NoteBreadcrumbs";
import { getNotePathQuery } from "~/lib/db/notes/path";
import { LinkPalette, useLinkPalette } from "~/components/palette";

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
  const [metadataExpanded, setMetadataExpanded] = createSignal(false);
  const [localNote, setLocalNote] = createSignal<Note | null>(null);
  const [uploading, setUploading] = createSignal(false);

  let textareaRef: HTMLTextAreaElement | undefined;

  // Initialize local note when note loads
  createEffect(() => {
    const currentNote = note();
    if (currentNote) {
      setLocalNote(currentNote);
    }
  });

  // Get current note data or fallback to local note
  const currentNote = () => localNote() || note();

  const syntaxOptions = SYNTAX_OPTIONS;
  const defaultSyntax: NoteSyntax = "md";

  const updateNote = (field: keyof Note, value: any) => {
    setLocalNote((prev) => (prev ? { ...prev, [field]: value } : null));
    setUnsavedChanges(true);
  };

  const saveNote = async () => {
    const id = noteId();
    const local = localNote();
    const original = note();

    if (!id || !local || !original) return;

    try {
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

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    // Prompt user for filename, defaulting to original
    const customName = window.prompt("Enter filename for upload:", file.name);
    if (customName === null) return; // User cancelled

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("customName", customName || file.name);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        insertTextAtCursor(uploadMarkup(file.type, result.url, result.originalName));
      } else {
        console.error("Upload failed:", result.error);
        alert(`Upload failed: ${result.error}`);
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Upload failed: Network error");
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

  // Modular keybinding functions
  const toggleEditMode = () => {
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

  // Link palette for inserting links to notes (Ctrl+K when editing)
  // NOTE: parentId is null for global search. In the future, this may be
  // connected to a URL parameter for virtual root functionality.
  const linkPalette = useLinkPalette({
    syntax: () => currentNote()?.syntax ?? defaultSyntax,
    parentId: () => null, // Global search - FUTURE: may use URL param for virtual root
    onInsertLink: (linkText) => insertTextAtCursor(linkText),
  });

  // Ctrl+K to open link palette (only when editing)
  const handleLinkPaletteKeybind = () => {
    if (isEditing()) {
      linkPalette.open();
    }
  };
  useKeybinding({ key: "k", ctrl: true }, handleLinkPaletteKeybind);

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
          {/* Header */}
          <div class="border-b border-base-300 bg-base-200">
            {/* Title Section */}
            <div class="px-4 pt-4 pb-3">
              <div class="flex items-start gap-3">
                <div class="flex-1 min-w-0">
                  <Show
                    when={!metadataExpanded()}
                    fallback={
                      <Fieldset class="bg-base-100 border-base-300 rounded-lg border">
                        <Fieldset.Legend class="px-3 text-sm font-medium text-base-content">
                          Note Metadata
                        </Fieldset.Legend>

                        <div class="p-6 space-y-6">
                          <div class="space-y-2">
                            <label class="block text-sm font-medium text-base-content">
                              Title
                            </label>
                            <Input
                              type="text"
                              value={currentNote()?.title || ""}
                              onInput={(e) =>
                                updateNote("title", e.currentTarget.value)
                              }
                              size="sm"
                              placeholder="Note title..."
                              class="w-full"
                            />
                          </div>

                          <div class="space-y-2">
                            <label class="block text-sm font-medium text-base-content">
                              Abstract
                            </label>
                            <Textarea
                              value={currentNote()?.abstract || ""}
                              onInput={(e) =>
                                updateNote("abstract", e.currentTarget.value)
                              }
                              placeholder="Brief description of the note content..."
                              size="sm"
                              rows={3}
                              class="w-full resize-none"
                            />
                          </div>
                        </div>
                      </Fieldset>
                    }
                  >
                    <div>
                      <h1
                        class="text-lg font-semibold break-words"
                        title={currentNote()?.title || ""}
                      >
                        {currentNote()?.title || "Untitled"}
                      </h1>

                      <p
                        class="text-sm text-base-content/60 truncate mt-1"
                        title={currentNote()?.abstract || ""}
                      >
                        {currentNote()?.abstract || "No description"}
                      </p>
                    </div>
                  </Show>
                </div>
                <button
                  onClick={() => setMetadataExpanded(!metadataExpanded())}
                  class="btn btn-ghost btn-sm btn-circle flex-shrink-0"
                  title={
                    metadataExpanded() ? "Collapse metadata" : "Edit metadata"
                  }
                >
                  {metadataExpanded() ? (
                    <ChevronUp class="w-4 h-4" />
                  ) : (
                    <NotebookPen class="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Controls Bar */}
            {/* TODO Consider Fieldset */}

            <div class="px-4 pb-3">
              <Show when={metadataExpanded()}>
                <div class="flex flex-wrap gap-2 sm:gap-3 mb-3 pt-3 border-t border-base-300/50">
                  {/* Mobile: Syntax and Edit controls in metadata */}
                  <div class="flex items-center gap-1 text-xs">
                    <span class="text-base-content/60">Syntax:</span>

                    <Select
                      value={currentNote()?.syntax || defaultSyntax}
                      onChange={(e) =>
                        updateNote("syntax", e.currentTarget.value)
                      }
                    >
                      {syntaxOptions.map((option) => (
                        <option value={option.value}>{option.label}</option>
                      ))}
                    </Select>
                  </div>

                  <div class="flex items-center gap-1 text-xs">
                    <span class="text-base-content/60">Edit mode:</span>
                    <Toggle
                      size="sm"
                      checked={isEditing()}
                      onChange={(e) => setIsEditing(e.currentTarget.checked)}
                    />
                  </div>
                </div>
              </Show>

              <div class="flex items-center justify-between">
                {/* Left: Syntax selector (hidden when metadata expanded) */}
                <div
                  class={`flex items-center ${metadataExpanded() ? "invisible" : ""}`}
                >
                  <Select
                    size="xs"
                    value={currentNote()?.syntax || defaultSyntax}
                    onChange={(e) =>
                      updateNote("syntax", e.currentTarget.value)
                    }
                  >
                    {syntaxOptions.map((option) => (
                      <option value={option.value}>{option.label}</option>
                    ))}
                  </Select>
                </div>

                {/* Right: Primary actions */}
                <div class="flex items-center gap-2">
                  <LinkButton
                    isEditing={isEditing}
                    openLinkPalette={linkPalette.open}
                  />

                  <UploadButton
                    isEditing={isEditing}
                    uploading={uploading}
                    onUpload={triggerFileUpload}
                  />

                  {/* Edit Toggle (hidden when metadata expanded) */}
                  <div
                    class={`flex items-center gap-1 px-2 py-1 rounded hover:bg-base-300/50 transition-colors ${metadataExpanded() ? "hidden" : "flex"}`}
                  >
                    <Eye class="w-3.5 h-3.5 text-base-content/60" />
                    <Toggle
                      size="sm"
                      checked={isEditing()}
                      onChange={(e) => setIsEditing(e.currentTarget.checked)}
                    />
                  </div>

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
          <div class="flex-1 flex">
            <Show
              when={isEditing()}
              fallback={
                <div class="flex-1 p-6 overflow-auto">
                  <div class="prose prose-sm max-w-none">
                    <Show
                      when={currentNote()?.content}
                      fallback={
                        <div class="text-center text-base-content/60 p-8">
                          No content
                        </div>
                      }
                    >
                      <MarkdownRenderer
                        content={() => currentNote()?.content || ""}
                        syntax={() => currentNote()?.syntax || defaultSyntax}
                      />
                    </Show>
                  </div>
                </div>
              }
            >
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
            </Show>
          </div>

          {/* Status Bar */}
          <div class="px-4 py-2 bg-base-200 border-t border-base-300 text-xs text-base-content/60">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-4">
                <span>{currentNote()?.content?.split("\n").length || 0}L</span>
                <span>{currentNote()?.content?.length || 0}C</span>
                <span>
                  {currentNote()
                    ?.content?.split(/\s+/)
                    .filter((w) => w.length > 0).length || 0}
                  W
                </span>
              </div>
              <div class="flex items-center gap-3">
                {unsavedChanges() && (
                  <span class="text-warning flex items-center gap-1">
                    <span class="w-1.5 h-1.5 bg-warning rounded-full"></span>
                    <span class="hidden sm:inline">Unsaved</span>
                  </span>
                )}
                <span class="text-base-content/40">
                  {
                    syntaxOptions.find(
                      (opt) => opt.value === currentNote()?.syntax,
                    )?.label
                  }
                </span>
              </div>
            </div>
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
