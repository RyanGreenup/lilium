import Home from "lucide-solid/icons/home";
import { For, Show, Accessor } from "solid-js";
import { createAsync, query } from "@solidjs/router";
import { Breadcrumbs } from "~/solid-daisy-components/components/Breadcrumbs";
import { useCurrentNote } from "~/lib/hooks/useCurrentNote";
import { useNoteNavigation } from "~/lib/hooks/useNoteNavigation";
import { useNoteParents } from "~/lib/hooks/useNoteParents";

interface NoteBreadcrumbsByIdProps {
  noteId: Accessor<string | undefined>;
}

// Query function to get note by ID
const getNoteByIdQuery = query(async (id: string) => {
  "use server";
  const { getNoteById: dbGetNoteById } = await import("~/lib/db");
  return await dbGetNoteById(id);
}, "note-by-id");

export function NoteBreadcrumbsById(props: NoteBreadcrumbsByIdProps) {
  const note = createAsync(async () => {
    const id = props.noteId();
    if (!id) return null;
    return await getNoteByIdQuery(id);
  });
  const parents = useNoteParents(props.noteId);
  const { navigateToNote, navigateToRoot } = useNoteNavigation();

  return (
    <Show when={note()}>
      <Breadcrumbs>
        <Breadcrumbs.Item>
          <a onClick={navigateToRoot} class="hover:text-primary cursor-pointer">
            <Home size={16} />
            Home
          </a>
        </Breadcrumbs.Item>

        <For each={parents()}>
          {(parent) => (
            <Breadcrumbs.Item>
              <a
                onClick={() => navigateToNote(parent.id)}
                class="hover:text-primary cursor-pointer"
              >
                {parent.title}
              </a>
            </Breadcrumbs.Item>
          )}
        </For>

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
