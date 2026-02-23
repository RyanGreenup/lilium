import { A, RouteDefinition, createAsync } from "@solidjs/router";
import CalendarDays from "lucide-solid/icons/calendar-days";
import Clock from "lucide-solid/icons/clock";
import FileText from "lucide-solid/icons/file-text";
import Folder from "lucide-solid/icons/folder";

import { createSignal, For, Suspense, Show } from "solid-js";
import { NoteBreadcrumbsById } from "~/components/NoteBreadcrumbs";
import { AreaChart } from "~/components/Echarts";
import { DonutChart } from "~/components/Echarts";
import { BarList } from "~/components/Echarts";
import { Tracker } from "~/components/Echarts";
import type { TrackerDataPoint } from "~/components/Echarts";
import { createProtectedRoute, getUser } from "~/lib/auth";
import { getDashboardStatsQuery } from "~/lib/db/noteStats";
import { getLatestJournalPageQuery } from "~/lib/db/notes/journal";
import { getRecentNotesQuery } from "~/lib/db/notes/search";

import { Badge } from "~/solid-daisy-components/components/Badge";
import { Card } from "~/solid-daisy-components/components/Card";
import {
  Stat,
  StatDesc,
  StatFigure,
  StatValue,
  Stats,
} from "~/solid-daisy-components/components/Stat";

export const route = {
  preload() {
    getUser();
    getDashboardStatsQuery();
    getRecentNotesQuery(4);
    getLatestJournalPageQuery();
  },
} satisfies RouteDefinition;

