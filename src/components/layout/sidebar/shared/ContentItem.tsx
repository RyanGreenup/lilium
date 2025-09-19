import { JSXElement, For } from "solid-js";

export interface ContentItemData {
  id: string;
  title: string;
  abstract: string;
  path?: string;
  onClick?: () => void;
}

interface ContentItemProps {
  item: ContentItemData;
  showPath?: boolean;
}

export const ContentItem = (props: ContentItemProps) => (
  <div
    class="p-3 bg-base-200 rounded-lg hover:bg-base-300 cursor-pointer transition-colors"
    onClick={props.item.onClick}
  >
    <h4 class="font-medium text-sm text-base-content mb-1 line-clamp-2">
      {props.item.title}
    </h4>
    {props.showPath && props.item.path && (
      <p class="text-xs text-base-content/60 mb-2 font-mono">
        {props.item.path}
      </p>
    )}
    <p class="text-xs text-base-content/70 line-clamp-3">
      {props.item.abstract}
    </p>
  </div>
);

interface ContentListProps {
  items: ContentItemData[];
  showPath?: boolean;
  emptyMessage?: string;
}

export const ContentList = (props: ContentListProps) => (
  <div class="p-4 space-y-3">
    {props.items.length === 0 ? (
      <div class="text-center text-base-content/60 text-sm py-8">
        {props.emptyMessage || "No items found"}
      </div>
    ) : (
      <div class="space-y-2">
        <For each={props.items}>
          {(item) => <ContentItem item={item} showPath={props.showPath} />}
        </For>
      </div>
    )}
  </div>
);
