import { createAsync } from "@solidjs/router";
import ChevronDown from "lucide-solid/icons/chevron-down";
import { Accessor, For, Show, createMemo } from "solid-js";
import { getNoteByIdQuery } from "~/lib/db/notes/read";
import { getIndexNoteIdQuery } from "~/lib/db_new/api";
import { useCurrentNoteChildren } from "~/lib/hooks/useCurrentDirectory";
import { useCurrentNote } from "~/lib/hooks/useCurrentNote";
import { useNoteNavigation } from "~/lib/hooks/useNoteNavigation";
import { useNoteFolderPath } from "~/lib/hooks/useNoteFolderPath";
import { Badge } from "~/solid-daisy-components/components/Badge";
import { Button } from "~/solid-daisy-components/components/Button";
import { HomeIconBreadcrumbs } from "./NoteBreadcrumbs";

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
  const folderPathResult = useNoteFolderPath(props.noteId);
  const { navigateToNote, navigateToRoot } = useNoteNavigation();
  const { children } = useCurrentNoteChildren();

  const hasChildren = createMemo(() => (children()?.length ?? 0) > 0);

  // Navigate to a folder's index note (if one exists)
  const handleFolderClick = async (folderId: string) => {
    const indexNoteId = await getIndexNoteIdQuery(folderId);
    if (indexNoteId) {
      navigateToNote(indexNoteId);
    }
  };

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
            <HomeIconBreadcrumbs />
          </Button>
        </div>

        {/* Folder path items */}
        <For each={folderPathResult()?.folderPath || []}>
          {(folder, index) => (
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
                  onClick={() => handleFolderClick(folder.id)}
                  class="justify-start px-2 py-1 h-auto min-h-0 w-full"
                >
                  {folder.title}
                </Button>
              </div>
            </div>
          )}
        </For>

        {/*Only show when current note is an index page of the folder*/}
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
