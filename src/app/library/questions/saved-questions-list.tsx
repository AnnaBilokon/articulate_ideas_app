"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Check, Plus, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { SavedQuestion } from "@/lib/saved-questions";
import { MAX_SAVED_QUESTION_CHARS } from "@/lib/schemas";
import { cn } from "@/lib/utils";

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

// Opens the New topic form with the question as the title and as a question
// for the lesson to answer, at the level and with the tags of the topic it
// came from. The topic, once created, marks the question as started.
function learnHref(q: SavedQuestion): string {
  const params = new URLSearchParams({ title: q.text.slice(0, 200), q: q.text, saved: q.id });
  if (q.source?.level) params.set("level", q.source.level);
  if (q.source && q.source.tags.length > 0) params.set("tags", q.source.tags.join(", "));
  return `/topics/new?${params}`;
}

export function SavedQuestionsList({ questions }: { questions: SavedQuestion[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toLearn = questions.filter((q) => !q.startedAt);
  const started = questions.filter((q) => q.startedAt);

  async function call(input: RequestInfo, init: RequestInit) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(input, init);
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(body?.error ?? "Something went wrong. Try again.");
      router.refresh();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function add(event: React.FormEvent) {
    event.preventDefault();
    const ok = await call("/api/saved-questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: draft }),
    });
    if (ok) setDraft("");
  }

  const remove = (id: string) => call(`/api/saved-questions/${id}`, { method: "DELETE" });

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={add} className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Input
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setError(null);
            }}
            placeholder="A question you want to learn about"
            maxLength={MAX_SAVED_QUESTION_CHARS}
            aria-label="New question to save"
            className="h-10 bg-card md:text-base"
          />
          <Button type="submit" variant="secondary" disabled={busy || !draft.trim()} className="h-10">
            <Plus className="size-4" /> Save
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Or save one from the Think deeper questions on any topic card.
        </p>
        {error && (
          <p className="text-sm text-coral-foreground" role="alert">
            {error}
          </p>
        )}
      </form>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight text-heading">To learn</h2>
        {toLearn.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {toLearn.map((q) => (
              <li key={q.id}>
                <Card size="sm">
                  <CardContent className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-medium leading-6">{q.text}</p>
                      <button
                        type="button"
                        onClick={() => remove(q.id)}
                        disabled={busy}
                        aria-label="Remove this question"
                        className="shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm text-muted-foreground">
                        {q.source ? (
                          <>
                            From{" "}
                            <Link href={`/topics/${q.source.id}/card#think-deeper`} className="underline-offset-4 hover:underline">
                              {q.source.title}
                            </Link>
                          </>
                        ) : (
                          "Your question"
                        )}{" "}
                        · saved {dateFormat.format(new Date(q.createdAt))}
                      </span>
                      <Link href={learnHref(q)} className={cn(buttonVariants({ size: "sm" }), "h-8 px-3")}>
                        Learn this <ArrowRight className="size-3.5" />
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">
            Nothing saved yet. On a topic card, open Think deeper and press &ldquo;Save for later&rdquo; on a question
            you want to dig into.
          </p>
        )}
      </section>

      {started.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold tracking-tight text-heading">Started</h2>
          <ul className="flex flex-col gap-2">
            {started.map((q) => (
              <li key={q.id} className="flex items-start gap-3 rounded-xl bg-muted/60 p-3 text-sm">
                <Check className="mt-0.5 size-4 shrink-0 text-success" />
                <div className="flex flex-1 flex-col gap-0.5">
                  <span>{q.text}</span>
                  <span className="text-muted-foreground">
                    {q.started ? (
                      <>
                        Learning it as{" "}
                        <Link href={`/topics/${q.started.id}`} className="underline-offset-4 hover:underline">
                          {q.started.title}
                        </Link>
                      </>
                    ) : (
                      "Its topic was deleted"
                    )}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => remove(q.id)}
                  disabled={busy}
                  aria-label="Remove this question"
                  className="shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
