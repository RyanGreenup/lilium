import { A, RouteDefinition } from "@solidjs/router";

import Menu from "lucide-solid/icons/menu";
import Settings from "lucide-solid/icons/settings";

import ToggleLeft from "lucide-solid/icons/toggle-left";
import { JSXElement, VoidComponent, Suspense } from "solid-js";
import { SidebarTabs } from "~/components/layout/sidebar/SidebarContent";
import { UserDropdown } from "~/components/UserDrowDown";
import { Logo } from "~/components/Logo";
import { getUser } from "~/lib/auth";
import NoteBreadcrumbs from "~/components/NoteBreadcrumbs";
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
            <SidebarTabs />
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


const NavbarContent = () => (
  <>
    <div class="navbar-start">
      <div class="dropdown">
        <SidebarToggle />
      </div>
      <A href="/" class="btn btn-ghost text-xl">
        <div class="flex items-center gap-2">
          <Logo class="h-8 w-8" />
          {/*<span>Lilium</span>*/}
        </div>
      </A>
    </div>

    <div class="navbar-center flex-1 px-4">
      <Suspense fallback={<div class="text-sm text-base-content/60">Loading...</div>}>
        <NoteBreadcrumbs />
      </Suspense>
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

