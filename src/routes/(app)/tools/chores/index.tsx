import { RouteDefinition, A, createAsync } from "@solidjs/router";
import { Show, Suspense } from "solid-js";
import { getUser } from "~/lib/auth";
import { Hero } from "~/solid-daisy-components/components/Hero";
import { Card } from "~/solid-daisy-components/components/Card";
import { Button } from "~/solid-daisy-components/components/Button";
import { Stats, Stat, StatTitle, StatValue, StatDesc } from "~/solid-daisy-components/components/Stat";
import { loadSummaryStats } from "~/lib/chore-actions";

export const route = {
  preload() {
    getUser();
  },
} satisfies RouteDefinition;

export default function ChoresHub() {
  const summary = createAsync(() => loadSummaryStats());

  return (
    <main class="max-w-6xl mx-auto space-y-8">
      <Hero class="rounded bg-base-200">
        <Hero.Content
          class="text-center"
          title="Chore Collective"
          description="Manage Housework AND practice Web Development!"
        />
      </Hero>

      {/* Quick Stats Overview */}
      <Suspense fallback={<div class="loading loading-spinner loading-lg mx-auto"></div>}>
        <Show when={summary()}>
          {(summaryData) => (
            <Stats class="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Stat>
                <StatTitle>Total Chores</StatTitle>
                <StatValue>{summaryData().total_chores}</StatValue>
              </Stat>
              <Stat>
                <StatTitle>Overdue</StatTitle>
                <StatValue class="text-error">{summaryData().overdue_chores}</StatValue>
              </Stat>
              <Stat>
                <StatTitle>On Time</StatTitle>
                <StatValue class="text-success">{summaryData().on_time_chores}</StatValue>
              </Stat>
              <Stat>
                <StatTitle>This Week</StatTitle>
                <StatValue>{summaryData().completions_this_week}</StatValue>
                <StatDesc>Completions</StatDesc>
              </Stat>
            </Stats>
          )}
        </Show>
      </Suspense>

      {/* Action Cards */}
      <section>
        <h2 class="text-2xl font-bold mb-6">What would you like to do?</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Daily Management Card */}
          <Card class="bg-base-100 shadow-lg hover:shadow-xl transition-all duration-300">
            <Card.Body>
              <Card.Title class="flex items-center gap-3">
                <span class="text-2xl">📋</span>
                <div>
                  <div>Manage Daily Tasks</div>
                  <div class="text-sm font-normal text-base-content/60">
                    Mark complete, update schedules
                  </div>
                </div>
              </Card.Title>
              <p class="text-sm text-base-content/70 mt-2">
                View your chores, mark them as complete, adjust duration intervals,
                and manage your daily responsibilities.
              </p>
              <Card.Actions class="mt-4">
                <A href="/tools/chores/form" class="w-full">
                  <Button color="primary" size="lg" class="w-full">
                    Go to Chore Forms
                  </Button>
                </A>
              </Card.Actions>
            </Card.Body>
          </Card>

          {/* Analytics Card */}
          <Card class="bg-base-100 shadow-lg hover:shadow-xl transition-all duration-300">
            <Card.Body>
              <Card.Title class="flex items-center gap-3">
                <span class="text-2xl">📊</span>
                <div>
                  <div>View Analytics</div>
                  <div class="text-sm font-normal text-base-content/60">
                    Insights and performance tracking
                  </div>
                </div>
              </Card.Title>
              <p class="text-sm text-base-content/70 mt-2">
                Explore detailed reports, completion trends, performance metrics,
                and understand your productivity patterns.
              </p>
              <Card.Actions class="mt-4">
                <A href="/tools/chores/report" class="w-full">
                  <Button color="secondary" size="lg" class="w-full">
                    View Reports
                  </Button>
                </A>
              </Card.Actions>
            </Card.Body>
          </Card>

        </div>
      </section>

      {/* Quick Tips */}
      <section class="bg-base-200/50 rounded-lg p-6">
        <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
          💡 Quick Tips
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 class="font-medium text-base-content mb-1">Managing Tasks</h4>
            <p class="text-base-content/70">
              Use the toggle to hide completed chores and focus on what needs attention.
              Update duration intervals to match our fluctuating schedule.
            </p>
          </div>
          <div>
            <h4 class="font-medium text-base-content mb-1">Understanding Reports</h4>
            <p class="text-base-content/70">
              Completion rates show how bad we're doing.
              Green badges mean we're on time, red badges indicate overdue tasks, i.e. failure.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
