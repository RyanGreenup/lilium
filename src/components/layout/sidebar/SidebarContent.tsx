import { useSearchParams } from "@solidjs/router";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  FolderTree,
  MessageSquare,
  Notebook,
  Search,
  Sparkles,
} from "lucide-solid";
import {
  createSignal,
  For,
  onMount,
  onCleanup,
  Show,
  Suspense,
} from "solid-js";
import { Tabs } from "~/solid-daisy-components/components/Tabs";
import { useKeybinding } from "~/solid-daisy-components/utilities/useKeybinding";
import BacklinksTab from "./tabs/BacklinksTab";
import DiscussionTab from "./tabs/DiscussionTab";
import ForwardLinksTab from "./tabs/ForwardLinksTab";
import { ListViewer } from "./tabs/NotesListTabNew";
import RecentNotesTab from "./tabs/RecentNotesTab";
import RelatedTab from "./tabs/RelatedTab";
import { SidebarSearchContent } from "./tabs/SearchTab";
import { SlideTransition } from "~/components/Animations/SlideTransition";
import { Loading } from "~/solid-daisy-components/components/Loading";

// Delayed fallback component to avoid flickering loading states for fast operations
function DelayedFallback(props: { delay?: number; children: any }) {
  const [show, setShow] = createSignal(false);

  const timeoutId = setTimeout(() => setShow(true), props.delay ?? 500);
  onCleanup(() => clearTimeout(timeoutId));

  return <Show when={show()}>{props.children}</Show>;
}

const SidebarLoadingIndicator = () => (
  <DelayedFallback delay={500}>
    <Loading variant="dots" />
    <Loading variant="dots" />
    <Loading variant="dots" />
  </DelayedFallback>
);

