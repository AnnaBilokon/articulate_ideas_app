"use client";

import { useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { TwoTruthsResult } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { ResultBanner } from "./result-banner";

// Three rounds: pick the lie in each, then see why each statement is true or false.
export function TwoTruthsPlay({
  challengeId,
  topicId,
  rounds,
}: {
  challengeId: string;
  topicId: string;
  rounds: string[][];
}) {
  const [picks, setPicks] = useState<(number | null)[]>(rounds.map(() => null));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scored, setScored] = useState<{ score: number; result: TwoTruthsResult } | null>(null);

  async function check() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/challenges/${challengeId}/attempts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ picks }),
      });
      const body = (await response.json().catch(() => null)) as
        | { score: number; result: TwoTruthsResult; error?: string }
        | null;
      if (!response.ok || !body?.result) throw new Error(body?.error ?? "Something went wrong. Try again.");
      setScored(body);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
    } finally {
      setPending(false);
    }
  }

  if (scored) {
    const right = scored.result.rounds.filter((r) => r.picked === r.lie).length;
    return (
      <div className="flex flex-col gap-5">
        <ResultBanner
          score={scored.score}
          summary={`You spotted ${right} of ${scored.result.rounds.length} lies.`}
          topicId={topicId}
          kind="two_truths"
        />
        {scored.result.rounds.map((r, ri) => (
          <Card key={ri} size="sm">
            <CardContent className="flex flex-col gap-3">
              <span className={cn("text-sm font-medium", r.picked === r.lie ? "text-success-foreground" : "text-coral-foreground")}>
                Round {ri + 1}: {r.picked === r.lie ? "you found the lie" : "not this time"}
              </span>
              <ul className="flex flex-col gap-2">
                {r.statements.map((s, si) => (
                  <li
                    key={si}
                    className={cn(
                      "flex gap-2 rounded-lg p-2.5 text-sm",
                      s.true ? "bg-muted/60" : "bg-coral-soft text-coral-foreground",
                    )}
                  >
                    {s.true ? <Check className="mt-0.5 size-4 shrink-0 text-success" /> : <X className="mt-0.5 size-4 shrink-0" />}
                    <span className="flex flex-col gap-0.5">
                      <span className="font-medium">
                        {s.text}
                        {si === r.picked && <span className="font-normal"> · your pick</span>}
                      </span>
                      <span className={cn(s.true && "text-muted-foreground")}>{s.why}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {rounds.map((statements, ri) => (
        <Card key={ri} size="sm">
          <CardContent className="flex flex-col gap-2">
            <span className="text-sm font-medium text-muted-foreground">Round {ri + 1}: which one is the lie?</span>
            <div role="radiogroup" aria-label={`Round ${ri + 1}`} className="flex flex-col gap-2">
              {statements.map((text, si) => (
                <label
                  key={si}
                  className={cn(
                    "flex cursor-pointer gap-2 rounded-lg border p-3 text-sm transition-colors has-focus-visible:ring-2 has-focus-visible:ring-ring",
                    picks[ri] === si ? "border-primary bg-accent" : "bg-background hover:bg-muted",
                  )}
                >
                  <input
                    type="radio"
                    name={`round-${ri}`}
                    checked={picks[ri] === si}
                    onChange={() => setPicks((prev) => prev.map((p, i) => (i === ri ? si : p)))}
                    className="sr-only"
                  />
                  {text}
                </label>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
      {error && (
        <p className="text-sm text-coral-foreground" role="alert">
          {error}
        </p>
      )}
      <Button onClick={check} disabled={pending || picks.some((p) => p === null)} className="w-fit self-end">
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
        Check
      </Button>
    </div>
  );
}
