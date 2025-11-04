import { createAsync, useSearchParams, useNavigate } from "@solidjs/router";
import { Suspense, Show, For } from "solid-js";
import { ContentItem, ContentItemData } from "../shared/ContentItem";
import { useCurrentNote } from "~/lib/hooks/useCurrentNote";
import { useNoteParents } from "~/lib/hooks/useNoteParents";
import { useKeyboardNavigation } from "~/lib/hooks/useKeyboardNavigation";

// Server function to get recent notes
const getRecentNotesData = async () => {
  "use server";
  const { getRecentNotes } = await import("~/lib/db/notes/search");
  return await getRecentNotes(10);
};

interface RecentNotesTabProps {
  focusTrigger?: () => string | null;
}

export default function RecentNotesTab(props: RecentNotesTabProps = {}) {
  let containerRef: HTMLDivElement | undefined;
  const { note, noteId } = useCurrentNote();
  const parents = useNoteParents(noteId);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Get recent notes from the database
  const recentNotesData = createAsync(async () => {
    try {
      return await getRecentNotesData();
    } catch (error) {
      console.error("Failed to fetch recent notes:", error);
      return [];
    }
  });

  // Function to navigate while preserving search params
  const navigateToNote = (noteId: string) => {
    const currentParams = new URLSearchParams();
    
    // Preserve all current search parameters
    Object.entries(searchParams).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach(v => currentParams.append(key, v));
      } else if (value !== undefined) {
        currentParams.set(key, value);
      }
    });
    
    const searchString = currentParams.toString();
    const url = `/note/${noteId}${searchString ? `?${searchString}` : ''}`;
    navigate(url);
  };

  // Transform database notes to ContentItemData format
  const transformedRecentNotes = () => {
    const notes = recentNotesData();
    if (!notes) return [];
    
    return notes.map((note): ContentItemData => ({
      id: note.id,
      title: note.title,
      abstract: note.abstract || "",
      path: `/note/${note.id}`,
      onClick: () => navigateToNote(note.id)
    }));
  };

  // Use keyboard navigation hook
  const { focusedItemIndex } = useKeyboardNavigation({
    items: transformedRecentNotes,
    containerRef: () => containerRef,
    onEnter: (item) => navigateToNote(item.id),
    focusTrigger: props.focusTrigger,
  });

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      class="flex flex-col h-full outline-none focus:outline-none"
      role="list"
      aria-label="Recent notes"
    >
      <div class="space-y-4">
        {/* Current Note Info */}
        <Show when={note()}>
          {(currentNote) => (
            <div class="bg-base-200 rounded-box p-3">
              <h4 class="text-sm font-medium text-base-content/70 mb-1">Current Note</h4>
              <p class="text-sm font-semibold">{currentNote().title}</p>
              <Show when={parents() && parents()!.length > 0}>
                <div class="text-xs text-base-content/60 mt-1">
                  <span>Path: </span>
                  <For each={parents()}>
                    {(parent, index) => (
                      <>
                        {index() > 0 && " / "}
                        <span>{parent.title}</span>
                      </>
                    )}
                  </For>
                  {parents()!.length > 0 && " / "}
                  <span class="font-medium">{currentNote().title}</span>
                </div>
              </Show>
            </div>
          )}
        </Show>

        {/* Recent Notes List */}
        <div>
          <Suspense
            fallback={<div class="loading loading-spinner loading-sm"></div>}
          >
            <h4 class="text-sm font-medium text-base-content/70 mb-2">
              Recent Notes
              <Show when={transformedRecentNotes().length > 0}>
                <span class="text-xs text-base-content/50 ml-2">
                  ({transformedRecentNotes().length})
                </span>
              </Show>
            </h4>

            <Show
              when={recentNotesData()}
              fallback={
                <div class="text-sm text-base-content/60">
                  Loading recent notes...
                </div>
              }
            >
              <Show
                when={transformedRecentNotes().length > 0}
                fallback={
                  <div class="text-center text-base-content/60 text-sm py-8">
                    No recent notes found
                  </div>
                }
              >
                <div class="p-4 space-y-2">
                  <For each={transformedRecentNotes()}>
                    {(item, index) => (
                      <ContentItem
                        item={item}
                        showPath={false}
                        isFocused={focusedItemIndex() === index()}
                      />
                    )}
                  </For>
                </div>
              </Show>
            </Show>
          </Suspense>
        </div>
      </div>
    </div>
  );
}
