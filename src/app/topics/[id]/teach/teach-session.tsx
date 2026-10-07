"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  CircleDashed,
  Loader2,
  Lock,
  MessageSquareText,
  MessagesSquare,
  Quote,
  RotateCcw,
  Sparkles,
  Telescope,
} from "lucide-react";
import type { ExplainResponse } from "@/app/api/topics/[id]/explain/route";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { noSubscribe, readStored, writeStored } from "@/lib/local-draft";
import {
  MAX_EXPLAIN_CHARS,
  MAX_FOLLOW_UP_CHARS,
  explainParts,
  type ExplainPartName,
  type ExplainRecord,
  type FollowUp,
} from "@/lib/schemas/grading";
import { cn } from "@/lib/utils";
import { scoreTone } from "@/components/recall-session";

type Explanation = { id: string; text: string; feedback: ExplainRecord };

const partLabels: Record<ExplainPartName, { label: string; hint: string }> = {
  claim: { label: "Claim", hint: "the main idea" },
  why: { label: "Why", hint: "how or why it works" },
  example: { label: "Example", hint: "a concrete case" },
  limit: { label: "Limit", hint: "where it stops applying" },
  so_what: { label: "So what", hint: "why it matters" },
};

const wordCount = (text: string) => (text.trim() ? text.trim().split(/\s+/).length : 0);

const draftKey = (topicId: string) => `teach-draft:${topicId}`;

