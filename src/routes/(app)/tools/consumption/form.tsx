import {
  Accessor,
  createSignal,
  For,
  JSXElement,
  Setter,
  Suspense,
  Show,
} from "solid-js";
import { createAsync, RouteDefinition } from "@solidjs/router";
import { VoidComponent } from "solid-js/types/server/rendering.js";
import { Alert } from "~/solid-daisy-components/components/Alert";
import { Button } from "~/solid-daisy-components/components/Button";
import { Fieldset, Label } from "~/solid-daisy-components/components/Fieldset";
import { Hero } from "~/solid-daisy-components/components/Hero";
import { Input } from "~/solid-daisy-components/components/Input";
import { Select } from "~/solid-daisy-components/components/Select";
import { Textarea } from "~/solid-daisy-components/components/Textarea";
import { Toggle } from "~/solid-daisy-components/components/Toggle";
import {
  type ConsumptionItemWithStatus,
  type ConsumptionEntry,
} from "~/lib/consumption-db";
import {
  loadConsumptionItems,
  loadOverdueConsumptionItems,
  createConsumptionAction,
  updateConsumptionAction,
  deleteConsumptionAction,
  getConsumptionHistory,
} from "~/lib/consumption-actions";
import { getUser } from "~/lib/auth";
import { FirstLetterAvatar } from "~/components/FirstLetterAvatar";

export const route = {
  preload() {
    getUser();
  },
} satisfies RouteDefinition;

