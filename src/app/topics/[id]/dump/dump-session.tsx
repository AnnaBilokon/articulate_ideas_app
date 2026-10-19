"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowRight, CalendarCheck, Check, CircleDashed, Lightbulb, Loader2, PenLine, RotateCcw, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { noSubscribe, readStored, writeStored } from "@/lib/local-draft";
import { MAX_DUMP_CHARS, type DumpRecord } from "@/lib/schemas/grading";
import { cn } from "@/lib/utils";

type Previous = { text: string; feedback: DumpRecord };

const wordCount = (text: string) => (text.trim() ? text.trim().split(/\s+/).length : 0);

// The draft and the nudges used are kept in this browser, so a refresh or a
// closed tab doesn't lose them.
const draftKey = (topicId: string) => `dump-draft:${topicId}`;
const nudgesKey = (topicId: string) => `dump-nudges:${topicId}`;

export function DumpSession({
  topicId,
  cues,
  previous,
}: {
  topicId: string;
  cues: string[];
  previous: Previous | null;
}) {
  const [result, setResult] = useState<Previous | null>(previous);
  const [writing, setWriting] = useState(previous === null);
  // Stored values until the learner changes them; "" on the server, the stored ones in the browser.
  const savedDraft = useSyncExternalStore(noSubscribe, () => readStored(draftKey(topicId)), () => "");
  const savedNudges = useSyncExternalStore(noSubscribe, () => readStored(nudgesKey(topicId)), () => "");
  const [edited, setEdited] = useState<string | null>(null);
  const [editedNudges, setEditedNudges] = useState<number | null>(null);
  const text = edited ?? savedDraft;
  const nudges = Math.min(cues.length, editedNudges ?? (Number(savedNudges) || 0));
  const [grading, setGrading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function updateText(value: string) {
    setEdited(value);
    writeStored(draftKey(topicId), value);
  }

  function nudge() {
    const next = Math.min(cues.length, nudges + 1);
    setEditedNudges(next);
    writeStored(nudgesKey(topicId), String(next));
  }

  // Adds the cue as a heading and puts the cursor under it, ready to type.
  function answerCue(cue: string) {
    const prefix = text.trim() ? `${text.replace(/\s+$/, "")}\n\n` : "";
    const next = `${prefix}${cue}\n`;
    updateText(next);
    requestAnimationFrame(() => {
      const box = textareaRef.current;
      if (!box) return;
      box.focus();
      box.setSelectionRange(next.length, next.length);
      box.scrollTop = box.scrollHeight;
    });
  }

  async function submit() {
    setGrading(true);
    setError(null);
    try {
      const response = await fetch(`/api/topics/${topicId}/dump`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text, nudges }),
      });
      const body = (await response.json()) as { feedback?: DumpRecord; error?: string };
      if (!response.ok || !body.feedback) throw new Error(body.error ?? "Something went wrong. Try again.");
      setResult({ text, feedback: body.feedback });
      setWriting(false);
      updateText("");
      setEditedNudges(0);
      writeStored(nudgesKey(topicId), "");
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
              <PenLine className="size-4 text-primary" /> What do you remember?
            </span>
            <p className="text-sm text-muted-foreground">
              Put the whole topic together: the main idea of each part, how the parts connect, and why it matters.
              Rough notes are fine, and struggling a little is what makes it stick. If you get stuck, ask for a nudge:
              each one is a cue, never an answer.
            </p>
          </div>

          {nudges > 0 && (
            <ol className="flex flex-col gap-1.5 rounded-xl bg-sunflower-soft/70 p-3" aria-label="Nudges">
              {cues.slice(0, nudges).map((cue) => (
                <li key={cue} className="flex items-start gap-2 text-sm">
                  <Lightbulb className="mt-0.5 size-4 shrink-0 text-sunflower-foreground" />
                  <span className="flex-1 leading-6">{cue}</span>
                  <Button
                    variant="ghost"
                    size="xs"
                    disabled={grading}
                    onClick={() => answerCue(cue)}
                    className="text-sunflower-foreground"
                  >
                    Answer this
                  </Button>
                </li>
              ))}
            </ol>
          )}

          <Textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => updateText(e.target.value)}
            maxLength={MAX_DUMP_CHARS}
            rows={14}
            autoFocus
            disabled={grading}
            placeholder="Start anywhere…"
            aria-label="Your brain dump"
            className="min-h-72 bg-background px-3 py-2.5 md:text-base"
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {wordCount(text).toLocaleString("en")} words
              {nudges > 0 && ` · ${nudges} ${nudges === 1 ? "nudge" : "nudges"} used`}
            </p>
            <Button variant="outline" disabled={grading || nudges >= cues.length} onClick={nudge}>
              <Lightbulb className="size-4" />
              {nudges >= cues.length ? "No more nudges" : "Give me a nudge"}
            </Button>
          </div>
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
                  <Loader2 className="size-4 animate-spin" /> Comparing with the lesson…
                </>
              ) : (
                <>
                  Check my recall <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  if (!result) return null;
  const { feedback } = result;

  return (
    <div className="flex flex-col gap-5">
      <p className="flex items-center gap-2 rounded-xl bg-info-soft/60 px-4 py-3 text-sm text-info-foreground">
        <CalendarCheck className="size-4 shrink-0" />
        Done for today. Your questions come back in tomorrow&apos;s review; the quiz is optional.
      </p>
      <Card className="bg-success-soft/50 ring-success/25">
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2 text-sm font-medium">
            <span className="rounded-full bg-success-soft px-2.5 py-1 text-success-foreground">
              {feedback.right.length} right
            </span>
            <span className="rounded-full bg-sunflower-soft px-2.5 py-1 text-sunflower-foreground">
              {feedback.missed.length} missed
            </span>
            <span className="rounded-full bg-coral-soft px-2.5 py-1 text-coral-foreground">
              {feedback.wrong.length} to correct
            </span>
            <span className="flex items-center gap-1 rounded-full bg-info-soft px-2.5 py-1 text-info-foreground">
              <Lightbulb className="size-3.5" />
              {feedback.nudges === 0
                ? "no nudges"
                : `${feedback.nudges} ${feedback.nudges === 1 ? "nudge" : "nudges"}`}
            </span>
          </div>
          <p className="leading-7">{feedback.summary}</p>
        </CardContent>
      </Card>

      <FeedbackList
        title="You got these"
        tone="success"
        icon={<Check className="size-4" />}
        items={feedback.right}
        empty="Nothing matched the lesson yet. That's useful to know; the card will help."
      />
      <FeedbackList
        title="You missed these"
        tone="sunflower"
        icon={<CircleDashed className="size-4" />}
        items={feedback.missed}
        empty="Nothing important missing."
      />

      <Card className="bg-coral-soft/50 ring-coral/25">
        <CardContent className="flex flex-col gap-3">
          <span className="flex items-center gap-2 font-medium text-coral-foreground">
            <X className="size-4" /> Worth correcting
          </span>
          {feedback.wrong.length > 0 ? (
            <ul className="flex flex-col gap-3">
              {feedback.wrong.map((w, i) => (
                <li key={i} className="flex flex-col gap-1">
                  <q className="w-fit rounded bg-background/70 px-1.5 text-sm italic">{w.quote}</q>
                  <span className="leading-6">{w.issue}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Nothing you wrote was wrong.</p>
          )}
        </CardContent>
      </Card>

      <details className="rounded-xl border bg-card px-4 py-3">
        <summary className="cursor-pointer text-sm font-medium text-muted-foreground select-none hover:text-foreground">
          Your brain dump
        </summary>
        <p className="mt-3 text-sm leading-6 whitespace-pre-wrap">{result.text}</p>
      </details>

      <div className="flex flex-wrap gap-2">
        <Link href={`/topics/${topicId}/card`} className={cn(buttonVariants({ size: "lg" }), "h-10 px-4")}>
          Open topic card <ArrowRight className="size-4" />
        </Link>
        <Button variant="outline" size="lg" className="h-10 px-4" onClick={() => setWriting(true)}>
          <RotateCcw className="size-4" /> Do another brain dump
        </Button>
      </div>
    </div>
  );
}

const tones = {
  success: { card: "bg-success-soft/50 ring-success/25", title: "text-success-foreground" },
  sunflower: { card: "bg-sunflower-soft/60 ring-sunflower/40", title: "text-sunflower-foreground" },
};

function FeedbackList({
  title,
  tone,
  icon,
  items,
  empty,
}: {
  title: string;
  tone: keyof typeof tones;
  icon: React.ReactNode;
  items: string[];
  empty: string;
}) {
  return (
    <Card className={tones[tone].card}>
      <CardContent className="flex flex-col gap-3">
        <span className={cn("flex items-center gap-2 font-medium", tones[tone].title)}>
          {icon} {title}
        </span>
        {items.length > 0 ? (
          <ul className="flex flex-col gap-1.5 pl-5">
            {items.map((item, i) => (
              <li key={i} className="list-disc leading-6">
                {item}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">{empty}</p>
        )}
      </CardContent>
    </Card>
  );
}
