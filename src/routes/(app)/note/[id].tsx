import { useParams } from "@solidjs/router";
import { createSignal, createEffect, Show, Suspense } from "solid-js";
import { useCurrentNote } from "~/lib/hooks/useCurrentNote";
import { MarkdownRenderer } from "~/components/MarkdownRenderer";
import { updateNoteQuery } from "~/lib/db/notes/update";
import { SYNTAX_OPTIONS, type Note, type NoteSyntax } from "~/lib/db/types";
import Save from "lucide-solid/icons/save";
import Eye from "lucide-solid/icons/eye";
import ChevronUp from "lucide-solid/icons/chevron-up";
import NotebookPen from "lucide-solid/icons/notebook-pen";

import { Toggle } from "~/solid-daisy-components/components/Toggle";
import { Collapsible } from "~/solid-daisy-components/components/Collapsible";
import { Select } from "~/solid-daisy-components/components/Select";
import { Fieldset } from "~/solid-daisy-components/components/Fieldset";
import { Textarea } from "~/solid-daisy-components/components/Textarea";
import { Input } from "~/solid-daisy-components/components/Input";
import NoteBreadcrumbs from "~/components/NoteBreadcrumbs";

export default function NoteEditor() {
  const { note, noteId, noteExists, noteLoaded } = useCurrentNote();

  const [isEditing, setIsEditing] = createSignal(false);
  const [unsavedChanges, setUnsavedChanges] = createSignal(false);
  const [metadataExpanded, setMetadataExpanded] = createSignal(false);
  const [localNote, setLocalNote] = createSignal<Note | null>(null);

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
    setLocalNote((prev) => prev ? ({ ...prev, [field]: value }) : null);
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
      if (local.abstract !== original.abstract) updates.abstract = local.abstract;
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
    return new Date(isoString).toLocaleString();
  };

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
              <h1 class="text-2xl font-bold text-base-content/60 mb-2">Note Not Found</h1>
              <p class="text-base-content/40">The requested note could not be found.</p>
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
              title={metadataExpanded() ? "Collapse metadata" : "Edit metadata"}
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
                  onChange={(e) => updateNote("syntax", e.currentTarget.value)}
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
                onChange={(e) => updateNote("syntax", e.currentTarget.value)}
              >
                {syntaxOptions.map((option) => (
                  <option value={option.value}>{option.label}</option>
                ))}
              </Select>
            </div>

            {/* Right: Primary actions */}
            <div class="flex items-center gap-2">
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
          <span class="font-mono truncate mr-4">{currentNote()?.path || ""}</span>
          <span class="whitespace-nowrap text-xs">
            Modified {currentNote()?.updated_at ? formatDate(currentNote()!.updated_at) : "Unknown"}
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
                <Show when={currentNote()?.content} fallback={<div class="text-center text-base-content/60 p-8">No content</div>}>
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
            value={currentNote()?.content || ""}
            onInput={(e) => updateNote("content", e.currentTarget.value)}
            class="flex-1 p-6 textarea textarea-ghost resize-none border-none focus:outline-none text-sm font-mono leading-relaxed"
            placeholder="Start writing your note..."
            style={{ "field-sizing": "content" }}
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
              {
                currentNote()
                  ?.content?.split(/\s+/)
                  .filter((w) => w.length > 0).length || 0
              }
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
              {syntaxOptions.find((opt) => opt.value === currentNote()?.syntax)?.label}
            </span>
          </div>
        </div>
      </div>
        </div>
      </Show>
    </Show>
  );
}
