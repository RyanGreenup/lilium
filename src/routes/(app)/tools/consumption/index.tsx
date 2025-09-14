import { A, createAsync, RouteDefinition } from "@solidjs/router";
import { For, Show, Suspense } from "solid-js";
import { Accessor } from "solid-js/types/server/reactive.js";
import { FirstLetterAvatar } from "~/components/FirstLetterAvatar";
import { getUser } from "~/lib/auth";
import {
  loadConsumptionItems,
  loadConsumptionSummary,
} from "~/lib/consumption-actions";
import { Alert } from "~/solid-daisy-components/components/Alert";
import { Button } from "~/solid-daisy-components/components/Button";
import { Card } from "~/solid-daisy-components/components/Card";
import { Hero } from "~/solid-daisy-components/components/Hero";
import {
  Stat,
  StatDesc,
  Stats,
  StatTitle,
  StatValue,
} from "~/solid-daisy-components/components/Stat";

export const route = {
  preload() {
    getUser();
  },
} satisfies RouteDefinition;

export default function ConsumptionHub() {
  const summary = createAsync(() => loadConsumptionSummary());
  const items = createAsync(() => loadConsumptionItems());

  const formatNextAllowed = (nextAllowedAt: string) => {
    const date = new Date(nextAllowedAt);
    const now = new Date();
    if (date <= now) return "Available Now";

    const diffDays = Math.ceil(
      (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (diffDays === 1) return "Tomorrow";
    if (diffDays <= 7) return `${diffDays} days`;

    return date.toLocaleDateString("en-AU", {
      timeZone: "Australia/Sydney",
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <main class="max-w-6xl mx-auto space-y-8">
      <Hero class="rounded bg-base-200">
        <Hero.Content
          class="text-center"
          title="Consumption Tracker"
          description="Monitor your intake and maintain compliance with doctor's orders. We can't have too much fun."
        />
      </Hero>

      {/* Quick Stats Overview */}
      <Suspense
        fallback={
          <div class="loading loading-spinner loading-lg mx-auto"></div>
        }
      >
        <Show when={summary()}>
          {(summaryData) => <SummaryStatsCard summaryData={summaryData} />}
        </Show>
      </Suspense>

      {/* Current Status Overview */}
      <section>
        <h2 class="text-2xl font-bold mb-6">Current Item Status</h2>
        <Suspense
          fallback={
            <div class="loading loading-spinner loading-md mx-auto"></div>
          }
        >
          <Show when={items()}>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <For each={items()}>
                {(item) => (
                  <div
                    class={`p-4 rounded-lg border-2 ${
                      item.is_overdue
                        ? "border-error bg-error/5"
                        : "border-success bg-success/5"
                    }`}
                  >
                    <div class="flex items-center gap-3 mb-2">
                      <FirstLetterAvatar name={item.name} showIcon={true} />
                      <div class="flex-1">
                        <h3 class="font-semibold">{item.name}</h3>
                        <p class="text-sm opacity-70">
                          {item.interval_days >= 30
                            ? `${Math.floor(item.interval_days / 30)} month interval`
                            : item.interval_days >= 7
                              ? `${Math.floor(item.interval_days / 7)} week interval`
                              : `${item.interval_days} day interval`}
                        </p>
                      </div>
                    </div>
                    <div class="text-sm">
                      <div class="flex justify-between mb-1">
                        <span>Next allowed:</span>
                        <strong
                          class={
                            item.is_overdue ? "text-error" : "text-success"
                          }
                        >
                          {formatNextAllowed(item.next_allowed_at)}
                        </strong>
                      </div>
                      <div class="flex justify-between">
                        <span>Last consumed:</span>
                        <span>
                          {item.last_consumed_at
                            ? new Date(
                                item.last_consumed_at,
                              ).toLocaleDateString("en-AU", {
                                timeZone: "Australia/Sydney",
                                day: "numeric",
                                month: "short",
                              })
                            : "Never"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </Suspense>
      </section>

      {/* Action Cards */}
      <section>
        <h2 class="text-2xl font-bold mb-6">What would you like to do?</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Daily Management Card */}
          <Card class="bg-base-100 shadow-lg hover:shadow-xl transition-all duration-300">
            <Card.Body>
              <Card.Title class="flex items-center gap-3">
                <span class="text-2xl">📝</span>
                <div>
                  <div>Track Consumption</div>
                  <div class="text-sm font-normal text-base-content/60">
                    Log what you eat and when
                  </div>
                </div>
              </Card.Title>
              <p class="text-sm text-base-content/70 mt-2">
                Add new consumption entries, edit previous entries, and manage
                your intake history. Track quantities, dates, and notes for each
                consumption.
              </p>
              <Card.Actions class="mt-4">
                <A href="/tools/consumption/form" class="w-full">
                  <Button color="primary" size="lg" class="w-full">
                    Go to Consumption Form
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
                    Tolerance compliance reports
                  </div>
                </div>
              </Card.Title>
              <p class="text-sm text-base-content/70 mt-2">
                Explore detailed reports, consumption patterns, next allowed
                dates, and export data for medical consultations. Perfect for
                doctor visits.
              </p>
              <Card.Actions class="mt-4">
                <A href="/tools/consumption/report" class="w-full">
                  <Button color="secondary" size="lg" class="w-full">
                    View Reports
                  </Button>
                </A>
              </Card.Actions>
            </Card.Body>
          </Card>
        </div>
      </section>

      {/* Medical Alert */}
      <Alert color="info" class="border border-info/20">
        <div>
          <h3 class="font-semibold text-info">
            🩺 Tolerance Compliance Reminder
          </h3>
          <p class="text-sm mt-1">
            This tracker is designed to help you manage intake for your health.
            Always consult with your healthcare provider before making changes
            to your diet or if you have questions about your restrictions.
          </p>
        </div>
      </Alert>

      {/* Quick Tips */}
      <section class="bg-base-200/50 rounded-lg p-6">
        <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
          💡 Quick Tips
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 class="font-medium text-base-content mb-1">
              Tracking Consumption
            </h4>
            <p class="text-base-content/70">
              Log entries as soon as you consume. Use the date picker to
              backdate entries if needed. Add detailed notes for medical
              reference.
            </p>
          </div>
          <div>
            <h4 class="font-medium text-base-content mb-1">
              Understanding Status
            </h4>
            <p class="text-base-content/70">
              Green status means safe to consume, red means still restricted.
              Export reports as CSV files to share with your healthcare team
              during appointments.
            </p>
          </div>
          <div>
            <h4 class="font-medium text-base-content mb-1">
              Tolerance Intervals
            </h4>
            <p class="text-base-content/70">
              Lemons: 1 month, Meat: 3 months, Candy/Kale/Turmeric: 2 weeks.
              These intervals are based on your doctor's specific instructions.
            </p>
          </div>
          <div>
            <h4 class="font-medium text-base-content mb-1">Data Management</h4>
            <p class="text-base-content/70">
              Use the comprehensive data table to review all entries, filter by
              consumed item type or date range, and export complete consumption
              history for medical records.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

export const SummaryStatsCard = (props: {
  summaryData: Accessor<{
    total_items: number;
    overdue_items: number;
    on_time_items: number;
    consumptions_this_week: number;
  }>;
}) => {
  const summaryData = props.summaryData;
  return (
    <div class="overflow-x-auto">
      <Stats class="overflow-auto">
        <Stat>
          <StatTitle>Still Restricted</StatTitle>
          <StatValue class="text-error">
            {summaryData().overdue_items}
          </StatValue>
          <StatDesc>Cannot consume yet</StatDesc>
        </Stat>
        <Stat>
          <StatTitle>Available Now</StatTitle>
          <StatValue class="text-success">
            {summaryData().on_time_items}
          </StatValue>
          <StatDesc>Safe to consume</StatDesc>
        </Stat>
        <Stat>
          <StatTitle>This Week</StatTitle>
          <StatValue>{summaryData().consumptions_this_week}</StatValue>
          <StatDesc>Consumptions</StatDesc>
        </Stat>
        <Stat>
          <StatTitle>Items Tracked</StatTitle>
          <StatValue>{summaryData().total_items}</StatValue>
          <StatDesc>Tolerance restrictions</StatDesc>
        </Stat>
      </Stats>
    </div>
  );
};
