import { A, RouteDefinition } from "@solidjs/router";
import { Clock, FileText, Folder, Plus, Search } from "lucide-solid";
import { For, createSignal } from "solid-js";
import { getUser } from "~/lib/auth";
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
  },
} satisfies RouteDefinition;

interface Note {
  id: string;
  title: string;
  abstract: string;
  lastModified: string;
  path: string;
  syntax: string;
}

interface Stats {
  totalNotes: number;
  recentlyModified: number;
  folders: number;
  searchQueries: number;
}

export default function Home() {
  const [stats] = createSignal<Stats>({
    totalNotes: 247,
    recentlyModified: 12,
    folders: 15,
    searchQueries: 34,
  });

  const [recentNotes] = createSignal<Note[]>([
    {
      id: "1",
      title: "Machine Learning Pipeline Design",
      abstract:
        "Comprehensive guide to building robust machine learning pipelines including data preprocessing, feature engineering, and model deployment strategies.",
      lastModified: "2024-01-15T14:30:00Z",
      path: "/notes/computer-science/ai/ml-pipeline.md",
      syntax: "markdown",
    },
    {
      id: "2",
      title: "Statistical Hypothesis Testing",
      abstract:
        "Methods for testing statistical hypotheses including t-tests, ANOVA, and non-parametric tests. Covers p-values and effect sizes.",
      lastModified: "2024-01-14T09:15:00Z",
      path: "/notes/mathematics/statistics/hypothesis-testing.md",
      syntax: "markdown",
    },
    {
      id: "3",
      title: "Python Data Analysis Tools",
      abstract:
        "Pandas, NumPy, and Matplotlib for data manipulation and visualization. Includes best practices for exploratory data analysis.",
      lastModified: "2024-01-13T16:45:00Z",
      path: "/notes/programming/python/data-analysis.md",
      syntax: "markdown",
    },
    {
      id: "4",
      title: "Quantum Computing Basics",
      abstract:
        "Introduction to quantum computing principles including qubits, superposition, entanglement, and quantum gates.",
      lastModified: "2024-01-12T11:20:00Z",
      path: "/notes/physics/quantum/basics.org",
      syntax: "org",
    },
  ]);

  const quickActions = [
    {
      title: "New Note",
      description: "Create a new note",
      icon: <Plus class="w-5 h-5" />,
      href: "/note/new",
      color: "btn-primary",
    },
    {
      title: "Search Notes",
      description: "Find existing notes",
      icon: <Search class="w-5 h-5" />,
      href: "/?sidebar=search",
      color: "btn-secondary",
    },
    {
      title: "Browse Folders",
      description: "Explore note structure",
      icon: <Folder class="w-5 h-5" />,
      href: "/?sidebar=notes",
      color: "btn-accent",
    },
  ];

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString();
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div class="space-y-8 overflow-x-auto">
      {/* Statistics Cards */}
      <Stats class="shadow">
        <Stat place="center">
          <StatFigure class="text-primary">
            <FileText class="w-8 h-8" />
          </StatFigure>
          <StatValue>{stats().totalNotes}</StatValue>
          <StatDesc>Total Notes</StatDesc>
        </Stat>

        <Stat place="center">
          <StatFigure class="text-secondary">
            <Clock class="w-8 h-8" />
          </StatFigure>
          <StatValue>{stats().recentlyModified}</StatValue>
          <StatDesc>Recently Modified</StatDesc>
        </Stat>

        <Stat place="center">
          <StatFigure class="text-accent">
            <Folder class="w-8 h-8" />
          </StatFigure>
          <StatValue>{stats().folders}</StatValue>
          <StatDesc>Folders</StatDesc>
        </Stat>
      </Stats>

      {/* Recent Notes */}
      <div>
        <h2 class="text-2xl font-bold mb-6 flex items-center">
          <Clock class="w-6 h-6 mr-3" />
          Recent Notes
        </h2>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <For each={recentNotes()}>
            {(note) => (
              <Card class="hover:shadow-lg transition-shadow cursor-pointer shadow-lg">
                <Card.Body>
                  <div class="flex justify-between items-start mb-2">
                    <h3 class="card-title text-lg ">{note.title}</h3>
                    <Badge variant="outline" size="sm">
                      {note.syntax}
                    </Badge>
                  </div>
                  <p class="text-base-content/70 text-sm line-clamp-3 mb-4">
                    {note.abstract}
                  </p>
                  <div class="flex justify-between items-center text-xs text-base-content/60 gap-8">
                    <span class="font-mono">{note.path}</span>
                    <div class="text-right">
                      <div>{formatDate(note.lastModified)}</div>
                      <div>{formatTime(note.lastModified)}</div>
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
      </div>
    </div>
  );
}
