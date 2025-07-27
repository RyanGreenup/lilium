import { createSignal, JSXElement, Show, For } from "solid-js";
import { tv } from "tailwind-variants";

export type SidebarTabId = "files" | "search" | "backlinks";

interface SidebarTabsProps {
  activeTab?: SidebarTabId;
  onTabChange?: (tabId: SidebarTabId) => void;
  filesContent: JSXElement;
  searchContent?: JSXElement;
  backlinksContent?: JSXElement;
}

const sidebarTabs = tv({
  slots: {
    container: "flex flex-col h-full",
    tabList: "flex border-b border-base-300",
    tab: "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
    content: "flex-1 overflow-hidden",
    placeholder: "p-4 text-center text-base-content/50"
  },
  variants: {
    active: {
      true: {
        tab: "border-primary text-primary bg-base-100"
      },
      false: {
        tab: "border-transparent text-base-content/70 hover:text-base-content hover:border-base-300"
      }
    }
  }
});

export const SidebarTabs = (props: SidebarTabsProps) => {
  const [activeTab, setActiveTab] = createSignal<SidebarTabId>(props.activeTab || "files");
  const styles = sidebarTabs();

  const tabs = {
    files: { label: "Files", content: props.filesContent, placeholder: undefined },
    search: { label: "Search", content: props.searchContent, placeholder: "Search functionality coming soon" },
    backlinks: { label: "Backlinks", content: props.backlinksContent, placeholder: "Backlinks functionality coming soon" }
  } as const;

  const handleTabChange = (tabId: SidebarTabId) => {
    setActiveTab(tabId);
    props.onTabChange?.(tabId);
  };

  const activeTabData = tabs[activeTab()];

  return (
    <div class={styles.container()}>
      {/* Tab Navigation (Buttons along the top) */}
      <div class={styles.tabList()}>
        <For each={Object.entries(tabs)}>
          {([id, tab]) => (
            <button
              class={styles.tab({ active: activeTab() === id })}
              onClick={() => handleTabChange(id as SidebarTabId)}
            >
              {tab.label}
            </button>
          )}
        </For>
      </div>

      {/* Tab Content (Content below the tabs)*/}
      <div class={styles.content()}>
        <Show
          when={activeTabData.content}
          fallback={activeTabData.placeholder && <div class={styles.placeholder()}>{activeTabData.placeholder}</div>}
        >
          {activeTabData.content}
        </Show>
      </div>
    </div>
  );
};
