import {  For, createSignal } from "solid-js";
import { tv } from "tailwind-variants";
import { useNavigate } from "@solidjs/router";
import { Breadcrumbs } from "~/solid-daisy-components/components/Breadcrumbs";
import { NoteBreadcrumbsById } from "~/components/NoteBreadcrumbs";

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

  return (
    <div
      class="p-3 bg-base-200 rounded-lg hover:bg-base-300 cursor-pointer transition-colors"
      onClick={props.item.onClick}
    >
      <h4 class="font-medium text-sm text-base-content mb-1 line-clamp-2">
        {props.item.title}
      </h4>
      {props.showPath && (
        <div class="mb-2">
          {props.item.useNoteBreadcrumbs ? (
            <div class={breadcrumbsVariants({ wrap: true })}>
              <NoteBreadcrumbsById noteId={createSignal(props.item.id)[0]} />
            </div>
          ) : (
            props.item.path &&
            breadcrumbs().length > 0 && (
              <Breadcrumbs class={breadcrumbsVariants({ wrap: true })}>
                <For each={breadcrumbs()}>
                  {(crumb, index) => (
                    <Breadcrumbs.Item>
                      <span
                        class={breadcrumbItemVariants({
                          isLast: crumb.isLast,
                          wrap: true,
                        })}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!crumb.isLast) {
                            navigate(`/note${crumb.fullPath}`);
                          }
                        }}
                      >
                        {crumb.label}
                      </span>
                    </Breadcrumbs.Item>
                  )}
                </For>
              </Breadcrumbs>
            )
          )}
        </div>
      )}
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
