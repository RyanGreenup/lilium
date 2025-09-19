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
    { id: 0, label: "Notes", icon: <Notebook class="w-4 h-4" /> },
    { id: 1, label: "Search", icon: <Search class="w-4 h-4" /> },
    { id: 2, label: "Backlinks", icon: <ArrowLeft class="w-4 h-4" /> },
    { id: 3, label: "Forward", icon: <ArrowRight class="w-4 h-4" /> },
    { id: 4, label: "Related", icon: <Sparkles class="w-4 h-4" /> },
    { id: 5, label: "Discussion", icon: <MessageSquare class="w-4 h-4" /> },
  ];

  onMount(() => {
    if (searchParams.sidebar) {
      switch (searchParams.sidebar) {
        case "notes":
          setActiveTab(0);
          break;
        case "search":
          setActiveTab(1);
          break;
        case "backlinks":
          setActiveTab(2);
          break;
        case "forward":
          setActiveTab(3);
          break;
        case "related":
          setActiveTab(4);
          break;
        case "discussion":
          setActiveTab(5);
          break;
        default:
          setActiveTab(0);
      }
    }
  });

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
