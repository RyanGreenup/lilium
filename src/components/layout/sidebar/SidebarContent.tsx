import { useSearchParams } from "@solidjs/router";
import {
  ArrowLeft,
  ArrowRight,
  MessageSquare,
  Notebook,
  Search,
  Sparkles,
} from "lucide-solid";
import { createSignal, For, onMount, Show } from "solid-js";
import { Tabs } from "~/solid-daisy-components/components/Tabs";
import BacklinksTab from "./tabs/BacklinksTab";
import DiscussionTab from "./tabs/DiscussionTab";
import ForwardLinks from "./tabs/ForwardLinksTab";
import NotesTab from "./tabs/NotesTab";
import RelatedTab from "./tabs/RelatedTab";
import { SidebarSearchContent } from "./tabs/SearchTab";

export const SidebarTabs = () => {
  const [activeTab, setActiveTab] = createSignal(0);
  const [searchParams, setSearchParams] = useSearchParams();

  const tabs = [
    { id: 0, label: "Notes", key: "notes", icon: <Notebook class="w-4 h-4" /> },
    { id: 1, label: "Search", key: "search", icon: <Search class="w-4 h-4" /> },
    { id: 2, label: "Backlinks", key: "backlinks", icon: <ArrowLeft class="w-4 h-4" /> },
    { id: 3, label: "Forward", key: "forward", icon: <ArrowRight class="w-4 h-4" /> },
    { id: 4, label: "Related", key: "related", icon: <Sparkles class="w-4 h-4" /> },
    { id: 5, label: "Discussion", key: "discussion", icon: <MessageSquare class="w-4 h-4" /> },
  ];

  onMount(() => {
    if (searchParams.sidebar) {
      const tab = tabs.find(t => t.key === searchParams.sidebar);
      setActiveTab(tab?.id ?? 0);
    }
  });

  const handleTabChange = (tabId: number) => {
    setActiveTab(tabId);
    const tab = tabs.find(t => t.id === tabId);
    if (tab) {
      setSearchParams({ sidebar: tab.key });
    }
  };

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
