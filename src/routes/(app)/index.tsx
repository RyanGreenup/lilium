import { A, createAsync, query, redirect } from "@solidjs/router";
import Counter from "~/components/Counter";
import { getUser, requireUser } from "~/lib/auth";

export default function Home() {
  const user = createAsync(() => getUser(), { deferStream: true });
  const data = createAsync(() => privateData(), { deferStream: true });

  return (
    <main class="bg-base-100 text-center mx-auto p-4">
      <h1 class="max-6-xs text-6xl text-primary   uppercase my-16">
        Hello {user()?.username}! Here is your data: {data()}
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

/**
 * Simulate getting Private data by:
 *
 * 1. Checking the user is defined (i.e. are cookies enabled)
 * 2. Checking the user is authorized
 * 3. Connecting to the database
 * 4. Returning the data
 *
 */
const privateData = query(async function (): Promise<string> {
  "use server";
  // Check the user is authorized to get this data
  const user = await requireUser();
  if (await isAuthorized(user.id)) {
    // Get the database connection
    const conn = await getDbConnection();
    return conn.data;
  }

  throw redirect("/login");
}, "privateData");

/**
 * Simulate Getting a Database Connection
 *
 * 1. Is the user defined (i.e. are cookies enabled)
 * 2. Is the user authorized
 * 3. Return the db object (in this case just true)
 *
 */
const getDbConnection = query(async function (): Promise<{ data: string }> {
  "use server";
  // Confirm the user is permitted to have a db connection
  const user = await requireUser();
  if (await isAuthorized(user.id)) {
    // Return true as db connection
    return { data: "Some Private Data" };
  }
  throw redirect("/login");
}, "conn");

/**
 * Simulate verifying user auth
 */
const isAuthorized = query(async function (user_id: string): Promise<boolean> {
  "use server";
  if (user_id.length > 0) {
    return true;
  }
  return true;
}, "userAuth");
