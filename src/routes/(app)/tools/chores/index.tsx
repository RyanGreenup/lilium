import { RouteDefinition } from "@solidjs/router";
import { getUser } from "~/lib/auth";

export const route = {
  preload() {
    getUser();
  },
} satisfies RouteDefinition;

export default function Page() {
  return <p>TODO</p>;
}
