import { createAsync, useSearchParams, useNavigate } from "@solidjs/router";
import { Suspense, Show } from "solid-js";
import { ContentList, ContentItemData } from "../shared/ContentItem";
import { useCurrentNote } from "~/lib/hooks/useCurrentNote";
import { getBacklinksQuery } from "~/lib/db_new/notes/search";
import { getDisplayTitle } from "~/lib/db_new/notes/utils";

interface BacklinksTabProps {
  focusTrigger?: () => string | null;
}

export default function BacklinksTab(props: BacklinksTabProps = {}) {
  const { noteId } = useCurrentNote();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Get backlinks from the database
  const backlinksData = createAsync(() => {
    const currentNoteId = noteId();
    if (!currentNoteId) return Promise.resolve([]);
    return getBacklinksQuery(currentNoteId);
  });

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
  const transformedBacklinks = () => {
    const notes = backlinksData();
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
    <Suspense fallback={<div class="loading loading-spinner loading-sm"></div>}>
      <div>
        <h4 class="text-sm font-medium text-base-content/70 mb-2">
          Backlinks
          <Show when={transformedBacklinks().length > 0}>
            <span class="text-xs text-base-content/50 ml-2">
              ({transformedBacklinks().length})
            </span>
          </Show>
        </h4>

        <ContentList
          items={transformedBacklinks()}
          showPath={true}
          enableKeyboardNav={true}
          focusTrigger={props.focusTrigger}
          emptyMessage="No backlinks found for this note"
          showFollowMode={false}
        />
      </div>
    </Suspense>
  );
}
