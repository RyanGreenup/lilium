import { Show, createEffect, onCleanup } from "solid-js";
import { Portal } from "solid-js/web";
import type { ListItem } from "~/lib/db/types";

interface DeleteConfirmDialogProps {
  item: ListItem | null | undefined;
  onConfirm: (item: ListItem) => void;
  onCancel: () => void;
}

export default function DeleteConfirmDialog(props: DeleteConfirmDialogProps) {
  let cancelRef: HTMLButtonElement | undefined;

  createEffect(() => {
    if (!props.item) return;

    // Auto-focus cancel button for safety
    requestAnimationFrame(() => cancelRef?.focus());

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        props.onCancel();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    onCleanup(() => document.removeEventListener("keydown", handleKeyDown, true));
  });

  const handleBackdropClick = (e: MouseEvent) => {
    if (e.target === e.currentTarget) {
      props.onCancel();
    }
  };

  return (
    <Show when={props.item}>
      {(item) => (
        <Portal>
          <div
            class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center"
            onClick={handleBackdropClick}
          >
            <div class="bg-base-100 rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
              <h3 class="font-bold text-lg mb-2">
                Delete {item().type === "folder" ? "folder" : "note"}
              </h3>
              <p class="mb-1">
                Are you sure you want to delete{" "}
                <span class="font-semibold">"{item().title}"</span>?
              </p>
              <Show when={item().type === "folder"}>
                <p class="text-warning text-sm mb-4">
                  This will delete the folder and all its contents.
                </p>
              </Show>
              <Show when={item().type !== "folder"}>
                <div class="mb-4" />
              </Show>
              <div class="flex justify-end gap-2">
                <button
                  ref={cancelRef}
                  class="btn btn-sm"
                  onClick={() => props.onCancel()}
                >
                  Cancel
                </button>
                <button
                  class="btn btn-sm btn-error"
                  onClick={() => props.onConfirm(item())}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </Show>
  );
}
