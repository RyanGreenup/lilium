import { createAsync, useParams, useLocation } from "@solidjs/router";

// Server function to get children with folder status
const getChildrenWithFolderStatus = async (parentId?: string) => {
  "use server";
  const { getChildNotesWithFolderStatus } = await import("~/lib/db");
  return await getChildNotesWithFolderStatus(parentId);
};

// Server function to get note by ID
const getNoteById = async (noteId: string) => {
  "use server";
  const { getNoteById: dbGetNoteById } = await import("~/lib/db");
  return await dbGetNoteById(noteId);
};

/**
 * Hook to manage the current directory context in the sidebar
 * Uses route params to track the current directory (/folder/:id or root)
 */
export function useCurrentDirectory() {
  const params = useParams();
  const location = useLocation();
  
  // Determine if we're in a folder route and get the folder ID
  const isInFolder = location.pathname.startsWith('/folder/');
  const dirId = isInFolder ? params.id : undefined;

  // Get the current directory note (if any)
  const currentDir = createAsync(async () => {
    if (!dirId) return null;
    try {
      return await getNoteById(dirId);
    } catch (error) {
      console.error("Failed to fetch directory:", error);
      return null;
    }
  });

  // Get children of the current directory
  const children = createAsync(async () => {
    try {
      return await getChildrenWithFolderStatus(dirId);
    } catch (error) {
      console.error("Failed to fetch children:", error);
      return [];
    }
  });

  return {
    currentDir,
    dirId,
    children,
    isInFolder,
  };
}