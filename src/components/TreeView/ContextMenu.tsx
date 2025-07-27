import { ContextMenu as KobalteContextMenu } from "@kobalte/core/context-menu";
import { TreeNode } from "./types";
import { JSX } from "solid-js";
import { useTreeContext } from "./context";
import { tv } from "tailwind-variants";

// Tailwind Variants for context menu styling
const contextMenuStyles = tv({
  slots: {
    trigger: "w-full",
    content: [
      "z-50 min-w-48 rounded-md bg-base-100 p-1 shadow-lg border border-base-300",
      "animate-in fade-in-0 zoom-in-95"
    ],
    subContent: [
      "z-50 min-w-32 rounded-md bg-base-100 p-1 shadow-lg border border-base-300",
      "animate-in fade-in-0 zoom-in-95"
    ],
    item: [
      "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
      "hover:bg-base-200 focus:bg-base-200",
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
    ],
    subTrigger: [
      "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
      "hover:bg-base-200 focus:bg-base-200 data-[state=open]:bg-base-200"
    ],
    separator: "my-1 h-px bg-base-300",
    icon: "ml-auto h-4 w-4"
  },
  variants: {
    intent: {
      default: {},
      destructive: {
        item: "text-error"
      }
    }
  }
});

export interface ContextMenuProps {
  children: JSX.Element;
  node?: TreeNode;
  onCut?: (nodeId: string) => void;
  onPaste?: (nodeId: string) => void;
  onMoveToRoot?: (nodeId: string) => void;
  onRename?: (nodeId: string) => void;
  onDelete?: (nodeId: string) => void;
  onCreateNew?: (parentId: string) => void;
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
  onCollapseAllExceptFocused?: () => void;
  onCollapseAllExceptSelected?: () => void;
  onFoldCycle?: () => void;
  onRefreshTree?: () => void;
  onHoistHere?: (nodeId: string) => void;
  onFocusAndReveal?: (nodeId: string) => void;
  canPaste?: boolean;
  hasChildren?: boolean;
}

export const ContextMenu = (props: ContextMenuProps) => {
  const ctx = useTreeContext();
  const styles = contextMenuStyles();

  const handleOpenChange = (open: boolean) => {
    ctx.setContextMenuOpen(open);
  };

  const handleCut = () => {
    if (props.node) {
      props.onCut?.(props.node.id);
    }
  };

  const handlePaste = () => {
    if (props.node) {
      props.onPaste?.(props.node.id);
    }
  };

  const handleRename = () => {
    if (props.node) {
      props.onRename?.(props.node.id);
    }
  };

  const handleDelete = () => {
    if (props.node) {
      props.onDelete?.(props.node.id);
    }
  };

  const handleMoveToRoot = () => {
    if (props.node) {
      props.onMoveToRoot?.(props.node.id);
    }
  };

  const handleCreateNew = () => {
    if (props.node) {
      props.onCreateNew?.(props.node.id);
    }
  };

  const handleExpandAll = () => {
    props.onExpandAll?.();
  };

  const handleCollapseAll = () => {
    props.onCollapseAll?.();
  };

  const handleCollapseAllExceptFocused = () => {
    props.onCollapseAllExceptFocused?.();
  };

  const handleCollapseAllExceptSelected = () => {
    props.onCollapseAllExceptSelected?.();
  };

  const handleFoldCycle = () => {
    props.onFoldCycle?.();
  };

  const handleRefreshTree = () => {
    props.onRefreshTree?.();
  };

  const handleHoistHere = () => {
    if (props.node) {
      props.onHoistHere?.(props.node.id);
    }
  };

  const handleFocusAndReveal = () => {
    if (props.node) {
      props.onFocusAndReveal?.(props.node.id);
    }
  };

  return (
    <KobalteContextMenu onOpenChange={handleOpenChange}>
      <KobalteContextMenu.Trigger class={styles.trigger()}>
        {props.children}
      </KobalteContextMenu.Trigger>
      
      <KobalteContextMenu.Portal>
        <KobalteContextMenu.Content class={styles.content()}>
          {/* Cut/Paste Operations */}
          <KobalteContextMenu.Item
            class={styles.item()}
            onSelect={handleCut}
          >
            Cut
          </KobalteContextMenu.Item>
          
          <KobalteContextMenu.Item
            class={styles.item()}
            onSelect={handlePaste}
            disabled={!props.canPaste}
          >
            Paste
          </KobalteContextMenu.Item>

          <KobalteContextMenu.Item
            class={styles.item()}
            onSelect={handleMoveToRoot}
          >
            Move to Root
          </KobalteContextMenu.Item>
          
          <KobalteContextMenu.Separator class={styles.separator()} />
          
          {/* CRUD Operations */}
          <KobalteContextMenu.Item
            class={styles.item()}
            onSelect={handleRename}
          >
            Rename
          </KobalteContextMenu.Item>
          
          <KobalteContextMenu.Item
            class={styles.item()}
            onSelect={handleCreateNew}
          >
            New Item
          </KobalteContextMenu.Item>
          
          <KobalteContextMenu.Separator class={styles.separator()} />

          {/* Expansion Controls */}
          <KobalteContextMenu.Sub>
            <KobalteContextMenu.SubTrigger class={styles.subTrigger()}>
              Expand/Collapse
              <svg class={styles.icon()} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </KobalteContextMenu.SubTrigger>
            <KobalteContextMenu.Portal>
              <KobalteContextMenu.SubContent class={styles.subContent()}>
                <KobalteContextMenu.Item
                  class={styles.item()}
                  onSelect={handleExpandAll}
                >
                  Expand All
                </KobalteContextMenu.Item>
                <KobalteContextMenu.Item
                  class={styles.item()}
                  onSelect={handleCollapseAll}
                >
                  Collapse All
                </KobalteContextMenu.Item>
                <KobalteContextMenu.Item
                  class={styles.item()}
                  onSelect={handleCollapseAllExceptFocused}
                >
                  Collapse All Except Focused
                </KobalteContextMenu.Item>
                <KobalteContextMenu.Item
                  class={styles.item()}
                  onSelect={handleCollapseAllExceptSelected}
                >
                  Collapse All Except Selected
                </KobalteContextMenu.Item>
                <KobalteContextMenu.Item
                  class={styles.item()}
                  onSelect={handleFoldCycle}
                >
                  Fold Cycle
                </KobalteContextMenu.Item>
              </KobalteContextMenu.SubContent>
            </KobalteContextMenu.Portal>
          </KobalteContextMenu.Sub>

          {/* Navigation & Special Operations */}
          <KobalteContextMenu.Item
            class={styles.item()}
            onSelect={handleFocusAndReveal}
          >
            Focus and Reveal
          </KobalteContextMenu.Item>

          <KobalteContextMenu.Item
            class={styles.item()}
            onSelect={handleHoistHere}
            disabled={!props.hasChildren}
          >
            Hoist Here (Set as Root)
          </KobalteContextMenu.Item>

          <KobalteContextMenu.Item
            class={styles.item()}
            onSelect={handleRefreshTree}
          >
            Refresh Tree
          </KobalteContextMenu.Item>
          
          <KobalteContextMenu.Separator class={styles.separator()} />
          
          {/* Destructive Operations */}
          <KobalteContextMenu.Item
            class={styles.item({ intent: "destructive" })}
            onSelect={handleDelete}
          >
            Delete
          </KobalteContextMenu.Item>
        </KobalteContextMenu.Content>
      </KobalteContextMenu.Portal>
    </KobalteContextMenu>
  );
};