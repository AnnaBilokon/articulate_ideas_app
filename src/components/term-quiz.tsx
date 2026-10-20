"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Check, Loader2, PartyPopper, Repeat, X } from "lucide-react";
import type { TermCheck } from "@/app/api/terms/[id]/check/route";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type QuizTerm = { id: string; definition: string; topicTitle?: string };

type Result = TermCheck & { id: string; definition: string; counted: boolean };

const isRight = (r: Result) => r.verdict !== "wrong" || r.counted;

// Term quiz: read an explanation, name the term. Practice only: nothing is
// saved or scheduled.
export function TermQuiz({ terms, backHref, backLabel }: { terms: QuizTerm[]; backHref: string; backLabel: string }) {
  const [round, setRound] = useState(terms);
  const [pos, setPos] = useState(0);
  const [answer, setAnswer] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Result[]>([]);

  const current = round[pos];
  const result = current ? results.find((r) => r.id === current.id) : undefined;
  const done = pos >= round.length;

  async function check(text: string) {
    setChecking(true);
    setError(null);
    try {
      const response = await fetch(`/api/terms/${current.id}/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer: text }),
      });
      const body = (await response.json().catch(() => null)) as (TermCheck & { error?: string }) | null;
      if (!response.ok || !body?.term) throw new Error(body?.error ?? "Something went wrong. Try again.");
      setResults((prev) => [...prev, { ...body, id: current.id, definition: current.definition, counted: false }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
    } finally {
      setChecking(false);
    }
  }

  function next() {
    setPos((p) => p + 1);
    setAnswer("");
    setError(null);
  }

  function countAsRight() {
    setResults((prev) => prev.map((r) => (r.id === current.id ? { ...r, counted: true } : r)));
  }

  if (done) {
    const missed = results.filter((r) => !isRight(r));
    const right = results.length - missed.length;
    return (
      <div className="flex flex-col gap-5">
        <Card className="bg-success-soft/50 ring-success/25">
          <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-success text-white">
              <PartyPopper className="size-6" />
            </span>
            <div className="text-lg font-semibold">
              {right} of {results.length} terms right
            </div>
            <div className="flex flex-wrap justify-center gap-2 pt-1">
              {missed.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setRound(missed.map(({ id, definition }) => ({ id, definition })));
                    setResults([]);
                    setPos(0);
                  }}
                >
                  <Repeat className="size-4" /> Practise the missed ones again
                </Button>
              )}
              <Link href={backHref} className={buttonVariants()}>
                {backLabel} <ArrowRight className="size-4" />
              </Link>
            </div>
          </CardContent>
        </Card>
        {missed.length > 0 && (
          <Card>
            <CardContent className="flex flex-col gap-3">
              <div className="font-medium">Terms to look at again</div>
              <ul className="flex flex-col gap-3">
                {missed.map((r) => (
                  <li key={r.id} className="text-sm">
                    <span className="font-semibold text-heading">{r.term}</span>
                    {r.fullForm && <span className="text-muted-foreground"> ({r.fullForm})</span>}
                    <p className="text-muted-foreground">{r.definition}</p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-5 py-2">
        <div className="flex items-center gap-3">
          <div className="flex flex-1 gap-1" aria-label={`Term ${pos + 1} of ${round.length}`}>
            {round.map((t, i) => (
              <span
                key={t.id}
                className={cn("h-1.5 flex-1 rounded-full", i < pos || (i === pos && result) ? "bg-primary" : "bg-muted")}
              />
            ))}
          </div>
          <span className="text-sm text-muted-foreground tabular-nums">
            {pos + 1} / {round.length}
          </span>
        </div>

        <div className="flex flex-col gap-2">
          {current.topicTitle && (
            <Badge variant="secondary" className="max-w-full truncate">
              {current.topicTitle}
            </Badge>
          )}
          <span className="text-sm text-muted-foreground">What&apos;s the term?</span>
          <p className="text-lg leading-7 font-medium sm:text-xl">{current.definition}</p>
        </div>

        {!result ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (answer.trim()) void check(answer);
            }}
            className="flex flex-col gap-3"
          >
            <Input
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="A word or two"
              aria-label="Your answer"
              maxLength={200}
              autoFocus
              disabled={checking}
              className="h-11 bg-background md:text-base"
            />
            {error && (
              <p className="text-sm text-coral-foreground" role="alert">
                {error}
              </p>
            )}
            <div className="flex flex-wrap justify-between gap-2">
              <Button type="button" variant="ghost" disabled={checking} onClick={() => void check("")}>
                I don&apos;t know: show me
              </Button>
              <Button type="submit" size="lg" className="h-10 px-4" disabled={checking || !answer.trim()}>
                {checking ? <Loader2 className="size-4 animate-spin" /> : null}
                {checking ? "Checking…" : "Check"}
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-4">
            <div
              className={cn(
                "flex flex-col gap-1.5 rounded-xl p-4",
                isRight(result) ? "bg-success-soft text-success-foreground" : "bg-coral-soft text-coral-foreground",
              )}
            >
              <span className="flex items-center gap-1.5 text-sm font-medium">
                {isRight(result) ? <Check className="size-4" /> : <X className="size-4" />}
                {result.counted
                  ? "Counted as right"
                  : result.verdict === "right"
                    ? "Right"
                    : result.verdict === "close"
                      ? "Right, with a small typo"
                      : answer.trim()
                        ? "Not quite"
                        : "Here it is"}
              </span>
              <span className="text-2xl font-semibold">
                {result.term}
                {result.fullForm && <span className="text-base font-normal"> ({result.fullForm})</span>}
              </span>
              {answer.trim() && result.verdict !== "right" && (
                <span className="text-sm">You wrote: {answer.trim()}</span>
              )}
              {result.note && <span className="text-sm">{result.note}</span>}
            </div>
            {result.example && <p className="text-sm text-muted-foreground">Example: {result.example}</p>}
            <div className="flex flex-wrap justify-between gap-2">
              {result.verdict === "wrong" && answer.trim() && !result.counted ? (
                <Button variant="ghost" onClick={countAsRight}>
                  Count it as right
                </Button>
              ) : (
                <span />
              )}
              <Button size="lg" className="h-10 px-4" onClick={next} autoFocus>
                {pos + 1 >= round.length ? "See results" : "Next term"} <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
