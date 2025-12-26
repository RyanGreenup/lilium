import { createAsync, useSearchParams, useNavigate } from "@solidjs/router";
import { Suspense, Show } from "solid-js";
import { ContentList, ContentItemData } from "../shared/ContentItem";
import { useCurrentNote } from "~/lib/hooks/useCurrentNote";
import { getRecentNotesQuery } from "~/lib/db/notes/search";
import { getDisplayTitle } from "~/lib/db/notes/utils";

interface RecentNotesTabProps {
  focusTrigger?: () => string | null;
}

const N_RECENT_NOTES = 20;

export default function RecentNotesTab(props: RecentNotesTabProps = {}) {
  const { noteId } = useCurrentNote();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Get recent notes from the database
  const recentNotesData = createAsync(() =>
    getRecentNotesQuery(N_RECENT_NOTES),
  );

  // Function to navigate while preserving search params
  const navigateToNote = (noteId: string) => {
    const currentParams = new URLSearchParams();

    // Preserve all current search parameters
    Object.entries(searchParams).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((v) => currentParams.append(key, v));
      } else if (value !== undefined) {
        currentParams.set(key, value);
      }
    });

    const searchString = currentParams.toString();
    const url = `/note/${noteId}${searchString ? `?${searchString}` : ""}`;
    navigate(url);
  };

  // Transform database notes to ContentItemData format
  const transformedRecentNotes = () => {
    const notes = recentNotesData();
    if (!notes) return [];

    return notes.map(
      (note): ContentItemData => ({
        id: note.id,
        title: getDisplayTitle(note),
        abstract: note.abstract || "",
        path: `/note/${note.id}`,
        onClick: () => navigateToNote(note.id),
      }),
    );
  };

  return (
    <div class="flex flex-col h-full space-y-4">
      {/* Recent Notes List */}
      <Suspense
        fallback={<div class="loading loading-spinner loading-sm"></div>}
      >
        <div class="flex flex-col flex-1 min-h-0">
          <h4 class="text-sm font-medium text-base-content/70 mb-2 flex-shrink-0">
            Recent Notes
            <Show when={transformedRecentNotes().length > 0}>
              <span class="text-xs text-base-content/50 ml-2">
                ({transformedRecentNotes().length})
              </span>
            </Show>
          </h4>

          <ContentList
            items={transformedRecentNotes()}
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
