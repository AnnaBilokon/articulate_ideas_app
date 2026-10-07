"use client";

import { useState } from "react";
import { ArrowRight, CalendarClock, Check, CircleDashed, Loader2, TriangleAlert } from "lucide-react";
import type { GradeResponse } from "@/app/api/questions/[id]/grade/route";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { formatDue } from "@/lib/schedule";
import { cn } from "@/lib/utils";

// One recall question at a time: confidence, answer, grade, and misses asked
// again at the end. Used by the quiz, reviews and word practice, which differ
// only in where the questions come from and what the end screen shows.

export type SessionQuestion = { id: string; text: string; topicId?: string; topicTitle?: string };
export type FirstTry = { question: SessionQuestion; attemptId: string; score: number; confidentMiss: boolean };
type Turn = { question: SessionQuestion; reask: boolean };
type Phase = "confidence" | "answer" | "grading" | "feedback";

const confidenceLevels = [
  { value: 1, label: "Guessing" },
  { value: 2, label: "Somewhat sure" },
  { value: 3, label: "Sure" },
] as const;

export function scoreTone(score: number) {
  if (score >= 4) return "bg-success-soft text-success-foreground";
  if (score === 3) return "bg-sunflower-soft text-sunflower-foreground";
  return "bg-coral-soft text-coral-foreground";
}

const finishLabels = { quiz: "Finish quiz", review: "Finish review", practice: "Finish practice" };

