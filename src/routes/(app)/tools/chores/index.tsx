import { Accessor, createSignal, Setter } from "solid-js";
import { VoidComponent } from "solid-js/types/server/rendering.js";
import { Fieldset, Label } from "~/solid-daisy-components/components/Fieldset";
import { Hero } from "~/solid-daisy-components/components/Hero";
import { Toggle } from "~/solid-daisy-components/components/Toggle";

export default function Home() {
  const [checked, setChecked] = createSignal(false);

  return (
    <main class="">
      <HeroComponent />
      <ToggleComponent getChecked={checked} setChecked={setChecked} />
    </main>
  );
}

const HeroComponent: VoidComponent = () => (
  <Hero class="min-h-96 rounded bg-base-200">
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
