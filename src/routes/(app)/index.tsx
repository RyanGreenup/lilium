import { A, RouteDefinition } from "@solidjs/router";
import Counter from "~/components/Counter";
import { UserDropdown } from "~/components/UserDrowDown";
import { getUser } from "~/lib/auth";

export const route = {
  preload() {
    getUser();
  },
} satisfies RouteDefinition;

export default function Home() {
  return (
    <main class="text-center mx-auto  p-4">
      <div class="prose dark:prose-invert">
        <h1> Welcome the Chronicles</h1>
      </div>
    </main>
  );
}
