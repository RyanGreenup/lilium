import { createAsync } from "@solidjs/router";
import { Accessor, For, Show } from "solid-js";
import { getNoteByIdQuery } from "~/lib/db_new/notes/read";
import { getIndexNoteIdQuery } from "~/lib/db_new/api";
import { useCurrentNote } from "~/lib/hooks/useCurrentNote";
import { useNoteNavigation } from "~/lib/hooks/useNoteNavigation";
import { useNoteFolderPath } from "~/lib/hooks/useNoteFolderPath";
import { Breadcrumbs } from "~/solid-daisy-components/components/Breadcrumbs";

const MAX_LENGTH = 2;

interface NoteBreadcrumbsByIdProps {
  noteId: Accessor<string | undefined>;
}

export function NoteBreadcrumbsById(props: NoteBreadcrumbsByIdProps) {
  const note = createAsync(async () => {
    const id = props.noteId();
    if (!id) return null;
    return await getNoteByIdQuery(id);
  });
  const folderPathResult = useNoteFolderPath(props.noteId);
  const { navigateToNote, navigateToRoot } = useNoteNavigation();

  // Navigate to a folder's index note (if one exists)
  const handleFolderClick = async (folderId: string) => {
    const indexNoteId = await getIndexNoteIdQuery(folderId);
    if (indexNoteId) {
      navigateToNote(indexNoteId);
    }
  };

  return (
    <Show when={note()}>
      <Breadcrumbs>
        <Breadcrumbs.Item>
          <a
            onClick={navigateToRoot}
            class="hover:text-primary cursor-pointer p-2"
          >
            <HomeIconBreadcrumbs />
          </a>
        </Breadcrumbs.Item>

        {/* Folder path items */}
        <For each={folderPathResult()?.folderPath || []}>
          {(folder) => (
            <Breadcrumbs.Item>
              <a
                onClick={() => handleFolderClick(folder.id)}
                class="hover:text-primary cursor-pointer"
              >
                {folder.title}
              </a>
            </Breadcrumbs.Item>
          )}
        </For>

        {/* Current note (leaf - not clickable) */}
        <Breadcrumbs.Item>
          <span class="text-base-content/70">{note()!.title}</span>
        </Breadcrumbs.Item>
      </Breadcrumbs>
    </Show>
  );
}

export default function NoteBreadcrumbs() {
  const { noteId } = useCurrentNote();
  return <NoteBreadcrumbsById noteId={noteId} />;
}

/**
A Simple orb to represent home in breadcrumbs
*/
export const HomeIconBreadcrumbs = () => (
  <div class="w-2.5 h-2.5 bg-primary rounded-full opacity-70" />
);
