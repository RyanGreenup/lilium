import { createSignal, For } from "solid-js";
import { useNavigate } from "@solidjs/router";

interface TreeNode {
  title: string;
  link?: string;
  expanded?: boolean;
  children?: TreeNode[];
}

const treeData: TreeNode[] = [
  {
    title: "Programming",
    expanded: true,
    children: [
      {
        title: "Thing",
        expanded: false,
        children: [
          { title: "bar", link: "/about" },
          { title: "foo", link: "/" },
        ],
      },
      { title: "Welcome", link: "/" },
    ],
  },
];

interface TreeItemProps {
  node: TreeNode;
  level: number;
}

function TreeItem(props: TreeItemProps) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = createSignal(props.node.expanded ?? false);
  
  const handleClick = () => {
    if (props.node.children && props.node.children.length > 0) {
      setExpanded(!expanded());
    } else if (props.node.link) {
      navigate(props.node.link);
    }
  };
  
  return (
    <div>
      <div 
        class="flex items-center py-1 px-2 text-sm cursor-pointer hover:bg-base-300 rounded"
        style={{ "padding-left": `${props.level * 16 + 8}px` }}
        onclick={handleClick}
      >
        {props.node.children && props.node.children.length > 0 && (
          <svg 
            class="w-3 h-3 mr-1 transition-transform" 
            classList={{ "rotate-90": expanded() }}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        )}
        {!props.node.children && (
          <div class="w-3 h-3 mr-1"></div>
        )}
        <span class="truncate">{props.node.title}</span>
      </div>
      
      {props.node.children && expanded() && (
        <For each={props.node.children}>
          {(child) => <TreeItem node={child} level={props.level + 1} />}
        </For>
      )}
    </div>
  );
}

export default function NavTree() {
  return (
    <div class="p-4">
      <For each={treeData}>
        {(node) => <TreeItem node={node} level={0} />}
      </For>
    </div>
  );
}
