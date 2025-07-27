import { createSignal, JSXElement, Switch, Match, For } from "solid-js";
import { tv } from "tailwind-variants";

export type SidebarTabId = "files" | "search" | "backlinks";

interface SidebarTabsProps {
  activeTab?: SidebarTabId;
  onTabChange?: (tabId: SidebarTabId) => void;
  filesContent: JSXElement;
  searchContent?: JSXElement;
  backlinksContent?: JSXElement;
}

interface TabConfig {
  id: SidebarTabId;
  label: string;
  content: (props: SidebarTabsProps) => JSXElement;
  placeholder?: string;
}

const sidebarTabs = tv({
  slots: {
    container: "flex flex-col h-full",
    tabList: "flex border-b border-base-300",
    tab: "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
    content: "flex-1 overflow-hidden",
    placeholder: "p-4 text-center text-base-content/50",
  },
  variants: {
    active: {
      true: {
        tab: "border-primary text-primary bg-base-100",
      },
      false: {
        tab: "border-transparent text-base-content/70 hover:text-base-content hover:border-base-300",
      },
    },
  },
});

const tabs: TabConfig[] = [
  {
    id: "files",
    label: "Files",
    content: (props) => props.filesContent,
  },
  {
    id: "search",
    label: "Search",
    content: (props) => props.searchContent,
    placeholder: "Search functionality coming soon",
  },
  {
    id: "backlinks",
    label: "Backlinks",
    content: (props) => props.backlinksContent,
    placeholder: "Backlinks functionality coming soon",
  },
];

export const SidebarTabs = (props: SidebarTabsProps) => {
  const [activeTab, setActiveTab] = createSignal<SidebarTabId>(
    props.activeTab || "files",
  );
  const styles = sidebarTabs();

  const handleTabChange = (tabId: SidebarTabId) => {
    setActiveTab(tabId);
    props.onTabChange?.(tabId);
  };

  return (
    <div class={styles.container()}>
      {/* Tab Navigation */}
      <div class={styles.tabList()}>
        <For each={tabs}>
          {(tab) => (
            <button
              class={styles.tab({ active: activeTab() === tab.id })}
              onClick={() => handleTabChange(tab.id)}
            >
              {tab.label}
            </button>
          )}
        </For>
      </div>

      {/* Tab Content */}
      <div class={styles.content()}>
        <Switch>
          <For each={tabs}>
            {(tab) => (
              <Match when={activeTab() === tab.id}>
                {tab.content(props) || (
                  <div class={styles.placeholder()}>
                    {tab.placeholder}
                  </div>
                )}
              </Match>
            )}
          </For>
        </Switch>
      </div>
    </div>
  );
};
