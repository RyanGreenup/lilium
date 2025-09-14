import { createAsync, RouteDefinition } from "@solidjs/router";
import {
  Accessor,
  createSignal,
  For,
  JSXElement,
  Setter,
  Show,
  Suspense,
} from "solid-js";
import { VoidComponent } from "solid-js/types/server/rendering.js";
import { getUser } from "~/lib/auth";
import {
  completeChoreAction,
  getCompletions,
  loadChores,
  loadOverdueChores,
  undoChoreAction,
  updateDurationAction,
} from "~/lib/chore-actions";
import { type ChoreCompletion, type ChoreWithStatus } from "~/lib/db";
import { Alert } from "~/solid-daisy-components/components/Alert";
import { Button } from "~/solid-daisy-components/components/Button";
import { Fieldset, Label } from "~/solid-daisy-components/components/Fieldset";
import { Hero } from "~/solid-daisy-components/components/Hero";
import { Input } from "~/solid-daisy-components/components/Input";
import { Select } from "~/solid-daisy-components/components/Select";
import { Textarea } from "~/solid-daisy-components/components/Textarea";
import { Toggle } from "~/solid-daisy-components/components/Toggle";

export const route = {
  preload() {
    getUser();
  },
} satisfies RouteDefinition;

export default function Home() {
  const [checked, setChecked] = createSignal(false);
  
  // Global refresh trigger for all chore data
  const [globalRefreshTrigger, setGlobalRefreshTrigger] = createSignal(0);

  // Load real data from database with refresh capability
  const allChores = createAsync(() => {
    globalRefreshTrigger(); // Subscribe to global refresh
    return loadChores();
  });
  const overdueChores = createAsync(() => {
    globalRefreshTrigger(); // Subscribe to global refresh  
    return loadOverdueChores();
  });

  // Choose which data to display based on toggle
  const chores = () => (checked() ? overdueChores() : allChores());

  return (
    <main class="">
      <HeroComponent />
      <ToggleComponent getChecked={checked} setChecked={setChecked} />
      <Suspense
        fallback={
          <div class="loading loading-spinner loading-lg mx-auto"></div>
        }
      >
        <div class="flex justify-center">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-8 auto-rows-max">
            <Show when={chores()} fallback={<div>Loading chores...</div>}>
              <For each={chores() || []}>
                {(chore) => <ChoreForm chore={chore} onDataChange={() => setGlobalRefreshTrigger(prev => prev + 1)} />}
              </For>
            </Show>
          </div>
        </div>
      </Suspense>
    </main>
  );
}

const HeroComponent: VoidComponent = () => (
  <Hero class="inline-block rounded bg-base-200">
    <Hero.Content
      class="text-center"
      title="Chores"
      description="This list has a timeout based on the frequency of each Item."
    ></Hero.Content>
  </Hero>
);

const ToggleComponent = (props: {
  getChecked: Accessor<boolean>;
  setChecked: Setter<boolean>;
  onChange?: () => void;
}) => (
  <Fieldset class="w-xs bg-base-100 border border-base-300 p-4 rounded-box">
    <Fieldset.Legend>Show All</Fieldset.Legend>
    <Label>Hide Complete</Label>
    <Toggle
      checked={props.getChecked()}
      onChange={(e) => {
        props.setChecked(e.currentTarget.checked);
        props.onChange?.();
      }}
    />
  </Fieldset>
);

