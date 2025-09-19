import { useParams } from "@solidjs/router";
import { createSignal, createEffect, Show } from "solid-js";
import {
  Save,
  Eye,
  Edit3,
  FileText,
  Settings,
  ChevronDown,
  ChevronUp,
} from "lucide-solid";
import { Tabs } from "~/solid-daisy-components/components/Tabs";
import { Toggle } from "~/solid-daisy-components/components/Toggle";
import { Collapsible } from "~/solid-daisy-components/components/Collapsible";
import { Select } from "~/solid-daisy-components/components/Select";
import { Fieldset } from "~/solid-daisy-components/components/Fieldset";
import { Textarea } from "~/solid-daisy-components/components/Textarea";

interface Note {
  id: string;
  title: string;
  abstract: string;
  content: string;
  syntax: "markdown" | "org" | "html" | "jsx";
  lastModified: string;
  path: string;
}

export default function NoteEditor() {
  const params = useParams();
  const [note, setNote] = createSignal<Note>({
    id: params.id,
    title: "Machine Learning Pipeline Design",
    abstract:
      "Comprehensive guide to building robust machine learning pipelines including data preprocessing, feature engineering, and model deployment strategies.",
    content: `# Machine Learning Pipeline Design

## Overview

A comprehensive guide to building robust machine learning pipelines including data preprocessing, feature engineering, and model deployment strategies.

## Key Components

### 1. Data Ingestion
- **Sources**: Multiple data sources (APIs, databases, files)
- **Validation**: Schema validation and data quality checks
- **Storage**: Efficient data storage and versioning

### 2. Feature Engineering
\`\`\`python
def engineer_features(df):
    # Example feature engineering
    df['feature_interaction'] = df['feature_a'] * df['feature_b']
    df['normalized_value'] = (df['value'] - df['value'].mean()) / df['value'].std()
    return df
\`\`\`

### 3. Model Training
- Cross-validation strategies
- Hyperparameter optimization
- Model selection and evaluation

### 4. Deployment
- Model versioning and artifacts
- Monitoring and alerting
- A/B testing framework

## Best Practices

1. **Version Control**: Track code, data, and model versions
2. **Testing**: Unit tests for data pipeline components
3. **Monitoring**: Real-time performance monitoring
4. **Documentation**: Clear documentation for reproducibility

## Next Steps

- Implement automated retraining
- Add model interpretation tools
- Enhance monitoring dashboard`,
    syntax: "markdown",
    lastModified: "2024-01-15T14:30:00Z",
    path: "/notes/computer-science/ai/ml-pipeline.md",
  });

  const [isEditing, setIsEditing] = createSignal(false); // Start in preview mode
  const [unsavedChanges, setUnsavedChanges] = createSignal(false);
  const [metadataExpanded, setMetadataExpanded] = createSignal(false);

  const syntaxOptions = [
    { value: "markdown", label: "Markdown", extension: ".md" },
    { value: "org", label: "Org Mode", extension: ".org" },
    { value: "html", label: "HTML", extension: ".html" },
    { value: "jsx", label: "JSX", extension: ".jsx" },
  ];

  const updateNote = (field: keyof Note, value: any) => {
    setNote((prev) => ({ ...prev, [field]: value }));
    setUnsavedChanges(true);
  };

  const saveNote = () => {
    // TODO: Implement actual save functionality
    console.log("Saving note:", note());
    setUnsavedChanges(false);
    setNote((prev) => ({ ...prev, lastModified: new Date().toISOString() }));
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString();
  };

  return (
    <div class="h-full flex flex-col">
      {/* Header */}
      <div class="border-b border-base-300 bg-base-200">
        {/* Title Section */}
        <div class="px-4 pt-4 pb-3">
          <div class="flex items-start gap-3">
            <FileText class="w-5 h-5 text-base-content/70 flex-shrink-0 mt-0.5" />
            <div class="flex-1 min-w-0">
              <Show
                when={!metadataExpanded()}
                fallback={
                  <Fieldset class="bg-base-100 border-base-300 rounded-lg border p-4 space-y-3">
                    <Fieldset.Legend>Note Metadata</Fieldset.Legend>

                    <div>
                      <label class="label py-1">
                        <span class="label-text text-sm font-medium">
                          Title
                        </span>
                      </label>
                      <input
                        type="text"
                        value={note().title}
                        onInput={(e) =>
                          updateNote("title", e.currentTarget.value)
                        }
                        class="input input-bordered w-full input-sm"
                        placeholder="Note title..."
                      />
                    </div>

                    <div>
                      <label class="label py-1">
                        <span class="label-text text-sm font-medium">
                          Abstract
                        </span>
                      </label>
                      <Textarea
                        value={note().abstract}
                        onInput={(e) =>
                          updateNote("abstract", e.currentTarget.value)
                        }
                        placeholder="Brief description of the note content..."
                      />
                    </div>
                  </Fieldset>
                }
              >
                <div>
                  <h1
                    class="text-lg font-semibold break-words"
                    title={note().title}
                  >
                    {note().title}
                  </h1>
                  <div class="tooltip" data-tip={note().abstract}>
                    <p
                      class="text-sm text-base-content/60 truncate mt-1"
                      title={note().abstract}
                    >
                      {note().abstract}
                    </p>
                  </div>
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
                <Edit3 class="w-4 h-4" />
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
                  value={note().syntax}
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
                value={note().syntax}
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
          <span class="font-mono truncate mr-4">{note().path}</span>
          <span class="whitespace-nowrap text-xs">
            Modified {formatDate(note().lastModified)}
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
                {/* Preview content would be rendered here based on syntax */}
                <div class="p-4 bg-base-200 rounded-lg">
                  <p class="text-base-content/60 text-center">
                    Preview for {note().syntax} will be rendered here
                  </p>
                </div>
              </div>
            </div>
          }
        >
          <textarea
            value={note().content}
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
            <span>{note().content.split("\n").length}L</span>
            <span>{note().content.length}C</span>
            <span>
              {
                note()
                  .content.split(/\s+/)
                  .filter((w) => w.length > 0).length
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
              {syntaxOptions.find((opt) => opt.value === note().syntax)?.label}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
