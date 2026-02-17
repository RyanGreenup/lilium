import { For, Show, createEffect } from "solid-js";
import type { ListItem } from "~/lib/db/types";
import ColumnItem from "./ColumnItem";

interface ColumnProps {
  title: string;
  items: ListItem[];
  focusedIndex: number;
  width: number;
  isActive: boolean;
  isSliding: boolean;
  nextColumnFolderId: string | null | undefined;
  cutItemId: string | null;
  onItemClick: (itemIdx: number, item: ListItem) => void;
  onItemMouseMove: (itemIdx: number) => void;
}

export default function Column(props: ColumnProps) {
  let columnRef: HTMLDivElement | undefined;

  // Scroll focused item into view when this is the active column.
  // Footgun: running scrollIntoView while the parent track is animating
  // introduces competing scroll/transform updates and visible jitter.
  // Keep this disabled during slides.
  createEffect(() => {
    if (!props.isActive || props.isSliding || !columnRef) return;
    const items = columnRef.querySelectorAll("[data-list-item]");
    const el = items[props.focusedIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  });

  return (
    <div
      ref={columnRef}
      class="h-full overflow-y-auto flex-shrink-0 border-r border-base-300 bg-base-100"
      style={{ width: `${props.width}px` }}
    >
      {/* Column header */}
      <div class="px-3 py-1.5 text-xs font-semibold text-base-content/50 uppercase tracking-wider border-b border-base-300 sticky top-0 bg-base-100 z-10">
        {props.title}
      </div>

      <Show
        when={props.items.length > 0}
        fallback={
          <div class="flex items-center justify-center h-32 text-base-content/40 text-sm">
            Empty folder
          </div>
        }
      >
        <For each={props.items}>
          {(item, itemIdx) => {
            const isFocused = () =>
              props.isActive && itemIdx() === props.focusedIndex;

            const isCurrentFolder = () => {
              if (props.isActive) return false;
              return (
                !!props.nextColumnFolderId &&
                item.id === props.nextColumnFolderId
              );
            };

            return (
              <ColumnItem
                item={item}
                focused={isFocused()}
                selected={isCurrentFolder()}
                isCut={props.cutItemId === item.id}
                onClick={() => props.onItemClick(itemIdx(), item)}
                onMouseMove={() => props.onItemMouseMove(itemIdx())}
              />
            );
          }}
        </For>
      </Show>
    </div>
  );
}
