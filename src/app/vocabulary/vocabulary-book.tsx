"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  ChevronDown,
  Dumbbell,
  Lightbulb,
  Loader2,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatDue } from "@/lib/schedule";
import { MAX_WORD_CHARS, TRANSLATION_LANGUAGE } from "@/lib/schemas/vocabulary";
import { cn } from "@/lib/utils";

type Word = {
  id: string;
  word: string;
  part_of_speech: string | null;
  definition: string;
  usage_note: string | null;
  examples: string[];
  translation: string | null;
  context: string | null;
  due_at: string;
  last_score: number | null;
  topics: { id: string; title: string } | null;
};

export function VocabularyBook({ words, due, nextDueAt }: { words: Word[]; due: number; nextDueAt: string | null }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [newWord, setNewWord] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [removing, setRemoving] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    setError(null);
    try {
      const response = await fetch("/api/vocabulary", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ word: newWord }),
      });
      const body = (await response.json()) as { word?: { id: string }; existing?: { id: string }; error?: string };
      if (response.status === 409 && body.existing) {
        // Already saved: open its entry instead.
        const id = body.existing.id;
        setQuery("");
        setJustAdded(id);
        requestAnimationFrame(() => document.getElementById(`word-${id}`)?.scrollIntoView({ block: "center" }));
      }
      if (!response.ok || !body.word) throw new Error(body.error ?? "Could not add the word. Try again.");
      setNewWord("");
      setQuery("");
      setJustAdded(body.word.id);
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add the word. Try again.");
    } finally {
      setAdding(false);
    }
  }

  async function remove(id: string, word: string) {
    if (!window.confirm(`Remove "${word}" from your vocabulary? Its practice history goes too.`)) return;
    setRemoving(id);
    setError(null);
    try {
      const response = await fetch(`/api/vocabulary/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Could not remove the word. Try again.");
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove the word. Try again.");
    } finally {
      setRemoving(null);
    }
  }

  const q = query.trim().toLowerCase();
  const shown = q
    ? words.filter((w) => [w.word, w.definition, w.translation ?? ""].some((s) => s.toLowerCase().includes(q)))
    : words;

  return (
    <div className="flex flex-col gap-6">
      {due > 0 ? (
        <Card className="bg-sunflower-soft/70 ring-sunflower/50">
          <CardContent className="flex flex-wrap items-center gap-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sunflower text-sunflower-foreground">
              <Dumbbell className="size-5" />
            </span>
            <div className="flex min-w-40 flex-1 flex-col gap-0.5">
              <div className="font-medium">
                {due} {due === 1 ? "word" : "words"} to practice
              </div>
              <div className="text-sm text-muted-foreground">Say what each one means, and use it in a sentence.</div>
            </div>
            <Link href="/vocabulary/practice" className={cn(buttonVariants({ size: "lg" }), "h-10 px-4")}>
              Practice <ArrowRight className="size-4" />
            </Link>
          </CardContent>
        </Card>
      ) : (
        words.length > 0 && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarClock className="size-4" />
            {nextDueAt ? `Next practice ${formatDue(nextDueAt)}.` : "No words to practice."}
          </p>
        )
      )}

      <form onSubmit={add} className="flex flex-col gap-2">
        <label htmlFor="new-word" className="text-sm font-medium">
          Add a word or phrase
        </label>
        <div className="flex gap-2">
          <Input
            id="new-word"
            value={newWord}
            onChange={(e) => setNewWord(e.target.value)}
            maxLength={MAX_WORD_CHARS}
            disabled={adding}
            placeholder="e.g. ubiquitous, take for granted"
            className="h-10 bg-background md:text-base"
          />
          <Button type="submit" size="lg" className="h-10 px-4" disabled={adding || !newWord.trim()}>
            {adding ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            {adding ? "Explaining…" : "Add"}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground" role={error ? "alert" : undefined}>
          {error ? (
            <span className="text-coral-foreground">{error}</span>
          ) : (
            `You'll get a plain definition, how to use it, examples and the ${TRANSLATION_LANGUAGE} translation. While reading a lesson, select any word to save it.`
          )}
        </p>
      </form>

      {words.length > 0 ? (
        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-tight">
              Your words <span className="font-normal text-muted-foreground">({words.length})</span>
            </h2>
            {words.length > 5 && (
              <div className="relative w-full sm:w-60">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search your words"
                  aria-label="Search your words"
                  className="bg-background pl-8"
                />
              </div>
            )}
          </div>
          {shown.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {shown.map((w) => (
                <WordEntry
                  key={w.id}
                  word={w}
                  open={w.id === justAdded}
                  removing={removing === w.id}
                  onRemove={() => remove(w.id, w.word)}
                />
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">No words match &ldquo;{query}&rdquo;.</p>
          )}
        </section>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-2 py-4 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-accent text-primary">
              <BookOpen className="size-6" />
            </span>
            <div className="font-medium">No words yet</div>
            <p className="max-w-sm text-sm text-muted-foreground">
              Add one above, or select a word while reading a lesson and tap &ldquo;Add to vocabulary&rdquo;.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function WordEntry({
  word: w,
  open,
  removing,
  onRemove,
}: {
  word: Word;
  open: boolean;
  removing: boolean;
  onRemove: () => void;
}) {
  return (
    <li id={`word-${w.id}`}>
      <details open={open} className="group rounded-xl border bg-card shadow-xs">
        <summary className="flex cursor-pointer list-none items-start gap-3 p-4 [&::-webkit-details-marker]:hidden">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="text-lg font-semibold">{w.word}</span>
              {w.part_of_speech && <span className="text-sm text-muted-foreground italic">{w.part_of_speech}</span>}
            </div>
            {w.translation && (
              <div className="flex items-baseline gap-1.5 text-sm">
                <span className="rounded bg-info-soft px-1.5 text-xs font-medium text-info-foreground" title={TRANSLATION_LANGUAGE}>
                  укр
                </span>
                <span>{w.translation}</span>
              </div>
            )}
            <p className="leading-6 text-foreground/90">{w.definition}</p>
          </div>
          <ChevronDown className="mt-1.5 size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>
        <div className="flex flex-col gap-4 border-t px-4 py-4">
          {w.usage_note && (
            <div className="flex gap-2">
              <Lightbulb className="mt-1 size-4 shrink-0 text-sunflower-foreground" />
              <p className="leading-6">
                <span className="font-medium">How to use it: </span>
                {w.usage_note}
              </p>
            </div>
          )}
          {w.examples.length > 0 && (
            <ul className="flex flex-col gap-1.5 pl-5">
              {w.examples.map((example) => (
                <li key={example} className="list-disc leading-6 italic marker:text-primary">
                  {example}
                </li>
              ))}
            </ul>
          )}
          {w.topics && (
            <p className="text-sm text-muted-foreground">
              Saved from{" "}
              <Link href={`/topics/${w.topics.id}`} className="font-medium text-info-foreground hover:underline">
                {w.topics.title}
              </Link>
              {w.context && <>: &ldquo;{w.context}&rdquo;</>}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground" suppressHydrationWarning>
              <CalendarClock className="size-4" />
              {w.last_score === null ? "New: ready to practice" : `Practice ${formatDue(w.due_at)}`}
            </span>
            <Button variant="ghost" size="sm" disabled={removing} onClick={onRemove} className="text-coral-foreground">
              {removing ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />} Remove
            </Button>
          </div>
        </div>
      </details>
    </li>
  );
}
