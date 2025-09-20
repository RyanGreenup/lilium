import { createAsync, useSearchParams, useNavigate } from "@solidjs/router";
import { Suspense, Show, For } from "solid-js";
import { ContentItem, ContentItemData } from "../shared/ContentItem";
import { useCurrentNote } from "~/lib/hooks/useCurrentNote";
import { useKeyboardNavigation } from "~/lib/hooks/useKeyboardNavigation";

// Server function to get backlinks
const getBacklinksData = async (noteId: string) => {
  "use server";
  const { getBacklinks } = await import("~/lib/db/notes/search");
  return await getBacklinks(noteId);
};

interface BacklinksTabProps {
  focusTrigger?: () => string | null;
}

export default function BacklinksTab(props: BacklinksTabProps = {}) {
  let containerRef: HTMLDivElement | undefined;
  const { noteId } = useCurrentNote();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Get backlinks from the database
  const backlinksData = createAsync(async () => {
    const currentNoteId = noteId();
    if (!currentNoteId) return [];
    
    try {
      return await getBacklinksData(currentNoteId);
    } catch (error) {
      console.error("Failed to fetch backlinks:", error);
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
  const transformedBacklinks = () => {
    const notes = backlinksData();
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
    items: transformedBacklinks,
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
      aria-label="Backlinks to current note"
    >
      <div class="space-y-4">
        <div>
          <h4 class="text-sm font-medium text-base-content/70 mb-2">
            Backlinks
            <Show when={transformedBacklinks().length > 0}>
              <span class="text-xs text-base-content/50 ml-2">
                ({transformedBacklinks().length})
              </span>
            </Show>
          </h4>
          
          <Suspense fallback={<div class="loading loading-spinner loading-sm"></div>}>
            <Show 
              when={backlinksData()} 
              fallback={<div class="text-sm text-base-content/60">Loading backlinks...</div>}
            >
              <Show 
                when={transformedBacklinks().length > 0}
                fallback={
                  <div class="text-center text-base-content/60 text-sm py-8">
                    No backlinks found for this note
                  </div>
                }
              >
                <div class="p-4 space-y-2">
                  <For each={transformedBacklinks()}>
                    {(item, index) => (
                      <ContentItem
                        item={item}
                        showPath={true}
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