export default function Home() {
  createProtectedRoute();
  const stats = createAsync(() => getDashboardStatsQuery());
  const recentNotes = createAsync(() => getRecentNotesQuery(4));
  const latestJournal = createAsync(() => getLatestJournalPageQuery());

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString();
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const areaChartData = () => {
    const s = stats();
    if (!s) return [];
    return s.notes_created_by_month.map((m) => ({
      month: m.month,
      Notes: m.count,
    }));
  };

  const donutData = () => {
    const s = stats();
    if (!s) return [];
    return s.syntax_breakdown.map((sb) => ({
      syntax: sb.syntax || "unknown",
      count: sb.count,
    }));
  };

  const trackerData = (): TrackerDataPoint[] => {
    const s = stats();
    if (!s) return [];

    const dayMap = new Map<string, number>();
    for (const d of s.notes_updated_by_day) {
      dayMap.set(d.day, d.count);
    }

    const result: TrackerDataPoint[] = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const key = date.toISOString().slice(0, 10);
      const count = dayMap.get(key) ?? 0;
      const color =
        count === 0
          ? "bg-base-300"
          : count <= 2
            ? "bg-success/40"
            : count <= 5
              ? "bg-success/70"
              : "bg-success";
      result.push({ color, tooltip: `${key}: ${count} notes` });
    }
    return result;
  };

  return (
    <div class="flex h-full min-h-0 flex-col gap-4 overflow-hidden p-6">
      {/* Stats Row */}
      <Suspense
        fallback={<div class="loading loading-spinner loading-lg"></div>}
      >
        <Show when={stats()}>
          {(statsData) => (
            <div class="shrink-0 flex flex-wrap gap-4">
              <Stats class="shadow flex-1 min-w-0">
                <Stat place="center">
                  <StatFigure class="text-primary">
                    <FileText class="w-8 h-8" />
                  </StatFigure>
                  <StatValue>{statsData().total_notes}</StatValue>
                  <StatDesc>Total Notes</StatDesc>
                </Stat>
                <Stat place="center">
                  <StatFigure class="text-accent">
                    <Folder class="w-8 h-8" />
                  </StatFigure>
                  <StatValue>{statsData().total_folders}</StatValue>
                  <StatDesc>Folders</StatDesc>
                </Stat>
                <Stat place="center">
                  <StatFigure class="text-secondary">
                    <Clock class="w-8 h-8" />
                  </StatFigure>
                  <StatValue>{statsData().recent_notes}</StatValue>
                  <StatDesc>Recent (7d)</StatDesc>
                </Stat>
                <Show when={latestJournal()}>
                  {(journal) => (
                    <Stat place="center">
                      <StatFigure class="text-info">
                        <CalendarDays class="w-8 h-8" />
                      </StatFigure>
                      <StatValue class="text-base">
                        <A href={`/note/${journal().id}`} class="link">
                          {journal().title}
                        </A>
                      </StatValue>
                      <StatDesc>Latest Journal</StatDesc>
                    </Stat>
                  )}
                </Show>
              </Stats>
            </div>
          )}
        </Show>
      </Suspense>

      {/* Scrollable chart grid */}
      <div class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
        <Suspense>
          <Show when={stats()}>
            {(statsData) => (
              <div class="grid grid-cols-1 gap-4 xl:grid-cols-3">
                {/* Area Chart - Notes Over Time */}
                <section class="card border border-base-300 bg-base-100 shadow-sm xl:col-span-2">
                  <div class="card-body">
                    <div class="flex items-center justify-between gap-2">
                      <h2 class="card-title text-base">Notes Over Time</h2>
                      <span class="badge badge-outline text-xs">Area</span>
                    </div>
                    <AreaChart
                      data={areaChartData()}
                      index="month"
                      categories={["Notes"]}
                      showLegend={false}
                      showYAxis={true}
                      allowDecimals={false}
                      style={{ height: "200px" }}
                    />
                  </div>
                </section>

                {/* Donut Chart - Syntax Breakdown */}
                <section class="card border border-base-300 bg-base-100 shadow-sm">
                  <div class="card-body">
                    <div class="flex items-center justify-between gap-2">
                      <h2 class="card-title text-base">Syntax Breakdown</h2>
                      <span class="badge badge-outline text-xs">Donut</span>
                    </div>
                    <DonutChart
                      data={donutData()}
                      category="syntax"
                      value="count"
                      showLabel={true}
                      style={{ height: "200px" }}
                    />
                  </div>
                </section>

                {/* Bar List - Top Folders */}
                <section class="card border border-base-300 bg-base-100 shadow-sm">
                  <div class="card-body">
                    <div class="flex items-center justify-between gap-2">
                      <h2 class="card-title text-base">Top Folders</h2>
                      <span class="badge badge-outline text-xs">Bar</span>
                    </div>
                    <BarList data={statsData().top_folders} />
                  </div>
                </section>

                {/* Tracker - Recent Activity */}
                <section class="card border border-base-300 bg-base-100 shadow-sm xl:col-span-2">
                  <div class="card-body">
                    <div class="flex items-center justify-between gap-2">
                      <h2 class="card-title text-base">
                        Activity (Last 14 Days)
                      </h2>
                      <span class="badge badge-outline text-xs">Tracker</span>
                    </div>
                    <Tracker data={trackerData()} hoverEffect={true} />
                  </div>
                </section>
              </div>
            )}
          </Show>
        </Suspense>

        {/* Recent Notes */}
        <Suspense>
          <Show when={recentNotes()}>
            {(notes) => (
              <div>
                <h2 class="text-lg font-bold mb-3 flex items-center gap-2">
                  <Clock class="w-5 h-5" />
                  Recent Notes
                </h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <For each={notes()}>
                    {(note) => (
                      <Card class="hover:shadow-lg transition-shadow shadow-sm">
                        <Card.Body>
                          <div class="flex justify-between items-start mb-2">
                            <div class="flex items-center gap-2">
                              <FileText class="w-4 h-4 text-base-content/60" />
                              <h3 class="card-title text-sm">{note.title}</h3>
                            </div>
                            <Badge variant="outline" size="sm">
                              {note.syntax}
                            </Badge>
                          </div>
                          <Show when={note.abstract}>
                            <p class="text-base-content/70 text-sm line-clamp-2 mb-3">
                              {note.abstract}
                            </p>
                          </Show>
                          <div class="flex justify-between items-center text-xs text-base-content/60 gap-4">
                            <div class="flex-1 min-w-0">
                              <NoteBreadcrumbsById
                                noteId={createSignal(note.id)[0]}
                              />
                            </div>
                            <div class="text-right">
                              <div>{formatDate(note.updated_at)}</div>
                              <div>{formatTime(note.updated_at)}</div>
                            </div>
                          </div>
                          <Card.Actions class="justify-end mt-3">
                            <A
                              class="btn btn-primary btn-sm"
                              href={`/note/${note.id}`}
                            >
                              Open
                            </A>
                          </Card.Actions>
                        </Card.Body>
                      </Card>
                    )}
                  </For>
                </div>
              </div>
            )}
          </Show>
        </Suspense>
      </div>
    </div>
  );
}
