export default function KeyboardHints() {
  return (
    <div class="flex items-center gap-4 px-4 py-2 bg-base-200 text-xs text-base-content/50 border-t border-base-300">
      <span>
        <kbd class="kbd kbd-xs">j</kbd>/<kbd class="kbd kbd-xs">k</kbd>{" "}
        navigate
      </span>
      <span>
        <kbd class="kbd kbd-xs">l</kbd>/<kbd class="kbd kbd-xs">Enter</kbd>{" "}
        open
      </span>
      <span>
        <kbd class="kbd kbd-xs">h</kbd>/
        <kbd class="kbd kbd-xs">Backspace</kbd> back
      </span>
      <span>
        <kbd class="kbd kbd-xs">gg</kbd> top
      </span>
      <span>
        <kbd class="kbd kbd-xs">G</kbd> bottom
      </span>
      <span>
        <kbd class="kbd kbd-xs">z</kbd> jump palette
      </span>
    </div>
  );
}