export function TeachSession({
  topicId,
  mastery,
  previous,
}: {
  topicId: string;
  mastery: string | null;
  previous: Explanation | null;
}) {
  const [result, setResult] = useState<Explanation | null>(previous);
  const [writing, setWriting] = useState(previous === null);
  // The stored draft until the learner changes it; "" on the server.
  const savedDraft = useSyncExternalStore(noSubscribe, () => readStored(draftKey(topicId)), () => "");
  const [edited, setEdited] = useState<string | null>(null);
  const text = edited ?? savedDraft;
  const [grading, setGrading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentMastery, setCurrentMastery] = useState(mastery);
  const [justExplained, setJustExplained] = useState(false);

  function updateText(value: string) {
    setEdited(value);
    writeStored(draftKey(topicId), value);
  }

  async function submit() {
    setGrading(true);
    setError(null);
    try {
      const response = await fetch(`/api/topics/${topicId}/explain`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const body = (await response.json()) as Partial<ExplainResponse> & { error?: string };
      if (!response.ok || !body.id || !body.feedback) throw new Error(body.error ?? "Something went wrong. Try again.");
      setResult({ id: body.id, text, feedback: body.feedback });
      setJustExplained(body.mastery === "explained" && currentMastery !== "explained");
      setCurrentMastery(body.mastery ?? null);
      setWriting(false);
      updateText("");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
    } finally {
      setGrading(false);
    }
  }

  if (writing) {
    return (
      <Card className="gap-0 py-0">
        <CardContent className="flex flex-col gap-4 p-4 sm:p-6">
          <div className="flex flex-col gap-1">
            <span className="flex items-center gap-2 font-medium">
              <MessageSquareText className="size-4 text-primary" /> Explain it to someone new
            </span>
            <p className="text-sm text-muted-foreground">
              Without looking back, explain the whole topic to someone who has never heard of it. Use your own words
              and plain language. A good explanation covers five things:
            </p>
          </div>
          <ul className="flex flex-wrap gap-1.5" aria-label="Parts of a good explanation">
            {explainParts.map((part) => (
              <li key={part} className="rounded-full bg-muted px-2.5 py-1 text-xs">
                <span className="font-medium">{partLabels[part].label}</span>
                <span className="text-muted-foreground"> · {partLabels[part].hint}</span>
              </li>
            ))}
          </ul>
          <Textarea
            value={text}
            onChange={(e) => updateText(e.target.value)}
            maxLength={MAX_EXPLAIN_CHARS}
            rows={14}
            autoFocus
            disabled={grading}
            placeholder="So, the idea is…"
            aria-label="Your explanation"
            className="min-h-72 bg-background px-3 py-2.5 md:text-base"
          />
          <p className="text-sm text-muted-foreground">{wordCount(text).toLocaleString("en")} words</p>
        </CardContent>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/50 px-4 py-4 sm:px-6">
          <p className="text-sm text-coral-foreground" role="alert">
            {error}
          </p>
          <div className="flex gap-2">
            {result && (
              <Button variant="ghost" disabled={grading} onClick={() => setWriting(false)}>
                Cancel
              </Button>
            )}
            <Button size="lg" className="h-10 px-4" disabled={grading || !text.trim()} onClick={submit}>
              {grading ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Reading your explanation…
                </>
              ) : (
                <>
                  Get feedback <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  if (!result) return null;

  return (
    <ExplanationFeedback
      key={result.id}
      topicId={topicId}
      explanation={result}
      justExplained={justExplained}
      onExplainAgain={() => setWriting(true)}
    />
  );
}

function ExplanationFeedback({
  topicId,
  explanation,
  justExplained,
  onExplainAgain,
}: {
  topicId: string;
  explanation: Explanation;
  justExplained: boolean;
  onExplainAgain: () => void;
}) {
  const { feedback } = explanation;
  const [followUps, setFollowUps] = useState<FollowUp[]>(feedback.follow_ups);
  const [answers, setAnswers] = useState<string[]>(() => feedback.follow_ups.map(() => ""));
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skipped, setSkipped] = useState(false);

  const answered = followUps.every((f) => f.answer !== null);
  const present = explainParts.filter((part) => feedback[part].present).length;

  async function sendAnswers() {
    setSending(true);
    setError(null);
    try {
      const response = await fetch(`/api/explanations/${explanation.id}/follow-ups`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const body = (await response.json()) as { follow_ups?: FollowUp[]; error?: string };
      if (!response.ok || !body.follow_ups) throw new Error(body.error ?? "Something went wrong. Try again.");
      setFollowUps(body.follow_ups);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className={cn("rounded-xl px-3 py-1.5 text-xl font-semibold tabular-nums", scoreTone(feedback.score))}>
              {feedback.score}/5
            </span>
            <span className="text-muted-foreground">{present} of 5 parts of a good explanation</span>
          </div>
          {justExplained && (
            <p className="text-sm">
              Mastery: <strong>Explained</strong>. You can teach this to someone else.
            </p>
          )}
          <ul className="flex flex-col gap-3">
            {explainParts.map((part) => {
              const { present: has, note } = feedback[part];
              return (
                <li key={part} className="flex items-start gap-3">
                  <span
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-full",
                      has ? "bg-success-soft text-success-foreground" : "bg-sunflower-soft text-sunflower-foreground",
                    )}
                  >
                    {has ? <Check className="size-4" /> : <CircleDashed className="size-4" />}
                  </span>
                  <div className="flex flex-col pt-0.5">
                    <span className="font-medium">
                      {partLabels[part].label}
                      <span className="font-normal text-muted-foreground"> · {has ? "there" : "missing or weak"}</span>
                    </span>
                    <span className="leading-6">{note}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <Card className="bg-coral-soft/50 ring-coral/25">
        <CardContent className="flex flex-col gap-3">
          <span className="flex items-center gap-2 font-medium text-coral-foreground">
            <Quote className="size-4" /> Make these sharper
          </span>
          {feedback.vague_parts.length > 0 ? (
            <ul className="flex flex-col gap-3">
              {feedback.vague_parts.map((v, i) => (
                <li key={i} className="flex flex-col gap-1">
                  <q className="w-fit rounded bg-background/70 px-1.5 text-sm italic">{v.quote}</q>
                  <span className="leading-6">{v.issue}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Nothing vague: your wording was clear throughout.</p>
          )}
        </CardContent>
      </Card>

      <Card className="gap-0 bg-info-soft/40 py-0 ring-info/25">
        <CardContent className="flex flex-col gap-4 p-4 sm:p-6">
          <div className="flex flex-col gap-1">
            <span className="flex items-center gap-2 font-medium text-info-foreground">
              <MessagesSquare className="size-4" /> {followUps.length === 1 ? "A question" : "Questions"} from your
              listener
            </span>
            {!answered && (
              <p className="text-sm text-muted-foreground">
                Someone new to this would ask you next. Answer from memory, in a few sentences.
              </p>
            )}
          </div>
          <ol className="flex flex-col gap-4">
            {followUps.map((f, i) => (
              <li key={i} className="flex flex-col gap-2">
                <p className="leading-6 font-medium">{f.question}</p>
                {f.answer === null ? (
                  <Textarea
                    value={answers[i]}
                    onChange={(e) => setAnswers((a) => a.map((v, j) => (j === i ? e.target.value : v)))}
                    maxLength={MAX_FOLLOW_UP_CHARS}
                    rows={4}
                    disabled={sending}
                    placeholder="Your answer…"
                    aria-label={`Your answer to question ${i + 1}`}
                    className="min-h-24 bg-background px-3 py-2.5 md:text-base"
                  />
                ) : (
                  <>
                    <p
                      className={cn(
                        "rounded-lg bg-background/80 px-3 py-2 text-sm leading-6 whitespace-pre-wrap",
                        !f.answer && "text-muted-foreground italic",
                      )}
                    >
                      {f.answer || "Skipped"}
                    </p>
                    {f.reply && (
                      <div className="flex items-start gap-2">
                        {f.closed ? (
                          <Check className="mt-1 size-4 shrink-0 text-success" />
                        ) : (
                          <CircleDashed className="mt-1 size-4 shrink-0 text-sunflower-foreground" />
                        )}
                        <span className="leading-6">
                          <strong className={f.closed ? "text-success-foreground" : "text-sunflower-foreground"}>
                            {f.closed ? "Gap filled." : "Not quite."}
                          </strong>{" "}
                          {f.reply}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </li>
            ))}
          </ol>
        </CardContent>
        {!answered && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-background/50 px-4 py-4 sm:px-6">
            <p className="text-sm text-coral-foreground" role="alert">
              {error}
            </p>
            <Button
              size="lg"
              className="h-10 px-4"
              disabled={sending || answers.every((a) => !a.trim())}
              onClick={sendAnswers}
            >
              {sending ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Reading your answers…
                </>
              ) : (
                <>
                  Send {followUps.length === 1 ? "answer" : "answers"} <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </div>
        )}
      </Card>

      {answered || skipped ? (
        <Card className="gap-0 py-0">
          <CardContent className="flex flex-col gap-3 border-l-4 border-primary p-5 sm:p-6">
            <span className="flex items-center gap-2 font-medium">
              <Sparkles className="size-4 text-primary" /> A tighter version
            </span>
            <p className="leading-7 whitespace-pre-wrap">{feedback.tighter_version}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-muted/60 p-3 text-muted-foreground">
          <span className="flex size-9 items-center justify-center rounded-lg bg-background">
            <Lock className="size-4" />
          </span>
          <span className="min-w-48 flex-1 text-sm">
            A tighter version of your explanation opens after the questions. Filling the gaps yourself first is what
            makes it stick.
          </span>
          <Button variant="ghost" size="sm" onClick={() => setSkipped(true)}>
            Show it now
          </Button>
        </div>
      )}

      <details className="rounded-xl border bg-card px-4 py-3">
        <summary className="cursor-pointer text-sm font-medium text-muted-foreground select-none hover:text-foreground">
          Your explanation
        </summary>
        <p className="mt-3 text-sm leading-6 whitespace-pre-wrap">{explanation.text}</p>
      </details>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="lg" className="h-10 px-4" onClick={onExplainAgain}>
          <RotateCcw className="size-4" /> Explain it again
        </Button>
        <Link
          href={`/topics/${topicId}/card#think-deeper`}
          className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-10 px-4")}
        >
          <Telescope className="size-4" /> Think deeper
        </Link>
        <Link href={`/topics/${topicId}`} className={cn(buttonVariants({ size: "lg" }), "h-10 px-4")}>
          Back to topic <ArrowRight className="size-4" />
        </Link>
      </div>
    </div>
  );
}
