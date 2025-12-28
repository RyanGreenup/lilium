import { createAsync, useSearchParams, useNavigate } from "@solidjs/router";
import { Suspense, Show } from "solid-js";
import { ContentList, ContentItemData } from "../shared/ContentItem";
import { getRecentNotesForDisplay } from "~/lib/sidebar";

interface RecentNotesTabProps {
  focusTrigger?: () => string | null;
}

export default function RecentNotesTab(props: RecentNotesTabProps = {}) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const recentNotesData = createAsync(() => getRecentNotesForDisplay(10));

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
    const data = recentNotesData();
    if (!data) return [];
    return data.map((item) => ({
      ...item,
      onClick: () => navigateToNote(item.id),
    }));
  };

  return (
    <Suspense fallback={<div class="loading loading-spinner loading-sm"></div>}>
      <div class="h-full flex flex-col">
        <h4 class="text-sm font-medium text-base-content/70 mb-2">
          Recent Notes
          <Show when={items().length > 0}>
            <span class="text-xs text-base-content/50 ml-2">
              ({items().length})
            </span>
          </Show>
        </h4>
        <div class="flex-1 min-h-0 overflow-y-auto">
          <ContentList
            items={items()}
            showPath={true}
            enableKeyboardNav={true}
            focusTrigger={props.focusTrigger}
            emptyMessage="No recent notes found"
            showFollowMode={false}
          />
        </div>
      </div>
    </Suspense>
  );
}
