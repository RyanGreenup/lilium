import { Accessor, createSignal, For, JSXElement, Setter, Suspense, Show } from "solid-js";
import { createAsync, RouteDefinition } from "@solidjs/router";
import { VoidComponent } from "solid-js/types/server/rendering.js";
import { Button } from "~/solid-daisy-components/components/Button";
import { Fieldset, Label } from "~/solid-daisy-components/components/Fieldset";
import { Hero } from "~/solid-daisy-components/components/Hero";
import { Input } from "~/solid-daisy-components/components/Input";
import { Select } from "~/solid-daisy-components/components/Select";
import { Textarea } from "~/solid-daisy-components/components/Textarea";
import { Toggle } from "~/solid-daisy-components/components/Toggle";
import { type ChoreWithStatus, type ChoreCompletion } from "~/lib/db";
import { loadChores, loadOverdueChores, completeChoreAction, undoChoreAction, updateDurationAction, getCompletions } from "~/lib/chore-actions";
import { getUser } from "~/lib/auth";

export const route = {
  preload() {
    getUser();
  },
} satisfies RouteDefinition;

export default function Home() {
  const [checked, setChecked] = createSignal(false);
  const allChores = createAsync(() => loadChores());
  const overdueChores = createAsync(() => loadOverdueChores());

  // Choose which data to display based on toggle
  const chores = () => checked() ? overdueChores() : allChores();

  return (
    <main class="">
      <HeroComponent />
      <ToggleComponent getChecked={checked} setChecked={setChecked} />
      <Suspense fallback={<div class="loading loading-spinner loading-lg mx-auto"></div>}>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-8 auto-rows-max">
          <Show when={chores()} fallback={<div>Loading chores...</div>}>
            <For each={chores() || []}>
              {(chore) => (
                <ChoreForm chore={chore} />
              )}
            </For>
          </Show>
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
    return date.toLocaleString("en-GB", {
      weekday: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return date.toDateString();
};
const ChoreForm = (props: {
  chore: ChoreWithStatus;
}) => {
  const [notes, setNotes] = createSignal("");
  const [duration, setDuration] = createSignal(props.chore.duration_hours);
  const completions = createAsync(() => getCompletions(props.chore.id, 5));
  const [selectedCompletion, setSelectedCompletion] = createSignal<ChoreCompletion | undefined>();

  const statusColor = props.chore.is_overdue ? "border-error" : "border-success";
  const lastCompleted = props.chore.last_completed
    ? TimeStampToDateString(new Date(props.chore.last_completed).getTime() / 1000, true)
    : "Never";

  return (
    <Fieldset class={`w-xs bg-base-200 border ${statusColor} p-4 rounded-box`}>
      <Fieldset.Legend>{props.chore.name}</Fieldset.Legend>

      <p class="label">
        Previous: {lastCompleted}
        {props.chore.is_overdue && <span class="text-error ml-2">(Overdue)</span>}
      </p>

      <Details title="Details">
        <Label>Previous Completions</Label>
        <Select onChange={(e) => {
          const completionId = e.currentTarget.value;
          const completion = completions()?.find(c => c.id === completionId);
          setSelectedCompletion(completion);
        }}>
          <option value="">Select completion...</option>
          <For each={completions() || []}>
            {(completion) => (
              <option value={completion.id}>
                {TimeStampToDateString(new Date(completion.completed_at).getTime() / 1000)}
              </option>
            )}
          </For>
        </Select>

        <Label>Notes from Selected Completion</Label>
        <div class="bg-base-100 border border-base-300 p-3 rounded-box max-h-[6.25rem] overflow-auto mb-4">
          {selectedCompletion()?.notes || "No notes"}
        </div>
      </Details>

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
        <Button
          type="submit"
          size="sm"
          color="secondary"
          class="mt-2"
        >
          Update Duration
        </Button>
      </form>

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
        <div class="flex gap-2 mt-4">
          <Button
            type="submit"
            size="sm"
            color="primary"
          >
            Mark Completed
          </Button>
        </div>
      </form>

      <form action={undoChoreAction} method="post" class="mt-2">
        <input type="hidden" name="choreId" value={props.chore.id} />
        <Button
          type="submit"
          size="sm"
          color="error"
          disabled={!props.chore.last_completed}
        >
          Mark Not Completed
        </Button>
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

