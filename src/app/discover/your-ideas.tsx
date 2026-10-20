"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Loader2, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { learnIdeaHref } from "@/lib/ideas";
import type { SavedQuestion } from "@/lib/saved-questions";
import { MAX_SAVED_QUESTION_CHARS } from "@/lib/schemas";
import { cn } from "@/lib/utils";

export type Idea = Pick<SavedQuestion, "id" | "text" | "area" | "title" | "source">;

// Type an idea or question; it's saved and labelled with an area and a short
// title. A label that isn't one of the favourite areas can be added as one.
export function AddIdea({
  areas,
  onAdded,
  onAddArea,
}: {
  areas: string[];
  onAdded: (idea: Idea) => void;
  onAddArea: (area: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<Idea | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/saved-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: draft }),
      });
      const body = (await response.json().catch(() => null)) as
        | { id?: string; area?: string | null; title?: string | null; error?: string }
        | null;
      if (!response.ok || !body?.id) throw new Error(body?.error ?? "Something went wrong. Try again.");
      const idea = { id: body.id, text: draft.trim(), area: body.area ?? null, title: body.title ?? null, source: null };
      onAdded(idea);
      setAdded(idea);
      setDraft("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
    } finally {
      setPending(false);
    }
  }

  const newArea = added?.area && !areas.some((a) => a.toLowerCase() === added.area!.toLowerCase()) ? added.area : null;

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <label htmlFor="idea" className="text-sm font-medium">
        Add an idea
      </label>
      <div className="flex gap-2">
        <Input
          id="idea"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setError(null);
          }}
          placeholder="A question or something to learn, e.g. How do vector databases work?"
          maxLength={MAX_SAVED_QUESTION_CHARS}
          className="h-10 bg-card md:text-base"
        />
        <Button type="submit" disabled={pending || !draft.trim()} className="h-10">
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          {pending ? "Sorting…" : "Add"}
        </Button>
      </div>
      {error && (
        <p className="text-sm text-coral-foreground" role="alert">
          {error}
        </p>
      )}
      {added && !error && (
        <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
          {added.area ? (
            <>
              Saved under <Badge variant="secondary">{added.area}</Badge>
              {newArea && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onAddArea(newArea);
                    setAdded({ ...added });
                  }}
                >
                  <Plus className="size-3.5" /> Add {newArea} to your areas
                </Button>
              )}
            </>
          ) : (
            "Saved. It couldn't be labelled this time, so it's under Other."
          )}
        </p>
      )}
    </form>
  );
}

export function IdeaCard({ idea, onRemove }: { idea: Idea; onRemove: (id: string) => void }) {
  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <p className="font-semibold text-heading">{idea.title ?? idea.text}</p>
            {idea.title && <p className="text-sm text-muted-foreground">{idea.text}</p>}
          </div>
          <button
            type="button"
            onClick={() => onRemove(idea.id)}
            aria-label="Remove this idea"
            className="shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm text-muted-foreground">
            {idea.source ? `From ${idea.source.title}` : "Your idea"}
          </span>
          <Link href={learnIdeaHref(idea)} className={cn(buttonVariants({ size: "sm" }), "h-8 px-3")}>
            Learn this <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

/** Ideas grouped by their area label, in the order of the favourite areas; unlabelled last. */
export function groupByArea(ideas: Idea[], areas: string[]): [string, Idea[]][] {
  const groups = new Map<string, Idea[]>();
  for (const idea of ideas) {
    const key = idea.area ?? "Other";
    groups.set(key, [...(groups.get(key) ?? []), idea]);
  }
  const rank = (name: string) => {
    const i = areas.findIndex((a) => a.toLowerCase() === name.toLowerCase());
    return name === "Other" ? Infinity : i === -1 ? areas.length : i;
  };
  return [...groups].sort((a, b) => rank(a[0]) - rank(b[0]) || a[0].localeCompare(b[0]));
}
