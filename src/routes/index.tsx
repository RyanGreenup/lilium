import { A } from "@solidjs/router";
import Counter from "~/components/Counter";

export default function Home() {
  return (
    <main class="bg-base-100 text-center mx-auto p-4">
      <h1 class="max-6-xs text-6xl text-primary   uppercase my-16">
        Hello world!
      </h1>

      <div class="flex flex-col sm:flex-row gap-4 justify-center items-center p-6">
        <Counter />

        <button
          onClick={() => {
            if (typeof document !== "undefined") {
              const currentTheme =
                document.documentElement.getAttribute("data-theme");
              if (currentTheme === "night") {
                document.documentElement.removeAttribute("data-theme");
              } else {
                document.documentElement.setAttribute("data-theme", "night");
              }
            }
          }}
          class=" rounded-box bg-primary text-primary-content border-border border-base-300 px-4 py-3 min-w-fit h-auto"
        >
          Toggle Night Theme
        </button>
      </div>

      <p class="mt-8">
        Visit{" "}
        <a
          href="https://solidjs.com"
          target="_blank"
          class="text-sky-600 hover:underline"
        >
          solidjs.com
        </a>{" "}
        to learn how to build Solid apps.
      </p>
      <p class="my-4">
        <span>Home</span>
        {" - "}
        <A href="/about" class="text-sky-600 hover:underline">
          About Page
        </A>{" "}
      </p>
    </main>
  );
}
