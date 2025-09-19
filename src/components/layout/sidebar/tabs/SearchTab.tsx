import { createSignal, For, JSXElement } from "solid-js";
import { Collapsible } from "~/solid-daisy-components/components/Collapsible";
import { Fieldset } from "~/solid-daisy-components/components/Fieldset";
import { Radio } from "~/solid-daisy-components/components/Radio";
import { Toggle } from "~/solid-daisy-components/components/Toggle";

export const SidebarSearchContent = () => {
  const [searchAllNotes, setSearchAllNotes] = createSignal(true);
  const [useSemanticSearch, setUseSemanticSearch] = createSignal(false);
  const [pathDisplay, setPathDisplay] = createSignal(0); // 0: Absolute, 1: Relative, 2: Title

  const pathDisplayOptions = [
    { id: 0, label: "Absolute" },
    { id: 1, label: "Relative" },
    { id: 2, label: "Title" },
  ];

  return (
    <div class="p-4 space-y-4">
      <input
        type="text"
        placeholder="Search..."
        class="input input-bordered w-full"
      />

      <Collapsible class="p-0" title="Settings">
        <Fieldset class="bg-base-200 border-base-300 rounded-box border p-4 space-y-3">
          <Fieldset.Legend>Search Options</Fieldset.Legend>

          <VStack label={<>Children Only</>}>
            <Toggle
              size="sm"
              checked={searchAllNotes()}
              onChange={(e) => setSearchAllNotes(e.currentTarget.checked)}
            />
          </VStack>

          <VStack label={<>Semantic search</>}>
            <Toggle
              size="sm"
              color="primary"
              checked={useSemanticSearch()}
              onChange={(e) => setUseSemanticSearch(e.currentTarget.checked)}
            />
          </VStack>
        </Fieldset>

        <Fieldset class="bg-base-200 border-base-300 rounded-box border p-4 space-y-3">
          <Fieldset.Legend>Path Display</Fieldset.Legend>
          <For each={pathDisplayOptions}>
            {(option) => (
              <div class="form-control">
                <label class="label cursor-pointer justify-start gap-2">
                  <Radio
                    name="path-display"
                    size="sm"
                    checked={pathDisplay() === option.id}
                    onChange={() => setPathDisplay(option.id)}
                  />
                  <span class="label-text text-sm">{option.label}</span>
                </label>
              </div>
            )}
          </For>
        </Fieldset>
      </Collapsible>
    </div>
  );
};

export const VStack = (props: { children: any; label: JSXElement }) => (
  <div class="form-control flex flex-col">
    <label class="label cursor-pointer flex flex-col items-start">
      <span class="label-text text-sm flex items-center gap-2">
        {props.label}
      </span>
      {props.children}
    </label>
  </div>
);
