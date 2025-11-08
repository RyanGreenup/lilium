import { createSignal } from "solid-js";
import { A } from "@solidjs/router";
import { LinkInsertionPalette } from "~/components/LinkInsertionPalette";
import { Button } from "~/solid-daisy-components/components/Button";

export default function LinkPaletteShowcase() {
  const [isOpen, setIsOpen] = createSignal(false);
  const [insertedLink, setInsertedLink] = createSignal("");

  const handleInsert = (link: string) => {
    setInsertedLink(link);
    setIsOpen(false);
  };

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
                Click the button below to open the link insertion palette:
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
            <li>Modal overlay with backdrop</li>
            <li>Tab navigation (notes / external site)</li>
            <li>Searchable list of notes</li>
            <li>Keyboard navigation support (planned)</li>
            <li>Responsive design</li>
          </ul>
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
      />
    </main>
  );
}
