import { children, JSXElement, splitProps } from "solid-js";
import { Button } from "~/solid-daisy-components/components/Button";
import  FileText  from "lucide-solid/icons/file-text";
import Folder from "lucide-solid/icons/folder";


interface MenuItemProps {
  icon?: JSXElement;
  children: JSXElement;
  size?: "sm" | "md";
  onClick?: () => void;
  submenu?: JSXElement;
}

const MenuItem = (props: MenuItemProps) => {
  const [local, others] = splitProps(props, ["children", "icon", "submenu"]);
  const safeSubMenu = children(() => local.submenu);
  const safeChildren = children(() => local.children);
  return (
    <li>
      <a
        class={props.size === "sm" ? "text-sm py-1" : ""}
        onClick={props.onClick}
      >
        {local.icon && <span class="mr-2">{local.icon}</span>}
        {safeChildren()}
      </a>
      {safeSubMenu() && <ul>{safeSubMenu()}</ul>}
    </li>
  );
};

export default function NotesTab() {
  return (
    <div class="space-y-4">
      {/* Hierarchical Context */}
      <ul class="menu  rounded-box w-full text-sm">
        <li class="menu-title text-xs">Path</li>
        <MenuItem
          icon={<Folder size={16} />}
          size="sm"
          submenu={
            <MenuItem
              icon={<Folder size={16} />}
              size="sm"
              submenu={
                <MenuItem icon={<Folder size={16} />} size="sm">
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

      <div class="divider"></div>

      {/* Current Directory */}
      <div>
        <Button
          variant="ghost"
          onclick={() => {
            alert("I'll Redirect to the index page note in the future");
          }}
        >
          <h3 class="text-sm font-medium text-base-content/70 mb-2">
            Current Directory
          </h3>
        </Button>
        <ul class="menu bg-base-200 rounded-box w-full">
          <MenuItem icon={<Folder size={16} />}>tools</MenuItem>
          <MenuItem icon={<FileText size={16} />}>Custom CSS for Heirarçhy in...</MenuItem>
          <MenuItem icon={<FileText size={16} />}>Directories and Wikiïs</MenuItem>
          <MenuItem icon={<FileText size={16} />}>Wikijs</MenuItem>
        </ul>
      </div>
    </div>
  );
}
