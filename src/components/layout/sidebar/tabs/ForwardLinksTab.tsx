import { createAsync, useSearchParams, useNavigate } from "@solidjs/router";
import { Suspense, Show } from "solid-js";
import { ContentList, ContentItemData } from "../shared/ContentItem";
import { useCurrentNote } from "~/lib/hooks/useCurrentNote";
import { getForwardLinksForDisplay } from "~/lib/sidebar";

interface ForwardLinksTabProps {
  focusTrigger?: () => string | null;
}

export default function ForwardLinksTab(props: ForwardLinksTabProps = {}) {
  const { noteId } = useCurrentNote();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const forwardLinksData = createAsync(async () => {
    const id = noteId();
    if (!id) return [];
    return await getForwardLinksForDisplay(id);
  });

  const navigateToNote = (noteId: string) => {
    const params = new URLSearchParams();
    Object.entries(searchParams).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((v) => params.append(key, v));
      } else if (value !== undefined) {
        params.set(key, value);
      }
    });
    const search = params.toString();
    navigate(`/note/${noteId}${search ? `?${search}` : ""}`);
  };

  const items = (): ContentItemData[] => {
    const data = forwardLinksData();
    if (!data) return [];
    return data.map((item) => ({ ...item, onClick: () => navigateToNote(item.id) }));
  };

  return (
    <Suspense fallback={<div class="loading loading-spinner loading-sm"></div>}>
      <div>
        <h4 class="text-sm font-medium text-base-content/70 mb-2">
          Forward Links
          <Show when={items().length > 0}>
            <span class="text-xs text-base-content/50 ml-2">({items().length})</span>
          </Show>
        </h4>
        <ContentList
          items={items()}
          showPath={true}
          enableKeyboardNav={true}
          focusTrigger={props.focusTrigger}
          emptyMessage="No forward links found for this note"
          showFollowMode={false}
        />
      </div>
    </Suspense>
  );
}
