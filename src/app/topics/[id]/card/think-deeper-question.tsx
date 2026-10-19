"use client";

import { useState } from "react";
import { Bookmark, BookmarkCheck, Loader2, PenLine } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MAX_CRITICAL_ANSWER_CHARS, type Critique } from "@/lib/schemas";
import { cn } from "@/lib/utils";

export type CriticalAnswer = { answer: string; feedback: Critique; created_at: string };

// One Think deeper question: think with the hints, write an answer and get
// feedback with a fuller answer and the other side, or save it to learn later.
export function ThinkDeeperQuestion({
  id,
  text,
  kindLabel,
  kindClass,
  considerations,
  savedId: initialSavedId,
  latest: initialLatest,
}: {
  id: string;
  text: string;
  kindLabel: string;
  kindClass: string;
  considerations: string[];
  savedId: string | null;
  latest: CriticalAnswer | null;
}) {
  const [savedId, setSavedId] = useState(initialSavedId);
  const [saving, setSaving] = useState(false);
  const [latest, setLatest] = useState(initialLatest);
  const [writing, setWriting] = useState(false);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleSaved() {
    setSaving(true);
    setError(null);
    try {
      const response = savedId
        ? await fetch(`/api/saved-questions/${savedId}`, { method: "DELETE" })
        : await fetch("/api/saved-questions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, criticalQuestionId: id }),
          });
      const body = (await response.json().catch(() => null)) as { id?: string; error?: string } | null;
      if (!response.ok) throw new Error(body?.error ?? "Something went wrong. Try again.");
      setSavedId(savedId ? null : (body?.id ?? null));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/critical/${id}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer: draft }),
      });
      const body = (await response.json().catch(() => null)) as { answer?: CriticalAnswer; error?: string } | null;
      if (!response.ok || !body?.answer) throw new Error(body?.error ?? "Something went wrong. Try again.");
      setLatest(body.answer);
      setWriting(false);
      setDraft("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <li className="flex flex-col gap-2 rounded-xl border bg-background p-4">
      <div className="flex items-center justify-between gap-2">
        <Badge className={cn("w-fit", kindClass)}>{kindLabel}</Badge>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSaved}
          disabled={saving}
          aria-pressed={Boolean(savedId)}
          className={cn(savedId && "text-primary")}
        >
          {savedId ? <BookmarkCheck className="size-3.5" /> : <Bookmark className="size-3.5" />}
          {savedId ? "Saved to learn later" : "Save for later"}
        </Button>
      </div>
      <p className="leading-6 font-medium">{text}</p>
      <details className="group">
        <summary className="cursor-pointer text-sm text-muted-foreground select-none hover:text-foreground">
          Things to consider
        </summary>
        <ul className="mt-2 flex flex-col gap-1 pl-5 text-sm">
          {considerations.map((c) => (
            <li key={c} className="list-disc marker:text-tag-2-foreground">
              {c}
            </li>
          ))}
        </ul>
      </details>

      {latest && !writing && <Feedback answer={latest} />}

      {writing ? (
        <form onSubmit={submit} className="flex flex-col gap-2 pt-1">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={5}
            maxLength={MAX_CRITICAL_ANSWER_CHARS}
            placeholder="What do you think, and why? A paragraph is plenty."
            aria-label="Your answer"
            autoFocus
            className="bg-card md:text-base"
          />
          <div className="flex items-center gap-2">
            <Button type="submit" disabled={pending || draft.trim().length === 0}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              {pending ? "Reading your answer…" : "Get feedback"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setWriting(false)} disabled={pending}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setWriting(true)} className="w-fit">
          <PenLine className="size-3.5" />
          {latest ? "Answer again" : "Answer it, then see a fuller answer"}
        </Button>
      )}

      {error && (
        <p className="text-sm text-coral-foreground" role="alert">
          {error}
        </p>
      )}
    </li>
  );
}

function Feedback({ answer }: { answer: CriticalAnswer }) {
  const { strengths, gaps, fuller_answer, counterargument } = answer.feedback;
  return (
    <div className="flex flex-col gap-3 rounded-lg bg-muted/60 p-3 text-sm">
      <div>
        <div className="text-xs font-medium text-muted-foreground">Your answer</div>
        <p className="whitespace-pre-line">{answer.answer}</p>
      </div>
      <Section title="What works" items={strengths} className="text-success-foreground" />
      {gaps.length > 0 && <Section title="What to add" items={gaps} className="text-sunflower-foreground" />}
      <div>
        <div className="font-medium text-heading">A fuller answer</div>
        <p className="leading-6">{fuller_answer}</p>
      </div>
      <div>
        <div className="font-medium text-heading">The other side</div>
        <p className="leading-6">{counterargument}</p>
      </div>
    </div>
  );
}

function Section({ title, items, className }: { title: string; items: string[]; className: string }) {
  return (
    <div>
      <div className={cn("font-medium", className)}>{title}</div>
      <ul className="flex list-disc flex-col gap-0.5 pl-5">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
