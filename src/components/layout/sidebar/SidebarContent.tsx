import { useSearchParams } from "@solidjs/router";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  MessageSquare,
  Notebook,
  Search,
  Sparkles,
} from "lucide-solid";
import { createSignal, For, onMount, Show } from "solid-js";
import { Tabs } from "~/solid-daisy-components/components/Tabs";
import { useKeybinding } from "~/solid-daisy-components/utilities/useKeybinding";
import BacklinksTab from "./tabs/BacklinksTab";
import DiscussionTab from "./tabs/DiscussionTab";
import ForwardLinks from "./tabs/ForwardLinksTab";
import NotesTab, { SlideTransition } from "./tabs/NotesTab";
import RecentNotesTab from "./tabs/RecentNotesTab";
import RelatedTab from "./tabs/RelatedTab";
import { SidebarSearchContent } from "./tabs/SearchTab";

export const SidebarTabs = () => {
  const [activeTab, setActiveTab] = createSignal(0);
  const [isGoingDeeper, setIsGoingDeeper] = createSignal(true);
  const [searchParams, setSearchParams] = useSearchParams();

  const tabs = [
    { id: 0, label: "Notes", key: "notes", icon: <Notebook class="w-4 h-4" /> },
    { id: 1, label: "Recent", key: "recent", icon: <Clock class="w-4 h-4" /> },
    { id: 2, label: "Search", key: "search", icon: <Search class="w-4 h-4" /> },
    { id: 3, label: "Backlinks", key: "backlinks", icon: <ArrowLeft class="w-4 h-4" /> },
    { id: 4, label: "Forward", key: "forward", icon: <ArrowRight class="w-4 h-4" /> },
    { id: 5, label: "Related", key: "related", icon: <Sparkles class="w-4 h-4" /> },
    { id: 6, label: "Discussion", key: "discussion", icon: <MessageSquare class="w-4 h-4" /> },
  ];

  onMount(() => {
    if (searchParams.sidebar) {
      const tab = tabs.find(t => t.key === searchParams.sidebar);
      setActiveTab(tab?.id ?? 0);
    }
  });

  const handleTabChange = (tabId: number) => {
    const currentTab = activeTab();
    setIsGoingDeeper(tabId > currentTab);
    setActiveTab(tabId);
    const tab = tabs.find(t => t.id === tabId);
    if (tab) {
      setSearchParams({ sidebar: tab.key });
    }
  };

  // Global keybindings for tab switching (Alt + 1-7)
  useKeybinding({ key: "1", alt: true }, () => handleTabChange(0));
  useKeybinding({ key: "2", alt: true }, () => handleTabChange(1));
  useKeybinding({ key: "3", alt: true }, () => handleTabChange(2));
  useKeybinding({ key: "4", alt: true }, () => handleTabChange(3));
  useKeybinding({ key: "5", alt: true }, () => handleTabChange(4));
  useKeybinding({ key: "6", alt: true }, () => handleTabChange(5));
  useKeybinding({ key: "7", alt: true }, () => handleTabChange(6));

  // Global keybindings for tab navigation (Alt + h/l)
  useKeybinding({ key: "h", alt: true }, () => {
    const currentTab = activeTab();
    const prevTab = currentTab - 1;
    if (prevTab >= 0) {
      handleTabChange(prevTab);
    }
  });

  useKeybinding({ key: "l", alt: true }, () => {
    const currentTab = activeTab();
    const nextTab = currentTab + 1;
    if (nextTab < tabs.length) {
      handleTabChange(nextTab);
    }
  });

  return (
    <>
      <Tabs style="lift">
        <For each={tabs}>
          {(tab) => (
            <Tabs.Tab
              active={activeTab() === tab.id}
              onClick={() => handleTabChange(tab.id)}
            >
              {tab.icon}
            </Tabs.Tab>
          )}
        </For>
      </Tabs>

      <div class="mt-4 relative overflow-hidden">
        <SlideTransition isGoingDeeper={isGoingDeeper} contentId={`tab-${activeTab()}`}>
          <div>
            <Show when={activeTab() === 0}>
              <NotesTab />
            </Show>

            <Show when={activeTab() === 1}>
              <RecentNotesTab />
            </Show>

            <Show when={activeTab() === 2}>
              <SidebarSearchContent />
            </Show>

            <Show when={activeTab() === 3}>
              <BacklinksTab />
            </Show>

            <Show when={activeTab() === 4}>
              <ForwardLinks />
            </Show>

            <Show when={activeTab() === 5}>
              <RelatedTab />
            </Show>

            <Show when={activeTab() === 6}>
              <DiscussionTab />
            </Show>
          </div>
        </SlideTransition>
      </div>
    </>
  );
};
