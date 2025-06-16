import { createSignal } from "solid-js";

export default function Counter() {
  const [count, setCount] = createSignal(0);
  return (
    <button
      classList={{
        // Colors
        " rounded-box bg-primary text-primary-content border-border border-base-300":
          true,
        // Size
        "px-4 py-3 min-w-fit h-auto": true,
      }}
      onClick={() => setCount(count() + 1)}
    >
      Clicks: {count()}
    </button>
  );
}
