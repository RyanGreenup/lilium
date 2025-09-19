import { JSXElement } from "solid-js";

interface MenuItemProps {
  icon?: string;
  children: JSXElement;
  size?: "sm" | "md";
  onClick?: () => void;
  submenu?: JSXElement;
}

const MenuItem = (props: MenuItemProps) => (
  <li>
    <a
      class={props.size === "sm" ? "text-sm py-1" : ""}
      onClick={props.onClick}
    >
      {props.icon && `${props.icon} `}
      {props.children}
    </a>
    {props.submenu && <ul>{props.submenu}</ul>}
  </li>
);

export default function NotesTab() {
  return (
    <div class="space-y-4">
      {/* Hierarchical Context */}
      <ul class="menu bg-base-300 rounded-box w-full text-sm">
        <li class="menu-title text-xs">Path</li>
        <MenuItem
          icon="📁"
          size="sm"
          submenu={
            <MenuItem
              icon="📁"
              size="sm"
              submenu={
                <MenuItem icon="📁" size="sm">
                  wikijs
                </MenuItem>
              }
            >
              notetaking
            </MenuItem>
          }
        >
          / (root)
        </MenuItem>
      </ul>

      {/* Current Directory */}
      <div>
        <h3 class="text-sm font-medium text-base-content/70 mb-2">
          Current Directory
        </h3>
        <ul class="menu bg-base-200 rounded-box w-full">
          <MenuItem icon="📁">tools</MenuItem>
          <MenuItem icon="📄">Custom CSS for Heirarçhy in...</MenuItem>
          <MenuItem icon="📄">Directories and Wikiïs</MenuItem>
          <MenuItem icon="📄">Wikijs</MenuItem>
        </ul>
      </div>
    </div>
  );
}
