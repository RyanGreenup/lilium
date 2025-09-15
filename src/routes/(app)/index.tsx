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
    <main class="max-w-6xl mx-auto space-y-8">
      <Hero
        class="min-h-96 rounded"
        style={{
          "background-image":
            "url(https://immich.vidar/api/assets/4374d4dd-5b32-40ae-9593-5c6f85a1885e/thumbnail?slug=iadslkjslkdfjewuoikdkdididslkijsdaflkdsfajkl&size=preview&c=EQgKDYLfd3l0qnh1aaiJdrRqUFYH)",
        }}
      >
        <Hero.Overlay class="rounded" />
        <Hero.Content
          class="text-center text-white"
          title="Welcome to Chronicles"
          description="Something for us"
        ></Hero.Content>
      </Hero>

      {/* Quick Access Tools */}
      <section>
        <h2 class="text-2xl font-bold mb-6">Quick Access</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <ChoreCards />
        </div>
      </section>

      {/* Content */}

      <section class="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <MarkdownRenderer
          content={() => `
## Usage Notes
`}
        />

        <Alert color="info" showIcon={true}>
          On Android, simply use the <code class="inline-block">http://</code>{" "}
          site, self-signed certificates simply don't work properly on Android
          with the Secure cookie store (i.e. Auth).
        </Alert>
        <MarkdownRenderer
          content={() => `
### Android

It seems on *Android*, it's necessary to restart the device for a *self-signed* TLS / SSL certificate to work for a new domain that's been added. We'll need to look into this.

In addition, when updating the site, it's necessary to clear ALL site data from chrome. This may be related to the \`service-worker.js\` I added for the PWA.

Basically, restart your phone, delete **all** the data and you're good to go. Each update, delete all the data.

The benefit of the service worker is that the JS doesn't have to load. There's less benefit here though as we use server side rendering, the impact would be greater with an SPA.
`}
        />

        <div class="prose dark:prose-invert max-w-none">
          <h3>About</h3>
          <p>
            Chronicles is our forever companion. We'll Track our chores, monitor
            habits, build things together
            <Heart class="w-4rem h-4rem animate-bounce inline-block mr-1" />
            and stay on top of our responsibilities??
          </p>
          <p>I've already started with some tools above.</p>
          <p>
            We've both been marked as collaborators in{" "}
            <a href="https://gitea.vidar/ryan/Chronicles/">
              gitea.vidar/ryan/Chronicles/
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}

const ChoreCards: VoidComponent = () => (
  <>
    {/* Chore Management Card */}
    <Card class="bg-base-100 shadow-lg hover:shadow-xl transition-shadow">
      <Card.Body>
        <Card.Title class="flex items-center gap-2">
          📋 Chore Management
        </Card.Title>
        <p class="text-sm text-base-content/70">
          Mark chores as complete, update schedules, and manage your daily
          tasks.
        </p>
        <Card.Actions>
          <A href="/tools/chores/form">
            <Button color="primary" size="sm" class="w-full">
              Manage Chores
            </Button>
          </A>
        </Card.Actions>
      </Card.Body>
    </Card>

    {/* Chore Reports Card */}
    <Card class="bg-base-100 shadow-lg hover:shadow-xl transition-shadow">
      <Card.Body>
        <Card.Title class="flex items-center gap-2">
          📊 Chore Reports
        </Card.Title>
        <p class="text-sm text-base-content/70">
          View analytics, completion trends, and performance insights.
        </p>
        <Card.Actions>
          <A href="/tools/chores/report">
            <Button color="secondary" size="sm" class="w-full">
              View Reports
            </Button>
          </A>
        </Card.Actions>
      </Card.Body>
    </Card>

    {/* Quick Stats Card */}
    <Card class="bg-gradient-to-br from-primary/10 to-secondary/10 shadow-lg">
      <Card.Body>
        <Card.Title class="flex items-center gap-2">⚡ Quick Stats</Card.Title>
        <p class="text-sm text-base-content/70">
          Get a quick overview of your chore completion status.
        </p>
        <div class="mt-4 space-y-2">
          <div class="text-xs text-base-content/60">
            Check the reports section for detailed analytics
          </div>
        </div>
      </Card.Body>
    </Card>
  </>
);

const Thumbnail = (props: { children: JSXElement }) => (
  <div class="w-full flex justify-center lg:justify-start">
    {props.children}
  </div>
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
      <Card.Title>Us Time!</Card.Title>
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
