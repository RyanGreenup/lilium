import { useNavigate } from "@solidjs/router";

export interface NavigationItem {
  id: string;
  title: string;
  is_folder: boolean;
}

/**
 * Hook to handle navigation logic for notes and folders
 */
export function useNoteNavigation() {
  const navigate = useNavigate();

  // Navigate to a note (opens the note for viewing/editing)
  const navigateToNote = (noteId: string) => {
    navigate(`/note/${noteId}`);
  };

  // Navigate to a folder (shows folder contents in sidebar)
  const navigateToFolder = (folderId: string) => {
    navigate(`/folder/${folderId}`);
  };

  // Navigate to root directory
  const navigateToRoot = () => {
    navigate('/');
  };

  // Handle clicking on an item - folder or note
  const handleItemClick = (item: NavigationItem) => {
    console.log('Navigation clicked:', item);
    if (item.is_folder) {
      // Navigate to folder (changes sidebar context)
      console.log('Navigating to folder:', item.id);
      navigateToFolder(item.id);
    } else {
      // Navigate to note (opens note content)
      console.log('Navigating to note:', item.id);
      navigateToNote(item.id);
    }
  };

  return {
    navigateToNote,
    navigateToFolder,
    navigateToRoot,
    handleItemClick,
  };
}