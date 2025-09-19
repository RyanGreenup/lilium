import FileText from "lucide-solid/icons/file-text";
import Folder from "lucide-solid/icons/folder";
import ChevronRight from "lucide-solid/icons/chevron-right";
import { Show, For } from "solid-js";
import { useCurrentNote } from "~/lib/hooks/useCurrentNote";
import { useCurrentDirectory } from "~/lib/hooks/useCurrentDirectory";
import { useNoteParents } from "~/lib/hooks/useNoteParents";
import { useNoteNavigation } from "~/lib/hooks/useNoteNavigation";

export default function NotesTab() {
  const { noteId } = useCurrentNote();
  const { currentDir, dirId, children, isInFolder } = useCurrentDirectory();
  const { handleItemClick, navigateToRoot } = useNoteNavigation();
  
  // Get parents of the current directory (not the current note)
  const parents = useNoteParents(dirId);
  return (
    <div class="space-y-4">
      {/* Breadcrumb Navigation */}
      <div class="bg-base-200 rounded-box p-3">
        <div class="text-xs text-base-content/60 mb-2">Current Path</div>
        <div class="flex items-center gap-1 text-sm">
          <button
            class="btn btn-ghost btn-xs"
            onClick={navigateToRoot}
          >
            <Folder size={14} />
            Root
          </button>
          
          <Show when={parents() && parents()!.length > 0}>
            <For each={parents()}>
              {(parent) => (
                <>
                  <ChevronRight size={12} class="text-base-content/40" />
                  <button
                    class="btn btn-ghost btn-xs"
                    onClick={() => handleItemClick(parent)}
                  >
                    <Folder size={14} />
                    {parent.title}
                  </button>
                </>
              )}
            </For>
          </Show>
          
          <Show when={currentDir()}>
            {(dir) => (
              <>
                <ChevronRight size={12} class="text-base-content/40" />
                <span class="text-primary font-medium">
                  <Folder size={14} class="inline mr-1" />
                  {dir().title}
                </span>
              </>
            )}
          </Show>
        </div>
      </div>

      {/* Current Directory Contents */}
      <div>
        <div class="text-sm font-medium text-base-content/70 mb-3">
          <Show when={currentDir()} fallback="Root Directory">
            {(dir) => dir().title}
          </Show>
        </div>
        
        <ul class="menu bg-base-200 rounded-box w-full">
          <Show when={children() && children()!.length > 0} fallback={
            <li class="text-center text-base-content/50 py-4">
              No items in this directory
            </li>
          }>
            <For each={children()}>
              {(child) => (
                <li>
                  <a
                    class={`${noteId === child.id ? "active" : ""}`}
                    onClick={() => handleItemClick(child)}
                  >
                    <Show 
                      when={child.is_folder} 
                      fallback={<FileText size={16} />}
                    >
                      <Folder size={16} />
                    </Show>
                    <span class="flex-1">{child.title}</span>
                    <Show when={child.is_folder}>
                      <ChevronRight size={14} class="text-base-content/40" />
                    </Show>
                  </a>
                </li>
              )}
            </For>
          </Show>
        </ul>
      </div>
    </div>
  );
}
