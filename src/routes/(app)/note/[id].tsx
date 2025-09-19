import { useParams } from "@solidjs/router";
import { createSignal, createEffect, Show } from "solid-js";
import { Save, Eye, Edit3, FileText, Settings } from "lucide-solid";
import { Tabs } from "~/solid-daisy-components/components/Tabs";
import { Toggle } from "~/solid-daisy-components/components/Toggle";

interface Note {
  id: string;
  title: string;
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
    path: "/notes/computer-science/ai/ml-pipeline.md"
  });

  const [isEditing, setIsEditing] = createSignal(true);
  const [previewMode, setPreviewMode] = createSignal(false);
  const [unsavedChanges, setUnsavedChanges] = createSignal(false);

  const syntaxOptions = [
    { value: "markdown", label: "Markdown", extension: ".md" },
    { value: "org", label: "Org Mode", extension: ".org" },
    { value: "html", label: "HTML", extension: ".html" },
    { value: "jsx", label: "JSX", extension: ".jsx" }
  ];

  const updateNote = (field: keyof Note, value: any) => {
    setNote(prev => ({ ...prev, [field]: value }));
    setUnsavedChanges(true);
  };

  const saveNote = () => {
    // TODO: Implement actual save functionality
    console.log("Saving note:", note());
    setUnsavedChanges(false);
    setNote(prev => ({ ...prev, lastModified: new Date().toISOString() }));
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString();
  };

  return (
    <div class="h-full flex flex-col">
      {/* Header */}
      <div class="flex items-center justify-between p-4 border-b border-base-300 bg-base-200">
        <div class="flex items-center gap-4 flex-1">
          <FileText class="w-5 h-5 text-base-content/70" />
          <input
            type="text"
            value={note().title}
            onInput={(e) => updateNote("title", e.currentTarget.value)}
            class="input input-ghost text-lg font-semibold flex-1 p-0 h-auto border-none focus:outline-none"
            placeholder="Note title..."
          />
        </div>
        
        <div class="flex items-center gap-2">
          {/* Syntax Selector */}
          <select
            value={note().syntax}
            onChange={(e) => updateNote("syntax", e.currentTarget.value)}
            class="select select-sm select-bordered"
          >
            {syntaxOptions.map(option => (
              <option value={option.value}>{option.label}</option>
            ))}
          </select>

          {/* Preview Toggle */}
          <div class="form-control">
            <label class="label cursor-pointer gap-2">
              <Eye class="w-4 h-4" />
              <Toggle
                size="sm"
                checked={previewMode()}
                onChange={(e) => setPreviewMode(e.currentTarget.checked)}
              />
            </label>
          </div>

          {/* Save Button */}
          <button
            onClick={saveNote}
            class={`btn btn-sm ${unsavedChanges() ? 'btn-primary' : 'btn-ghost'}`}
            disabled={!unsavedChanges()}
          >
            <Save class="w-4 h-4" />
            {unsavedChanges() ? 'Save' : 'Saved'}
          </button>
        </div>
      </div>

      {/* Metadata */}
      <div class="px-4 py-2 bg-base-100 border-b border-base-300 text-sm text-base-content/60">
        <div class="flex items-center justify-between">
          <span class="font-mono">{note().path}</span>
          <span>Last modified: {formatDate(note().lastModified)}</span>
        </div>
      </div>

      {/* Content Area */}
      <div class="flex-1 flex">
        <Show when={!previewMode()} fallback={
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
        }>
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
          <span>
            Lines: {note().content.split('\n').length} | 
            Characters: {note().content.length} | 
            Words: {note().content.split(/\s+/).filter(w => w.length > 0).length}
          </span>
          <div class="flex items-center gap-4">
            <span>Syntax: {syntaxOptions.find(opt => opt.value === note().syntax)?.label}</span>
            {unsavedChanges() && (
              <span class="text-warning">● Unsaved changes</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}