import { createSignal, JSXElement } from "solid-js";
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

export const SidebarTabs = (props: SidebarTabsProps) => {
  const [activeTab, setActiveTab] = createSignal<SidebarTabId>(
    props.activeTab || "files",
  );
  const styles = sidebarTabs();

  const handleTabChange = (tabId: SidebarTabId) => {
    setActiveTab(tabId);
    props.onTabChange?.(tabId);
  };

  const renderTabContent = () => {
    switch (activeTab()) {
      case "files":
        return props.filesContent;
      case "search":
        return (
          props.searchContent || (
            <div class={styles.placeholder()}>
              Search functionality coming soon
            </div>
          )
        );
      case "backlinks":
        return (
          props.backlinksContent || (
            <div class={styles.placeholder()}>
              Backlinks functionality coming soon
            </div>
          )
        );
      default:
        return props.filesContent;
    }
  };

  return (
    <div class={styles.container()}>
      {/* Tab Navigation */}
      <div class={styles.tabList()}>
        <button
          class={styles.tab({ active: activeTab() === "files" })}
          onClick={() => handleTabChange("files")}
        >
          Files
        </button>
        <button
          class={styles.tab({ active: activeTab() === "search" })}
          onClick={() => handleTabChange("search")}
        >
          Search
        </button>
        <button
          class={styles.tab({ active: activeTab() === "backlinks" })}
          onClick={() => handleTabChange("backlinks")}
        >
          Backlinks
        </button>
      </div>

      {/* Tab Content */}
      <div class={styles.content()}>{renderTabContent()}</div>
    </div>
  );
};
