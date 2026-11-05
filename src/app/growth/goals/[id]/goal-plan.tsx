"use client";

import { useState, useTransition } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { GoalPlan, GoalPlanAnswer } from "@/lib/schemas";
import { addGoalSteps } from "../../actions";

// "AI helps": Claude drafts steps for the goal. When the goal is too vague to
// plan, it asks a few questions first; then you pick the steps to add.
export function GoalPlanHelper({ goalId, room }: { goalId: string; room: number }) {
  const [questions, setQuestions] = useState<string[] | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  // The answers the plan was made from, kept for "Try again" and the note.
  const [given, setGiven] = useState<GoalPlanAnswer[] | null>(null);
  const [plan, setPlan] = useState<GoalPlan | null>(null);
  const [picked, setPicked] = useState<boolean[]>([]);
  const [saveNote, setSaveNote] = useState(true);
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<number | null>(null);
  const [adding, start] = useTransition();

  async function ask(withAnswers: GoalPlanAnswer[] | null) {
    setThinking(true);
    setError(null);
    setAdded(null);
    try {
      const response = await fetch(`/api/goals/${goalId}/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: withAnswers }),
      });
      const body = (await response.json().catch(() => null)) as { plan?: GoalPlan; error?: string } | null;
      if (!response.ok || !body?.plan) throw new Error(body?.error ?? "Something went wrong. Try again.");
      const next = body.plan;
      setGiven(withAnswers);
      if (next.questions.length > 0) {
        setQuestions(next.questions);
        setAnswers(next.questions.map(() => ""));
        setPlan(null);
      } else {
        setQuestions(null);
        setPlan(next);
        // Picked up to the room left for steps.
        setPicked(next.steps.map((_, i) => i < room));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
    } finally {
      setThinking(false);
    }
  }

  const close = () => {
    setQuestions(null);
    setPlan(null);
    setGiven(null);
    setError(null);
  };

  const chosen = plan ? plan.steps.filter((_, i) => picked[i]) : [];
  const answered = (given ?? []).filter((a) => a.answer);
  const add = () =>
    start(async () => {
      const note =
        saveNote && answered.length > 0
          ? `From "AI helps":\n\n${answered.map((a) => `${a.question}\n${a.answer}`).join("\n\n")}`.slice(0, 4000)
          : null;
      const result = await addGoalSteps(goalId, chosen, note);
      setError(result.error);
      if (!result.error) {
        close();
        setAdded(chosen.length);
      }
    });

  const errorLine = error && (
    <p className="text-sm text-coral-foreground" role="alert">
      {error}
    </p>
  );

  if (!questions && !plan) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" onClick={() => ask(null)} disabled={thinking}>
            {thinking ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {thinking ? "Thinking…" : "AI helps"}
          </Button>
          <span className="text-xs text-muted-foreground">
            Claude drafts steps to reach this goal. If it needs to know more, it asks first.
          </span>
        </div>
        {added !== null && (
          <p className="text-sm text-success-foreground" role="status">
            Added {added} {added === 1 ? "step" : "steps"}.
          </p>
        )}
        {errorLine}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl bg-muted/50 p-4">
      <span className="flex items-center gap-2 text-sm font-medium">
        <Sparkles className="size-4 text-primary" /> AI helps
      </span>

      {questions && (
        <>
          <p className="-mt-2 text-sm text-muted-foreground">
            A few questions first, so the plan fits you. Skip any you&apos;d rather not answer.
          </p>
          {questions.map((q, i) => (
            <label key={q} className="flex flex-col gap-1.5">
              <span className="text-sm">{q}</span>
              <Textarea
                value={answers[i]}
                onChange={(e) => setAnswers(answers.map((a, j) => (j === i ? e.target.value : a)))}
                rows={2}
                maxLength={1000}
                className="bg-background"
              />
            </label>
          ))}
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => ask(questions.map((question, i) => ({ question, answer: answers[i].trim() })))} disabled={thinking}>
              {thinking && <Loader2 className="size-4 animate-spin" />} {thinking ? "Making the plan…" : "Make the plan"}
            </Button>
            <Button variant="ghost" onClick={close} disabled={thinking}>
              Cancel
            </Button>
          </div>
        </>
      )}

      {plan && (
        <>
          <p className="text-sm leading-6">{plan.summary}</p>
          {plan.assumptions && <p className="-mt-2 text-sm text-muted-foreground italic">{plan.assumptions}</p>}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Steps to add</span>
            <ul className="flex flex-col gap-1">
              {plan.steps.map((s, i) => (
                <li key={s}>
                  <label className="flex items-start gap-3 rounded-lg px-2 py-1.5 hover:bg-background/70">
                    <input
                      type="checkbox"
                      checked={picked[i]}
                      onChange={(e) => setPicked(picked.map((p, j) => (j === i ? e.target.checked : p)))}
                      className="mt-0.5 size-4 shrink-0 accent-primary"
                    />
                    <span className="text-sm">{s}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
          {answered.length > 0 && (
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={saveNote} onChange={(e) => setSaveNote(e.target.checked)} className="size-4 accent-primary" />
              Save my answers as a note
            </label>
          )}
          <div className="flex flex-wrap gap-2">
            <Button onClick={add} disabled={adding || thinking || chosen.length === 0 || chosen.length > room}>
              {adding && <Loader2 className="size-4 animate-spin" />}
              Add {chosen.length} {chosen.length === 1 ? "step" : "steps"}
            </Button>
            <Button variant="outline" onClick={() => ask(given)} disabled={adding || thinking}>
              {thinking && <Loader2 className="size-4 animate-spin" />} Try again
            </Button>
            <Button variant="ghost" onClick={close} disabled={adding || thinking}>
              Close
            </Button>
          </div>
          {chosen.length > room && (
            <p className="text-sm text-muted-foreground">There&apos;s room for {room} more steps on this goal.</p>
          )}
        </>
      )}
      {errorLine}
    </div>
  );
}
