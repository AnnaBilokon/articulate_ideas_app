"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowRight, Loader2, Plus, RefreshCw, Sparkles, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  MAX_AREA_CHARS,
  normalizeTag,
  suggestionKindLabels,
  topicLevelLabels,
  type TopicSuggestion,
} from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { saveFavoriteAreas } from "./actions";

const kindClass: Record<TopicSuggestion["kind"], string> = {
  next_step: "bg-info-soft text-info-foreground",
  fill_gap: "bg-sunflower-soft text-sunflower-foreground",
  new_corner: "bg-tag-2 text-tag-2-foreground",
};

// Opens the New topic form filled in with the suggestion.
function newTopicHref(suggestion: TopicSuggestion, area: string): string {
  const params = new URLSearchParams({ title: suggestion.title, level: suggestion.level });
  const tag = normalizeTag(area);
  if (tag) params.set("tags", tag);
  for (const q of suggestion.starter_questions) params.append("q", q);
  return `/topics/new?${params}`;
}

export function DiscoverView({ areas: initialAreas, initialArea }: { areas: string[]; initialArea: string | null }) {
  const [areas, setAreas] = useState(initialAreas);
  const [draft, setDraft] = useState("");
  const [areaError, setAreaError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  const [selected, setSelected] = useState<string | null>(initialArea);
  // Ideas per area, kept while the page is open so switching back is free.
  const [ideas, setIdeas] = useState<Record<string, TopicSuggestion[]>>({});
  const [loadingArea, setLoadingArea] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const save = (next: string[]) =>
    startSaving(async () => {
      const result = await saveFavoriteAreas(next);
      if ("error" in result) setAreaError(result.error);
      else {
        setAreas(result.areas);
        setAreaError(null);
      }
    });

  const addArea = (event: React.FormEvent) => {
    event.preventDefault();
    const name = draft.trim();
    if (!name) return;
    if (areas.some((a) => a.toLowerCase() === name.toLowerCase())) {
      setAreaError(`"${name}" is already in your list.`);
      return;
    }
    setDraft("");
    save([...areas, name]);
  };

  const removeArea = (area: string) => {
    if (selected === area) setSelected(null);
    save(areas.filter((a) => a !== area));
  };

  async function suggest(area: string, more = false) {
    setSelected(area);
    setError(null);
    setLoadingArea(area);
    try {
      const shown = more ? (ideas[area] ?? []) : [];
      const response = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ area, exclude: shown.map((s) => s.title) }),
      });
      const body = (await response.json().catch(() => null)) as
        | { suggestions?: TopicSuggestion[]; error?: string }
        | null;
      if (!response.ok || !body?.suggestions) throw new Error(body?.error ?? "Something went wrong. Try again.");
      setIdeas((prev) => ({ ...prev, [area]: [...shown, ...body.suggestions!] }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
    } finally {
      setLoadingArea(null);
    }
  }

  const pick = (area: string) => {
    if (ideas[area]) setSelected(area);
    else void suggest(area);
  };

  // Arriving from Today with an area: suggest right away, once.
  const started = useRef(false);
  useEffect(() => {
    if (started.current || !initialArea) return;
    started.current = true;
    void suggest(initialArea);
    // Runs once for the area in the link.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shown = selected ? ideas[selected] : undefined;
  const loading = loadingArea !== null && loadingArea === selected;

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight text-heading">Your favourite areas</h2>
        {areas.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {areas.map((area) => (
              <li
                key={area}
                className={cn(
                  "flex items-center rounded-full text-sm font-medium transition-colors",
                  selected === area
                    ? "bg-highlight text-highlight-foreground"
                    : "bg-muted text-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <button
                  type="button"
                  onClick={() => pick(area)}
                  aria-pressed={selected === area}
                  className="rounded-l-full py-1.5 pr-1 pl-3.5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {area}
                </button>
                <button
                  type="button"
                  onClick={() => removeArea(area)}
                  disabled={saving}
                  aria-label={`Remove ${area}`}
                  className="rounded-r-full py-1.5 pr-2.5 pl-1 opacity-60 outline-none hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">
            None yet. Add the areas you love, like Psychology, Economics or Biology.
          </p>
        )}
        <form onSubmit={addArea} className="flex gap-2 sm:max-w-md">
          <Input
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setAreaError(null);
            }}
            placeholder="Add an area, e.g. Psychology"
            maxLength={MAX_AREA_CHARS}
            aria-label="New favourite area"
            className="h-9 bg-background"
          />
          <Button type="submit" variant="secondary" disabled={saving || !draft.trim()} className="h-9">
            <Plus className="size-4" />
            Add
          </Button>
        </form>
        {areaError && (
          <p className="text-sm text-coral-foreground" role="alert">
            {areaError}
          </p>
        )}
      </section>

      {selected && (
        <section className="flex flex-col gap-3" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold tracking-tight text-heading">Ideas in {selected}</h2>
            {shown && shown.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => suggest(selected, true)} disabled={loading}>
                <RefreshCw className="size-3.5" />
                More ideas
              </Button>
            )}
          </div>

          {shown?.map((s) => (
            <Card key={s.title} size="sm">
              <CardContent className="flex flex-col gap-3">
                <div className="flex flex-wrap gap-1.5">
                  <Badge className={kindClass[s.kind]}>{suggestionKindLabels[s.kind]}</Badge>
                  <Badge variant="secondary">{topicLevelLabels[s.level]}</Badge>
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className="text-base font-semibold text-heading">{s.title}</h3>
                  <p className="text-muted-foreground">{s.why}</p>
                </div>
                {s.builds_on.length > 0 && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">Builds on </span>
                    {s.builds_on.map((t, i) => (
                      <span key={t.id}>
                        {i > 0 && ", "}
                        <Link href={`/topics/${t.id}`} className="font-medium underline-offset-4 hover:underline">
                          {t.title}
                        </Link>
                      </span>
                    ))}
                  </p>
                )}
                <ul className="flex list-disc flex-col gap-0.5 pl-5 text-sm">
                  {s.starter_questions.map((q) => (
                    <li key={q}>{q}</li>
                  ))}
                </ul>
                <Link href={newTopicHref(s, selected)} className={cn(buttonVariants(), "w-fit")}>
                  Start this topic <ArrowRight className="size-4" />
                </Link>
              </CardContent>
            </Card>
          ))}

          {loading && (
            <p className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Looking at what you&apos;ve learned…
            </p>
          )}
          {error && (
            <p className="text-sm text-coral-foreground" role="alert">
              {error}
            </p>
          )}
          {!loading && !shown && (
            <Button onClick={() => suggest(selected)} className="w-fit">
              <Sparkles className="size-4" />
              {error ? "Try again" : "Suggest topics"}
            </Button>
          )}
        </section>
      )}
    </div>
  );
}