export default function ConsumptionTracker() {
  const [showOnlyOverdue, setShowOnlyOverdue] = createSignal(false);

  // Load real data from database
  const allConsumptions = createAsync(() => loadConsumptionItems());
  const overdueConsumptions = createAsync(() => loadOverdueConsumptionItems());

  // Choose which data to display based on toggle
  const consumptions = () =>
    showOnlyOverdue() ? overdueConsumptions() : allConsumptions();

  return (
    <main class="">
      <HeroComponent />
      <ToggleComponent
        getChecked={showOnlyOverdue}
        setChecked={setShowOnlyOverdue}
      />
      <Suspense
        fallback={
          <div class="loading loading-spinner loading-lg mx-auto"></div>
        }
      >
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-8 auto-rows-max">
          <Show
            when={consumptions()}
            fallback={<div>Loading consumption items...</div>}
          >
            <For each={consumptions() || []}>
              {(item) => <ConsumptionForm item={item} />}
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
      title="Consumption Tracker"
      description="Track your intake with specified intervals between consumptions."
    ></Hero.Content>
  </Hero>
);

const ToggleComponent = (props: {
  getChecked: Accessor<boolean>;
  setChecked: Setter<boolean>;
  onChange?: () => void;
}) => (
  <Fieldset class="w-xs bg-base-100 border border-base-300 p-4 rounded-box">
    <Fieldset.Legend>Filter Options</Fieldset.Legend>
    <Label>Show Only Overdue</Label>
    <Toggle
      checked={props.getChecked()}
      onChange={(e) => {
        props.setChecked(e.currentTarget.checked);
        props.onChange?.();
      }}
    />
  </Fieldset>
);

const TimeStampToDateString = (
  timestamp: string | null,
  includeTime?: boolean,
) => {
  if (!timestamp) return "Never";

  // Handle different timestamp formats
  let date: Date;
  if (timestamp.includes("T")) {
    // ISO format: "2025-09-07T00:00:00.000Z" or "2025-09-07T00:00:00.000"
    if (!timestamp.endsWith("Z")) {
      date = new Date(timestamp + "Z");
    } else {
      date = new Date(timestamp);
    }
  } else {
    // SQLite format: "2025-09-14 08:04:38"
    date = new Date(timestamp + "Z");
  }

  if (includeTime) {
    return date.toLocaleString("en-AU", {
      timeZone: "Australia/Sydney",
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return date.toLocaleDateString("en-AU", {
    timeZone: "Australia/Sydney",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const ConsumptionForm = (props: { item: ConsumptionItemWithStatus }) => {
  const [notes, setNotes] = createSignal("");
  const [quantity, setQuantity] = createSignal(1);
  // Initialize with today's date
  const getToday = () => {
    const now = new Date();
    // Use standard toISOString and extract date portion
    return now.toISOString().split("T")[0]; // Returns YYYY-MM-DD format
  };
  const [consumptionDate, setConsumptionDate] = createSignal(getToday());

  // Load consumption history
  const history = createAsync(() => getConsumptionHistory(props.item.id, 10));

  const [selectedHistoryEntry, setSelectedHistoryEntry] = createSignal<
    ConsumptionEntry | undefined
  >();
  const [isEditingEntry, setIsEditingEntry] = createSignal(false);
  const [editDate, setEditDate] = createSignal("");
  const [editQuantity, setEditQuantity] = createSignal(1);
  const [editNotes, setEditNotes] = createSignal("");

  // Form feedback signals
  const [addSuccess, setAddSuccess] = createSignal(false);
  const [addError, setAddError] = createSignal(false);
  const [updateSuccess, setUpdateSuccess] = createSignal(false);
  const [updateError, setUpdateError] = createSignal(false);
  const [deleteSuccess, setDeleteSuccess] = createSignal(false);
  const [deleteError, setDeleteError] = createSignal(false);

  // Form submission handlers
  const handleAddConsumption = async (event: Event) => {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);

    try {
      await fetch(form.action, { method: "POST", body: formData });
      setAddSuccess(true);
      setNotes("");
      setQuantity(1);
      setConsumptionDate(getToday());
      setTimeout(() => setAddSuccess(false), 3000);
    } catch (error) {
      setAddError(true);
      setTimeout(() => setAddError(false), 3000);
    }
  };

  const handleUpdateConsumption = async (event: Event) => {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);

    try {
      await fetch(form.action, { method: "POST", body: formData });
      setUpdateSuccess(true);
      setIsEditingEntry(false);
      setTimeout(() => setUpdateSuccess(false), 3000);
    } catch (error) {
      setUpdateError(true);
      setTimeout(() => setUpdateError(false), 3000);
    }
  };

  const startEditingEntry = (entry: ConsumptionEntry) => {
    // Convert ISO date to YYYY-MM-DD format for date input
    const dateOnly = entry.consumed_at.split("T")[0];
    setEditDate(dateOnly);
    setEditQuantity(entry.quantity);
    setEditNotes(entry.notes || "");
    setIsEditingEntry(true);
  };

  const cancelEditingEntry = () => {
    setIsEditingEntry(false);
    setEditDate("");
    setEditQuantity(1);
    setEditNotes("");
  };

  const handleDeleteConsumption = async (entryId: string) => {
    try {
      const formData = new FormData();
      formData.append("entryId", entryId);
      await deleteConsumptionAction(formData);
      setDeleteSuccess(true);
      setTimeout(() => setDeleteSuccess(false), 3000);
    } catch (error) {
      setDeleteError(true);
      setTimeout(() => setDeleteError(false), 3000);
    }
  };

  const statusColor = props.item.is_overdue ? "border-error" : "border-success";
  const lastConsumed = TimeStampToDateString(props.item.last_consumed_at, true);
  const intervalText =
    props.item.interval_days >= 30
      ? `${Math.floor(props.item.interval_days / 30)} month${Math.floor(props.item.interval_days / 30) !== 1 ? "s" : ""}`
      : props.item.interval_days >= 7
        ? `${Math.floor(props.item.interval_days / 7)} week${Math.floor(props.item.interval_days / 7) !== 1 ? "s" : ""}`
        : `${props.item.interval_days} day${props.item.interval_days !== 1 ? "s" : ""}`;

  // Animation classes based on form states
  const formAnimationClasses = () => {
    const hasSuccess = addSuccess() || updateSuccess() || deleteSuccess();
    const hasError = addError() || updateError() || deleteError();

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
      <Fieldset.Legend>
        <div class="flex items-center gap-2">
          <FirstLetterAvatar name={props.item.id} showIcon={true} />
          {/*Leave this, I like it without*/}
          <span>{props.item.name}</span>
        </div>
      </Fieldset.Legend>

      <p class="label">
        Last Consumed: {lastConsumed}
        {props.item.is_overdue && (
          <span class="text-error ml-2">(Overdue)</span>
        )}
      </p>
      <p class="text-sm opacity-70 mb-2">Interval: {intervalText}</p>

      <Details title="History & Details">
        <Label>Previous Consumptions</Label>
        <Select
          onChange={(e) => {
            const entryId = e.currentTarget.value;
            const entry = history()?.find((h) => h.id === entryId);
            setSelectedHistoryEntry(entry);
          }}
        >
          <option value="">Select entry...</option>
          <For each={history() || []}>
            {(entry) => (
              <option value={entry.id}>
                {TimeStampToDateString(entry.consumed_at)} - Qty:{" "}
                {entry.quantity}
              </option>
            )}
          </For>
        </Select>

        <Show when={selectedHistoryEntry()}>
          <div class="mt-2 p-3 bg-base-100 rounded border">
            <Show when={!isEditingEntry()}>
              <div>
                <p class="text-xs mb-1">
                  <strong>Date:</strong>{" "}
                  {TimeStampToDateString(
                    selectedHistoryEntry()?.consumed_at,
                    true,
                  )}
                </p>
                <p class="text-xs mb-1">
                  <strong>Quantity:</strong> {selectedHistoryEntry()?.quantity}
                </p>
                <p class="text-xs mb-3">
                  <strong>Notes:</strong>{" "}
                  {selectedHistoryEntry()?.notes || "No notes"}
                </p>
                <div class="flex gap-2">
                  <Button
                    size="xs"
                    color="secondary"
                    onClick={() => startEditingEntry(selectedHistoryEntry())}
                  >
                    Edit
                  </Button>
                  <Button
                    size="xs"
                    color="error"
                    onClick={() =>
                      handleDeleteConsumption(selectedHistoryEntry()?.id)
                    }
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </Show>

            <Show when={isEditingEntry()}>
              <form
                action={updateConsumptionAction}
                method="post"
                onSubmit={handleUpdateConsumption}
              >
                <input
                  type="hidden"
                  name="entryId"
                  value={selectedHistoryEntry()?.id}
                />
                <Label class="text-xs">Edit Date</Label>
                <Input
                  type="date"
                  name="consumedAt"
                  value={editDate()}
                  onInput={(e) => setEditDate(e.currentTarget.value)}
                  class="mb-2 text-xs"
                />

                <Label class="text-xs">Edit Quantity</Label>
                <Input
                  type="number"
                  name="quantity"
                  min="0.1"
                  step="0.1"
                  value={editQuantity()}
                  onInput={(e) =>
                    setEditQuantity(parseFloat(e.currentTarget.value) || 1)
                  }
                  class="mb-2 text-xs"
                />

                <Label class="text-xs">Edit Notes</Label>
                <Textarea
                  name="notes"
                  value={editNotes()}
                  onInput={(e) => setEditNotes(e.currentTarget.value)}
                  placeholder="Edit notes..."
                  rows="2"
                  class="mb-3 text-xs font-mono"
                />

                <div class="flex gap-2">
                  <Button type="submit" size="xs" color="primary">
                    Save
                  </Button>
                  <Button
                    type="button"
                    size="xs"
                    color="ghost"
                    onClick={cancelEditingEntry}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Show>
          </div>
        </Show>

        <Show when={updateSuccess()}>
          <Alert color="success" class="alert-sm mt-2">
            <span class="text-xs">Updated!</span>
          </Alert>
        </Show>
        <Show when={updateError()}>
          <Alert color="error" class="alert-sm mt-2">
            <span class="text-xs">Update Error!</span>
          </Alert>
        </Show>
      </Details>

      {/* Add New Consumption Form */}
      <form
        class="mt-4"
        action={createConsumptionAction}
        method="post"
        onSubmit={handleAddConsumption}
      >
        <input type="hidden" name="consumptionItemId" value={props.item.id} />

        <Label class="text-xs">Date</Label>
        <Input
          type="date"
          name="consumedAt"
          value={consumptionDate()}
          onInput={(e) => setConsumptionDate(e.currentTarget.value)}
        />

        <Label class="text-xs">Quantity</Label>
        <Input
          type="number"
          name="quantity"
          min="0.1"
          step="0.1"
          value={quantity()}
          onInput={(e) => setQuantity(parseFloat(e.currentTarget.value) || 1)}
          placeholder="Quantity consumed"
        />

        <Label class="text-xs">Notes</Label>
        <Textarea
          class="font-mono text-xs"
          name="notes"
          value={notes()}
          onInput={(e) => setNotes(e.currentTarget.value)}
          placeholder="Add notes about this consumption..."
          rows="2"
        />

        <div class="flex items-center gap-2 mt-4">
          <Button type="submit" size="sm" color="primary">
            Add Consumption
          </Button>
          <Show when={addSuccess()}>
            <Alert color="success" class="alert-sm">
              <span class="text-xs">Added!</span>
            </Alert>
          </Show>
          <Show when={addError()}>
            <Alert color="error" class="alert-sm">
              <span class="text-xs">Error!</span>
            </Alert>
          </Show>
        </div>
      </form>

      <Show when={deleteSuccess()}>
        <Alert color="success" class="alert-sm mt-2">
          <span class="text-xs">Deleted!</span>
        </Alert>
      </Show>
      <Show when={deleteError()}>
        <Alert color="error" class="alert-sm mt-2">
          <span class="text-xs">Delete Error!</span>
        </Alert>
      </Show>
    </Fieldset>
  );
};

const Details = (props: { children: JSXElement; title: string }) => (
  <details class="collapse collapse-arrow bg-base-100 border-base-300 border mb-2">
    <summary class="collapse-title font-semibold text-sm">
      {props.title}
    </summary>
    <div class="collapse-content text-sm">{props.children}</div>
  </details>
);
