"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRight, Search } from "lucide-react";
import { TagBadge, tagColorClass } from "@/components/tag-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { scoreTone, stageLabels, type TopicStanding } from "@/lib/knowledge";
import { topicLevelLabels, type TopicLevel } from "@/lib/schemas/topic";
import { cn } from "@/lib/utils";

export type LibraryTopic = TopicStanding & {
  next: "Lesson" | "Brain dump" | null;
  id: string;
  title: string;
  level: TopicLevel | null;
  createdAt: string;
  stage: string | null;
  tags: string[];
  summary: string | null;
};

const statusFilters = [
  { value: "all", label: "All" },
  { value: "learning", label: "In progress" },
  { value: "learned", label: "Learned" },
] as const;

const sorts = [
  { value: "recent", label: "Newest" },
  { value: "weakest", label: "Weakest first" },
  { value: "review", label: "Next review" },
] as const;

type StatusFilter = (typeof statusFilters)[number]["value"];
type Sort = (typeof sorts)[number]["value"];

const pillClass = (on: boolean) =>
  cn(
    "rounded-full px-3 py-1 text-sm font-medium transition-colors",
    on ? "bg-highlight text-highlight-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
  );

const dueTime = (t: LibraryTopic) => (t.nextDueAt ? Date.parse(t.nextDueAt) : Infinity);

// Unscored topics go last when sorting by score or review date.
const compare = {
  recent: (a: LibraryTopic, b: LibraryTopic) => b.createdAt.localeCompare(a.createdAt),
  weakest: (a: LibraryTopic, b: LibraryTopic) => (a.score ?? 6) - (b.score ?? 6) || b.dueNow - a.dueNow,
  review: (a: LibraryTopic, b: LibraryTopic) => dueTime(a) - dueTime(b),
};

export function LibraryList({ topics }: { topics: LibraryTopic[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [tag, setTag] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>("recent");

  // Tags by how many topics use them.
  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of topics) for (const name of t.tags) counts.set(name, (counts.get(name) ?? 0) + 1);
    return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([name]) => name);
  }, [topics]);

  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const shown = topics
    .filter((t) => status === "all" || (status === "learned") === t.learned)
    .filter((t) => !tag || t.tags.includes(tag))
    .filter((t) => {
      const text = [t.title, t.summary ?? "", ...t.tags].join(" ").toLowerCase();
      return words.every((w) => text.includes(w));
    })
    .sort(compare[sort]);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search titles, summaries and tags"
          aria-label="Search your topics"
          className="h-10 bg-card pl-9 md:text-base"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1" role="group" aria-label="Show">
          {statusFilters.map((f) => (
            <button
              key={f.value}
              type="button"
              aria-pressed={status === f.value}
              onClick={() => setStatus(f.value)}
              className={pillClass(status === f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          Sort
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="h-8 rounded-lg border bg-card px-2 text-sm text-foreground"
          >
            {sorts.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by tag">
          {tags.map((name) => (
            <button
              key={name}
              type="button"
              aria-pressed={tag === name}
              onClick={() => setTag(tag === name ? null : name)}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
                tag === name
                  ? "border-primary bg-primary text-primary-foreground"
                  : cn("border-transparent hover:border-current/30", tagColorClass(name)),
              )}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      <p className="text-sm text-muted-foreground" aria-live="polite">
        {shown.length === topics.length
          ? `${topics.length} ${topics.length === 1 ? "topic" : "topics"}`
          : `${shown.length} of ${topics.length} topics`}
      </p>

      <ul className="flex flex-col gap-2">
        {shown.map((t) => (
          <li key={t.id}>
            <Link href={`/topics/${t.id}`} className="group block">
              <Card size="sm" className="transition-shadow group-hover:shadow-md group-hover:ring-primary/30">
                <CardContent className="flex items-start gap-3">
                  <span
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-xl text-base font-semibold",
                      tagColorClass(t.tags[0] ?? t.title),
                    )}
                    aria-hidden
                  >
                    {t.title.trim().charAt(0).toUpperCase()}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-medium">{t.title}</div>
                      {t.score !== null && (
                        <span
                          className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums", scoreTone(t.score))}
                          title="Average of your latest answer to each question"
                        >
                          {t.score.toFixed(1)} / 5
                        </span>
                      )}
                    </div>
                    {t.summary && <p className="line-clamp-2 text-sm text-muted-foreground">{t.summary}</p>}
                    <p className="text-sm">{statusLine(t)}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {t.learned && t.stage && stageLabels[t.stage] && (
                        <Badge className="bg-success-soft text-success-foreground">{stageLabels[t.stage]}</Badge>
                      )}
                      {!t.learned && <Badge className="bg-info-soft text-info-foreground">In progress</Badge>}
                      {t.level && <Badge variant="secondary">{topicLevelLabels[t.level]}</Badge>}
                      {t.tags.slice(0, 3).map((name) => (
                        <TagBadge key={name} name={name} />
                      ))}
                      {t.tags.length > 3 && (
                        <span className="text-xs text-muted-foreground">+{t.tags.length - 3}</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="size-5 shrink-0 self-center text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </CardContent>
              </Card>
            </Link>
          </li>
        ))}
      </ul>

      {shown.length === 0 && (
        <p className="py-6 text-center text-muted-foreground">
          {topics.length === 0 ? "No topics yet. Start one with New topic." : "No topics match."}
        </p>
      )}
    </div>
  );
}

// "Can answer 9 of 14 · next review tomorrow"
function statusLine(t: LibraryTopic): string {
  if (!t.learned) return `Next: ${t.next ?? "Lesson"}`;
  if (t.questions === 0) return "Learned";
  const parts = [
    t.answered > 0 ? `Can answer ${t.canAnswer} of ${t.questions}` : `${t.questions} questions, not answered yet`,
    t.dueNow > 0 ? `${t.dueNow} due now` : t.nextReview ? `next review ${t.nextReview}` : null,
  ];
  return parts.filter(Boolean).join(" · ");
}
