"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Loader2, Pencil, Plus, Target, Trash2, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Achievement } from "@/lib/goals";
import { formatDay, type AchievementInput } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { deleteAchievement, logAchievement, updateAchievement } from "../actions";

type GoalOption = { id: string; title: string };

// "Log a win", and each achievement with edit and remove. A win can be on
// its own or towards a goal; one a goal earned keeps its goal.

function AchievementForm({
  id,
  initial,
  goals,
  goalLocked,
  today,
  submitLabel,
  onSave,
  onCancel,
}: {
  id: string;
  initial: AchievementInput;
  goals: GoalOption[];
  goalLocked: boolean;
  today: string;
  submitLabel: string;
  onSave: (input: AchievementInput) => Promise<{ error: string | null }>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial.title);
  const [note, setNote] = useState(initial.note);
  const [achievedOn, setAchievedOn] = useState(initial.achievedOn);
  const [goalId, setGoalId] = useState(initial.goalId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const save = () =>
    start(async () => {
      const result = await onSave({ title, note, achievedOn, goalId: goalId || null });
      setError(result.error);
    });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor={`win-title-${id}`}>What did you do?</Label>
        <Input
          id={`win-title-${id}`}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          placeholder="e.g. Asked the first question in the all-hands"
          className="h-10 bg-background md:text-base"
          autoFocus
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`win-note-${id}`}>What it meant</Label>
        <Textarea
          id={`win-note-${id}`}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          maxLength={2000}
          placeholder="Optional. How it felt, what made it possible."
          className="bg-background"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`win-date-${id}`}>When</Label>
          <Input
            id={`win-date-${id}`}
            type="date"
            value={achievedOn}
            max={today}
            onChange={(e) => setAchievedOn(e.target.value)}
            className="h-10 bg-background"
          />
        </div>
        {!goalLocked && goals.length > 0 && (
          <div className="flex flex-col gap-2">
            <Label htmlFor={`win-goal-${id}`}>Towards a goal</Label>
            <select
              id={`win-goal-${id}`}
              value={goalId}
              onChange={(e) => setGoalId(e.target.value)}
              className="h-10 rounded-lg border border-input bg-background px-2.5 text-sm"
            >
              <option value="">None</option>
              {goals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      {error && (
        <p className="text-sm text-coral-foreground" role="alert">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button onClick={save} disabled={pending || !title.trim() || !achievedOn}>
          {pending && <Loader2 className="size-4 animate-spin" />} {submitLabel}
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export function LogWin({ goals, today }: { goals: GoalOption[]; today: string }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <Button className="w-fit" onClick={() => setOpen(true)}>
        <Plus className="size-4" /> Log a win
      </Button>
    );
  }
  return (
    <Card>
      <CardContent>
        <AchievementForm
          id="new"
          initial={{ title: "", note: "", achievedOn: today, goalId: null }}
          goals={goals}
          goalLocked={false}
          today={today}
          submitLabel="Save the win"
          onSave={async (input) => {
            const result = await logAchievement(input);
            if (!result.error) setOpen(false);
            return result;
          }}
          onCancel={() => setOpen(false)}
        />
      </CardContent>
    </Card>
  );
}

export function AchievementItem({ achievement: a, goals, today }: { achievement: Achievement; goals: GoalOption[]; today: string }) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removing, startRemoving] = useTransition();

  if (editing) {
    // The goal it's linked to stays in the list even if it isn't active.
    const options = a.goalId && a.goalTitle && !goals.some((g) => g.id === a.goalId) ? [{ id: a.goalId, title: a.goalTitle }, ...goals] : goals;
    return (
      <Card>
        <CardContent>
          <AchievementForm
            id={a.id}
            initial={{ title: a.title, note: a.note ?? "", achievedOn: a.achievedOn, goalId: a.goalId }}
            goals={options}
            goalLocked={a.fromGoal}
            today={today}
            submitLabel="Save"
            onSave={async (input) => {
              const result = await updateAchievement(a.id, input);
              if (!result.error) setEditing(false);
              return result;
            }}
            onCancel={() => setEditing(false)}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="group flex gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full",
          a.fromGoal ? "bg-success-soft text-success-foreground" : "bg-sunflower-soft text-sunflower-foreground",
        )}
      >
        {a.fromGoal ? <Target className="size-4" /> : <Trophy className="size-4" />}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="font-medium">{a.fromGoal ? `Reached: ${a.title}` : a.title}</span>
        {a.note && <p className="text-sm leading-6 whitespace-pre-wrap text-muted-foreground">{a.note}</p>}
        <span className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
          {formatDay(a.achievedOn)}
          {a.goalId && !a.fromGoal && a.goalTitle && (
            <Link href={`/growth/goals/${a.goalId}`} className="hover:text-foreground">
              Towards: {a.goalTitle}
            </Link>
          )}
        </span>
        {error && <span className="text-xs text-coral-foreground">{error}</span>}
      </div>
      <span className="flex shrink-0 items-start gap-0.5 opacity-70 group-hover:opacity-100 sm:opacity-0 sm:group-focus-within:opacity-100">
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label={`Edit “${a.title}”`}
          className="rounded-full p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Pencil className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => startRemoving(async () => setError((await deleteAchievement(a.id)).error))}
          disabled={removing}
          aria-label={`Remove “${a.title}”`}
          className="rounded-full p-1.5 text-muted-foreground hover:bg-accent hover:text-coral-foreground"
        >
          {removing ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
        </button>
      </span>
    </div>
  );
}
