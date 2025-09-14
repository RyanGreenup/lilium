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
// TODO: Add consumption types after database implementation
// import { type ConsumptionWithStatus, type ConsumptionEntry } from "~/lib/db";
// import {
//   loadConsumptionItems,
//   loadOverdueConsumptions,
//   createConsumptionAction,
//   updateConsumptionAction,
//   deleteConsumptionAction,
//   getConsumptionHistory,
// } from "~/lib/consumption-actions";
import { getUser } from "~/lib/auth";

export const route = {
  preload() {
    getUser();
  },
} satisfies RouteDefinition;

// Mock data for layout testing
const mockConsumptionItems = [
  { id: "1", name: "Lemons", intervalDays: 30, lastConsumed: null, isOverdue: false },
  { id: "2", name: "Meat", intervalDays: 90, lastConsumed: "2024-12-01", isOverdue: true },
  { id: "3", name: "Candy", intervalDays: 14, lastConsumed: "2024-12-10", isOverdue: false },
  { id: "4", name: "Kale", intervalDays: 14, lastConsumed: null, isOverdue: false },
  { id: "5", name: "Turmeric", intervalDays: 14, lastConsumed: "2024-11-20", isOverdue: true },
];

export default function ConsumptionTracker() {
  const [showOnlyOverdue, setShowOnlyOverdue] = createSignal(false);
  
  // Mock async data - replace with actual async calls later
  const allConsumptions = () => mockConsumptionItems;
  const overdueConsumptions = () => mockConsumptionItems.filter(item => item.isOverdue);

  // Choose which data to display based on toggle
  const consumptions = () => (showOnlyOverdue() ? overdueConsumptions() : allConsumptions());

  return (
    <main class="">
      <HeroComponent />
      <ToggleComponent getChecked={showOnlyOverdue} setChecked={setShowOnlyOverdue} />
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-8 auto-rows-max">
        <For each={consumptions() || []}>
          {(item) => <ConsumptionForm item={item} />}
        </For>
      </div>
    </main>
  );
}

const HeroComponent: VoidComponent = () => (
  <Hero class="inline-block rounded bg-base-200">
    <Hero.Content
      class="text-center"
      title="Food Consumption Tracker"
      description="Track your medical dietary restrictions with specified intervals between consumptions."
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

const TimeStampToDateString = (timestamp: string | null, includeTime?: boolean) => {
  if (!timestamp) return "Never";
  const date = new Date(timestamp + "Z");
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

const ConsumptionForm = (props: { item: any }) => {
  const [notes, setNotes] = createSignal("");
  const [quantity, setQuantity] = createSignal(1);
  const [consumptionDate, setConsumptionDate] = createSignal(new Date().toISOString().split('T')[0]);
  
  // Mock history data - replace with actual async call later
  const history = () => [
    { id: "1", consumedAt: "2024-11-15", notes: "Had some with lunch", quantity: 2 },
    { id: "2", consumedAt: "2024-10-20", notes: "Small portion", quantity: 1 },
  ];

  const [selectedHistoryEntry, setSelectedHistoryEntry] = createSignal<any | undefined>();
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

  // Form submission handlers (mock implementations)
  const handleAddConsumption = async (event: Event) => {
    event.preventDefault();
    // TODO: Implement actual API call
    console.log("Adding consumption:", { notes: notes(), quantity: quantity(), date: consumptionDate() });
    setAddSuccess(true);
    setNotes("");
    setQuantity(1);
    setTimeout(() => setAddSuccess(false), 3000);
  };

  const handleUpdateConsumption = async (event: Event) => {
    event.preventDefault();
    const entryToUpdate = selectedHistoryEntry();
    if (!entryToUpdate) return;
    
    // TODO: Implement actual API call
    console.log("Updating consumption:", {
      id: entryToUpdate.id,
      date: editDate(),
      quantity: editQuantity(),
      notes: editNotes()
    });
    
    setUpdateSuccess(true);
    setIsEditingEntry(false);
    setTimeout(() => setUpdateSuccess(false), 3000);
  };

  const startEditingEntry = (entry: any) => {
    setEditDate(entry.consumedAt);
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
    // TODO: Implement actual API call
    console.log("Deleting consumption:", entryId);
    setDeleteSuccess(true);
    setTimeout(() => setDeleteSuccess(false), 3000);
  };

  const statusColor = props.item.isOverdue ? "border-error" : "border-success";
  const lastConsumed = TimeStampToDateString(props.item.lastConsumed, true);
  const intervalText = props.item.intervalDays >= 30 
    ? `${Math.floor(props.item.intervalDays / 30)} month${Math.floor(props.item.intervalDays / 30) !== 1 ? 's' : ''}`
    : props.item.intervalDays >= 7 
      ? `${Math.floor(props.item.intervalDays / 7)} week${Math.floor(props.item.intervalDays / 7) !== 1 ? 's' : ''}`
      : `${props.item.intervalDays} day${props.item.intervalDays !== 1 ? 's' : ''}`;

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
      <Fieldset.Legend>{props.item.name}</Fieldset.Legend>

      <p class="label">
        Last Consumed: {lastConsumed}
        {props.item.isOverdue && (
          <span class="text-error ml-2">(Overdue)</span>
        )}
      </p>
      <p class="text-sm opacity-70 mb-2">
        Interval: {intervalText}
      </p>

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
                {TimeStampToDateString(entry.consumedAt)} - Qty: {entry.quantity}
              </option>
            )}
          </For>
        </Select>

        <Show when={selectedHistoryEntry()}>
          <div class="mt-2 p-3 bg-base-100 rounded border">
            <Show when={!isEditingEntry()}>
              <div>
                <p class="text-xs mb-1"><strong>Date:</strong> {TimeStampToDateString(selectedHistoryEntry()?.consumedAt, true)}</p>
                <p class="text-xs mb-1"><strong>Quantity:</strong> {selectedHistoryEntry()?.quantity}</p>
                <p class="text-xs mb-3"><strong>Notes:</strong> {selectedHistoryEntry()?.notes || "No notes"}</p>
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
                    onClick={() => handleDeleteConsumption(selectedHistoryEntry()?.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </Show>
            
            <Show when={isEditingEntry()}>
              <form onSubmit={handleUpdateConsumption}>
                <Label class="text-xs">Edit Date</Label>
                <Input
                  type="date"
                  value={editDate()}
                  onInput={(e) => setEditDate(e.currentTarget.value)}
                  class="mb-2 text-xs"
                />
                
                <Label class="text-xs">Edit Quantity</Label>
                <Input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={editQuantity()}
                  onInput={(e) => setEditQuantity(parseFloat(e.currentTarget.value) || 1)}
                  class="mb-2 text-xs"
                />
                
                <Label class="text-xs">Edit Notes</Label>
                <Textarea
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
      <form class="mt-4" onSubmit={handleAddConsumption}>
        <Label>New Consumption</Label>
        
        <Label class="text-xs">Date</Label>
        <Input
          type="date"
          value={consumptionDate()}
          onInput={(e) => setConsumptionDate(e.currentTarget.value)}
        />

        <Label class="text-xs">Quantity</Label>
        <Input
          type="number"
          min="0.1"
          step="0.1"
          value={quantity()}
          onInput={(e) => setQuantity(parseFloat(e.currentTarget.value) || 1)}
          placeholder="Quantity consumed"
        />

        <Label class="text-xs">Notes</Label>
        <Textarea
          class="font-mono text-xs"
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
    <summary class="collapse-title font-semibold text-sm">{props.title}</summary>
    <div class="collapse-content text-sm">{props.children}</div>
  </details>
);