import { createAsync, RouteDefinition } from "@solidjs/router";
import { createColumnHelper } from "@tanstack/solid-table";
import { For, Show, Suspense, createMemo } from "solid-js";
import { FirstLetterAvatar } from "~/components/FirstLetterAvatar";
import { UserAvatar } from "~/components/UserDrowDown";
import { getUser } from "~/lib/auth";
import {
  loadAllConsumptionEntries,
  loadConsumptionAnalytics,
  loadConsumptionSummary,
  nullUsername,
} from "~/lib/consumption-actions";
import { Card } from "~/solid-daisy-components/components/Card";
import { VirtualizedDataTable } from "~/solid-daisy-components/components/Datatables/VirtualizedDataTable";
import { Hero } from "~/solid-daisy-components/components/Hero";
import { Table } from "~/solid-daisy-components/components/Table";
import { BarChart } from "~/solid-daisy-components/components/viz/chart_js/BarChart";
import { DoughnutChart } from "~/solid-daisy-components/components/viz/chart_js/DoughnutChart";
import { SummaryStatsCard } from ".";

export const route = {
  preload() {
    getUser();
  },
} satisfies RouteDefinition;

export default function ConsumptionReport() {
  const analytics = createAsync(() => loadConsumptionAnalytics());
  const summary = createAsync(() => loadConsumptionSummary());
  const allEntries = createAsync(() => loadAllConsumptionEntries());

  // Column helper for the data table
  const columnHelper = createColumnHelper<any>();

  const consumableOptions = createMemo(() => {
    const data = allEntries();
    if (!data) return [];
    const uniqueValues = [...new Set(data.map(item => item.food_name))].sort();
    return uniqueValues.map(value => ({ value, label: value }));
  });

  const statusOptions = createMemo(() => [
    { value: "Available", label: "Available" },
    { value: "Restricted", label: "Restricted" }
  ]);

  const columns = createMemo(() => [
    columnHelper.accessor("food_name", {
      header: "Consumable",
      size: 120,
      meta: {
        filterVariant: "select",
        selectOptions: consumableOptions(),
      },
      cell: (info) => (
        <div class="flex items-center gap-2">
          <FirstLetterAvatar name={info.getValue()} showIcon={true} />
          <span class="font-medium">{info.getValue()}</span>
        </div>
      ),
    }),
    columnHelper.accessor("consumed_at", {
      header: "Consumed Date",
      size: 140,
      cell: (info) => {
        const date = new Date(info.getValue());
        return date.toLocaleDateString("en-AU", {
          timeZone: "Australia/Sydney",
          weekday: "short",
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
      },
    }),
    columnHelper.accessor("quantity", {
      header: "Quantity",
      size: 80,
      cell: (info) => Math.round(info.getValue() * 10) / 10,
    }),
    columnHelper.accessor("notes", {
      header: "Notes",
      size: 200,
      cell: (info) => (
        <div class="max-w-xs truncate" title={info.getValue() || ""}>
          {info.getValue() || "—"}
        </div>
      ),
    }),
    columnHelper.accessor("interval_days", {
      header: "Restriction Period",
      size: 130,
      cell: (info) => {
        const days = info.getValue();
        return days >= 30
          ? `${Math.floor(days / 30)} month${Math.floor(days / 30) !== 1 ? "s" : ""}`
          : days >= 7
            ? `${Math.floor(days / 7)} week${Math.floor(days / 7) !== 1 ? "s" : ""}`
            : `${days} day${days !== 1 ? "s" : ""}`;
      },
    }),
    columnHelper.accessor("next_allowed_at", {
      header: "Next Allowed",
      size: 130,
      cell: (info) => {
        const nextAllowedAt = info.getValue();
        const available = isItemAvailable(nextAllowedAt);

        if (available) {
          return <span class="text-success font-semibold">Available Now</span>;
        }

        return (
          <span class="text-error">
            {formatNextAllowed(nextAllowedAt)}
          </span>
        );
      },
    }),
    columnHelper.accessor("is_currently_overdue", {
      header: "Status",
      size: 100,
      meta: {
        filterVariant: "select",
        selectOptions: statusOptions(),
      },
      filterFn: (row, columnId, filterValue) => {
        if (!filterValue) return true;
        const nextAllowedAt = row.original.next_allowed_at;
        const available = isItemAvailable(nextAllowedAt);
        const status = available ? "Available" : "Restricted";
        return status === filterValue;
      },
      cell: (info) => {
        // Use centralized logic for consistency
        const nextAllowedAt = info.row.original.next_allowed_at;
        const available = isItemAvailable(nextAllowedAt);

        return (
          <span
            class={`badge whitespace-nowrap ${
              available ? "badge-success" : "badge-error"
            }`}
          >
            {available ? "Available" : "Restricted"}
          </span>
        );
      },
    }),
    columnHelper.accessor("username", {
      header: "User",
      size: 120,
      cell: (info) => {
        const username = info.getValue();
        const displayName =
          username === nullUsername
            ? nullUsername.charAt(0).toUpperCase() + nullUsername.slice(1)
            : username;
        return (
          <div class="flex items-center gap-2">
            <Show when={username !== nullUsername} fallback={<UnknownAvatar />}>
              <UserAvatar username={username} size="xs" />
            </Show>
            <span class="text-sm" title={username}>
              {displayName}
            </span>
          </div>
        );
      },
    }),
    columnHelper.accessor("created_at", {
      header: "Entry Created",
      size: 140,
      cell: (info) => {
        const date = new Date(info.getValue());
        return date.toLocaleDateString("en-AU", {
          timeZone: "Australia/Sydney",
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
      },
    }),
  ]);

  // Next consumption timeline data for bar chart
  const nextConsumptionData = () => {
    const data = analytics();
    if (!data) return null;

    return {
      labels: data.map((item) => item.name),
      datasets: [
        {
          label: "Days Until Next Allowed",
          data: data.map((item) => item.days_until_next),
          backgroundColor: data.map((item) =>
            item.is_overdue
              ? "rgba(239, 68, 68, 0.8)"
              : "rgba(34, 197, 94, 0.8)",
          ),
          borderColor: data.map((item) =>
            item.is_overdue ? "rgba(239, 68, 68, 1)" : "rgba(34, 197, 94, 1)",
          ),
          borderWidth: 2,
        },
      ],
    };
  };

  // Frequency analysis for doughnut chart
  const frequencyData = () => {
    const data = analytics();
    if (!data) return null;

    return {
      labels: data.map((item) => item.name),
      datasets: [
        {
          data: data.map((item) => item.consumption_frequency || 0),
          backgroundColor: [
            "rgba(251, 191, 36, 0.8)", // Lemons - yellow
            "rgba(239, 68, 68, 0.8)", // Meat - red
            "rgba(168, 85, 247, 0.8)", // Candy - purple
            "rgba(34, 197, 94, 0.8)", // Kale - green
            "rgba(249, 115, 22, 0.8)", // Turmeric - orange
          ],
          borderColor: [
            "rgba(251, 191, 36, 1)",
            "rgba(239, 68, 68, 1)",
            "rgba(168, 85, 247, 1)",
            "rgba(34, 197, 94, 1)",
            "rgba(249, 115, 22, 1)",
          ],
          borderWidth: 2,
        },
      ],
    };
  };

  // Status distribution
  const statusData = () => {
    const summaryData = summary();
    if (!summaryData) return null;

    return {
      labels: ["Available Now", "Still Restricted"],
      datasets: [
        {
          data: [summaryData.on_time_items, summaryData.overdue_items],
          backgroundColor: [
            "rgba(34, 197, 94, 0.8)", // green
            "rgba(239, 68, 68, 0.8)", // red
          ],
          borderColor: ["rgba(34, 197, 94, 1)", "rgba(239, 68, 68, 1)"],
          borderWidth: 2,
        },
      ],
    };
  };

  // Centralized logic for determining if an item is available
  const isItemAvailable = (nextAllowedAt: string): boolean => {
    const nextAllowedDate = new Date(nextAllowedAt);
    const now = new Date();
    return nextAllowedDate <= now;
  };

  const formatNextAllowed = (nextAllowedAt: string) => {
    if (isItemAvailable(nextAllowedAt)) return "Available Now";

    const date = new Date(nextAllowedAt);
    return date.toLocaleDateString("en-AU", {
      timeZone: "Australia/Sydney",
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const getFrequencyText = (frequency: number) => {
    if (frequency === 0) return "Never consumed";
    if (frequency < 1) return `${Math.round(frequency * 4 * 10) / 10}/month`;
    return `${frequency}/month`;
  };

  return (
    <main class="space-y-6">
      <Hero class="inline-block rounded bg-base-200">
        <Hero.Content
          class="text-center"
          title="Consumption Report"
          description="Analytics for your medical dietary restrictions and consumption patterns."
        />
      </Hero>

      <Suspense
        fallback={
          <div class="loading loading-spinner loading-lg mx-auto"></div>
        }
      >
        {/* Summary Statistics */}
        <Show when={summary()}>
          {(summaryData) => <SummaryStatsCard summaryData={summaryData} />}
        </Show>

        {/* Next Consumption Timeline */}
        <Card>
          <Card.Body>
            <Card.Title>Next Allowed Consumption Timeline</Card.Title>
            <Show when={nextConsumptionData()}>
              {(data) => (
                <BarChart
                  data={data()}
                  title="Days Until Next Consumption"
                  className="h-64"
                />
              )}
            </Show>
          </Card.Body>
        </Card>

        {/* Charts Section */}
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <Card.Body>
              <Card.Title>Consumption Status</Card.Title>
              <Show when={statusData()}>
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
              <Card.Title>Monthly Consumption Frequency</Card.Title>
              <Show when={frequencyData()}>
                {(data) => (
                  <DoughnutChart
                    data={data()}
                    title="Times per Month"
                    className="h-64"
                  />
                )}
              </Show>
            </Card.Body>
          </Card>
        </div>

        {/* Detailed Analytics Table */}
        <Card>
          <Card.Body>
            <Card.Title>Detailed Consumption Analytics</Card.Title>
            <div class="overflow-x-auto">
              <Table zebra={true} size="sm">
                <thead>
                  <tr>
                    <th>Consumable</th>
                    <th>Next Allowed</th>
                    <th>Restriction Period</th>
                    <th>Total Consumed</th>
                    <th>Avg Frequency</th>
                    <th>Users</th>
                    <th>Last Consumption</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <Show when={analytics()}>
                    <For each={analytics()}>
                      {(item) => (
                        <tr
                          class={
                            isItemAvailable(item.next_allowed_at) ? "bg-success/5" : "bg-error/10"
                          }
                        >
                          <td>
                            <div class="flex items-center gap-2">
                              <FirstLetterAvatar
                                name={item.name}
                                showIcon={true}
                              />
                              <span class="font-medium">{item.name}</span>
                            </div>
                          </td>
                          <td
                            class={
                              isItemAvailable(item.next_allowed_at)
                                ? "text-success font-semibold"
                                : "text-error"
                            }
                          >
                            {formatNextAllowed(item.next_allowed_at)}
                          </td>
                          <td>
                            {item.interval_days >= 30
                              ? `${Math.floor(item.interval_days / 30)} month${Math.floor(item.interval_days / 30) !== 1 ? "s" : ""}`
                              : item.interval_days >= 7
                                ? `${Math.floor(item.interval_days / 7)} week${Math.floor(item.interval_days / 7) !== 1 ? "s" : ""}`
                                : `${item.interval_days} day${item.interval_days !== 1 ? "s" : ""}`}
                          </td>
                          <td>{item.total_consumptions || 0} times</td>
                          <td>
                            {getFrequencyText(item.consumption_frequency || 0)}
                          </td>
                          <td>
                            <div class="flex flex-wrap gap-1 max-w-32">
                              <For each={item.unique_users || []}>
                                {(username) => {
                                  return (
                                    <div title={username}>
                                      <Show
                                        when={username !== nullUsername}
                                        fallback={<UnknownAvatar />}
                                      >
                                        <UserAvatar
                                          username={username}
                                          size="xs"
                                        />
                                      </Show>
                                    </div>
                                  );
                                }}
                              </For>
                              <Show
                                when={(item.unique_users || []).length === 0}
                              >
                                <span class="text-xs opacity-60">No users</span>
                              </Show>
                            </div>
                          </td>
                          <td>
                            {item.last_consumed_at
                              ? new Date(
                                  item.last_consumed_at,
                                ).toLocaleDateString("en-AU", {
                                  timeZone: "Australia/Sydney",
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })
                              : "Never"}
                          </td>
                          <td>
                            <span
                              class={`badge whitespace-nowrap ${
                                isItemAvailable(item.next_allowed_at)
                                  ? "badge-success"
                                  : "badge-error"
                              }`}
                            >
                              {isItemAvailable(item.next_allowed_at) ? "Available" : "Restricted"}
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

        {/* Individual Food Details */}
        <Show when={analytics()}>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <For each={analytics()}>
              {(item) => (
                <Card>
                  <Card.Body>
                    <div class="flex items-center gap-3 mb-4">
                      <FirstLetterAvatar name={item.name} showIcon={true} />
                      <div>
                        <Card.Title class="text-lg">{item.name}</Card.Title>
                        <span
                          class={`badge ${isItemAvailable(item.next_allowed_at) ? "badge-success" : "badge-error"}`}
                        >
                          {isItemAvailable(item.next_allowed_at) ? "Available" : "Restricted"}
                        </span>
                      </div>
                    </div>

                    <div class="space-y-2 text-sm">
                      <div class="flex justify-between">
                        <span>Next allowed:</span>
                        <strong
                          class={
                            isItemAvailable(item.next_allowed_at) ? "text-success" : "text-error"
                          }
                        >
                          {formatNextAllowed(item.next_allowed_at)}
                        </strong>
                      </div>

                      <div class="flex justify-between">
                        <span>Interval:</span>
                        <span>{item.interval_days} days</span>
                      </div>

                      <div class="flex justify-between">
                        <span>Total consumed:</span>
                        <span>{item.total_consumptions || 0} times</span>
                      </div>

                      <div class="flex justify-between">
                        <span>Avg quantity:</span>
                        <span>
                          {item.avg_quantity
                            ? Math.round(item.avg_quantity * 10) / 10
                            : 0}
                        </span>
                      </div>

                      <Show when={item.avg_days_between}>
                        <div class="flex justify-between">
                          <span>Avg days between:</span>
                          <span>{item.avg_days_between} days</span>
                        </div>
                      </Show>
                    </div>
                  </Card.Body>
                </Card>
              )}
            </For>
          </div>
        </Show>

        {/* Comprehensive Data Review Table */}
        <Card>
          <Card.Body>
            <Card.Title>All Consumption Data</Card.Title>
            <p class="text-sm opacity-70 mb-4">
              Complete record of all consumption entries with filtering,
              sorting, and export capabilities.
            </p>
            <Show when={allEntries()}>
              <VirtualizedDataTable
                data={allEntries() || []}
                columns={columns()}
                enableGlobalFilter={true}
                enableColumnFilters={true}
                enableSorting={true}
                enableDownload={true}
                downloadFilename="consumption-data.csv"
                searchPlaceholder="Search all consumption data..."
                height="500px"
                striped={true}
                darkHeader={true}
                estimateSize={() => 52}
                overscan={10}
              />
            </Show>
          </Card.Body>
        </Card>
      </Suspense>
    </main>
  );
}

const UnknownAvatar = () => (
  <div class="avatar placeholder">
    <div class="bg-neutral text-neutral-content rounded-full w-6 h-6 flex items-center justify-center text-xs">
      U
    </div>
  </div>
);
