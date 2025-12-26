import { createAsync, useSearchParams, useNavigate } from "@solidjs/router";
import { Suspense, Show } from "solid-js";
import { ContentList, ContentItemData } from "../shared/ContentItem";
import { useCurrentNote } from "~/lib/hooks/useCurrentNote";
import { getForwardLinksQuery } from "~/lib/db_new/notes/search";

interface ForwardLinksTabProps {
  focusTrigger?: () => string | null;
}

export default function ForwardLinksTab(props: ForwardLinksTabProps = {}) {
  const { noteId } = useCurrentNote();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Get forward links from the database
  const forwardLinksData = createAsync(() => {
    const currentNoteId = noteId();
    if (!currentNoteId) return Promise.resolve([]);
    return getForwardLinksQuery(currentNoteId);
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
  const transformedForwardLinks = () => {
    const notes = forwardLinksData();
    if (!notes) return [];

    return notes.map(
      (note): ContentItemData => ({
        id: note.id,
        title: note.title,
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
          Forward Links
          <Show when={transformedForwardLinks().length > 0}>
            <span class="text-xs text-base-content/50 ml-2">
              ({transformedForwardLinks().length})
            </span>
          </Show>
        </h4>

        <ContentList
          items={transformedForwardLinks()}
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
