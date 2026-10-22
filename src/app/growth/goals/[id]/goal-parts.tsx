"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, Loader2, Minus, Pause, Play, Plus, RotateCcw, Trash2, Trophy, Wind, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatAmount, type GoalStatus } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import {
  addGoalNote,
  addGoalStep,
  deleteGoal,
  deleteGoalNote,
  deleteGoalStep,
  setGoalMetric,
  setGoalStatus,
  setGoalStepDone,
} from "../../actions";

// The interactive parts of a goal's page. Each calls a server action, and the
// page re-renders with fresh data.

function ErrorLine({ error }: { error: string | null }) {
  return error ? (
    <p className="text-sm text-coral-foreground" role="alert">
      {error}
    </p>
  ) : null;
}

/** The number reached so far: one up or down, or type it in. */
export function MetricControl({ goalId, current, unit }: { goalId: string; current: number; unit: string | null }) {
  const [value, setValue] = useState(String(current));
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const save = (next: number) =>
    start(async () => {
      const result = await setGoalMetric(goalId, next);
      setError(result.error);
      if (!result.error) setValue(String(next));
    });
  const typed = Number(value.replace(",", "."));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="icon" aria-label="One less" disabled={pending || current <= 0} onClick={() => save(Math.max(0, current - 1))}>
          <Minus className="size-4" />
        </Button>
        <Input
          aria-label={`Reached so far${unit ? ` (${unit})` : ""}`}
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && Number.isFinite(typed)) save(typed);
          }}
          className="h-8 w-24 bg-background text-center tabular-nums"
        />
        <Button variant="outline" size="icon" aria-label="One more" disabled={pending} onClick={() => save(current + 1)}>
          <Plus className="size-4" />
        </Button>
        {value.trim() !== "" && Number.isFinite(typed) && typed !== current && (
          <Button size="sm" disabled={pending} onClick={() => save(typed)}>
            Set to {formatAmount(typed)}
          </Button>
        )}
        {pending && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
      </div>
      <ErrorLine error={error} />
    </div>
  );
}

