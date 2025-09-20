import { createAsync } from "@solidjs/router";
import ChevronDown from "lucide-solid/icons/chevron-down";
import Home from "lucide-solid/icons/home";
import { Accessor, For, Show, createMemo } from "solid-js";
import { getNoteByIdQuery } from "~/lib/db/notes/read";
import { useCurrentNote } from "~/lib/hooks/useCurrentNote";
import { useCurrentNoteChildren } from "~/lib/hooks/useCurrentDirectory";
import { useNoteNavigation } from "~/lib/hooks/useNoteNavigation";
import { useNoteParents } from "~/lib/hooks/useNoteParents";
import { Badge } from "~/solid-daisy-components/components/Badge";
import { Button } from "~/solid-daisy-components/components/Button";

interface NoteBreadcrumbsVerticalByIdProps {
  noteId: Accessor<string | undefined>;
}

export function NoteBreadcrumbsVerticalById(
  props: NoteBreadcrumbsVerticalByIdProps,
) {
  const note = createAsync(async () => {
    const id = props.noteId();
    if (!id) return null;
    return await getNoteByIdQuery(id);
  });
  const parents = useNoteParents(props.noteId);
  const { navigateToNote, navigateToRoot } = useNoteNavigation();
  const { children } = useCurrentNoteChildren();
  
  const hasChildren = createMemo(() => (children()?.length ?? 0) > 0);

  return (
    <Show when={note()}>
      <div class="flex flex-col space-y-1">
        <div class="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={navigateToRoot}
            class="justify-start px-2 py-1 h-auto min-h-0"
          >
            <Home size={14} />
            Home
          </Button>
        </div>

        <For each={parents()}>
          {(parent, index) => (
            <div
              class="flex items-center space-x-2"
              style={`margin-left: ${Math.min((index() + 1) * 0.5, 2.5)}rem`}
            >
              <div class="flex items-center justify-center w-4">
                <ChevronDown size={12} class="text-base-content/40" />
              </div>
              <div class="flex-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateToNote(parent.id)}
                  class="justify-start px-2 py-1 h-auto min-h-0 w-full"
                >
                  {parent.title}
                </Button>
              </div>
            </div>
          )}
        </For>

        <Show when={hasChildren()}>
          <div class="flex items-center space-x-2">
            <div class="flex-1 px-2 py-1">
              <Badge
                color="primary"
                variant="soft"
                class="text-sm font-medium rounded"
              >
                {note()!.title}
              </Badge>
            </div>
          </div>
        </Show>
      </div>
    </Show>
  );
}

export default function NoteBreadcrumbsVertical() {
  const { noteId } = useCurrentNote();
  return <NoteBreadcrumbsVerticalById noteId={noteId} />;
}
