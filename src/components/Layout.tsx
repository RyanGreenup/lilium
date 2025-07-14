import { createSignal, JSXElement } from "solid-js";

interface LayoutProps {
  children: JSXElement;
  sidebarContent: JSXElement;
}

export default function MyLayout(props: LayoutProps) {
  const [leftSidebarVisible, setLeftSidebarVisible] = createSignal(true);
  const [rightSidebarVisible, setRightSidebarVisible] = createSignal(true);
  const [activeTab, setActiveTab] = createSignal("Welcome");

  return (
    <div class="h-screen flex bg-base-100 text-base-content">
      {/* Left Sidebar */}
      <div 
        class="w-64 bg-base-200 border-r border-base-300 flex flex-col"
        classList={{ "hidden": !leftSidebarVisible() }}
      >
        <div class="flex-1 overflow-y-auto">
          {props.sidebarContent}
        </div>
      </div>

      {/* Main Content Area */}
      <div class="flex-1 flex flex-col">
        {/* Tab Bar */}
        <div class="h-12 bg-base-200 border-b border-base-300 flex items-center px-4">
          <div class="flex items-center space-x-2">
            <button 
              class="btn btn-sm btn-ghost"
              onclick={() => setLeftSidebarVisible(!leftSidebarVisible())}
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div class="flex items-center space-x-1">
              <button 
                class="btn btn-sm btn-ghost"
                onclick={() => window.history.back()}
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button 
                class="btn btn-sm btn-ghost"
                onclick={() => window.history.forward()}
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Tab */}
          <div class="flex-1 flex items-center ml-4">
            <div class="tabs tabs-boxed bg-base-100">
              <a class="tab tab-active">{activeTab()}</a>
              <button class="btn btn-sm btn-ghost ml-2">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Right side controls */}
          <div class="flex items-center space-x-2">
            <button class="btn btn-sm btn-ghost">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
            <button class="btn btn-sm btn-ghost">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            <button 
              class="btn btn-sm btn-ghost"
              onclick={() => setRightSidebarVisible(!rightSidebarVisible())}
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div class="flex-1 overflow-y-auto p-6">
          {props.children}
        </div>
      </div>

      {/* Right Sidebar */}
      <div 
        class="w-80 bg-base-200 border-l border-base-300 flex flex-col"
        classList={{ "hidden": !rightSidebarVisible() }}
      >
        <div class="p-4 border-b border-base-300">
          <h3 class="font-semibold text-sm">Linked mentions</h3>
          <p class="text-xs text-base-content/60 mt-1">0</p>
          <p class="text-xs text-base-content/60 mt-2">No backlinks found.</p>
        </div>
        
        <div class="p-4">
          <h3 class="font-semibold text-sm">Unlinked mentions</h3>
          <p class="text-xs text-base-content/60 mt-1">0</p>
        </div>
      </div>
    </div>
  );
}
