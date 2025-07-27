import {
  createResource,
  createSignal,
  createEffect,
  For,
  Show,
  Suspense,
} from "solid-js";
import { Transition } from "solid-transition-group";
import { TreeItemProps } from "./types";
import { useTreeContext } from "./context";
import { ANIMATION_CLASSES } from "./constants";
import { LoadingTreeItem } from "./LoadingTreeItem";
import { ContextMenu } from "./ContextMenu";

const ExpandCollapseIcon = (props: { expanded: boolean; class?: string }) => (
  <svg
    classList={{
      "w-3 h-3 transition-transform duration-200": true,
      "rotate-90": props.expanded,
      [props.class || ""]: !!props.class,
    }}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M9 5l7 7-7 7"
    />
  </svg>
);

const TreeElementTransition = (props: { children: any }) => (
  <Transition
    enterActiveClass={ANIMATION_CLASSES.ENTER_ACTIVE}
    enterClass={ANIMATION_CLASSES.ENTER}
    enterToClass={ANIMATION_CLASSES.ENTER_TO}
    exitActiveClass={ANIMATION_CLASSES.EXIT_ACTIVE}
    exitClass={ANIMATION_CLASSES.EXIT}
    exitToClass={ANIMATION_CLASSES.EXIT_TO}
  >
    {props.children}
  </Transition>
);

export const TreeItem = (props: TreeItemProps) => {
  const ctx = useTreeContext();
  const [editingLabel, setEditingLabel] = createSignal("");
  let inputRef: HTMLInputElement | undefined;

  const expanded = () => ctx.expandedNodes().has(props.node.id);
  const level = () => props.node.level;
  const isSelected = () => ctx.selectedNodeId() === props.node.id;
  const isFocused = () => ctx.focusedNodeId() === props.node.id;
  const isCut = () => ctx.cutNodeId() === props.node.id;
  const isEditing = () => ctx.editingNodeId() === props.node.id;

  const [childrenResource] = createResource(
    () => (expanded() && props.node.hasChildren ? props.node.id : null),
    async (nodeId) => {
      const children = await (ctx.loadChildren?.(nodeId) ||
        Promise.resolve([]));
      if (children.length > 0) {
        ctx.onChildrenLoaded(nodeId, children);
      }
      return children;
    },
  );

  const handleToggle = () => {
    ctx.onExpand(props.node.id);
  };

  const handleClick = () => {
    ctx.onFocus(props.node);
    ctx.onSelect(props.node);
  };

  const handleCut = () => {
    ctx.onCut(props.node.id);
  };

  const handlePaste = () => {
    ctx.onPaste(props.node.id);
  };

  const handleMoveToRoot = () => {
    ctx.onMoveToRoot(props.node.id);
  };

  const handleRename = () => {
    ctx.onRename(props.node.id);
  };

  const handleCreateNew = () => {
    // Note: Create new operation would be handled by parent component
    // For now, we just trigger the context menu callback
  };

  const handleDelete = () => {
    // Note: Delete operation would be handled by parent component
    // For now, we just trigger the context menu callback
  };

  const handleExpandClick = (e: MouseEvent) => {
    e.stopPropagation();
    handleToggle();
  };

  const startEditing = () => {
    setEditingLabel(props.node.label);
    // Use requestAnimationFrame to ensure DOM is updated before focusing
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (inputRef) {
          inputRef.focus();
          inputRef.select();
        }
      });
    });
  };

  const commitEdit = () => {
    const newLabel = editingLabel().trim();
    if (newLabel && newLabel !== props.node.label) {
      ctx.onRenameCommit(props.node.id, newLabel);
    } else {
      ctx.onRenameCancel();
    }
  };

  const cancelEdit = () => {
    ctx.onRenameCancel();
  };

  const handleInputKeyDown = (e: KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === "Enter") {
      commitEdit();
    } else if (e.key === "Escape") {
      cancelEdit();
    }
  };

  const handleInputBlur = () => {
    // Only commit if we have a valid value
    const trimmed = editingLabel().trim();
    if (trimmed) {
      commitEdit();
    } else {
      cancelEdit();
    }
  };

  // Start editing when node becomes the editing target
  createEffect((prevEditing) => {
    const currentlyEditing = isEditing();
    // Only start editing if we weren't editing before and now we are
    if (!prevEditing && currentlyEditing) {
      startEditing();
    }
    return currentlyEditing;
  }, false);

  return (
    <ContextMenu
      node={props.node}
      onCut={handleCut}
      onPaste={handlePaste}
      onMoveToRoot={handleMoveToRoot}
      onRename={handleRename}
      onCreateNew={handleCreateNew}
      onDelete={handleDelete}
      canPaste={!!ctx.cutNodeId()}
    >
      <li>
        <a
          classList={{
            "items-center gap-2 flex w-full": true,
            active: isSelected(),
            "hover:bg-base-300": !isSelected() && !isFocused(),
            "bg-primary/20": isFocused() && !isSelected(),
            "bg-primary text-primary-content": isSelected(),
            "opacity-50 bg-warning text-warning-content": isCut(),
          }}
          style={{ "padding-left": `${level() * 1.5 + 0.5}rem` }}
          onClick={handleClick}
          data-node-id={props.node.id}
          role="treeitem"
          aria-expanded={expanded()}
          aria-level={level() + 1}
          aria-selected={isSelected()}
        >
          <Show
            when={props.node.hasChildren}
            fallback={<div class="w-4 h-4 opacity-0" />}
          >
            <button
              class="btn btn-ghost btn-xs btn-square"
              onClick={handleExpandClick}
              tabIndex={-1}
              aria-label={expanded() ? "Collapse" : "Expand"}
            >
              <ExpandCollapseIcon expanded={expanded()} />
            </button>
          </Show>
          <Show
            when={isEditing()}
            fallback={<span class="flex-1">{props.node.label}</span>}
          >
            <input
              ref={inputRef}
              type="text"
              class="input input-sm flex-1 min-w-0 text-base-content"
              value={editingLabel()}
              onInput={(e) => setEditingLabel(e.currentTarget.value)}
              onKeyDown={handleInputKeyDown}
              onBlur={handleInputBlur}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onFocus={(e) => e.stopPropagation()}
            />
          </Show>
        </a>

        <TreeElementTransition>
          <Show when={expanded() && props.node.hasChildren}>
            <ul>
              <Suspense fallback={<LoadingTreeItem />}>
                <For each={childrenResource()}>
                  {(child) => (
                    <TreeItem node={{ ...child, level: level() + 1 }} />
                  )}
                </For>
              </Suspense>
            </ul>
          </Show>
        </TreeElementTransition>
      </li>
    </ContextMenu>
  );
};
