import { A, RouteDefinition, createAsync, query } from "@solidjs/router";
import Clock from "lucide-solid/icons/clock";

import FileText from "lucide-solid/icons/file-text";
import Folder from "lucide-solid/icons/folder";

import { For, Suspense, Show } from "solid-js";
import { getUser } from "~/lib/auth";
import { getNoteChildCountsQuery } from "~/lib/db/notes/read";
import { getNotesStatsQuery } from "~/lib/db/noteStats";

const getRecentNotesData = async () => {
  "use server";
  const { getRecentNotes } = await import("~/lib/db");
  return await getRecentNotes(4);
};

import { Badge } from "~/solid-daisy-components/components/Badge";
import { Card } from "~/solid-daisy-components/components/Card";
import {
  Stat,
  StatDesc,
  StatFigure,
  StatValue,
  Stats,
} from "~/solid-daisy-components/components/Stat";

const getRecentNotesQuery = query(getRecentNotesData, "recent-notes");

export const route = {
  preload() {
    getUser();
    getNotesStatsQuery();
    getRecentNotesQuery();
    getNoteChildCountsQuery();
  },
} satisfies RouteDefinition;


export default function Home() {
  const stats = createAsync(() => getNotesStatsQuery());
  const recentNotes = createAsync(() => getRecentNotesQuery());
  const childCounts = createAsync(() => getNoteChildCountsQuery());

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString();
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isFolder = (noteId: string) => {
    const counts = childCounts();
    if (!counts) return false;
    const noteCount = counts.find(c => c.id === noteId);
    return noteCount ? noteCount.child_count > 0 : false;
  };

  return (
    <div class="space-y-8 overflow-x-auto">
      {/* Statistics Cards */}
      <div class="flex justify-center">
        <Suspense fallback={<div class="loading loading-spinner loading-lg"></div>}>
          <Show when={stats()}>
            {(statsData) => (
              <Stats class="shadow">
                <Stat place="center">
                  <StatFigure class="text-primary">
                    <FileText class="w-8 h-8" />
                  </StatFigure>
                  <StatValue>{statsData().total_notes}</StatValue>
                  <StatDesc>Total Notes</StatDesc>
                </Stat>

                <Stat place="center">
                  <StatFigure class="text-secondary">
                    <Clock class="w-8 h-8" />
                  </StatFigure>
                  <StatValue>{statsData().recent_notes}</StatValue>
                  <StatDesc>Recently Modified</StatDesc>
                </Stat>

                <Stat place="center">
                  <StatFigure class="text-accent">
                    <Folder class="w-8 h-8" />
                  </StatFigure>
                  <StatValue>{statsData().folders}</StatValue>
                  <StatDesc>Folders</StatDesc>
                </Stat>
              </Stats>
            )}
          </Show>
        </Suspense>
      </div>

      {/* Recent Notes */}
      <div>
        <h2 class="text-2xl font-bold mb-6 flex items-center">
          <Clock class="w-6 h-6 mr-3" />
          Recent Notes
        </h2>
        <Suspense fallback={<div class="loading loading-spinner loading-lg"></div>}>
          <Show when={recentNotes()}>
            {(notes) => (
              <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <For each={notes()}>
                  {(note) => (
                    <Card class="hover:shadow-lg transition-shadow cursor-pointer shadow-lg">
                      <Card.Body>
                        <div class="flex justify-between items-start mb-2">
                          <div class="flex items-center gap-2">
                            <Show when={isFolder(note.id)} fallback={<FileText class="w-4 h-4 text-base-content/60" />}>
                              <Folder class="w-4 h-4 text-base-content/60" />
                            </Show>
                            <h3 class="card-title text-lg">{note.title}</h3>
                          </div>
                          <Badge variant="outline" size="sm">
                            {note.syntax}
                          </Badge>
                        </div>
                        <Show when={note.abstract}>
                          <p class="text-base-content/70 text-sm line-clamp-3 mb-4">
                            {note.abstract}
                          </p>
                        </Show>
                        <div class="flex justify-between items-center text-xs text-base-content/60 gap-8">
                          <span class="font-mono text-xs truncate">/notes/{note.id}</span>
                          <div class="text-right">
                            <div>{formatDate(note.updated_at)}</div>
                            <div>{formatTime(note.updated_at)}</div>
                          </div>
                        </div>
                        <Card.Actions class="justify-end mt-4">
                          <A class="btn btn-primary btn-sm" href={`/note/${note.id}`}>
                            Open
                          </A>
                        </Card.Actions>
                      </Card.Body>
                    </Card>
                  )}
                </For>
              </div>
            )}
          </Show>
        </Suspense>
      </div>
    </div>
  );
}
