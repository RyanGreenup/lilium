import { createSignal, JSXElement, Switch, Match, For, onMount } from "solid-js";
import { tv } from "tailwind-variants";
import { Transition } from "solid-transition-group";
import FileText from "lucide-solid/icons/file-text";
import Search from "lucide-solid/icons/search";
import Link from "lucide-solid/icons/link";

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
  icon: typeof FileText;
  content: (props: SidebarTabsProps) => JSXElement;
  placeholder?: string;
}

const sidebarTabs = tv({
  slots: {
    container: "flex flex-col h-full",
    tabList: "flex border-b border-base-300 overflow-x-auto",
    tab: "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
    content: "flex-1 overflow-hidden",
    placeholder: "p-4 text-center text-base-content/50",
    transition: "transition-all duration-200 ease-in-out",
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
    entering: {
      true: {
        transition: "opacity-0 transform translate-x-2",
      },
      false: {
        transition: "opacity-100 transform translate-x-0",
      },
    },
  },
});

const tabs: TabConfig[] = [
  {
    id: "files",
    label: "Files",
    icon: FileText,
    content: (props) => props.filesContent,
  },
  {
    id: "search",
    label: "Search",
    icon: Search,
    content: (props) => props.searchContent,
    placeholder: "Search functionality coming soon",
  },
  {
    id: "backlinks",
    label: "Backlinks",
    icon: Link,
    content: (props) => props.backlinksContent,
    placeholder: "Backlinks functionality coming soon",
  },
];

export const SidebarTabs = (props: SidebarTabsProps) => {
  const [activeTab, setActiveTab] = createSignal<SidebarTabId>(
    props.activeTab || "files",
  );
  const styles = sidebarTabs();
  let tabListRef: HTMLDivElement | undefined;

  const handleTabChange = (tabId: SidebarTabId) => {
    setActiveTab(tabId);
    props.onTabChange?.(tabId);
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    const currentIndex = tabs.findIndex((tab) => tab.id === activeTab());
    let newIndex: number;

    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        newIndex = (currentIndex + 1) % tabs.length;
        handleTabChange(tabs[newIndex].id);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        newIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        handleTabChange(tabs[newIndex].id);
        break;
    }
  };

  onMount(() => {
    if (tabListRef) {
      tabListRef.addEventListener("keydown", handleKeyDown);
    }
  });

  return (
    <div class={styles.container()}>
      {/* Tab Navigation */}
      <div
        ref={tabListRef}
        class={styles.tabList()}
        role="tablist"
        tabIndex={0}
      >
        <For each={tabs}>
          {(tab) => (
            <button
              class={styles.tab({ active: activeTab() === tab.id })}
              role="tab"
              tabIndex={-1}
              aria-selected={activeTab() === tab.id}
              onClick={() => handleTabChange(tab.id)}
            >
              <tab.icon size={16} />
            </button>
          )}
        </For>
      </div>

      {/* Tab Content */}
      <div class={styles.content()}>
        <Transition
          enterClass={styles.transition({ entering: true })}
          enterToClass={styles.transition({ entering: false })}
          exitClass={styles.transition({ entering: false })}
          exitToClass={styles.transition({ entering: true })}
        >
          <Switch>
            <For each={tabs}>
              {(tab) => (
                <Match when={activeTab() === tab.id}>
                  <div class={styles.transition()}>
                    {tab.content(props) || (
                      <div class={styles.placeholder()}>{tab.placeholder}</div>
                    )}
                  </div>
                </Match>
              )}
            </For>
          </Switch>
        </Transition>
      </div>
    </div>
  );
};
