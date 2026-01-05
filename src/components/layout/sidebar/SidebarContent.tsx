import { useNavigate, useParams, useSearchParams } from "@solidjs/router";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  MessageSquare,
  Notebook,
  Search,
  Sparkles,
} from "lucide-solid";
import { createSignal, createMemo, For, onMount, onCleanup, Show, Suspense } from "solid-js";
import { Tabs } from "~/solid-daisy-components/components/Tabs";
import { useKeybinding } from "~/solid-daisy-components/utilities/useKeybinding";
import {
  ContextMenu,
  useContextMenu,
  type ContextMenuItem,
} from "~/solid-daisy-components/components/ContextMenu";
import BacklinksTab from "./tabs/BacklinksTab";
import DiscussionTab from "./tabs/DiscussionTab";
import ForwardLinksTab from "./tabs/ForwardLinksTab";
import { ListViewer } from "./tabs/NotesListTabNew";
import RecentNotesTab from "./tabs/RecentNotesTab";
import RelatedTab from "./tabs/RelatedTab";
import { SidebarSearchContent } from "./tabs/SearchTab";
import { Loading } from "~/solid-daisy-components/components/Loading";
import type { ListItem } from "~/lib/db/types";
import { ITEM_KEYBINDINGS } from "~/lib/keybindings";
import { useListItemActions } from "~/lib/hooks/useListItemActions";
import { OpenNotePalette, useOpenNotePalette } from "~/components/palette";

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
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const params = useParams();

  // Reactive accessor for current note ID from route
  const currentNoteId = () => params.id;

  // Navigation handler for when user selects a note in the sidebar
  const handleNoteSelect = (noteId: string) => {
    navigate(`/note/${noteId}`);
  };

  // Focus triggers for tabs
  const [notesFocusTrigger, setNotesFocusTrigger] = createSignal<string | null>(
    null,
  );
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

  // Persistent notes list state across tab navigation
  const [notesHistory, setNotesHistory] = createSignal<string[]>([]);
  const [notesFocusMemory, setNotesFocusMemory] = createSignal<
    Record<string, number | undefined>
  >({});

  // ==========================================================================
  // Open Note Palette
  // [TODO 2025-12-28 17:49]
  // ==========================================================================
  // The "current parent" is pulled from the file browser's navigation history.
  // This allows the palette to scope searches to the current folder context
  // without requiring the user to navigate away from their current note.
  //
  // FUTURE: This parentId will be connected to a URL parameter for "virtual root"
  // This will effectively be `cd`, api will scope all queries to
  // descendants of a parent_id by using =mv_note_paths= and =mv_folder_paths=
  //
  // The palette will then look at that (and likely move to a global context
  // provider. Then the Link Insert Palette can use it too
  // For now, it's derived from the sidebar's navigation state. as the API
  // has not yet been implemented.

  const currentFileBrowserParent = createMemo(() => notesHistory().at(-1) ?? null);

  // Open note palette with scoped search (uses file browser's current folder)
  const openPaletteScoped = useOpenNotePalette({
    parentId: currentFileBrowserParent,
  });

  // Open note palette with global search (all notes)
  const openPaletteGlobal = useOpenNotePalette({
    parentId: () => null,
  });

  // Ctrl+P: Open global palette (search all notes)
  useKeybinding({ key: "p", ctrl: true }, openPaletteGlobal.open);

  // Ctrl+Alt+P: Open scoped palette (search within current folder context)
  // NOTE: Using Ctrl+Alt instead of Ctrl+Shift to avoid browser conflicts
  // (Ctrl+Shift+P often opens browser dev tools or other browser features)
  useKeybinding({ key: "p", ctrl: true, alt: true }, openPaletteScoped.open);

  // Context menu state - discriminated union for clarity
  type ContextMenuTarget =
    | { type: "item"; item: ListItem }
    | { type: "emptyArea"; parentId: string | null };

  const [contextTarget, setContextTarget] =
    createSignal<ContextMenuTarget | null>(null);

  // List item actions (create, rename, etc.)
  const {
    editingItemId,
    handleStartEdit,
    handleCancelRename,
    handleRename,
    handleCreateSibling,
    handleCreateChild,
    handleCreateInFolder,
    handleCopyLink,
    handleDuplicate,
    cutItem,
    handleCut,
    handlePaste,
    handlePasteChild,
    handleDelete,
    handleMakeFolder,
    handleMakeNote,
  } = useListItemActions();

  // Menu builder for empty area (backdrop) clicks
  const buildEmptyAreaMenu = (parentId: string | null): ContextMenuItem[] => [
    {
      id: "create-note",
      label: "New note",
      keybind: ITEM_KEYBINDINGS.createSibling.key,
      onClick: () => handleCreateInFolder(parentId, "note"),
    },
    {
      id: "create-folder",
      label: "New folder",
      keybind: ITEM_KEYBINDINGS.createSiblingFolder.key,
      onClick: () => handleCreateInFolder(parentId, "folder"),
    },
  ];

  // Menu builder for item clicks
  const buildItemMenu = (item: ListItem): ContextMenuItem[] => {
    const isFolder = item.type === "folder";
    return [
      { id: "rename", label: ITEM_KEYBINDINGS.rename.label, keybind: ITEM_KEYBINDINGS.rename.key, onClick: () => handleStartEdit(item) },
      { id: "create-sibling", label: ITEM_KEYBINDINGS.createSibling.label, keybind: ITEM_KEYBINDINGS.createSibling.key, onClick: () => handleCreateSibling(item, "note") },
      { id: "create-sibling-folder", label: ITEM_KEYBINDINGS.createSiblingFolder.label, keybind: ITEM_KEYBINDINGS.createSiblingFolder.key, onClick: () => handleCreateSibling(item, "folder") },
      { id: "create-child", label: ITEM_KEYBINDINGS.createChild.label, keybind: ITEM_KEYBINDINGS.createChild.key, onClick: () => handleCreateChild(item, "note") },
      { id: "create-child-folder", label: ITEM_KEYBINDINGS.createChildFolder.label, keybind: ITEM_KEYBINDINGS.createChildFolder.key, onClick: () => handleCreateChild(item, "folder") },
      { id: "sep1", label: "", separator: true },
      { id: "copy-link", label: ITEM_KEYBINDINGS.copyLink.label, keybind: ITEM_KEYBINDINGS.copyLink.key, onClick: () => handleCopyLink(item) },
      { id: "duplicate", label: ITEM_KEYBINDINGS.duplicate.label, keybind: ITEM_KEYBINDINGS.duplicate.key, onClick: () => handleDuplicate(item) },
      isFolder
        ? { id: "make-note", label: ITEM_KEYBINDINGS.makeNote.label, keybind: ITEM_KEYBINDINGS.makeNote.key, onClick: () => handleMakeNote(item) }
        : { id: "make-folder", label: ITEM_KEYBINDINGS.makeFolder.label, keybind: ITEM_KEYBINDINGS.makeFolder.key, onClick: () => handleMakeFolder(item) },
      { id: "cut", label: ITEM_KEYBINDINGS.cut.label, keybind: ITEM_KEYBINDINGS.cut.key, onClick: () => handleCut(item) },
      { id: "paste", label: ITEM_KEYBINDINGS.paste.label, keybind: ITEM_KEYBINDINGS.paste.key, onClick: () => handlePaste(item) },
      { id: "paste-child", label: ITEM_KEYBINDINGS.pasteChild.label, keybind: ITEM_KEYBINDINGS.pasteChild.key, onClick: () => handlePasteChild(item) },
      { id: "sep2", label: "", separator: true },
      { id: "delete", label: ITEM_KEYBINDINGS.delete.label, keybind: ITEM_KEYBINDINGS.delete.key, onClick: () => handleDelete(item) },
    ];
  };

  const getContextMenuItems = (): ContextMenuItem[] => {
    const target = contextTarget();
    if (!target) return [];
    return target.type === "emptyArea"
      ? buildEmptyAreaMenu(target.parentId)
      : buildItemMenu(target.item);
  };

  const contextMenu = useContextMenu({ items: getContextMenuItems() });

  const handleContextMenu = (item: ListItem, event: MouseEvent) => {
    setContextTarget({ type: "item", item });
    contextMenu.open(event);
  };

  const handleEmptyAreaContextMenu = (
    parentId: string | null,
    event: MouseEvent,
  ) => {
    setContextTarget({ type: "emptyArea", parentId });
    contextMenu.open(event);
  };

  const tabs = [
    { id: 0, label: "Notes", key: "notes", icon: <Notebook class="w-4 h-4" /> },
    { id: 1, label: "Recent", key: "recent", icon: <Clock class="w-4 h-4" /> },
    { id: 2, label: "Search", key: "search", icon: <Search class="w-4 h-4" /> },
    {
      id: 3,
      label: "Backlinks",
      key: "backlinks",
      icon: <ArrowLeft class="w-4 h-4" />,
    },
    {
      id: 4,
      label: "Forward",
      key: "forward",
      icon: <ArrowRight class="w-4 h-4" />,
    },
    {
      id: 5,
      label: "Related",
      key: "related",
      icon: <Sparkles class="w-4 h-4" />,
    },
    {
      id: 6,
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
    setActiveTab(tabId);
    const tab = tabs.find((t) => t.id === tabId);
    if (tab) {
      setSearchParams({ sidebar: tab.key });
    }

    // Trigger focus when switching tabs to enable immediate keyboard navigation
    const shouldFocus = true;
    if (shouldFocus) {
      const triggerId = Date.now().toString();
      if (tabId === 0) {
        // Notes tab - focus file browser for keyboard navigation
        setNotesFocusTrigger(triggerId);
        setTimeout(() => setNotesFocusTrigger(null), 100);
      } else if (tabId === 1) {
        // Recent tab - focus list for keybinding navigation
        setRecentFocusTrigger(triggerId);
        setTimeout(() => setRecentFocusTrigger(null), 100);
      } else if (tabId === 2) {
        // Search tab - focus input for both keybinding and clicks
        setSearchFocusTrigger(triggerId);
        setTimeout(() => setSearchFocusTrigger(null), 100);
      } else if (tabId === 3) {
        // Backlinks tab - focus list for keybinding navigation
        setBacklinksFocusTrigger(triggerId);
        setTimeout(() => setBacklinksFocusTrigger(null), 100);
      } else if (tabId === 4) {
        // Forward links tab - focus list for keybinding navigation
        setForwardLinksFocusTrigger(triggerId);
        setTimeout(() => setForwardLinksFocusTrigger(null), 100);
      } else if (tabId === 5) {
        // Related tab - focus list for keybinding navigation
        setRelatedFocusTrigger(triggerId);
        setTimeout(() => setRelatedFocusTrigger(null), 100);
      } else if (tabId === 6) {
        // Discussion tab - focus textarea for immediate typing
        setDiscussionFocusTrigger(triggerId);
        setTimeout(() => setDiscussionFocusTrigger(null), 100);
      }
    }
  };

  // Global keybindings for tab switching (Ctrl + 1-7)
  useKeybinding({ key: "1", ctrl: true }, () => handleTabChange(0, true));
  useKeybinding({ key: "2", ctrl: true }, () => handleTabChange(1, true));
  useKeybinding({ key: "3", ctrl: true }, () => handleTabChange(2, true));
  useKeybinding({ key: "4", ctrl: true }, () => handleTabChange(3, true));
  useKeybinding({ key: "5", ctrl: true }, () => handleTabChange(4, true));
  useKeybinding({ key: "6", ctrl: true }, () => handleTabChange(5, true));
  useKeybinding({ key: "7", ctrl: true }, () => handleTabChange(6, true));

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

      <div class="mt-4 relative flex-1 min-h-0">
        {/* Notes Tab */}
        <div class="h-full" classList={{ hidden: activeTab() !== 0 }}>
          <Suspense fallback={<SidebarLoadingIndicator />}>
            <ListViewer
              focusTrigger={notesFocusTrigger}
              currentNoteId={currentNoteId}
              onNoteSelect={handleNoteSelect}
              onContextMenu={handleContextMenu}
              onEmptyAreaContextMenu={handleEmptyAreaContextMenu}
              editingItemId={editingItemId}
              onRename={handleRename}
              onCancelRename={handleCancelRename}
              onCreateSibling={handleCreateSibling}
              onCreateChild={handleCreateChild}
              onStartEdit={handleStartEdit}
              onCopyLink={handleCopyLink}
              onDuplicate={handleDuplicate}
              cutItemId={() => cutItem()?.id ?? null}
              onCut={handleCut}
              onPaste={handlePaste}
              onPasteChild={handlePasteChild}
              onDelete={handleDelete}
              onMakeFolder={handleMakeFolder}
              onMakeNote={handleMakeNote}
              persistedHistory={notesHistory()}
              onHistoryChange={setNotesHistory}
              persistedFocusMemory={notesFocusMemory()}
              onFocusMemoryChange={setNotesFocusMemory}
            />
          </Suspense>
        </div>

        {/* Recent Tab */}
        <div class="h-full" classList={{ hidden: activeTab() !== 1 }}>
          <Suspense fallback={<SidebarLoadingIndicator />}>
            <RecentNotesTab focusTrigger={recentFocusTrigger} />
          </Suspense>
        </div>

        {/* Search Tab */}
        <div class="h-full" classList={{ hidden: activeTab() !== 2 }}>
          <Suspense fallback={<SidebarLoadingIndicator />}>
            <SidebarSearchContent
              focusTrigger={searchFocusTrigger}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
            />
          </Suspense>
        </div>

        {/* Backlinks Tab */}
        <div class="h-full" classList={{ hidden: activeTab() !== 3 }}>
          <Suspense fallback={<SidebarLoadingIndicator />}>
            <BacklinksTab focusTrigger={backlinksFocusTrigger} />
          </Suspense>
        </div>

        {/* Forward Links Tab */}
        <div class="h-full" classList={{ hidden: activeTab() !== 4 }}>
          <Suspense fallback={<SidebarLoadingIndicator />}>
            <ForwardLinksTab focusTrigger={forwardLinksFocusTrigger} />
          </Suspense>
        </div>

        {/* Related Tab */}
        <div class="h-full" classList={{ hidden: activeTab() !== 5 }}>
          <Suspense fallback={<SidebarLoadingIndicator />}>
            <RelatedTab focusTrigger={relatedFocusTrigger} />
          </Suspense>
        </div>

        {/* Discussion Tab */}
        <div class="h-full" classList={{ hidden: activeTab() !== 6 }}>
          <Suspense fallback={<SidebarLoadingIndicator />}>
            <DiscussionTab focusTrigger={discussionFocusTrigger} />
          </Suspense>
        </div>
      </div>

      {/* Context menu for list items - wrapped in Show to ensure items are evaluated
          when the menu opens (after contextItem signal is set), not at component init */}
      <Show when={contextMenu.isOpen()}>
        <ContextMenu
          items={getContextMenuItems()}
          open={true}
          x={contextMenu.contextMenuProps().x}
          y={contextMenu.contextMenuProps().y}
          onOpenChange={(open) => {
            if (!open) contextMenu.close();
          }}
        />
      </Show>

      {/* Open Note Palettes */}
      {/* Ctrl+P: Global palette (all notes) */}
      <OpenNotePalette {...openPaletteGlobal.paletteProps} />
      {/* Ctrl+Shift+P: Scoped palette (within current folder context) */}
      <OpenNotePalette {...openPaletteScoped.paletteProps} />
    </div>
  );
};