export function StepsList({ goalId, steps }: { goalId: string; steps: { id: string; title: string; doneAt: string | null }[] }) {
  const [newStep, setNewStep] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const run = (key: string, action: () => Promise<{ error: string | null }>, after?: () => void) => {
    setBusy(key);
    start(async () => {
      const result = await action();
      setError(result.error);
      if (!result.error) after?.();
      setBusy(null);
    });
  };
  const add = () => newStep.trim() && run("new", () => addGoalStep(goalId, newStep), () => setNewStep(""));

  return (
    <div className="flex flex-col gap-3">
      {steps.length > 0 && (
        <ul className="flex flex-col gap-1">
          {steps.map((s) => (
            <li key={s.id} className="group flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-muted/60">
              <input
                type="checkbox"
                checked={Boolean(s.doneAt)}
                disabled={pending && busy === s.id}
                onChange={(e) => run(s.id, () => setGoalStepDone(s.id, e.target.checked))}
                aria-label={s.title}
                className="size-4 shrink-0 accent-primary"
              />
              <span className={cn("flex-1 text-sm", s.doneAt && "text-muted-foreground line-through decoration-muted-foreground/50")}>
                {s.title}
              </span>
              <button
                type="button"
                onClick={() => run(`x${s.id}`, () => deleteGoalStep(s.id))}
                disabled={pending}
                aria-label={`Remove step: ${s.title}`}
                className="rounded-full p-1 text-muted-foreground opacity-60 hover:text-foreground hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <Input
          value={newStep}
          onChange={(e) => setNewStep(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          maxLength={200}
          placeholder={steps.length === 0 ? "Add a first step" : "Add a step"}
          aria-label="New step"
          className="h-9 bg-background"
        />
        <Button type="button" variant="secondary" onClick={add} disabled={!newStep.trim() || pending} className="h-9">
          {pending && busy === "new" ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Add
        </Button>
      </div>
      <ErrorLine error={error} />
    </div>
  );
}

const noteDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Stockholm" });

export function NotesLog({ goalId, notes }: { goalId: string; notes: { id: string; createdAt: string; body: string }[] }) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const add = () =>
    start(async () => {
      const result = await addGoalNote(goalId, body);
      setError(result.error);
      if (!result.error) setBody("");
    });

  return (
    <div className="flex flex-col gap-3">
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={2}
        maxLength={4000}
        placeholder="How's it going? What moved, what's in the way, what you noticed."
        aria-label="New note"
        className="bg-background"
      />
      <Button variant="secondary" className="w-fit" onClick={add} disabled={!body.trim() || pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Add note
      </Button>
      <ErrorLine error={error} />
      {notes.length > 0 && (
        <ol className="flex flex-col gap-3 border-l-2 border-border pl-4">
          {notes.map((n) => (
            <li key={n.id} className="group flex flex-col gap-0.5">
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                {noteDate.format(new Date(n.createdAt))}
                <button
                  type="button"
                  onClick={() => start(async () => setError((await deleteGoalNote(n.id)).error))}
                  aria-label="Remove note"
                  className="rounded-full p-0.5 opacity-60 hover:text-foreground hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                >
                  <X className="size-3" />
                </button>
              </span>
              <p className="text-sm leading-6 whitespace-pre-wrap">{n.body}</p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/** Moving the goal on: achieved, paused, let go, or back to active. */
export function StatusActions({ goalId, status }: { goalId: string; status: GoalStatus }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [target, setTarget] = useState<GoalStatus | null>(null);

  const move = (next: GoalStatus) => {
    setTarget(next);
    start(async () => setError((await setGoalStatus(goalId, next)).error));
  };
  const icon = (s: GoalStatus, Icon: typeof Check) =>
    pending && target === s ? <Loader2 className="size-4 animate-spin" /> : <Icon className="size-4" />;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {status === "active" && (
          <>
            <Button onClick={() => move("achieved")} disabled={pending}>
              {icon("achieved", Trophy)} Mark as achieved
            </Button>
            <Button variant="outline" onClick={() => move("paused")} disabled={pending}>
              {icon("paused", Pause)} Pause
            </Button>
            <Button variant="ghost" onClick={() => move("let_go")} disabled={pending}>
              {icon("let_go", Wind)} Let it go
            </Button>
          </>
        )}
        {status === "paused" && (
          <>
            <Button onClick={() => move("active")} disabled={pending}>
              {icon("active", Play)} Pick it up again
            </Button>
            <Button variant="ghost" onClick={() => move("let_go")} disabled={pending}>
              {icon("let_go", Wind)} Let it go
            </Button>
          </>
        )}
        {(status === "achieved" || status === "let_go") && (
          <Button variant="outline" onClick={() => move("active")} disabled={pending}>
            {icon("active", RotateCcw)} {status === "achieved" ? "Reopen" : "Bring it back"}
          </Button>
        )}
      </div>
      {status === "achieved" && (
        <p className="text-xs text-muted-foreground">Reopening takes it out of your achievements again.</p>
      )}
      <ErrorLine error={error} />
    </div>
  );
}

// Two steps: the first click asks, the second deletes.
export function DeleteGoal({ goalId, title }: { goalId: string; title: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!confirming) {
    return (
      <Button variant="ghost" className="w-fit text-muted-foreground hover:text-coral-foreground" onClick={() => setConfirming(true)}>
        <Trash2 className="size-4" /> Delete goal
      </Button>
    );
  }
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-coral-soft p-4 ring-1 ring-coral/30" role="alertdialog" aria-labelledby="delete-goal">
      <p id="delete-goal" className="font-medium text-coral-foreground">
        Delete “{title}”?
      </p>
      <p className="text-sm">This removes its steps and notes. An achievement it earned stays in your achievements.</p>
      <ErrorLine error={error} />
      <div className="flex flex-wrap gap-2">
        <Button
          variant="destructive"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const result = await deleteGoal(goalId);
              if (result.error) setError(result.error);
              else router.push("/growth/goals");
            })
          }
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />} Delete for good
        </Button>
        <Button variant="outline" disabled={pending} onClick={() => setConfirming(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
