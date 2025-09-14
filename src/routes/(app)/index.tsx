import { RouteDefinition } from "@solidjs/router";
import { JSXElement } from "solid-js";
import { VoidComponent } from "solid-js/types/server/rendering.js";
import { getUser } from "~/lib/auth";
import { Button } from "~/solid-daisy-components/components/Button";
import { Card } from "~/solid-daisy-components/components/Card";

export const route = {
  preload() {
    getUser();
  },
} satisfies RouteDefinition;

export default function Home() {
  return (
    <main class="  p-4 max-w-260">
      <div class="prose dark:prose-invert">
        <h1> Welcome the Chronicles</h1>
      </div>
      <Thumbnail>
        <ShaiImage />
      </Thumbnail>
      <div class="prose dark:prose-invert">
        <p>
          {" "}
          We can use this for our chores list and any other associated stuff
          too!
        </p>
      </div>
    </main>
  );
}

const Thumbnail = (props: { children: JSXElement }) => (
  <div class="float-right ml-4 my-4">{props.children}</div>
);

const ShaiImage: VoidComponent = () => (
  <Card class="w-48 bg-base-100 shadow-sm">
    <figure>
      <img
        src="https://immich.vidar/api/assets/9725898a-64f1-4ac8-ba33-379825786121/thumbnail?slug=ikdiasdlkjlkdsfjewndiodsnomivdskldsvlkjiewrweoijdsji&size=preview&c=XQgKDQIMfHSYm7VJVFm3dwGKJLA4"
        alt="Shoes"
      />
    </figure>
    <Card.Body>
      <Card.Title>Shoes!</Card.Title>
      <p>We need more days like this.</p>
      <Card.Actions>
        <FancyHover>
          <a href="https://photon.vidar/post/lemmy.vidar/187">
            <Button color="primary">Discuss Now</Button>
          </a>
        </FancyHover>
      </Card.Actions>
    </Card.Body>
  </Card>
);

const FancyHover = (props: { children: JSXElement }) => (
  <div class="transition-all duration-300 ease-in-out transform hover:scale-125 hover:shadow-lg hover:-translate-y-1 hover:rotate-3">
    {props.children}
  </div>
);
