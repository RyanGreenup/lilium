import { createEffect, createSignal, JSXElement, onMount } from "solid-js";
// import "~/app.css";

function LayoutContainer(props: { children: JSXElement }) {
  return (
    <div class="h-full flex flex-col border-4 border-purple-500 m-4">
      {props.children}
    </div>
  );
}

function MainArea(props: { children: JSXElement }) {
  return (
    <div class="flex-1 relative md:flex overflow-hidden">{props.children}</div>
  );
}

interface ToggleButtonProps {
  label: string;
  inputId: string;
}

// TODO should this be CSS or js something?
const Z_INDICES = {
  mobileDrawer: "z-50",
  topHeader: "z-10",
  bottomHeader: "z-50",
  overlay: "z-40",
  sidebar: "z-10",
};

export default function MyLayout(props: {
  children: JSXElement;
  sidebarContent: JSXElement;
}) {
  const [drawerWidth, setDrawerWidth] = createSignal(256); // Default 256px (w-64)
  const [isBottomVisible, setIsBottomVisible] = createSignal(true);
  const [isDrawerVisible, setIsDrawerVisible] = createSignal(false);
  const [isDrawerMaximized, setIsDrawerMaximized] = createSignal(false);
  const [isResizing, setIsResizing] = createSignal(false);

  let resizeRef!: HTMLDivElement;
  let startX = 0;
  let startWidth = 0;
  const MIN_WIDTH = 200;
  const MAX_WIDTH = 1024;

  const handleMouseDown = (e: MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startX = e.clientX;
    startWidth = drawerWidth();

    if (document) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing()) return;

    const deltaX = e.clientX - startX;
    const newWidth = Math.min(
      MAX_WIDTH,
      Math.max(MIN_WIDTH, startWidth + deltaX),
    );
    setDrawerWidth(newWidth);
  };

  const handleMouseUp = () => {
    setIsResizing(false);
    if (document) {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
  };

  const handleTouchStart = (e: TouchEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startX = e.touches[0].clientX;
    startWidth = drawerWidth();

    if (document) {
      document.addEventListener("touchmove", handleTouchMove);
      document.addEventListener("touchend", handleTouchEnd);
      document.body.style.userSelect = "none";
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isResizing()) return;

    const deltaX = e.touches[0].clientX - startX;
    const newWidth = Math.min(
      MAX_WIDTH,
      Math.max(MIN_WIDTH, startWidth + deltaX),
    );
    setDrawerWidth(newWidth);
  };

  const handleTouchEnd = () => {
    setIsResizing(false);
    if (document) {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
  };

  /* If Required, the following changes the size of, e.g., bottom Drawer */
  onMount(() => {
    createEffect(() => {
      document.documentElement.style.setProperty(
        "--spacing-sidebar_width",
        `${drawerWidth()}px`,
      );
    });
  });

  onMount(() => {
    // Add keyboard event listener
    createEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.ctrlKey && e.key === "b") {
          setIsDrawerVisible(!isDrawerVisible());
        } else if (e.ctrlKey && e.altKey && e.key === "h") {
          setIsBottomVisible(!isBottomVisible());
        }
      };

      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    });
  });

  const DRAWER_BLUR = false;

  // .............................................................................
  return (
    <div>
      {/* Overlay */}
      <div
        classList={{
          "fixed inset-0": true,
          "bg-black/50 ": true,
          "backdrop-blur-sm": DRAWER_BLUR,
          [Z_INDICES.overlay]: true,
          "opacity-0 pointer-events-none": !isDrawerVisible(),
          "opacity-100": isDrawerVisible(),
          "pointer-events-auto": isDrawerVisible(),
          "transition-opacity duration-300 ease-in-out": true,
          "md:hidden": true,
        }}
        onclick={() => setIsDrawerVisible(false)}
      />

      {/* Sidebar */}
      <div
        classList={{
          "bg-base-200 border border-base-300": true,
          fixed: true,
          "inset-x-0": true,
          "bottom-0": true,
          "mb-bottom_header": isBottomVisible(),
          "translate-y-full": !isDrawerVisible(),
          [Z_INDICES.mobileDrawer]: true,

          // If full lower drawer
          "h-1/2 md:h-auto": !isDrawerMaximized(),
          "h-between_headers": isDrawerMaximized(),

          // Now Handle Desktop
          "md:w-sidebar_width": true,
          "md:top-0": true,
          "md:left-0": true,
          "md:inset-y-0": true,
          "md:-translate-x-full md:translate-y-0": !isDrawerVisible(),

          // Animate movements
          "transition-transform duration-300 ease-in-out": !isResizing(),
          "transition-none": isResizing(),
        }}
      >
        <div class="flex flex-col h-full">
          <div class="flex justify-center">
            {/* Drag Handle */}
            <div class="md:hidden">
              <button
                class="bg-transparent hover:bg-gray-200/20 rounded-full w-16 h-8 flex items-center justify-center transition-colors"
                onclick={() => {
                  setIsDrawerMaximized(!isDrawerMaximized());
                }}
              >
                <div class="bg-gray-300 hover:bg-gray-400 rounded-full w-12 h-1 transition-colors"></div>
              </button>
            </div>
          </div>
          <div class="flex-1 p-4 overflow-hidden">{props.sidebarContent}</div>
        </div>
        {/* Resize Handle */}
        <div
          ref={resizeRef}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          classList={{
            // Visibility & Responsive
            "hidden md:block": true,
            // Positioning
            "absolute right-0 top-0": true,
            // Sizing
            "w-1 h-full": true,
            // Styling & Interaction
            "bg-base-300 hover:bg-secondary cursor-col-resize transition-colors":
              true,
          }}
        />
      </div>

      {/* Main Content */}
      <div
        classList={{
          // Basic Layout
          "flex justify-center items-center p-4": true,
          // Desktop Layout
          "mb-bottom_header": isBottomVisible(),
          "md:ml-sidebar_width": isDrawerVisible(),
          "transition-all duration-300 ease-in-out": !isResizing(),
          "transition-none": isResizing(),
        }}
      >
        {props.children}
      </div>

      {/* Bottom */}
      <div
        classList={{
          "bg-base-200 border border-base-300": true,
          fixed: true,
          "inset-x-0 h-bottom_header bottom-0": true,

          [Z_INDICES.bottomHeader]: true,

          // Allow Hiding Bottm
          "translate-y-full": !isBottomVisible(),
          "transition-all duration-300 ease-in-out": true,
        }}
      >
        <div class="h-full flex justify-end  md:justify-start">
          {/* KDE Plasma-style start menu button */}
          <button
            class="flex items-center space-x-2 bg-primary hover:bg-primary/80 px-4 h-full transition-colors w-24"
            onclick={() => {
              setIsDrawerVisible(!isDrawerVisible());
            }}
            oncontextmenu={(e) => {
              // maximize height before opening
              e.preventDefault();
              setIsDrawerMaximized(!isDrawerMaximized());
              setIsDrawerVisible(!isDrawerVisible());
              // Right click handler - add your logic here
            }}
          >
            {/* Application grid icon */}
            <div class="flex justify-center items-center w-full">
              <MenuIcon />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

const ApplicationGridIcon = () => {
  return (
    <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
      <path d="M4 4h4v4H4V4zm6 0h4v4h-4V4zm6 0h4v4h-4V4zM4 10h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4zM4 16h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4z" />
    </svg>
  );
};

const MenuIcon = () => {
  return (
    <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
      <path d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z" />
    </svg>
  );
};

const SidebarContent = () => {
  return (
    <div class="prose dark:prose-invert">
      <ul>
        {(() => {
          const items = [];
          for (let i = 1; i <= 300; i++) {
            items.push(<li key={i}>List item {i}</li>);
          }
          return items;
        })()}
      </ul>
      :way[]
    </div>
  );
};

const Article = () => {
  return (
    <div class="prose dark:prose-invert">
      <h1>Main Content Area</h1>
      <p class="">
        This content area adjusts based on the sidebar and header visibility.
      </p>
      <div class="">
        <p class="">Current layout state:</p>
        <ul class=""></ul>
      </div>
    </div>
  );
};

const Slider = (props: {
  value: number;
  onInput: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  class?: string;
}) => {
  return (
    <input
      type="range"
      value={props.value}
      min={props.min ?? 0}
      max={props.max ?? 100}
      step={props.step ?? 1}
      class={`w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider ${props.class || ""}`}
      onInput={(e) => props.onInput(Number(e.currentTarget.value))}
    />
  );
};
