"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SPOT_MISTAKES, type SpotMistakeResult } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { ResultBanner } from "./result-banner";

// Tap the sentences that are wrong, optionally say what's right, then check.
export function SpotMistakePlay({
  challengeId,
  topicId,
  sentences,
}: {
  challengeId: string;
  topicId: string;
  sentences: string[];
}) {
  const [flagged, setFlagged] = useState<number[]>([]);
  const [fixes, setFixes] = useState<Record<number, string>>({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scored, setScored] = useState<{ score: number; result: SpotMistakeResult } | null>(null);

  const toggle = (i: number) =>
    setFlagged((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i].sort((a, b) => a - b)));

  async function check() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/challenges/${challengeId}/attempts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flagged }),
      });
      const body = (await response.json().catch(() => null)) as
        | { score: number; result: SpotMistakeResult; error?: string }
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
    const { found, wrongFlags, mistakes } = scored.result;
    const mistakeAt = new Map(mistakes.map((m) => [m.index, m]));
    return (
      <div className="flex flex-col gap-5">
        <ResultBanner
          score={scored.score}
          summary={`You found ${found.length} of ${mistakes.length} mistakes${wrongFlags.length > 0 ? ` and flagged ${wrongFlags.length} correct ${wrongFlags.length === 1 ? "sentence" : "sentences"}` : ""}.`}
          topicId={topicId}
          kind="spot_mistake"
        />
        <Card>
          <CardContent className="leading-8">
            {sentences.map((s, i) => (
              <span
                key={i}
                className={cn(
                  "rounded px-0.5",
                  mistakeAt.has(i) && found.includes(i) && "bg-success-soft text-success-foreground",
                  mistakeAt.has(i) && !found.includes(i) && "bg-sunflower-soft text-sunflower-foreground",
                  wrongFlags.includes(i) && "text-muted-foreground line-through",
                )}
              >
                {s}{" "}
              </span>
            ))}
          </CardContent>
        </Card>
        <ul className="flex flex-col gap-3">
          {mistakes.map((m) => (
            <li key={m.index}>
              <Card size="sm">
                <CardContent className="flex flex-col gap-1.5 text-sm">
                  <span className={cn("font-medium", found.includes(m.index) ? "text-success-foreground" : "text-sunflower-foreground")}>
                    {found.includes(m.index) ? "You found this one" : "You missed this one"}
                  </span>
                  <p className="text-muted-foreground line-through">{m.sentence}</p>
                  <p>
                    <span className="font-medium text-heading">Right: </span>
                    {m.correction}
                  </p>
                  <p className="text-muted-foreground">{m.why}</p>
                  {fixes[m.index]?.trim() && (
                    <p>
                      <span className="font-medium">You said: </span>
                      {fixes[m.index].trim()}
                    </p>
                  )}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
        {wrongFlags.length > 0 && (
          <p className="text-sm text-muted-foreground">
            The crossed-out {wrongFlags.length === 1 ? "sentence was" : "sentences were"} correct.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Tap the sentences you think are wrong. There are {SPOT_MISTAKES}.
      </p>
      <Card>
        <CardContent className="leading-8">
          {sentences.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => toggle(i)}
              aria-pressed={flagged.includes(i)}
              className={cn(
                "rounded px-0.5 text-left transition-colors hover:bg-muted",
                flagged.includes(i) && "bg-coral-soft text-coral-foreground hover:bg-coral-soft",
              )}
            >
              {s}{" "}
            </button>
          ))}
        </CardContent>
      </Card>

      {flagged.length > 0 && (
        <div className="flex flex-col gap-3">
          <span className="text-sm font-medium">What&apos;s right instead? <span className="font-normal text-muted-foreground">Optional, but it sticks better.</span></span>
          {flagged.map((i) => (
            <label key={i} className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">&ldquo;{sentences[i]}&rdquo;</span>
              <Input
                value={fixes[i] ?? ""}
                onChange={(e) => setFixes((prev) => ({ ...prev, [i]: e.target.value }))}
                placeholder="It should say…"
                maxLength={300}
                className="bg-background"
              />
            </label>
          ))}
        </div>
      )}

      {error && (
        <p className="text-sm text-coral-foreground" role="alert">
          {error}
        </p>
      )}
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground">
          Flagged {flagged.length} of {SPOT_MISTAKES}
        </span>
        <Button onClick={check} disabled={pending || flagged.length === 0}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          Check
        </Button>
      </div>
    </div>
  );
}
