import { A, createAsync, useSubmission } from "@solidjs/router";
import Popover from "corvu/popover";
import LogOut from "lucide-solid/icons/log-out";
import ChevronDown from "lucide-solid/icons/chevron-down";
import Settings from "lucide-solid/icons/settings";
import { Show } from "solid-js";
import { getUser, logout } from "~/lib/auth";
import { Avatar } from "~/solid-daisy-components/components/Avatar";

export function UserDropdown() {
  const user = createAsync(() => getUser(), { deferStream: true });
  const loggingOut = useSubmission(logout);

  return (
    <Show when={user()}>
      <Popover
        placement="bottom-end"
        floatingOptions={{ offset: 8, flip: true, shift: true }}
      >
        <Popover.Trigger class="btn btn-ghost btn-sm gap-1">
          <Avatar
            shape="circle"
            src={`/users/${user()?.username}.png`}
            alt="User avatar"
            size="xs"
          />
          <ChevronDown class="w-3.5 h-3.5 text-base-content/50" />
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content class="z-50 w-56 rounded-xl border border-base-300 bg-base-100 p-3 shadow-xl data-open:animate-in data-open:fade-in-50 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-50 data-closed:zoom-out-95">
            <div class="px-1 py-1.5">
              <div class="text-xs font-semibold uppercase tracking-wide text-base-content/50">
                Account
              </div>
              <div class="mt-1.5 text-sm font-medium">{user()?.username}</div>
            </div>

            <div class="my-2 border-t border-base-300" />

            <Popover.Close
              as={A}
              href="/settings"
              class="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-base-200"
            >
              <Settings class="w-4 h-4" />
              Settings
            </Popover.Close>

            <form action={logout} method="post">
              <Popover.Close
                as="button"
                type="submit"
                class="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-error transition-colors hover:bg-error/10"
                disabled={loggingOut.pending}
              >
                <LogOut class="w-4 h-4" />
                {loggingOut.pending ? "Logging out..." : "Logout"}
              </Popover.Close>
            </form>
          </Popover.Content>
        </Popover.Portal>
      </Popover>
    </Show>
  );
}

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
