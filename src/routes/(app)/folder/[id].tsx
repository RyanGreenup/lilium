import { RouteDefinition } from "@solidjs/router";
import { getUser } from "~/lib/auth";

export const route = {
  preload() {
    getUser();
  },
} satisfies RouteDefinition;

export default function FolderView() {
  return (
    <div class="p-6">
      <div class="text-center text-base-content/60">
        <h2 class="text-2xl font-bold mb-4">Folder View</h2>
        <p>Navigate using the sidebar to explore folders and open notes.</p>
        <p class="text-sm mt-2">Click on folders to browse their contents, or click on notes to open them.</p>
      </div>
    </div>
  );
}