export function RecallSession<Summary>({
  mode,
  questions,
  gradeUrl = (id) => `/api/questions/${id}/grade`,
  finishUrl,
  renderEnd,
}: {
  mode: "quiz" | "review" | "practice";
  questions: SessionQuestion[];
  // Where each answer is graded; recall questions by default.
  gradeUrl?: (questionId: string) => string;
  // Called once at the end with the first-try attempt ids; its JSON is the summary.
  finishUrl: string;
  renderEnd: (end: { firstTries: FirstTry[]; summary: Summary | null; finishing: boolean }) => React.ReactNode;
}) {
  const [queue, setQueue] = useState<Turn[]>(() => questions.map((question) => ({ question, reask: false })));
  const [pos, setPos] = useState(0);
  const [phase, setPhase] = useState<Phase>("confidence");
  const [confidence, setConfidence] = useState<number | null>(null);
  const [answer, setAnswer] = useState("");
  const [startedAt, setStartedAt] = useState(0);
  const [graded, setGraded] = useState<GradeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [firstTries, setFirstTries] = useState<FirstTry[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [finishing, setFinishing] = useState(false);

  const turn = queue[pos];
  const done = pos >= queue.length;

  // Time on a question = from the confidence click to the submit click, using
  // the clicks' own timestamps.
  function chooseConfidence(value: number, clickedAt: number) {
    setConfidence(value);
    setPhase("answer");
    setStartedAt(clickedAt);
  }

  async function submit(text: string, clickedAt: number) {
    if (confidence === null) return;
    setPhase("grading");
    setError(null);
    try {
      const response = await fetch(gradeUrl(turn.question.id), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          answer: text,
          confidence,
          mode,
          durationSec: Math.max(0, Math.round((clickedAt - startedAt) / 1000)),
        }),
      });
      const body = (await response.json()) as GradeResponse & { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Something went wrong. Try again.");
      setGraded(body);
      setPhase("feedback");

      if (!turn.reask) {
        setFirstTries((f) => [
          ...f,
          { question: turn.question, attemptId: body.attemptId, score: body.score, confidentMiss: body.confidentMiss },
        ]);
        // Misses come back once at the end of the session.
        if (body.score <= 2) setQueue((q) => [...q, { question: turn.question, reask: true }]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
      setPhase("answer");
    }
  }

  async function next() {
    const nextPos = pos + 1;
    setPos(nextPos);
    setPhase("confidence");
    setConfidence(null);
    setAnswer("");
    setGraded(null);
    window.scrollTo({ top: 0, behavior: "smooth" });

    if (nextPos >= queue.length) {
      setFinishing(true);
      try {
        const response = await fetch(finishUrl, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ attemptIds: firstTries.map((t) => t.attemptId) }),
        });
        if (response.ok) setSummary(await response.json());
      } finally {
        setFinishing(false);
      }
    }
  }

  if (done) return renderEnd({ firstTries, summary, finishing });

  const firstPassDone = Math.min(firstTries.length, questions.length);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="flex flex-1 gap-1" aria-label={`${firstPassDone} of ${questions.length} answered`}>
          {questions.map((q, i) => (
            <span
              key={q.id}
              className={cn(
                "h-1.5 flex-1 rounded-full",
                i < firstPassDone ? "bg-primary" : i === firstPassDone && !turn.reask ? "bg-sunflower" : "bg-border",
              )}
            />
          ))}
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">
          {turn.reask ? "Second try" : `${pos + 1} / ${questions.length}`}
        </span>
      </div>

      <Card className="gap-0 py-0">
        <CardContent className="flex flex-col gap-5 p-5 sm:p-7">
          {(turn.reask || turn.question.topicTitle) && (
            <div className="flex flex-wrap gap-1.5">
              {turn.question.topicTitle && (
                <Badge variant="secondary" className="max-w-full truncate">
                  {turn.question.topicTitle}
                </Badge>
              )}
              {turn.reask && <Badge className="bg-info-soft text-info-foreground">Second try</Badge>}
            </div>
          )}
          <p className="text-lg leading-7 font-medium sm:text-xl">{turn.question.text}</p>

          {phase === "confidence" && (
            <div className="flex flex-col gap-2">
              <span className="text-sm text-muted-foreground">Before you answer: how sure are you that you know this?</span>
              <div className="grid gap-2 sm:grid-cols-3">
                {confidenceLevels.map(({ value, label }) => (
                  <Button key={value} variant="outline" size="lg" className="h-11" onClick={(e) => chooseConfidence(value, e.timeStamp)}>
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {(phase === "answer" || phase === "grading") && (
            <div className="flex flex-col gap-3">
              <Textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                rows={5}
                maxLength={5000}
                autoFocus
                disabled={phase === "grading"}
                placeholder="Answer from memory, in your own words…"
                aria-label="Your answer"
                className="min-h-32 bg-background px-3 py-2.5 md:text-base"
              />
              {error && (
                <p className="text-sm text-coral-foreground" role="alert">
                  {error}
                </p>
              )}
              <div className="flex flex-wrap justify-between gap-2">
                <Button variant="ghost" disabled={phase === "grading"} onClick={(e) => submit("", e.timeStamp)}>
                  I don&apos;t know
                </Button>
                <Button
                  size="lg"
                  className="h-10 px-4"
                  disabled={phase === "grading" || !answer.trim()}
                  onClick={(e) => submit(answer, e.timeStamp)}
                >
                  {phase === "grading" ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Checking…
                    </>
                  ) : (
                    <>
                      Check answer <ArrowRight className="size-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {phase === "feedback" && graded && <Feedback graded={graded} answer={answer} />}
        </CardContent>

        {phase === "feedback" && (
          <div className="flex justify-end border-t bg-muted/50 px-5 py-4 sm:px-7">
            <Button size="lg" className="h-10 px-4" onClick={next} autoFocus>
              {pos + 1 >= queue.length ? finishLabels[mode] : "Next question"}{" "}
              <ArrowRight className="size-4" />
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}

/** The score part of an end screen: first-try average, counts and confident misses. */
export function ScoreSummary({ firstTries }: { firstTries: FirstTry[] }) {
  const average = firstTries.reduce((s, t) => s + t.score, 0) / Math.max(1, firstTries.length);
  const strong = firstTries.filter((t) => t.score >= 4).length;
  const partial = firstTries.filter((t) => t.score === 3).length;
  const missed = firstTries.filter((t) => t.score <= 2).length;
  const confidentMisses = firstTries.filter((t) => t.confidentMiss).length;

  return (
    <>
      <div className="text-4xl font-semibold tabular-nums">
        {average.toFixed(1)}
        <span className="text-lg text-muted-foreground"> / 5 average</span>
      </div>
      <div className="flex flex-wrap justify-center gap-2 text-sm font-medium">
        <span className="rounded-full bg-success-soft px-2.5 py-1 text-success-foreground">{strong} strong</span>
        <span className="rounded-full bg-sunflower-soft px-2.5 py-1 text-sunflower-foreground">{partial} partly there</span>
        <span className="rounded-full bg-coral-soft px-2.5 py-1 text-coral-foreground">{missed} missed</span>
      </div>
      {confidentMisses > 0 && (
        <p className="max-w-md text-sm text-coral-foreground">
          {confidentMisses} confident {confidentMisses === 1 ? "miss" : "misses"}: you were sure but wrong. Those
          corrections tend to stick best, and they&apos;ll come back sooner in reviews.
        </p>
      )}
    </>
  );
}

/** "Next review: tomorrow" line for an end screen. */
export function NextReview({ dueAt }: { dueAt: string }) {
  return (
    <p className="flex items-center gap-1.5 text-sm">
      <CalendarClock className="size-4 text-primary" />
      <span>
        Next review: <strong>{formatDue(dueAt)}</strong>
      </span>
    </p>
  );
}

function Feedback({ graded, answer }: { graded: GradeResponse; answer: string }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className={cn("rounded-xl px-3 py-1.5 text-xl font-semibold tabular-nums", scoreTone(graded.score))}>
          {graded.score}/5
        </span>
        <p className="leading-6">{graded.feedback}</p>
      </div>

      {graded.confidentMiss && (
        <div className="flex gap-2 rounded-xl bg-coral-soft p-3 text-sm ring-1 ring-coral/40">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-coral-foreground" />
          <span>
            <strong className="text-coral-foreground">Confident miss.</strong> You were sure, but this one missed.
            Compare your answer with the key points below; corrections like this stick best. It will come back sooner.
          </span>
        </div>
      )}

      <div className={cn("grid gap-3", graded.confidentMiss && answer && "sm:grid-cols-2")}>
        {graded.confidentMiss && answer && (
          <div className="flex flex-col gap-1.5 rounded-xl border bg-background p-3">
            <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Your answer</span>
            <p className="text-sm leading-6 whitespace-pre-wrap">{answer}</p>
          </div>
        )}
        <div className="flex flex-col gap-1.5 rounded-xl border bg-background p-3">
          <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Key points</span>
          <ul className="flex flex-col gap-1.5">
            {graded.keyPoints.map((point) => {
              const hit = graded.points_hit.includes(point);
              return (
                <li key={point} className="flex items-start gap-2 text-sm leading-6">
                  {hit ? (
                    <Check className="mt-1 size-4 shrink-0 text-success" />
                  ) : (
                    <CircleDashed className="mt-1 size-4 shrink-0 text-sunflower-foreground" />
                  )}
                  <span className={cn(!hit && "font-medium")}>{point}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <CalendarClock className="size-4" />
        Back for review {formatDue(graded.dueAt)}
      </p>
    </div>
  );
}
