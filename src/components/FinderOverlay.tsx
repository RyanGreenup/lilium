import { createSignal, JSXElement, onCleanup, onMount } from "solid-js";
import { Portal } from "solid-js/web";
import OverlayFinder from "./OverlayFinder";

const Backdrop = (props: { onClick: () => void }) => (
  <div class="absolute inset-0 bg-black/50" onClick={props.onClick} />
);

const Panel = (props: { open: boolean; children: JSXElement }) => (
  <div
    class="absolute inset-x-0 top-1/2 px-4 transition-transform duration-300 ease-out"
    style={{
      transform: props.open ? "translateY(-50%)" : "translateY(100dvh)",
    }}
  >
    <div
      class="bg-base-200 rounded-lg shadow-2xl overflow-hidden w-full"
      style={{ height: "85dvh" }}
    >
      {props.children}
    </div>
  </div>
);

export const FinderOverlay = () => {
  const [open, setOpen] = createSignal(false);

  onMount(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "F") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handler);
    onCleanup(() => document.removeEventListener("keydown", handler));
  });

  return (
    <Portal>
      <div
        class="fixed inset-0 z-50 transition-opacity duration-300"
        classList={{
          "opacity-100": open(),
          "opacity-0 pointer-events-none": !open(),
        }}
      >
        <Backdrop onClick={() => setOpen(false)} />
        <Panel open={open()}>
          <OverlayFinder open={open} onClose={() => setOpen(false)} />
        </Panel>
      </div>
    </Portal>
  );
};
