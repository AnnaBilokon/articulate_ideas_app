"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, BookmarkPlus, Check, ChevronRight, Loader2, RefreshCw, Repeat, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MAX_AREA_CHARS, SURPRISE_AREA, type FactQuestion, type QuickFact } from "@/lib/schemas";
import { cn } from "@/lib/utils";

// A minute of learning: pick a topic, then a question, and read a short
// answer. Every fact read goes into the Library; one can join the reviews.

async function post<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const data = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!response.ok || !data) throw new Error(data?.error ?? "Something went wrong. Try again.");
  return data;
}

export function QuickFacts({ areas }: { areas: string[] }) {
  const [area, setArea] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [questions, setQuestions] = useState<FactQuestion[]>([]);
  // Every question shown for this topic, so "More questions" brings new ones.
  const [shown, setShown] = useState<string[]>([]);
  const [read, setRead] = useState<Set<string>>(new Set());
  const [fact, setFact] = useState<QuickFact | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ideaSaved, setIdeaSaved] = useState<Set<string>>(new Set());

  async function run(key: string, task: () => Promise<void>) {
    setBusy(key);
    setError(null);
    try {
      await task();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
    } finally {
      setBusy(null);
    }
  }

  const loadQuestions = (topic: string, more = false) =>
    run(more ? "more" : `area:${topic}`, async () => {
      const already = more ? shown : [];
      const { questions: next } = await post<{ questions: FactQuestion[] }>("/api/facts/questions", { area: topic, shown: already.slice(-40) });
      setArea(topic);
      setFact(null);
      setQuestions(next);
      setShown([...already, ...next.map((q) => q.question)]);
      if (!more) setRead(new Set());
    });

  const open = (q: FactQuestion) =>
    run(`q:${q.question}`, async () => {
      const { fact: next } = await post<{ fact: QuickFact }>("/api/facts", q);
      setFact(next);
      setRead(new Set(read).add(q.question));
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

  const addToReviews = (f: QuickFact) =>
    run("review", async () => {
      const { fact: next } = await post<{ fact: QuickFact }>(`/api/facts/${f.id}/review`);
      setFact(next);
    });

  const saveIdea = (f: QuickFact) =>
    run("idea", async () => {
      await post("/api/saved-questions", { text: f.question });
      setIdeaSaved(new Set(ideaSaved).add(f.id));
    });

  const errorLine = error && (
    <p className="text-sm text-coral-foreground" role="alert">
      {error}
    </p>
  );

  // 1. Pick a topic
  if (!area) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => loadQuestions(SURPRISE_AREA)} disabled={busy !== null} className="rounded-full">
            {busy === `area:${SURPRISE_AREA}` ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {SURPRISE_AREA}
          </Button>
          {areas.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => loadQuestions(a)}
              disabled={busy !== null}
              className="flex items-center gap-1.5 rounded-full bg-muted px-3.5 py-1.5 text-sm font-medium transition-colors hover:bg-highlight hover:text-highlight-foreground disabled:opacity-60"
            >
              {busy === `area:${a}` && <Loader2 className="size-3.5 animate-spin" />}
              {a}
            </button>
          ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (typed.trim()) loadQuestions(typed.trim());
          }}
        >
          <Input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            maxLength={MAX_AREA_CHARS}
            placeholder="Or any topic: bees, the Vikings, sleep…"
            aria-label="A topic"
            className="h-9 bg-background"
          />
          <Button type="submit" variant="secondary" className="h-9" disabled={!typed.trim() || busy !== null}>
            {busy === `area:${typed.trim()}` && <Loader2 className="size-4 animate-spin" />} Go
          </Button>
        </form>
        {areas.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Your favourite areas show here as one-tap topics.{" "}
            <Link href="/discover" className="font-medium text-foreground underline-offset-4 hover:underline">
              Add them in Discover
            </Link>
            .
          </p>
        )}
        {errorLine}
      </div>
    );
  }

  // 3. The fact
  if (fact) {
    return (
      <div className="flex flex-col gap-4">
        <Card className="gap-0 py-0">
          <CardContent className="flex flex-col gap-4 border-l-4 border-primary p-5 sm:p-7">
            <Badge variant="secondary" className="w-fit">
              {fact.area}
            </Badge>
            <h2 className="text-xl leading-snug font-semibold text-balance text-heading">{fact.question}</h2>
            <p className="text-base leading-7">{fact.fact}</p>
            {fact.whyInteresting && <p className="text-sm leading-6 text-muted-foreground italic">{fact.whyInteresting}</p>}
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Check className="size-3.5 text-success-foreground" /> Saved to your{" "}
              <Link href="/library/facts" className="underline-offset-4 hover:text-foreground hover:underline">
                Library
              </Link>
            </p>
          </CardContent>
        </Card>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => setFact(null)} disabled={busy !== null}>
            Next question <ChevronRight className="size-4" />
          </Button>
          {fact.inReviews ? (
            <span className="flex items-center gap-1 px-2 text-sm text-success-foreground">
              <Check className="size-4" /> In your reviews
            </span>
          ) : (
            fact.canReview && (
              <Button variant="outline" onClick={() => addToReviews(fact)} disabled={busy !== null}>
                {busy === "review" ? <Loader2 className="size-4 animate-spin" /> : <Repeat className="size-4" />} Add to my reviews
              </Button>
            )
          )}
          {ideaSaved.has(fact.id) ? (
            <span className="flex items-center gap-1 px-2 text-sm text-success-foreground">
              <Check className="size-4" /> Saved to learn properly
            </span>
          ) : (
            <Button variant="ghost" onClick={() => saveIdea(fact)} disabled={busy !== null}>
              {busy === "idea" ? <Loader2 className="size-4 animate-spin" /> : <BookmarkPlus className="size-4" />} Learn it properly later
            </Button>
          )}
        </div>
        {errorLine}
      </div>
    );
  }

  // 2. Pick a question
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold tracking-tight text-heading">{area}</h2>
        <Button variant="ghost" size="sm" onClick={() => setArea(null)} disabled={busy !== null}>
          <ArrowLeft className="size-4" /> Change topic
        </Button>
      </div>
      <ul className="flex flex-col gap-2">
        {questions.map((q) => (
          <li key={q.question}>
            <button
              type="button"
              onClick={() => open(q)}
              disabled={busy !== null}
              className={cn(
                "group flex w-full items-center gap-3 rounded-xl bg-card px-4 py-3 text-left ring-1 ring-foreground/10 transition-shadow hover:shadow-md hover:ring-primary/30 disabled:opacity-70",
                read.has(q.question) && "opacity-60",
              )}
            >
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                {area === SURPRISE_AREA && <span className="text-xs text-muted-foreground">{q.area}</span>}
                <span className="font-medium">{q.question}</span>
              </span>
              {busy === `q:${q.question}` ? (
                <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
              ) : read.has(q.question) ? (
                <Check className="size-4 shrink-0 text-success-foreground" />
              ) : (
                <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              )}
            </button>
          </li>
        ))}
      </ul>
      <Button variant="outline" className="w-fit" onClick={() => loadQuestions(area, true)} disabled={busy !== null}>
        {busy === "more" ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />} More questions
      </Button>
      {errorLine}
    </div>
  );
}
