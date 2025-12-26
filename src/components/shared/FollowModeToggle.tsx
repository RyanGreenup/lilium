import { Accessor } from "solid-js";
import { Toggle } from "~/solid-daisy-components/components/Toggle";
import { Kbd } from "~/solid-daisy-components/components/Kbd";

export interface FollowModeToggleProps {
  followMode: Accessor<boolean>;
  setFollowMode: (value: boolean) => void;
  class?: string;
}

/**
 * Reusable Follow Mode toggle component
 * Consistent UI across all tabs that support follow mode
 */
export function FollowModeToggle(props: FollowModeToggleProps) {
  return (
    <div
      class={`px-4 py-2 bg-base-100 rounded-lg border border-base-300 ${props.class || ""}`}
    >
      <div class="flex items-center justify-between">
        <label class="label cursor-pointer p-0">
          <span class="label-text text-sm font-medium">
            Follow Mode <Kbd size="xs">Ctrl+F</Kbd>
          </span>
        </label>
        <Toggle
          size="sm"
          color="primary"
          checked={props.followMode()}
          onChange={(e) => props.setFollowMode(e.currentTarget.checked)}
        />
      </div>
      <div class="text-xs text-base-content/60 mt-1">
        {props.followMode()
          ? "Navigate to notes as you browse"
          : "Navigate only on Enter"}
      </div>
    </div>
  );
}
