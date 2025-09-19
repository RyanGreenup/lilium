import { A, RouteDefinition } from "@solidjs/router";
import BrushCleaning from "lucide-solid/icons/brush-cleaning";
import Candy from "lucide-solid/icons/candy";

import Camera from "lucide-solid/icons/camera";
import Menu from "lucide-solid/icons/menu";
import MessageCircleIcon from "lucide-solid/icons/message-circle";
import NotebookPen from "lucide-solid/icons/notebook-pen";
import Settings from "lucide-solid/icons/settings";

import {
  ArrowLeft,
  ArrowRight,
  FileTerminal,
  MessageSquare,
  Notebook,
  Search,
  SearchX,
  Sparkles,
} from "lucide-solid";
import ToggleLeft from "lucide-solid/icons/toggle-left";
import { createSignal, For, JSXElement, Show, VoidComponent } from "solid-js";
import { UserDropdown } from "~/components/UserDrowDown";
import { getUser } from "~/lib/auth";
import { Collapsible } from "~/solid-daisy-components/components/Collapsible";
import { Fieldset } from "~/solid-daisy-components/components/Fieldset";
import {
  BottomDock,
  CheckboxId,
  Layout,
  MainContent,
  MainWrapper,
  Navbar,
  RightDrawer,
  Sidebar,
  SidebarContent,
  ToggleButton,
} from "~/solid-daisy-components/components/Layouts/ResponsiveDrawer";
import { Radio } from "~/solid-daisy-components/components/Radio";
import { Tabs } from "~/solid-daisy-components/components/Tabs";
import { Toggle } from "~/solid-daisy-components/components/Toggle";

// Route Guard
export const route = {
  preload() {
    getUser();
  },
} satisfies RouteDefinition;

const VStack = (props: { children: any; label: JSXElement }) => (
  <div class="form-control flex flex-col">
    <label class="label cursor-pointer flex flex-col items-start">
      <span class="label-text text-sm flex items-center gap-2">
        {props.label}
      </span>
      {props.children}
    </label>
  </div>
);

export default function MainLayout(props: { children: JSXElement }) {
  return (
    <Layout class="text-base-content">
      <Navbar class="navbar bg-base-200 shadow-lg mt-[-0.25rem]">
        <NavbarContent />
      </Navbar>
      <MainWrapper>
        <Sidebar class="bg-base-200">
          <SidebarContent class="p-4">
            <SidebarItems />
          </SidebarContent>
        </Sidebar>
        <MainContent class="bg-base-100 p-4">{props.children}</MainContent>
        <RightDrawer class="bg-base-200">
          <div class="flex mt-12 justify-center">TODO</div>
        </RightDrawer>
      </MainWrapper>

      <BottomDock>
        <DockContent />
      </BottomDock>
    </Layout>
  );
}

const SidebarItems: VoidComponent = () => {
  const [activeTab, setActiveTab] = createSignal(0);

  const tabs = [
    { id: 0, label: "Notes", icon: <Notebook class="w-4 h-4" /> },
    { id: 1, label: "Search", icon: <Search class="w-4 h-4" /> },
    { id: 2, label: "Backlinks", icon: <ArrowLeft class="w-4 h-4" /> },
    { id: 3, label: "Forward", icon: <ArrowRight class="w-4 h-4" /> },
    { id: 4, label: "Related", icon: <Sparkles class="w-4 h-4" /> },
    { id: 5, label: "Discussion", icon: <MessageSquare class="w-4 h-4" /> },
  ];

  return (
    <>
      <Tabs style="lift">
        <For each={tabs}>
          {(tab) => (
            <Tabs.Tab
              active={activeTab() === tab.id}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
            </Tabs.Tab>
          )}
        </For>
      </Tabs>

      <div class="mt-4">
        <Show when={activeTab() === 0}>
          <div class="menu">
            <div class="menu-title">Navigation</div>
            <For
              each={[
                {
                  name: "Chores",
                  icon: <BrushCleaning class="w-4 h-4" />,
                  link: "tools/chores/",
                },
                {
                  name: "Consumption",
                  icon: <Candy class="w-4 h-4" />,
                  link: "tools/consumption/",
                },
              ]}
            >
              {(item) => (
                <li>
                  <A href={`/${item.link}`} class="flex items-center gap-2">
                    <span>{item.icon}</span>
                    {item.name}
                  </A>
                </li>
              )}
            </For>
          </div>

          <div class="divider"></div>

          <div class="menu">
            <div class="menu-title">Tools</div>
            <li>
              <a href="https://dokuwiki.vidar">
                <NotebookPen class="w-4 h-4" /> Wiki
              </a>
            </li>
            <li>
              <a href="https://photon.vidar">
                <MessageCircleIcon class="w-4 h-4" /> Forum
              </a>
            </li>
            <li>
              <a href="https://immich.vidar">
                <Camera class="w-4 h-4" /> Gallery
              </a>
            </li>
          </div>
        </Show>

        <Show when={activeTab() === 1}>
          <SidebarSearchContent />
        </Show>

        <Show when={activeTab() === 2}>
          <div class="p-4 text-center text-base-content/60">
            Backlinks will appear here
          </div>
        </Show>

        <Show when={activeTab() === 3}>
          <div class="p-4 text-center text-base-content/60">
            Forward links will appear here
          </div>
        </Show>

        <Show when={activeTab() === 4}>
          <div class="p-4 text-center text-base-content/60">
            Related content will appear here
          </div>
        </Show>

        <Show when={activeTab() === 5}>
          <div class="p-4 text-center text-base-content/60">
            Discussion will appear here
          </div>
        </Show>
      </div>
    </>
  );
};

const NavbarContent = () => (
  <>
    <div class="navbar-start">
      <div class="dropdown">
        <SidebarToggle />
      </div>
      <A href="/" class="btn btn-ghost text-xl">
        <div class=" p-1 rounded-lg ">
          <img src="/logo.png" class="max-h-[2rem]" />
        </div>
      </A>
    </div>

    {/*This would be used if the right drawer was included*/}
    <div class="navbar-end">
      <UserDropdown />
      <ToggleButton
        id={CheckboxId.RIGHT_DRAWER}
        class="btn btn-square btn-ghost"
      >
        <Settings class="w-5 h-5" />
      </ToggleButton>
    </div>
  </>
);

const SidebarToggle = () => (
  <ToggleButton id={CheckboxId.SIDEBAR} class="btn btn-square btn-ghost">
    <Menu class="w-5 h-5" />
  </ToggleButton>
);

const DockContent = () => (
  <div class="flex flex-row align-center justify-around bg-base-100 p-1 border-t-base-content w-full h-full">
    <ToggleButton id={CheckboxId.BOTTOM_DESKTOP} class="">
      <div class="tooltip" data-tip="Only Show Dock on Desktop">
        <ToggleLeft class="size-[1.2em]" />
        <span class="dock-label">Dock</span>
      </div>
    </ToggleButton>

    <ToggleButton id={CheckboxId.SIDEBAR} class="btn btn-square btn-ghost">
      <Menu class="w-5 h-5" />
    </ToggleButton>

    <ToggleButton id={CheckboxId.NAVBAR} class="btn btn-square btn-ghost">
      <div class="tooltip" data-tip="Hide Navbar">
        <ToggleLeft class="size-[1.2em]" />
        <span class="dock-label">Navbar</span>
      </div>
    </ToggleButton>
  </div>
);

const SidebarSearchContent = () => {
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
