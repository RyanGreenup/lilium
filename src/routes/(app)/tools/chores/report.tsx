import { createAsync, RouteDefinition } from "@solidjs/router";
import { For, Show, Suspense } from "solid-js";
import { getUser } from "~/lib/auth";
import { Hero } from "~/solid-daisy-components/components/Hero";
import { Table } from "~/solid-daisy-components/components/Table";
import { Card } from "~/solid-daisy-components/components/Card";
import { Stats, Stat, StatTitle, StatValue, StatDesc } from "~/solid-daisy-components/components/Stat";
import { DoughnutChart } from "~/solid-daisy-components/components/viz/chart_js/DoughnutChart";
import { loadChoreStatistics, loadCompletionTrends, loadSummaryStats } from "~/lib/chore-actions";

export const route = {
  preload() {
    getUser();
  },
} satisfies RouteDefinition;

export default function ChoreReport() {
  const statistics = createAsync(() => loadChoreStatistics());
  const trends = createAsync(() => loadCompletionTrends());
  const summary = createAsync(() => loadSummaryStats());

  const statusChartData = () => {
    const summaryData = summary();
    if (!summaryData) return null;
    
    return {
      labels: ['On Time', 'Overdue'],
      datasets: [{
        data: [summaryData.on_time_chores, summaryData.overdue_chores],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)', // green
          'rgba(239, 68, 68, 0.8)'   // red
        ],
        borderColor: [
          'rgba(34, 197, 94, 1)',
          'rgba(239, 68, 68, 1)'
        ],
        borderWidth: 2
      }]
    };
  };

  const completionRateData = () => {
    const stats = statistics();
    if (!stats) return null;

    // Group chores by completion rate ranges
    const excellent = stats.filter(s => s.completion_rate >= 90).length;
    const good = stats.filter(s => s.completion_rate >= 70 && s.completion_rate < 90).length;
    const fair = stats.filter(s => s.completion_rate >= 50 && s.completion_rate < 70).length;
    const poor = stats.filter(s => s.completion_rate < 50).length;

    return {
      labels: ['Excellent (90%+)', 'Good (70-89%)', 'Fair (50-69%)', 'Poor (<50%)'],
      datasets: [{
        data: [excellent, good, fair, poor],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',  // green
          'rgba(59, 130, 246, 0.8)', // blue
          'rgba(251, 191, 36, 0.8)', // yellow
          'rgba(239, 68, 68, 0.8)'   // red
        ],
        borderColor: [
          'rgba(34, 197, 94, 1)',
          'rgba(59, 130, 246, 1)', 
          'rgba(251, 191, 36, 1)',
          'rgba(239, 68, 68, 1)'
        ],
        borderWidth: 2
      }]
    };
  };

  return (
    <main class="space-y-6">
      <Hero class="inline-block rounded bg-base-200">
        <Hero.Content
          class="text-center"
          title="Chores Report"
          description="Analytics and insights for your chore completion patterns."
        />
      </Hero>

      <Suspense fallback={<div class="loading loading-spinner loading-lg mx-auto"></div>}>
        {/* Summary Statistics */}
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

        {/* Charts Section */}
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <Card.Body>
              <Card.Title>Chore Status Distribution</Card.Title>
              <Show when={statusChartData()}>
                {(data) => (
                  <DoughnutChart 
                    data={data()}
                    title="Current Status"
                    className="h-64"
                  />
                )}
              </Show>
            </Card.Body>
          </Card>

          <Card>
            <Card.Body>
              <Card.Title>Completion Rate Performance</Card.Title>
              <Show when={completionRateData()}>
                {(data) => (
                  <DoughnutChart 
                    data={data()}
                    title="Performance Distribution"
                    className="h-64"
                  />
                )}
              </Show>
            </Card.Body>
          </Card>
        </div>

        {/* Detailed Statistics Table */}
        <Card>
          <Card.Body>
            <Card.Title>Detailed Chore Statistics</Card.Title>
            <div class="overflow-x-auto">
              <Table zebra={true} size="sm">
                <thead>
                  <tr>
                    <th>Chore Name</th>
                    <th>Total Completions</th>
                    <th>Days Since Last</th>
                    <th>Avg Days Between</th>
                    <th>Completion Rate</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <Show when={statistics()}>
                    <For each={statistics()}>
                      {(stat) => (
                        <tr class={stat.is_overdue ? "bg-error/10" : ""}>
                          <td class="font-medium">{stat.name}</td>
                          <td>{stat.total_completions}</td>
                          <td>
                            {stat.days_since_last_completion === 999 
                              ? "Never" 
                              : `${stat.days_since_last_completion}d`
                            }
                          </td>
                          <td>{stat.average_days_between}d</td>
                          <td>
                            <div class="flex items-center gap-2">
                              <progress 
                                class={`progress w-20 ${
                                  stat.completion_rate >= 90 ? 'progress-success' :
                                  stat.completion_rate >= 70 ? 'progress-primary' :
                                  stat.completion_rate >= 50 ? 'progress-warning' : 'progress-error'
                                }`}
                                value={stat.completion_rate} 
                                max="100"
                              />
                              <span class="text-sm">{stat.completion_rate}%</span>
                            </div>
                          </td>
                          <td>
                            <span class={`badge whitespace-nowrap ${stat.is_overdue ? 'badge-error' : 'badge-success'}`}>
                              {stat.is_overdue ? 'Overdue' : 'On Time'}
                            </span>
                          </td>
                        </tr>
                      )}
                    </For>
                  </Show>
                </tbody>
              </Table>
            </div>
          </Card.Body>
        </Card>

        {/* Completion Trends */}
        <Show when={trends() && trends()!.length > 0}>
          <Card>
            <Card.Body>
              <Card.Title>Recent Activity (Last 30 Days)</Card.Title>
              <div class="overflow-x-auto">
                <Table size="sm">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Completions</th>
                      <th>Visual</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={trends()}>
                      {(trend) => (
                        <tr>
                          <td>{new Date(trend.date).toLocaleDateString()}</td>
                          <td>{trend.completions}</td>
                          <td>
                            <progress 
                              class="progress progress-primary w-20" 
                              value={trend.completions} 
                              max={Math.max(...(trends() || []).map(t => t.completions))}
                            />
                          </td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>
        </Show>
      </Suspense>
    </main>
  );
}