export const SidebarTabs = () => {
  const [activeTab, setActiveTab] = createSignal(0);
  const [isGoingDeeper, setIsGoingDeeper] = createSignal(true);
  const [searchParams, setSearchParams] = useSearchParams();

  // Focus triggers for tabs
  const [listViewerFocusTrigger, setListViewerFocusTrigger] = createSignal<
    string | null
  >(null);
  const [recentFocusTrigger, setRecentFocusTrigger] = createSignal<
    string | null
  >(null);
  const [searchFocusTrigger, setSearchFocusTrigger] = createSignal<
    string | null
  >(null);
  const [backlinksFocusTrigger, setBacklinksFocusTrigger] = createSignal<
    string | null
  >(null);
  const [forwardLinksFocusTrigger, setForwardLinksFocusTrigger] = createSignal<
    string | null
  >(null);
  const [relatedFocusTrigger, setRelatedFocusTrigger] = createSignal<
    string | null
  >(null);

  const [discussionFocusTrigger, setDiscussionFocusTrigger] = createSignal<
    string | null
  >(null);

  // Persistent search state across tab navigation
  const [searchTerm, setSearchTerm] = createSignal("");

  const tabs = [
    { id: 0, label: "Notes", key: "notes", icon: <Notebook class="w-4 h-4" /> },
    { id: 1, label: "List", key: "list", icon: <FolderTree class="w-4 h-4" /> },
    { id: 2, label: "Recent", key: "recent", icon: <Clock class="w-4 h-4" /> },
    { id: 3, label: "Search", key: "search", icon: <Search class="w-4 h-4" /> },
    {
      id: 4,
      label: "Backlinks",
      key: "backlinks",
      icon: <ArrowLeft class="w-4 h-4" />,
    },
    {
      id: 5,
      label: "Forward",
      key: "forward",
      icon: <ArrowRight class="w-4 h-4" />,
    },
    {
      id: 6,
      label: "Related",
      key: "related",
      icon: <Sparkles class="w-4 h-4" />,
    },
    {
      id: 7,
      label: "Discussion",
      key: "discussion",
      icon: <MessageSquare class="w-4 h-4" />,
    },
  ];

  onMount(() => {
    if (searchParams.sidebar) {
      const tab = tabs.find((t) => t.key === searchParams.sidebar);
      setActiveTab(tab?.id ?? 0);
    }
  });

  const handleTabChange = (tabId: number, fromKeybinding = false) => {
    const currentTab = activeTab();
    setIsGoingDeeper(tabId > currentTab);
    setActiveTab(tabId);
    const tab = tabs.find((t) => t.id === tabId);
    if (tab) {
      setSearchParams({ sidebar: tab.key });
    }

    // Trigger focus for keybindings and search tab clicks
    const shouldFocus = fromKeybinding || tabId === 3;
    if (shouldFocus) {
      const triggerId = Date.now().toString();
      if (tabId === 1) {
        // List viewer tab - focus for keyboard navigation
        setListViewerFocusTrigger(triggerId);
        setTimeout(() => setListViewerFocusTrigger(null), 100);
      } else if (tabId === 2) {
        // Recent tab - focus list for keybinding navigation
        setRecentFocusTrigger(triggerId);
        setTimeout(() => setRecentFocusTrigger(null), 100);
      } else if (tabId === 3) {
        // Search tab - focus input for both keybinding and clicks
        setSearchFocusTrigger(triggerId);
        setTimeout(() => setSearchFocusTrigger(null), 100);
      } else if (tabId === 4) {
        // Backlinks tab - focus list for keybinding navigation
        setBacklinksFocusTrigger(triggerId);
        setTimeout(() => setBacklinksFocusTrigger(null), 100);
      } else if (tabId === 5) {
        // Forward links tab - focus list for keybinding navigation
        setForwardLinksFocusTrigger(triggerId);
        setTimeout(() => setForwardLinksFocusTrigger(null), 100);
      } else if (tabId === 6) {
        // Related tab - focus list for keybinding navigation
        setRelatedFocusTrigger(triggerId);
        setTimeout(() => setRelatedFocusTrigger(null), 100);
      } else if (tabId === 7) {
        // Discussion tab - focus textarea for immediate typing
        setDiscussionFocusTrigger(triggerId);
        setTimeout(() => setDiscussionFocusTrigger(null), 100);
      }
    }
  };

  // Global keybindings for tab switching (Alt + 1-8)
  useKeybinding({ key: "1", alt: true }, () => handleTabChange(0, true));
  useKeybinding({ key: "2", alt: true }, () => handleTabChange(1, true));
  useKeybinding({ key: "3", alt: true }, () => handleTabChange(2, true));
  useKeybinding({ key: "4", alt: true }, () => handleTabChange(3, true));
  useKeybinding({ key: "5", alt: true }, () => handleTabChange(4, true));
  useKeybinding({ key: "6", alt: true }, () => handleTabChange(5, true));
  useKeybinding({ key: "7", alt: true }, () => handleTabChange(6, true));
  useKeybinding({ key: "8", alt: true }, () => handleTabChange(7, true));

  // Global keybindings for tab navigation (Alt + h/l)
  useKeybinding({ key: "h", alt: true }, () => {
    const currentTab = activeTab();
    const prevTab = currentTab - 1;
    if (prevTab >= 0) {
      handleTabChange(prevTab, true);
    }
  });

  useKeybinding({ key: "l", alt: true }, () => {
    const currentTab = activeTab();
    const nextTab = currentTab + 1;
    if (nextTab < tabs.length) {
      handleTabChange(nextTab, true);
    }
  });

  return (
    <div class="flex flex-col h-full">
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

      <div class="mt-4 relative overflow-hidden flex-1 min-h-0">
        <SlideTransition
          isGoingDeeper={isGoingDeeper}
          contentId={`tab-${activeTab()}`}
        >
          <div class="h-full">
            <Show when={activeTab() === 1}>
              {/* IMPORTANT: Suspense boundary prevents full-screen flicker
                  ListViewer uses createAsync for data fetching (items, folderPath, indexNoteId).
                  When users interact with the component (click items, navigate folders),
                  these async queries re-run. Without a Suspense boundary at the parent level,
                  SolidJS triggers re-renders of the entire page instead of just this component.
                  The Suspense boundary isolates these async updates to prevent flicker.
                  See also: BacklinksTab, ForwardLinksTab, RelatedTab (same pattern) */}
              <Suspense fallback={<SidebarLoadingIndicator />}>
                <ListViewer />
              </Suspense>
            </Show>

            <Show when={activeTab() === 2}>
              <Suspense fallback={<SidebarLoadingIndicator />}>
                <RecentNotesTab focusTrigger={recentFocusTrigger} />
              </Suspense>
            </Show>

            <Show when={activeTab() === 3}>
              <Suspense fallback={<SidebarLoadingIndicator />}>
                <SidebarSearchContent
                  focusTrigger={searchFocusTrigger}
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                />
              </Suspense>
            </Show>

            <Show when={activeTab() === 4}>
              <Suspense fallback={<SidebarLoadingIndicator />}>
                <BacklinksTab focusTrigger={backlinksFocusTrigger} />
              </Suspense>
            </Show>

            <Show when={activeTab() === 5}>
              <Suspense fallback={<SidebarLoadingIndicator />}>
                <ForwardLinksTab focusTrigger={forwardLinksFocusTrigger} />
              </Suspense>
            </Show>

            <Show when={activeTab() === 6}>
              <Suspense fallback={<SidebarLoadingIndicator />}>
                <RelatedTab focusTrigger={relatedFocusTrigger} />
              </Suspense>
            </Show>

            <Show when={activeTab() === 7}>
              <Suspense fallback={<SidebarLoadingIndicator />}>
                <DiscussionTab focusTrigger={discussionFocusTrigger} />
              </Suspense>
            </Show>
          </div>
        </SlideTransition>
      </div>
    </div>
  );
};
