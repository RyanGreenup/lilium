import { A, RouteDefinition } from "@solidjs/router";

import Menu from "lucide-solid/icons/menu";
import Settings from "lucide-solid/icons/settings";

import {
  ArrowLeft,
  ArrowRight,
  MessageSquare,
  Notebook,
  Search,
  Sparkles,
} from "lucide-solid";
import ToggleLeft from "lucide-solid/icons/toggle-left";
import { createSignal, For, JSXElement, Show, VoidComponent } from "solid-js";
import BacklinksTab from "~/components/layout/sidebar/tabs/BacklinksTab";
import DiscussionTab from "~/components/layout/sidebar/tabs/DiscussionTab";
import ForwardLinks from "~/components/layout/sidebar/tabs/ForwardLinksTab";
import NotesTab from "~/components/layout/sidebar/tabs/NotesTab";
import RelatedTab from "~/components/layout/sidebar/tabs/RelatedTab";
import { SidebarSearchContent } from "~/components/layout/sidebar/tabs/SearchTab";
import { UserDropdown } from "~/components/UserDrowDown";
import { getUser } from "~/lib/auth";
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
import { Tabs } from "~/solid-daisy-components/components/Tabs";

// Route Guard
export const route = {
  preload() {
    getUser();
  },
} satisfies RouteDefinition;

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
          <NotesTab />
        </Show>

        <Show when={activeTab() === 1}>
          <SidebarSearchContent />
        </Show>

        <Show when={activeTab() === 2}>
          <BacklinksTab />
        </Show>

        <Show when={activeTab() === 3}>
          <ForwardLinks />
        </Show>

        <Show when={activeTab() === 4}>
          <RelatedTab />
        </Show>

        <Show when={activeTab() === 5}>
          <DiscussionTab />
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
