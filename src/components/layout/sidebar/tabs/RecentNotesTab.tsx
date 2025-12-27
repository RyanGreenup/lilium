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
    return data.map((item) => ({ ...item, onClick: () => navigateToNote(item.id) }));
  };

  return (
    <div class="flex flex-col h-full space-y-4">
      <Suspense fallback={<div class="loading loading-spinner loading-sm"></div>}>
        <div class="flex flex-col flex-1 min-h-0">
          <h4 class="text-sm font-medium text-base-content/70 mb-2 flex-shrink-0">
            Recent Notes
            <Show when={items().length > 0}>
              <span class="text-xs text-base-content/50 ml-2">({items().length})</span>
            </Show>
          </h4>
          <ContentList
            items={items()}
            showPath={true}
            enableKeyboardNav={true}
            focusTrigger={props.focusTrigger}
            emptyMessage="No recent notes found"
            showFollowMode={false}
          />
        </div>
      </Suspense>
    </div>
  );
}
