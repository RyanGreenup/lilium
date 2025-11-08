import { createSignal, onMount, onCleanup } from "solid-js";
import { A } from "@solidjs/router";
import { LinkInsertionPalette, LinkItem } from "~/components/LinkInsertionPalette";
import { Button } from "~/solid-daisy-components/components/Button";
import { Kbd } from "~/solid-daisy-components/components/Kbd";

// Dummy data for demonstration
const dummyNotes: LinkItem[] = [
  { id: "1", title: "Forgejo", value: "/note/1", subtitle: "/notes/forgejo" },
  {
    id: "2",
    title: "Forgejo/Indexing Markdown Repositories",
    value: "/note/2",
    subtitle: "/notes/forgejo/indexing-markdown",
  },
  { id: "3", title: "Forgejo/Render Jupyter", value: "/note/3", subtitle: "/notes/forgejo/render-jupyter" },
  { id: "4", title: "Forgejo/Render Math", value: "/note/4", subtitle: "/notes/forgejo/render-math" },
  {
    id: "5",
    title: "Forgejo/Render Math/Async Javascript and Callback",
    value: "/note/5",
    subtitle: "/notes/forgejo/render-math/async-js",
  },
  { id: "6", title: "Forums to Review", value: "/note/6", subtitle: "/notes/forums" },
];

export default function LinkPaletteShowcase() {
  const [isOpen, setIsOpen] = createSignal(false);
  const [insertedLink, setInsertedLink] = createSignal("");

  const handleInsert = (value: string, item: LinkItem) => {
    setInsertedLink(`${item.title} -> ${value}`);
    setIsOpen(false);
  };

  // Example 1: Client-side filtering (synchronous)
  const searchNotesClientSide = (searchTerm: string): LinkItem[] => {
    const term = searchTerm.toLowerCase();
    return dummyNotes.filter((note) =>
      note.title.toLowerCase().includes(term)
    );
  };

  // Example 2: Simulated async search (like FTS query)
  const searchNotesAsync = async (searchTerm: string): Promise<LinkItem[]> => {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));
    const term = searchTerm.toLowerCase();
    return dummyNotes.filter((note) =>
      note.title.toLowerCase().includes(term)
    );
  };

  // Add keyboard shortcut to open palette
  onMount(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    onCleanup(() => window.removeEventListener("keydown", handleKeyDown));
  });

  return (
    <main class="container mx-auto p-8 max-w-4xl">
      <div class="mb-8">
        <h1 class="text-4xl font-bold mb-4">Link Insertion Palette Showcase</h1>
        <p class="text-base-content/70">
          This page demonstrates the LinkInsertionPalette component in isolation.
        </p>
      </div>

      <div class="card bg-base-200 shadow-xl mb-6">
        <div class="card-body">
          <h2 class="card-title mb-4">Test the Component</h2>

          <div class="space-y-4">
            <div>
              <p class="mb-2 text-sm text-base-content/70">
                Click the button below or press <Kbd>Ctrl</Kbd>+<Kbd>K</Kbd> to open the link insertion palette:
              </p>
              <Button
                color="primary"
                onClick={() => setIsOpen(true)}
              >
                Open Link Palette
              </Button>
            </div>

            <div class="divider">Result</div>

            <div>
              <p class="text-sm font-semibold mb-2">Last inserted link:</p>
              <div class="bg-base-100 p-4 rounded-lg border border-base-300">
                {insertedLink() || <span class="text-base-content/50 italic">No link inserted yet</span>}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="card bg-base-200 shadow-xl mb-6">
        <div class="card-body">
          <h2 class="card-title mb-4">Component Features</h2>
          <ul class="list-disc list-inside space-y-2 text-sm">
            <li>Modal overlay with backdrop and smooth animations</li>
            <li>Tab navigation (notes / external site)</li>
            <li>Flexible data sources via callbacks</li>
            <li>Supports both sync and async search functions</li>
            <li>Full keyboard navigation support</li>
            <li>Loading states and error handling</li>
            <li>Responsive design</li>
          </ul>

          <div class="divider">Architecture</div>

          <div class="space-y-2 text-sm">
            <p class="font-semibold">Data-agnostic design:</p>
            <ul class="list-disc list-inside space-y-1 ml-4 text-base-content/70">
              <li>Component only manages UI state and interactions</li>
              <li>Data fetching/filtering handled via callback props</li>
              <li>Supports both client-side filtering and server-side queries</li>
            </ul>

            <p class="font-semibold mt-4">Use Cases:</p>
            <ul class="list-disc list-inside space-y-1 ml-4 text-base-content/70">
              <li><strong>Client-side:</strong> Pre-load all notes, filter with JavaScript</li>
              <li><strong>Server-side FTS:</strong> Query SQLite with async callback</li>
              <li><strong>API calls:</strong> Fetch from external search APIs</li>
            </ul>
          </div>

          <div class="divider">Keyboard Shortcuts</div>

          <div class="space-y-2 text-sm">
            <div class="flex items-center gap-2">
              <Kbd size="sm">Ctrl</Kbd>+<Kbd size="sm">K</Kbd>
              <span class="text-base-content/70">Open palette</span>
            </div>
            <div class="flex items-center gap-2">
              <Kbd size="sm">↑</Kbd>/<Kbd size="sm">↓</Kbd> or <Kbd size="sm">Ctrl</Kbd>+<Kbd size="sm">K</Kbd>/<Kbd size="sm">J</Kbd>
              <span class="text-base-content/70">Navigate list</span>
            </div>
            <div class="flex items-center gap-2">
              <Kbd size="sm">Tab</Kbd>
              <span class="text-base-content/70">Switch tabs</span>
            </div>
            <div class="flex items-center gap-2">
              <Kbd size="sm">Enter</Kbd>
              <span class="text-base-content/70">Insert link</span>
            </div>
            <div class="flex items-center gap-2">
              <Kbd size="sm">Esc</Kbd>
              <span class="text-base-content/70">Close palette</span>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-8">
        <A href="/" class="btn btn-ghost">
          ← Back to Home
        </A>
      </div>

      <LinkInsertionPalette
        isOpen={isOpen()}
        onClose={() => setIsOpen(false)}
        onInsert={handleInsert}
        // Try switching to sync version with no loading states
        // searchNotes={searchNotesClientSide}
        // Try switching to async version to see loading states:
        searchNotes={searchNotesAsync}
      />
    </main>
  );
}
