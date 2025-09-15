import { createAsync, RouteDefinition, useSubmission } from "@solidjs/router";
import {
  Accessor,
  createEffect,
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
  const [searchTerm, setSearchTerm] = createSignal("");

  // Load data using SolidJS router cache
  const allChores = createAsync(() => loadChores());
  const overdueChores = createAsync(() => loadOverdueChores());

  // Choose which data to display based on toggle, then filter by search
  const chores = () => {
    const baseChores = checked() ? overdueChores() : allChores();
    const search = searchTerm().toLowerCase().trim();

    if (!search || !baseChores) return baseChores;

    return baseChores.filter((chore) =>
      chore.name.toLowerCase().includes(search),
    );
  };

  return (
    <main class="">
      <HeroComponent />
      <div class="flex gap-4 mb-4 flex-wrap">
        <SearchComponent
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
        />
        <ToggleComponent getChecked={checked} setChecked={setChecked} />
      </div>
      <Suspense
        fallback={
          <div class="loading loading-spinner loading-lg mx-auto"></div>
        }
      >
        <div class="flex justify-center">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-8 auto-rows-max">
            <Show when={chores()} fallback={<div>Loading chores...</div>}>
              <For each={chores() || []}>
                {(chore) => <ChoreForm chore={chore} />}
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

const SearchComponent = (props: {
  searchTerm: Accessor<string>;
  setSearchTerm: Setter<string>;
}) => (
  <Fieldset class="flex-1 max-w-md bg-base-100 border border-base-300 p-4 rounded-box">
    <Fieldset.Legend>Search</Fieldset.Legend>
    <Label>Filter Chores</Label>
    <Input
      type="text"
      placeholder="Search chore names..."
      value={props.searchTerm()}
      onInput={(e) => props.setSearchTerm(e.currentTarget.value)}
      class="w-full"
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
const ChoreForm = (props: { chore: ChoreWithStatus }) => {
  const [notes, setNotes] = createSignal("");
  const [duration, setDuration] = createSignal(props.chore.duration_hours);

  // Use SolidJS submissions for form handling
  const completeSubmission = useSubmission(completeChoreAction);
  const undoSubmission = useSubmission(undoChoreAction);
  const updateDurationSubmission = useSubmission(updateDurationAction);

  // Load completions with automatic refresh when submissions complete
  const completions = createAsync(() => {
    // React to completion changes
    completeSubmission.result;
    undoSubmission.result;
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

  // Clear notes when completion is successful
  createEffect(() => {
    if (completeSubmission.result && !completeSubmission.pending) {
      setNotes("");
    }
  });

  // Update local duration when duration update is successful
  createEffect(() => {
    if (updateDurationSubmission.result && !updateDurationSubmission.pending) {
      const input = updateDurationSubmission.input as FormData;
      const newDuration = parseInt(input.get("durationHours") as string) || 24;
      setDuration(newDuration);
    }
  });

  const statusColor = props.chore.is_overdue
    ? "border-error"
    : "border-success";
  const lastCompleted = props.chore.last_completed
    ? TimeStampToDateString(
        new Date(props.chore.last_completed + "Z").getTime() / 1000,
        true,
      )
    : "Never";

  return (
    <Fieldset
      class={`w-xs bg-base-200 border ${statusColor} p-4 rounded-box transition-all duration-300 ease-in-out hover:scale-[1.01]`}
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

        <form action={updateDurationAction} method="post">
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
            <Button
              type="submit"
              size="sm"
              color="secondary"
              disabled={updateDurationSubmission.pending}
            >
              {updateDurationSubmission.pending
                ? "Updating..."
                : "Update Duration"}
            </Button>
          </div>
        </form>
      </Details>

      <form action={completeChoreAction} method="post" class="mt-4">
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
          <Button
            type="submit"
            size="sm"
            color="primary"
            // disabled={completeSubmission.pending}
          >
            {/*This flashes the user, too disruptive*/}
            {/*{completeSubmission.pending ? "Completing..." : "Mark Completed"}*/}
            Mark Completed
          </Button>
        </div>
      </form>

      <form action={undoChoreAction} method="post" class="mt-2">
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
              // disabled={!props.chore.last_completed || undoSubmission.pending}
              disabled={!props.chore.last_completed}
            >
              {/*This flashes the user, too disruptive*/}
              {/*{undoSubmission.pending ? "Undoing..." : "Mark Not Completed"}*/}
              Mark Not Completed
            </Button>
          </div>
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
