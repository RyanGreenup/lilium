import { ContextMenu as KobalteContextMenu } from "@kobalte/core/context-menu";
import { TreeNode } from "./types";
import { JSX } from "solid-js";

export interface ContextMenuProps {
  children: JSX.Element;
  node?: TreeNode;
  onCut?: (nodeId: string) => void;
  onPaste?: (nodeId: string) => void;
  onMoveToRoot?: (nodeId: string) => void;
  onRename?: (nodeId: string) => void;
  onDelete?: (nodeId: string) => void;
  onCreateNew?: (parentId: string) => void;
  canPaste?: boolean;
}

export const ContextMenu = (props: ContextMenuProps) => {
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

  return (
    <KobalteContextMenu>
      <KobalteContextMenu.Trigger class="w-full">
        {props.children}
      </KobalteContextMenu.Trigger>
      
      <KobalteContextMenu.Portal>
        <KobalteContextMenu.Content class="z-50 min-w-32 rounded-md bg-base-100 p-1 shadow-lg border border-base-300 animate-in fade-in-0 zoom-in-95">
          <KobalteContextMenu.Item
            class="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-base-200 focus:bg-base-200 data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
            onSelect={handleCut}
          >
            Cut
          </KobalteContextMenu.Item>
          
          <KobalteContextMenu.Item
            class="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-base-200 focus:bg-base-200 data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
            onSelect={handlePaste}
            disabled={!props.canPaste}
          >
            Paste
          </KobalteContextMenu.Item>

          <KobalteContextMenu.Item
            class="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-base-200 focus:bg-base-200 data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
            onSelect={handleMoveToRoot}
          >
            Move to Root
          </KobalteContextMenu.Item>
          
          <KobalteContextMenu.Separator class="my-1 h-px bg-base-300" />
          
          <KobalteContextMenu.Item
            class="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-base-200 focus:bg-base-200 data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
            onSelect={handleRename}
          >
            Rename
          </KobalteContextMenu.Item>
          
          <KobalteContextMenu.Item
            class="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-base-200 focus:bg-base-200 data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
            onSelect={handleCreateNew}
          >
            New Item
          </KobalteContextMenu.Item>
          
          <KobalteContextMenu.Separator class="my-1 h-px bg-base-300" />
          
          <KobalteContextMenu.Item
            class="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-base-200 focus:bg-base-200 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 text-error"
            onSelect={handleDelete}
          >
            Delete
          </KobalteContextMenu.Item>
        </KobalteContextMenu.Content>
      </KobalteContextMenu.Portal>
    </KobalteContextMenu>
  );
};