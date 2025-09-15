import { createAsync, useSubmission } from "@solidjs/router";
import ChevronDown from "lucide-solid/icons/chevron-down";
import LogOut from "lucide-solid/icons/log-out";
import { Show } from "solid-js";
import { getUser, logout } from "~/lib/auth";
import { Avatar } from "~/solid-daisy-components/components/Avatar";
import { Button } from "~/solid-daisy-components/components/Button";

const ICON = "w-4 h-4 mr-2";
export function UserDropdown() {
  const user = createAsync(() => getUser(), { deferStream: true });
  const loggingOut = useSubmission(logout);

  return (
    <Show when={user()}>
      <div class="dropdown dropdown-end">
        <DropdownButton username={user()?.username || ""} />
        <ul
          tabindex="0"
          class="menu menu-sm dropdown-content mt-1 z-[1] p-2 shadow bg-base-100 rounded-box w-52 border border-base-300"
        >
          <li class="menu-title">
            <span class="text-xs font-semibold uppercase tracking-wide text-base-content/60">
              Account
            </span>
          </li>
          <li>
            <a class="px-3 py-2 text-sm text-base-content/70 cursor-default hover:bg-transparent">
              <p>{user()?.username}</p>
            </a>
          </li>
          <div class="divider my-1"></div>
          <li>
            <form action={logout} method="post">
              <button
                type="submit"
                class="px-3 py-2 text-error w-full text-left flex items-center  rounded-lg transition-colors"
                disabled={loggingOut.pending}
              >
                <LogOut class={ICON} />
                {loggingOut.pending ? "Logging out..." : "Logout"}
              </button>
            </form>
          </li>
        </ul>
      </div>
    </Show>
  );
}
function DropdownButton(props: { username: string }) {
  return (
    <Button variant="ghost" tabindex="0">
      <Avatar
        shape="circle"
        src={`/users/${props.username}.png`}
        alt="User avatar"
        size="xs"
      />

      <ChevronDown class="ml-1 w-4 h-4" />
    </Button>
  );
}

// xs sm md lg xl
export function UserAvatar(props: {
  username: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
}) {
  return (
    <Avatar
      shape="circle"
      src={`/users/${props.username}.png`}
      alt="User avatar"
      size={props.size || "xs"}
    />
  );
}
