import { getUser } from "~/lib/auth";

export const route = {
  preload() {
    getUser();
  },
} satisfies RouteDefinition;

export default function Home() {
  return (
    <main class="   max-w-260">
      <div class="prose dark:prose-invert ">
        <p>
          I'm thinking a datatable and form so we can enter what we take and
          when we take it.
        </p>
      </div>
    </main>
  );
}
