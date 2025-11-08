import { createSignal, onMount, onCleanup, Show } from "solid-js";
import { A, useNavigate } from "@solidjs/router";
import { LinkInsertionPalette, LinkItem, LinkFormat, formatLink } from "~/components/LinkInsertionPalette";
import { Button } from "~/solid-daisy-components/components/Button";
import { Kbd } from "~/solid-daisy-components/components/Kbd";

// Dummy data for demonstration - showing both UUID and file path examples
const dummyNotes: LinkItem[] = [
  {
    id: "a1b2c3d4",
    title: "Forgejo",
    value: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    subtitle: "UUID example"
  },
  {
    id: "b2c3d4e5",
    title: "Indexing Markdown Repositories",
    value: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    subtitle: "UUID example",
  },
  {
    id: "c3d4e5f6",
    title: "Render Jupyter Notebooks",
    value: "notes/projects/forgejo/render-jupyter.md",
    subtitle: "File path example"
  },
  {
    id: "d4e5f6a7",
    title: "Render Math with KaTeX",
    value: "notes/projects/forgejo/render-math.md",
    subtitle: "File path example"
  },
  {
    id: "e5f6a7b8",
    title: "Async Javascript and Callbacks",
    value: "e5f6a7b8-c9d0-1234-5678-90abcdef1234",
    subtitle: "UUID example",
  },
  {
    id: "f6a7b8c9",
    title: "Forums to Review",
    value: "notes/reviews/forums.md",
    subtitle: "File path example"
  },
];

