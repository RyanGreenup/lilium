import { useNavigate } from "@solidjs/router";
import { For, Show, createEffect, createSignal } from "solid-js";
import { tv } from "tailwind-variants";
import { NoteBreadcrumbsById } from "~/components/NoteBreadcrumbs";
import { FollowModeToggle } from "~/components/shared/FollowModeToggle";
import { useFollowMode } from "~/lib/hooks/useFollowMode";
import { useKeybinding } from "~/solid-daisy-components/utilities/useKeybinding";

const breadcrumbsVariants = tv({
  base: "text-xs",
  variants: {
    wrap: {
      true: "flex-wrap",
      false: "overflow-hidden",
    },
  },
  defaultVariants: {
    wrap: true,
  },
});

const breadcrumbItemVariants = tv({
  base: "transition-colors",
  variants: {
    isLast: {
      true: "text-base-content/80 font-medium",
      false: "text-base-content/50 hover:text-base-content/70 cursor-pointer",
    },
    wrap: {
      true: "",
      false: "truncate",
    },
  },
});

export interface ContentItemData {
  id: string;
  title: string;
  abstract: string;
  path?: string;
  onClick?: () => void;
  useNoteBreadcrumbs?: boolean;
}

interface ContentItemProps {
  item: ContentItemData;
  showPath?: boolean;
  isFocused?: boolean;
}

const parsePathToBreadcrumbs = (path: string) => {
  if (!path) return [];

  // Remove leading slash and file extension
  const cleanPath = path.replace(/^\//, "").replace(/\.[^/.]+$/, "");
  const segments = cleanPath.split("/");

  return segments.map((segment, index) => ({
    label:
      segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " "),
    isLast: index === segments.length - 1,
    fullPath: "/" + segments.slice(0, index + 1).join("/"),
  }));
};

export const ContentItem = (props: ContentItemProps) => {
  const navigate = useNavigate();
  const breadcrumbs = () =>
    props.showPath && props.item.path
      ? parsePathToBreadcrumbs(props.item.path)
      : [];

  const classList = () => {
    const classes = [
      "p-3",
      "bg-base-200",
      "rounded-lg",
      "hover:bg-base-300",
      "cursor-pointer",
      "transition-colors",
    ];
    if (props.isFocused) {
      classes.push("ring-2", "ring-primary", "ring-inset");
    }
    return classes.join(" ");
  };

  return (
    <div class={classList()} onClick={props.item.onClick}>
      <button onclick={() => navigate(`/note/${props.item.id}`)}>
        <h4 class="font-medium text-sm text-base-content mb-1 line-clamp-2">
          {props.item.title}
        </h4>
      </button>
      <Show when={props.showPath}>
        <div class="mb-2">
          <div class={breadcrumbsVariants({ wrap: true })}>
            <NoteBreadcrumbsById noteId={createSignal(props.item.id)[0]} />
          </div>
        </div>
      </Show>
      <p class="text-xs text-base-content/70 line-clamp-3">
        {props.item.abstract}
      </p>
    </div>
  );
};

interface ContentListProps {
  items: ContentItemData[];
  showPath?: boolean;
  emptyMessage?: string;
  enableKeyboardNav?: boolean;
  onEscape?: () => void;
  ref?: (el: HTMLDivElement) => void;
  showFollowMode?: boolean;
  focusTrigger?: () => string | null;
}

