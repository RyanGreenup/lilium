import ChevronRight from "lucide-solid/icons/chevron-right";
import Home from "lucide-solid/icons/home";
import { For } from "solid-js";

interface BreadcrumbProps {
  crumbs: { id: string; title: string }[];
  onNavigate: (depth: number) => void;
}

export default function Breadcrumb(props: BreadcrumbProps) {
  return (
    <div class="flex items-center gap-1 px-4 py-2 bg-base-200 text-sm border-b border-base-300 overflow-x-auto">
      <button
        class="flex items-center gap-1 hover:text-primary transition-colors shrink-0"
        onClick={() => props.onNavigate(0)}
      >
        <Home class="w-4 h-4" />
        <span>Home</span>
      </button>
      <For each={props.crumbs}>
        {(crumb, i) => (
          <>
            <ChevronRight class="w-3 h-3 text-base-content/40 shrink-0" />
            <button
              class="hover:text-primary transition-colors truncate max-w-[12rem]"
              onClick={() => props.onNavigate(i() + 1)}
            >
              {crumb.title}
            </button>
          </>
        )}
      </For>
    </div>
  );
}
