import ChevronRight from "lucide-solid/icons/chevron-right";
import { Show } from "solid-js";
import type { ListItem, NoteListItem } from "~/lib/db/types";
import {
  listItemVariants,
  listItemNameVariants,
} from "~/components/layout/sidebar/tabs/listStyle";
import ItemIcon from "./ItemIcon";

interface ColumnItemProps {
  item: ListItem;
  focused: boolean;
  selected: boolean;
  isCut: boolean;
  isMarked: boolean;
  onClick: () => void;
  onMouseMove: () => void;
}

export default function ColumnItem(props: ColumnItemProps) {
  return (
    <div
      data-list-item
      class={`${listItemVariants({
        focused: props.focused,
        selected: props.selected,
      })} transition-none ${props.isCut ? "opacity-40 italic border border-dashed border-warning/60" : ""} ${props.isMarked ? "border-l-4 border-l-info bg-info/10" : ""}`}
      onClick={props.onClick}
      onMouseMove={props.onMouseMove}
    >
      <ItemIcon item={props.item} />
      <span
        class={listItemNameVariants({
          focused: props.focused,
          selected: props.selected,
        })}
      >
        {props.item.title}
      </span>
      <Show when={props.item.type === "note" && "syntax" in props.item}>
        <span class="ml-auto text-xs text-base-content/50">
          {(props.item as NoteListItem).syntax}
        </span>
      </Show>
      <Show when={props.item.type === "folder"}>
        <ChevronRight class="ml-auto w-4 h-4 text-base-content/30" />
      </Show>
    </div>
  );
}