export default function LinkPaletteShowcase() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = createSignal(false);
  const [mode, setMode] = createSignal<"insert" | "navigate">("insert");
  const [linkFormat, setLinkFormat] = createSignal<LinkFormat>("markdown");
  const [insertedLink, setInsertedLink] = createSignal("");
  const [textareaContent, setTextareaContent] = createSignal("Try adding a link here. Press Ctrl+K to open the palette.");

  let textareaRef: HTMLTextAreaElement | undefined;

  // Use case 1: Insert formatted link
  const handleInsertLink = (item: LinkItem) => {
    // Format link according to selected format
    const formattedLink = formatLink(item, linkFormat());
    setInsertedLink(formattedLink);

    // Insert at cursor position in textarea
    if (textareaRef) {
      const start = textareaRef.selectionStart;
      const end = textareaRef.selectionEnd;
      const currentText = textareaContent();
      const newText = currentText.substring(0, start) + formattedLink + currentText.substring(end);
      setTextareaContent(newText);

      // Set cursor position after inserted text
      setTimeout(() => {
        if (textareaRef) {
          textareaRef.selectionStart = textareaRef.selectionEnd = start + formattedLink.length;
          textareaRef.focus();
        }
      }, 0);
    }

    setIsOpen(false);
  };

  // Use case 2: Navigate to note
  const handleNavigate = (item: LinkItem) => {
    setInsertedLink(`Navigated to: ${item.title} (${item.value})`);
    navigate(`/note/${item.value}`);
    setIsOpen(false);
  };

  // Dispatcher based on mode
  const handleSelect = (item: LinkItem) => {
    if (mode() === "insert") {
      handleInsertLink(item);
    } else {
      handleNavigate(item);
    }
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
                Choose mode and format, then press <Kbd>Ctrl</Kbd>+<Kbd>K</Kbd> to open the palette:
              </p>

              <div class="space-y-3 mb-3">
                <div>
                  <p class="text-xs font-semibold mb-1">Mode:</p>
                  <div class="flex gap-2">
                    <Button
                      variant={mode() === "insert" ? "default" : "ghost"}
                      color="primary"
                      onClick={() => setMode("insert")}
                      size="sm"
                    >
                      Insert Link
                    </Button>
                    <Button
                      variant={mode() === "navigate" ? "default" : "ghost"}
                      color="primary"
                      onClick={() => setMode("navigate")}
                      size="sm"
                    >
                      Navigate
                    </Button>
                  </div>
                </div>

                <Show when={mode() === "insert"}>
                  <div>
                    <p class="text-xs font-semibold mb-1">Link Format:</p>
                    <div class="flex gap-2">
                      <Button
                        variant={linkFormat() === "markdown" ? "default" : "ghost"}
                        color="primary"
                        onClick={() => setLinkFormat("markdown")}
                        size="sm"
                      >
                        Markdown
                      </Button>
                      <Button
                        variant={linkFormat() === "org" ? "default" : "ghost"}
                        color="primary"
                        onClick={() => setLinkFormat("org")}
                        size="sm"
                      >
                        Org-mode
                      </Button>
                    </div>
                  </div>
                </Show>
              </div>

              <Button
                color="primary"
                onClick={() => setIsOpen(true)}
              >
                Open Link Palette
              </Button>

              <div class="mt-3 p-3 bg-info/10 rounded-lg border border-info/20">
                <p class="text-xs text-base-content/80">
                  <strong>Current mode:</strong> {mode() === "insert"
                    ? `Inserts ${linkFormat()} link into textarea`
                    : "Navigates to /note/<id>"}
                  <br />
                  <strong>Demo includes:</strong> Mix of UUID-style IDs and file path IDs to show flexibility.
                  Try searching for "render", "jupyter", or "forums".
                </p>
              </div>
            </div>

            <div class="divider">Interactive Demo</div>

            <div>
              <p class="text-sm font-semibold mb-2">Try it in a textarea:</p>
              <textarea
                ref={textareaRef}
                class="textarea textarea-bordered w-full h-32 font-mono text-sm"
                value={textareaContent()}
                onInput={(e) => setTextareaContent(e.currentTarget.value)}
                placeholder="Type here and press Ctrl+K to insert a link..."
              />
              <p class="text-xs text-base-content/60 mt-1">
                Click inside the textarea and press <Kbd size="xs">Ctrl</Kbd>+<Kbd size="xs">K</Kbd> to insert a link at the cursor position
              </p>
            </div>

            <div class="divider">Last Insertion</div>

            <div>
              <p class="text-sm font-semibold mb-2">Last inserted markdown link:</p>
              <div class="bg-base-100 p-4 rounded-lg border border-base-300 font-mono text-sm break-all">
                {insertedLink() || <span class="text-base-content/50 italic">No link inserted yet</span>}
              </div>
              <Show when={insertedLink()}>
                <div class="mt-2">
                  <p class="text-xs font-semibold text-base-content/70 mb-1">Preview:</p>
                  <div class="bg-base-200 p-3 rounded border border-base-300 text-sm">
                    <div class="prose prose-sm">
                      {/* Simple markdown link rendering for demo */}
                      {(() => {
                        const link = insertedLink();
                        const match = link.match(/\[([^\]]+)\]\(([^)]+)\)/);
                        if (match) {
                          const [, title, id] = match;
                          return (
                            <span>
                              Link to: <strong>{title}</strong>
                              <br />
                              ID: <code class="text-xs">{id}</code>
                            </span>
                          );
                        }
                        return link;
                      })()}
                    </div>
                  </div>
                </div>
              </Show>
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

          <div class="divider">Output Examples</div>

          <div class="space-y-2 text-sm">
            <p class="font-semibold">Markdown format:</p>
            <div class="bg-base-100 p-3 rounded border border-base-300 space-y-2">
              <div>
                <p class="text-xs text-base-content/60">Notes with UUID:</p>
                <code class="text-xs">[Forgejo](a1b2c3d4-e5f6-7890-abcd-ef1234567890)</code>
              </div>
              <div>
                <p class="text-xs text-base-content/60">Notes with file path:</p>
                <code class="text-xs">[Render Jupyter Notebooks](notes/projects/forgejo/render-jupyter.md)</code>
              </div>
              <div>
                <p class="text-xs text-base-content/60">External URL:</p>
                <code class="text-xs">[Example Site](https://example.com)</code>
              </div>
            </div>

            <p class="font-semibold mt-3">Org-mode format:</p>
            <div class="bg-base-100 p-3 rounded border border-base-300 space-y-2">
              <div>
                <p class="text-xs text-base-content/60">Notes with UUID:</p>
                <code class="text-xs">[[a1b2c3d4-e5f6-7890-abcd-ef1234567890][Forgejo]]</code>
              </div>
              <div>
                <p class="text-xs text-base-content/60">Notes with file path:</p>
                <code class="text-xs">[[notes/projects/forgejo/render-jupyter.md][Render Jupyter Notebooks]]</code>
              </div>
              <div>
                <p class="text-xs text-base-content/60">External URL:</p>
                <code class="text-xs">[[https://example.com][Example Site]]</code>
              </div>
            </div>
          </div>

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
              <li><strong>Insert links:</strong> Markdown <code class="text-xs">[title](id)</code> or Org-mode <code class="text-xs">[[id][title]]</code></li>
              <li><strong>Navigate:</strong> Navigate to <code class="text-xs">/note/&lt;id&gt;</code> when selected</li>
              <li><strong>Copy to clipboard:</strong> Copy note details or formatted links</li>
              <li><strong>Custom actions:</strong> Parent component decides what to do with selected item</li>
              <li><strong>Flexible IDs:</strong> Works with UUIDs, file paths, or any identifier</li>
              <li><strong>Format support:</strong> Automatic formatting for both markdown and org-mode</li>
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
              <span class="text-base-content/70">Navigate list (notes tab)</span>
            </div>
            <div class="flex items-center gap-2">
              <Kbd size="sm">Tab</Kbd>
              <span class="text-base-content/70">Switch between notes/external tabs</span>
            </div>
            <div class="flex items-center gap-2">
              <Kbd size="sm">Enter</Kbd>
              <span class="text-base-content/70">Select item (insert or navigate based on mode)</span>
            </div>
            <div class="flex items-center gap-2">
              <Kbd size="sm">Esc</Kbd>
              <span class="text-base-content/70">Close palette</span>
            </div>
          </div>
          <p class="text-xs text-base-content/60 mt-3">
            <strong>Note:</strong> Component is action-agnostic. Parent decides what happens on selection (insert, navigate, copy, etc.).
            Use the <code class="text-xs">formatLink()</code> helper to format links in markdown or org-mode.
          </p>
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
        onSelect={handleSelect}
        linkFormat={linkFormat()}
        // Try switching to sync version with no loading states
        // searchNotes={searchNotesClientSide}
        // Try switching to async version to see loading states:
        searchNotes={searchNotesAsync}
      />
    </main>
  );
}