export const ContentList = (props: ContentListProps) => {
  const [focusedIndex, setFocusedIndex] = createSignal(-1);
  const navigate = useNavigate();
  let containerRef: HTMLDivElement | undefined;
  const itemRefs: (HTMLDivElement | undefined)[] = [];

  // Follow mode hook (only if showFollowMode is true)
  const followModeHook = props.showFollowMode
    ? useFollowMode({
        getFocusedItem: () => {
          const items = props.items;
          const index = focusedIndex();
          return index >= 0 && index < items.length ? items[index] : null;
        },
        keyBindingRef: () => containerRef,
        shouldNavigate: () => true, // Always navigate for content lists
      })
    : { followMode: () => false, setFollowMode: () => {} };

  // Handle external focus requests
  createEffect(() => {
    const trigger = props.focusTrigger?.();
    if (trigger && containerRef) {
      requestAnimationFrame(() => {
        containerRef?.focus();
      });
    }
  });

  // Auto-focus first item when items change and keyboard nav is enabled
  createEffect(() => {
    const items = props.items;
    if (props.enableKeyboardNav && items.length > 0 && focusedIndex() === -1) {
      setFocusedIndex(0);
    } else if (items.length === 0) {
      setFocusedIndex(-1);
    }
  });

  // Scroll focused item into view
  createEffect(() => {
    if (!props.enableKeyboardNav) return;

    const focusIndex = focusedIndex();
    if (focusIndex >= 0 && itemRefs[focusIndex] && containerRef) {
      const focusedElement = itemRefs[focusIndex];
      const container = containerRef;

      if (focusedElement) {
        // Calculate if element is visible
        const containerRect = container.getBoundingClientRect();
        const elementRect = focusedElement.getBoundingClientRect();

        // Check if element is outside the visible area
        const isAboveViewport = elementRect.top < containerRect.top;
        const isBelowViewport = elementRect.bottom > containerRect.bottom;

        if (isAboveViewport || isBelowViewport) {
          focusedElement.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
            inline: "nearest",
          });
        }
      }
    }
  });

  // Keyboard navigation
  if (props.enableKeyboardNav) {
    useKeybinding(
      { key: "ArrowDown" },
      () => {
        const items = props.items;
        const currentIndex = focusedIndex();
        const nextIndex = currentIndex + 1;
        if (nextIndex < items.length) {
          setFocusedIndex(nextIndex);
        }
      },
      { ref: () => containerRef },
    );

    useKeybinding(
      { key: "ArrowUp" },
      () => {
        const currentIndex = focusedIndex();
        const nextIndex = currentIndex - 1;
        if (nextIndex >= 0) {
          setFocusedIndex(nextIndex);
        }
      },
      { ref: () => containerRef },
    );

    useKeybinding(
      { key: "Enter" },
      () => {
        const items = props.items;
        const currentIndex = focusedIndex();
        if (currentIndex >= 0 && currentIndex < items.length) {
          const item = items[currentIndex];
          if (item.onClick) {
            item.onClick();
          } else {
            // Default navigation
            navigate(`/note/${item.id}`);
          }
        }
      },
      { ref: () => containerRef },
    );

    useKeybinding(
      { key: "Escape" },
      () => {
        if (props.onEscape) {
          props.onEscape();
        }
      },
      { ref: () => containerRef },
    );
  }

  return (
    <div class="flex flex-col h-full space-y-4">
      {/* Follow Mode Toggle */}
      {props.showFollowMode && (
        <FollowModeToggle
          followMode={followModeHook.followMode}
          setFollowMode={followModeHook.setFollowMode}
        />
      )}

      <div
        ref={(el) => {
          containerRef = el;
          if (props.ref) {
            props.ref(el);
          }
        }}
        tabIndex={props.enableKeyboardNav ? 0 : undefined}
        class="p-4 space-y-3 outline-none focus:outline-none flex-1 overflow-y-auto min-h-0"
      >
        {props.items.length === 0 ? (
          <div class="text-center text-base-content/60 text-sm py-8">
            {props.emptyMessage || "No items found"}
          </div>
        ) : (
          <div class="space-y-2">
            <For each={props.items}>
              {(item, index) => (
                <div ref={(el) => (itemRefs[index()] = el)}>
                  <ContentItem
                    item={item}
                    showPath={props.showPath}
                    isFocused={
                      props.enableKeyboardNav && focusedIndex() === index()
                    }
                  />
                </div>
              )}
            </For>
          </div>
        )}
      </div>
    </div>
  );
};
