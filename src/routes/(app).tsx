import { A, RouteDefinition } from "@solidjs/router";
import BookOpen from "lucide-solid/icons/book-open";

import Menu from "lucide-solid/icons/menu";

import ToggleLeft from "lucide-solid/icons/toggle-left";
import { JSXElement } from "solid-js";
import { SidebarTabs } from "~/components/layout/sidebar/SidebarContent";
import { Logo } from "~/components/Logo";
import { UserDropdown } from "~/components/UserDrowDown";
import { getUser } from "~/lib/auth";
import { Alert } from "~/solid-daisy-components/components/Alert";
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
          <RightDrawerContent />
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

    {/*This would be used if the right drawer was included*/}
    <div class="navbar-end">
      <UserDropdown />
      <ToggleButton
        id={CheckboxId.RIGHT_DRAWER}
        class="btn btn-square btn-ghost"
      >
        <BookOpen class="w-5 h-5" />
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

const RightDrawerContent = () => (
  <div class="flex mt-12 justify-center p-12">
    <Alert color="info" class="w-full max-w-md">
      <div class="flex flex-col gap-4">
        <h3 class="font-semibold text-lg">TODO Today's Journal</h3>

        <div class="space-y-2">
          <h4 class="font-medium">Quick Tasks</h4>
          <ul class="list-disc list-inside text-sm space-y-1">
            <li>
              <A href="/tasks" class="link">
                Review daily goals
              </A>
            </li>
            <li>
              <A href="/notes" class="link">
                Update project notes
              </A>
            </li>
            <li>
              <A href="/calendar" class="link">
                Check upcoming meetings
              </A>
            </li>
          </ul>
        </div>

        <div class="mt-4">
          <h4 class="font-medium mb-2">Quick Calendar</h4>
          <div class="bg-base-100 p-2 rounded text-center text-sm text-base-content">
            <div class="font-semibold">
              {new Date().toLocaleDateString("en-US", { weekday: "long" })}
            </div>
            <div class="text-2xl font-bold ">{new Date().getDate()}</div>
            <div>
              {new Date().toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </div>
          </div>
        </div>
      </div>
    </Alert>
  </div>
);