const TimeStampToDateString = (timestamp: number, includeTime?: boolean) => {
  const date = new Date(timestamp * 1000);
  if (includeTime) {
    return date.toLocaleString("en-AU", {
      timeZone: "Australia/Sydney",
      weekday: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return date.toLocaleDateString("en-AU", {
    timeZone: "Australia/Sydney",
  });
};

// Markdown rendering function
const renderMarkdown = async (markdownContent: string): Promise<string> => {
  if (!markdownContent.trim()) return "No notes";

  try {
    // Dynamically import the marked library to parse markdown to HTML
    const { marked } = await import("marked");
    // Convert the markdown content to HTML and return it
    return marked(markdownContent);
  } catch (error) {
    console.error("Failed to render markdown:", error);
    return markdownContent; // Fallback to plain text
  }
};
const ChoreForm = (props: { 
  chore: ChoreWithStatus;
  onDataChange?: () => void;
}) => {
  const [notes, setNotes] = createSignal("");
  const [duration, setDuration] = createSignal(props.chore.duration_hours);
  
  // Add refresh capability for completions data
  const [refreshTrigger, setRefreshTrigger] = createSignal(0);
  const completions = createAsync(() => {
    refreshTrigger(); // Subscribe to refresh trigger
    return getCompletions(props.chore.id, 5);
  });
  const [selectedCompletion, setSelectedCompletion] = createSignal<
    ChoreCompletion | undefined
  >();

  // Create reactive markdown rendering for selected completion notes
  const renderedNotes = createAsync(async () => {
    const completion = selectedCompletion();
    const notesContent = completion?.notes || "";
    return renderMarkdown(notesContent);
  });

  // Form feedback signals
  const [durationSuccess, setDurationSuccess] = createSignal(false);
  const [durationError, setDurationError] = createSignal(false);
  const [completeSuccess, setCompleteSuccess] = createSignal(false);
  const [completeError, setCompleteError] = createSignal(false);
  const [undoSuccess, setUndoSuccess] = createSignal(false);
  const [undoError, setUndoError] = createSignal(false);

  // Form submission handlers
  const handleDurationSubmit = async (event: Event) => {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);

    try {
      await fetch(form.action, { method: "POST", body: formData });
      setDurationSuccess(true);
      
      // Update the local duration state
      setDuration(parseInt(formData.get("durationHours") as string) || 24);
      
      // Refresh main chore data (duration change affects overdue status)
      props.onDataChange?.();
      
      setTimeout(() => setDurationSuccess(false), 3000);
    } catch (error) {
      setDurationError(true);
      setTimeout(() => setDurationError(false), 3000);
    }
  };

  const handleCompleteSubmit = async (event: Event) => {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);

    try {
      await fetch(form.action, { method: "POST", body: formData });
      setCompleteSuccess(true);
      setNotes("");
      
      // Refresh completions data
      setRefreshTrigger(prev => prev + 1);
      
      // Refresh main chore data (completion changes overdue status)
      props.onDataChange?.();
      
      setTimeout(() => setCompleteSuccess(false), 3000);
    } catch (error) {
      setCompleteError(true);
      setTimeout(() => setCompleteError(false), 3000);
    }
  };

  const handleUndoSubmit = async (event: Event) => {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);

    try {
      await fetch(form.action, { method: "POST", body: formData });
      setUndoSuccess(true);
      
      // Refresh completions data
      setRefreshTrigger(prev => prev + 1);
      
      // Refresh main chore data (undo changes overdue status)
      props.onDataChange?.();
      
      setTimeout(() => setUndoSuccess(false), 3000);
    } catch (error) {
      setUndoError(true);
      setTimeout(() => setUndoError(false), 3000);
    }
  };

  const statusColor = props.chore.is_overdue
    ? "border-error"
    : "border-success";
  const lastCompleted = props.chore.last_completed
    ? TimeStampToDateString(
        new Date(props.chore.last_completed + "Z").getTime() / 1000,
        true,
      )
    : "Never";

  // Animation classes based on form states
  const formAnimationClasses = () => {
    const hasSuccess = durationSuccess() || completeSuccess() || undoSuccess();
    const hasError = durationError() || completeError() || undoError();

    if (hasSuccess) {
      return "transition-all duration-500 ease-out scale-105 rotate-1 shadow-lg ring-2 ring-success/50";
    } else if (hasError) {
      return "transition-all duration-300 ease-out animate-pulse ring-2 ring-error/50 rotate-0 scale-[1.02]";
    } else {
      return "transition-all duration-300 ease-in-out hover:scale-[1.01] rotate-0 scale-100";
    }
  };

  return (
    <Fieldset
      class={`w-xs bg-base-200 border ${statusColor} p-4 rounded-box ${formAnimationClasses()}`}
    >
      <Fieldset.Legend>{props.chore.name}</Fieldset.Legend>

      <p class="label">
        Previous: {lastCompleted}
        {props.chore.is_overdue && (
          <span class="text-error ml-2">(Overdue)</span>
        )}
      </p>

      <Details title="Details">
        <Label>Previous Completions</Label>
        <Select
          onChange={(e) => {
            const completionId = e.currentTarget.value;
            const completion = completions()?.find(
              (c) => c.id === completionId,
            );
            setSelectedCompletion(completion);
          }}
        >
          <option value="">Select completion...</option>
          <For each={completions() || []}>
            {(completion) => (
              <option value={completion.id}>
                {TimeStampToDateString(
                  new Date(completion.completed_at + "Z").getTime() / 1000,
                )}
              </option>
            )}
          </For>
        </Select>

        <Label>Notes from Selected Completion</Label>
        <div class="bg-base-100 border border-base-300 p-3 rounded-box max-h-80 overflow-auto mb-4 prose prose-sm dark:prose-invert max-w-none">
          <Show when={selectedCompletion()}>
            <Suspense fallback={<div>Rendering notes...</div>}>
              <div innerHTML={renderedNotes() || "No notes"} />
            </Suspense>
          </Show>
          <Show when={!selectedCompletion()}>
            <div>No notes</div>
          </Show>
        </div>

        <form
          action={updateDurationAction}
          method="post"
          onSubmit={handleDurationSubmit}
        >
          <input type="hidden" name="choreId" value={props.chore.id} />
          <Label>Duration Interval (H)</Label>
          <Input
            type="number"
            name="durationHours"
            value={duration()}
            onInput={(e) => setDuration(parseInt(e.currentTarget.value) || 24)}
            placeholder="Duration Between Completion"
          />
          <div class="flex items-center gap-2 mt-2">
            <Button type="submit" size="sm" color="secondary">
              Update Duration
            </Button>
            <Show when={durationSuccess()}>
              <Alert color="success" class="alert-sm">
                <span class="text-xs">Updated!</span>
              </Alert>
            </Show>
            <Show when={durationError()}>
              <Alert color="error" class="alert-sm">
                <span class="text-xs">Error!</span>
              </Alert>
            </Show>
          </div>
        </form>
      </Details>

      <form
        action={completeChoreAction}
        method="post"
        class="mt-4"
        onSubmit={handleCompleteSubmit}
      >
        <input type="hidden" name="choreId" value={props.chore.id} />
        <Label>Notes</Label>
        <Textarea
          class="font-mono"
          name="notes"
          value={notes()}
          onInput={(e) => setNotes(e.currentTarget.value)}
          placeholder="Add notes for this completion..."
        />
        <div class="flex items-center gap-2 mt-4">
          <Button type="submit" size="sm" color="primary">
            Mark Completed
          </Button>
          <Show when={completeSuccess()}>
            <Alert color="success" class="alert-sm">
              <span class="text-xs">Completed!</span>
            </Alert>
          </Show>
          <Show when={completeError()}>
            <Alert color="error" class="alert-sm">
              <span class="text-xs">Error!</span>
            </Alert>
          </Show>
        </div>
      </form>

      <form
        action={undoChoreAction}
        method="post"
        class="mt-2"
        onSubmit={handleUndoSubmit}
      >
        <input type="hidden" name="choreId" value={props.chore.id} />
        <div class="flex items-center gap-2">
          <div
            class="tooltip"
            data-tip="The comment will be lost! (DELETE FROM chore_completsions where ..."
          >
            <Button
              type="submit"
              size="sm"
              color="error"
              disabled={!props.chore.last_completed}
            >
              Mark Not Completed
            </Button>
          </div>
          <Show when={undoSuccess()}>
            <Alert color="success" class="alert-sm">
              <span class="text-xs">Undone!</span>
            </Alert>
          </Show>
          <Show when={undoError()}>
            <Alert color="error" class="alert-sm">
              <span class="text-xs">Error!</span>
            </Alert>
          </Show>
        </div>
      </form>
    </Fieldset>
  );
};

const Details = (props: { children: JSXElement; title: string }) => (
  <details class="collapse collapse-arrow bg-base-100 border-base-300 border">
    <summary class="collapse-title font-semibold">{props.title}</summary>
    <div class="collapse-content text-sm">{props.children}</div>
  </details>
);
