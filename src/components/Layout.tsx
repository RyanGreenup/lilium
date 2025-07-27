import { createEffect, createSignal, JSXElement, onMount } from "solid-js";
import { tv } from "tailwind-variants";
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

const layoutVariants = tv({
  slots: {
    overlay: [
      "fixed inset-0",
      "bg-black/50",
      "backdrop-blur-sm",
      Z_INDICES.overlay,
      "transition-opacity duration-300 ease-in-out",
      "md:hidden"
    ].join(" "),
    sidebar: [
      "bg-base-200 border border-base-300",
      "fixed",
      "inset-x-0",
      "bottom-0",
      Z_INDICES.mobileDrawer,
      "md:w-sidebar_width",
      "md:top-0",
      "md:left-0",
      "md:inset-y-0"
    ].join(" "),
    sidebarInner: "flex flex-col h-full",
    dragHandle: "md:hidden",
    dragButton: "bg-transparent hover:bg-gray-200/20 rounded-full w-16 h-8 flex items-center justify-center transition-colors",
    dragBar: "bg-gray-300 hover:bg-gray-400 rounded-full w-12 h-1 transition-colors",
    sidebarContent: "flex-1 p-4 overflow-hidden",
    resizeHandle: [
      "hidden md:block",
      "absolute right-0 top-0",
      "w-1 h-full",
      "bg-base-300 hover:bg-secondary cursor-col-resize transition-colors"
    ].join(" "),
    mainContent: [
      "flex justify-center items-center p-4"
    ].join(" "),
    bottomBar: [
      "bg-base-200 border border-base-300",
      "fixed",
      "inset-x-0 h-bottom_header bottom-0",
      Z_INDICES.bottomHeader,
      "transition-all duration-300 ease-in-out"
    ].join(" "),
    menuButton: "flex items-center space-x-2 bg-primary hover:bg-primary/80 px-4 h-full transition-colors w-24",
    menuIcon: "flex justify-center items-center w-full"
  },
  variants: {
    drawerVisible: {
      true: {
        overlay: "opacity-100 pointer-events-auto",
        sidebar: "",
        mainContent: "md:ml-sidebar_width"
      },
      false: {
        overlay: "opacity-0 pointer-events-none",
        sidebar: "translate-y-full md:-translate-x-full md:translate-y-0",
        mainContent: ""
      }
    },
    drawerMaximized: {
      true: {
        sidebar: "h-between_headers"
      },
      false: {
        sidebar: "h-1/2 md:h-auto"
      }
    },
    bottomVisible: {
      true: {
        sidebar: "mb-bottom_header",
        mainContent: "mb-bottom_header",
        bottomBar: ""
      },
      false: {
        sidebar: "",
        mainContent: "",
        bottomBar: "translate-y-full"
      }
    },
    resizing: {
      true: {
        sidebar: "transition-none",
        mainContent: "transition-none"
      },
      false: {
        sidebar: "transition-transform duration-300 ease-in-out",
        mainContent: "transition-all duration-300 ease-in-out"
      }
    }
  }
});

export default function MyLayout(props: {
  children: JSXElement;
  sidebarContent: JSXElement;
}) {
  const [drawerWidth, setDrawerWidth] = createSignal(256); // Default 256px (w-64)
  const [isBottomVisible, setIsBottomVisible] = createSignal(true);
  const [isDrawerVisible, setIsDrawerVisible] = createSignal(false);
  const [isDrawerMaximized, setIsDrawerMaximized] = createSignal(false);
  const [isResizing, setIsResizing] = createSignal(false);
  
  const styles = () => layoutVariants({
    drawerVisible: isDrawerVisible(),
    drawerMaximized: isDrawerMaximized(),
    bottomVisible: isBottomVisible(),
    resizing: isResizing()
  });

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
        class={styles().overlay()}
        onclick={() => setIsDrawerVisible(false)}
      />

      {/* Sidebar */}
      <div
        class={styles().sidebar()}
        style={{ width: `${drawerWidth()}px` }}
      >
        <div class={styles().sidebarInner()}>
          <div class="flex justify-center">
            {/* Drag Handle */}
            <div class={styles().dragHandle()}>
              <button
                class={styles().dragButton()}
                onclick={() => {
                  setIsDrawerMaximized(!isDrawerMaximized());
                }}
              >
                <div class={styles().dragBar()}></div>
              </button>
            </div>
          </div>
          <div class={styles().sidebarContent()}>{props.sidebarContent}</div>
        </div>
        {/* Resize Handle */}
        <div
          ref={resizeRef}
          class={styles().resizeHandle()}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        />
      </div>

      {/* Main Content */}
      <div class={styles().mainContent()}>
        {props.children}
      </div>

      {/* Bottom */}
      <div class={styles().bottomBar()}>
        <div class="h-full flex justify-end md:justify-start">
          {/* KDE Plasma-style start menu button */}
          <button
            class={styles().menuButton()}
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
            <div class={styles().menuIcon()}>
              <MenuIcon />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

const iconVariants = tv({
  base: "w-5 h-5 text-white"
});

const ApplicationGridIcon = () => {
  const iconClass = iconVariants();
  return (
    <svg class={iconClass} fill="currentColor" viewBox="0 0 24 24">
      <path d="M4 4h4v4H4V4zm6 0h4v4h-4V4zm6 0h4v4h-4V4zM4 10h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4zM4 16h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4z" />
    </svg>
  );
};

const MenuIcon = () => {
  const iconClass = iconVariants();
  return (
    <svg class={iconClass} fill="currentColor" viewBox="0 0 24 24">
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

const sliderVariants = tv({
  base: "w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
});

const Slider = (props: {
  value: number;
  onInput: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  class?: string;
}) => {
  const sliderClass = sliderVariants();
  return (
    <input
      type="range"
      value={props.value}
      min={props.min ?? 0}
      max={props.max ?? 100}
      step={props.step ?? 1}
      class={`${sliderClass} ${props.class || ""}`}
      onInput={(e) => props.onInput(Number(e.currentTarget.value))}
    />
  );
};
