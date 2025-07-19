import { createSignal, JSXElement } from "solid-js";

export type SidebarTabId = "files" | "search" | "backlinks";

interface SidebarTabsProps {
  activeTab?: SidebarTabId;
  onTabChange?: (tabId: SidebarTabId) => void;
  filesContent: JSXElement;
  searchContent?: JSXElement;
  backlinksContent?: JSXElement;
}

export const SidebarTabs = (props: SidebarTabsProps) => {
  const [activeTab, setActiveTab] = createSignal<SidebarTabId>(props.activeTab || "files");

  const handleTabChange = (tabId: SidebarTabId) => {
    setActiveTab(tabId);
    props.onTabChange?.(tabId);
  };

  const renderTabContent = () => {
    switch (activeTab()) {
      case "files":
        return props.filesContent;
      case "search":
        return props.searchContent || <div class="p-4 text-center text-base-content/50">Search functionality coming soon</div>;
      case "backlinks":
        return props.backlinksContent || <div class="p-4 text-center text-base-content/50">Backlinks functionality coming soon</div>;
      default:
        return props.filesContent;
    }
  };

  return (
    <div class="flex flex-col h-full">
      {/* Tab Navigation */}
      <div class="flex border-b border-base-300">
        <button
          class={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab() === "files"
              ? "border-primary text-primary bg-base-100"
              : "border-transparent text-base-content/70 hover:text-base-content hover:border-base-300"
          }`}
          onClick={() => handleTabChange("files")}
        >
          Files
        </button>
        <button
          class={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab() === "search"
              ? "border-primary text-primary bg-base-100"
              : "border-transparent text-base-content/70 hover:text-base-content hover:border-base-300"
          }`}
          onClick={() => handleTabChange("search")}
        >
          Search
        </button>
        <button
          class={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab() === "backlinks"
              ? "border-primary text-primary bg-base-100"
              : "border-transparent text-base-content/70 hover:text-base-content hover:border-base-300"
          }`}
          onClick={() => handleTabChange("backlinks")}
        >
          Backlinks
        </button>
      </div>

      {/* Tab Content */}
      <div class="flex-1 overflow-hidden">
        {renderTabContent()}
      </div>
    </div>
  );
};