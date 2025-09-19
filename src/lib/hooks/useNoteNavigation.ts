import { useNavigate } from "@solidjs/router";

export interface NavigationItem {
  id: string;
  title: string;
  is_folder: boolean;
}

/**
 * Hook to handle navigation logic for notes and folders
 * Everything is just a note - folders are notes that have children
 */
export function useNoteNavigation() {
  const navigate = useNavigate();

  // Navigate to any note (folder or regular note)
  const navigateToNote = (noteId: string) => {
    navigate(`/note/${noteId}`);
  };

  // Navigate to root (home page)
  const navigateToRoot = () => {
    navigate("/");
  };

  // Handle clicking on any item - just navigate to it
  const handleItemClick = (item: NavigationItem) => {
    console.log("Navigation clicked:", item);
    navigateToNote(item.id);
  };

  return {
    navigateToNote,
    navigateToRoot,
    handleItemClick,
  };
}
