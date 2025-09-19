import { A, RouteDefinition } from "@solidjs/router";
import Heart from "lucide-solid/icons/heart";
import { JSXElement } from "solid-js";
import { VoidComponent } from "solid-js/types/server/rendering.js";
import { getUser } from "~/lib/auth";
import { Alert } from "~/solid-daisy-components/components/Alert";
import { Button } from "~/solid-daisy-components/components/Button";
import { Card } from "~/solid-daisy-components/components/Card";
import { Hero } from "~/solid-daisy-components/components/Hero";
import { MarkdownRenderer } from "~/utils/renderMarkdown";

export const route = {
  preload() {
    getUser();
  },
} satisfies RouteDefinition;

export default function Home() {
  return (
      <p>TODO</p>
  );
}

