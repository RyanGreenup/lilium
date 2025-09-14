import { Accessor, createSignal, For, JSXElement, Setter } from "solid-js";
import { VoidComponent } from "solid-js/types/server/rendering.js";
import { Button } from "~/solid-daisy-components/components/Button";
import { Fieldset, Label } from "~/solid-daisy-components/components/Fieldset";
import { Hero } from "~/solid-daisy-components/components/Hero";
import { Input } from "~/solid-daisy-components/components/Input";
import { Select } from "~/solid-daisy-components/components/Select";
import { Textarea } from "~/solid-daisy-components/components/Textarea";
import { Toggle } from "~/solid-daisy-components/components/Toggle";

export default function Home() {
  const [checked, setChecked] = createSignal(false);

  return (
    <main class="">
      <HeroComponent />
      <ToggleComponent getChecked={checked} setChecked={setChecked} />
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3 gap-8 auto-rows-max">
        <For each={Array.from({ length: 100 }, (_, i) => i)}>
          {(index) => <ChoreForm title={`Vacuum ${index + 1}`} />}
        </For>
      </div>
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
const ChoreForm = (props: { title: string }) => {
  const getCurrentPosixTimestamp = () => Math.floor(Date.now() / 1000);
  const DisplayCurrentPosixTimeStamp = () =>
    TimeStampToDateString(getCurrentPosixTimestamp());
  const LastCompleted = () => TimeStampToDateString(1757823379, true);

  return (
    <Fieldset class="w-xs bg-base-200 border border-base-300 p-4 rounded-box">
      {/*Display the last time it was finished */}
      <Fieldset.Legend>{props.title}</Fieldset.Legend>

      <p class="label">Previous: {LastCompleted()}</p>

      <Details title="Details">
        {/*Display Previous Notes */}
        <Label>Previous Notes</Label>
        <Select>
          <MiscContent />
        </Select>

        <Label>Previous Notes Content</Label>
        <div class="bg-base-100 border border-base-300 p-3 rounded-box max-h-[6.25rem] overflow-auto mb-4 prose dark:prose-invert">
          <h1>Some Arbitrary Note</h1>
          {Array.from({ length: 10 }, (_, i) => (
            <p>
              Previous notes will be displayed here based on the selected
              timestamp above.
            </p>
          ))}
        </div>
      </Details>

      <Label>Duration Interval (H)</Label>
      <Input type="text" placeholder="Duration Between Completion" />

      <Label>Notes</Label>
      <Textarea class="font-mono" />
      <div class="flex gap-2 mt-4">
        <Button type="button" size="sm" color="error">
          Mark Not Completed
        </Button>
        <Button type="submit" size="sm" color="primary">
          Mark Completed
        </Button>
      </div>
    </Fieldset>
  );
};

const Details = (props: { children: JSXElement; title: string }) => (
  <details class="collapse collapse-arrow bg-base-100 border-base-300 border">
    <summary class="collapse-title font-semibold">{props.title}</summary>
    <div class="collapse-content text-sm">{props.children}</div>
  </details>
);

const MiscContent = () => (
  <>
    {[1757823379, 1757909779, 1757996179, 1758082579, 1758168979].map(
      (timestamp: number) => (
        <option>{TimeStampToDateString(timestamp)}</option>
      ),
    )}
  </>
);
