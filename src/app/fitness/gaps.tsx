"use client";

import { useState, useTransition } from "react";
import { Flame, Leaf, Loader2, Plus, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { workoutGaps, type Gap, type GapItem } from "@/lib/fitness-plan";
import type { Equipment, Exercise } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { addRoutineExercises, addWarmUpOrCoolDown, addWorkoutExercises } from "./actions";
import { ExerciseThumb } from "./exercise-picker";

// Suggestions for what a workout is missing: a warm-up, a muscle group that
// keeps it balanced, stretching at the end. Each adds with a tap, or can be
// waved away.

type Target = { workoutId: string } | { routineId: string };

const ICONS = { warmup: Flame, cooldown: Leaf, muscle: Sparkles };

export function WorkoutGaps({
  items,
  library,
  equipment,
  target,
  only,
}: {
  items: GapItem[];
  library: Exercise[];
  equipment: Equipment[];
  target: Target;
  /** Just these kinds of suggestion, here (the warm-up at the top, say). */
  only?: Gap["type"][];
}) {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const gaps = workoutGaps(items, library, equipment).filter(
    (g) => (!only || only.includes(g.type)) && !dismissed.includes(gapKey(g)),
  );
  if (gaps.length === 0) return null;
  return (
    <ul className="flex flex-col gap-2.5" aria-label="Suggestions">
      {gaps.map((g) => (
        <li key={gapKey(g)}>
          <GapCard gap={g} target={target} onDismiss={() => setDismissed([...dismissed, gapKey(g)])} />
        </li>
      ))}
    </ul>
  );
}

const gapKey = (g: Gap) => (g.type === "muscle" ? `muscle:${g.muscle}` : g.type);

function GapCard({ gap, target, onDismiss }: { gap: Gap; target: Target; onDismiss: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [adding, setAdding] = useState<string | null>(null);
  const Icon = ICONS[gap.type];
  const run = (key: string, task: () => Promise<{ error: string | null }>) => {
    setAdding(key);
    start(async () => {
      setError((await task()).error);
      setAdding(null);
    });
  };
  const addOne = (exerciseId: string) =>
    "workoutId" in target ? addWorkoutExercises(target.workoutId, [exerciseId]) : addRoutineExercises(target.routineId, [exerciseId]);
  const whole = gap.type !== "muscle";

  return (
    <div className="flex flex-col gap-3 rounded-3xl border-2 border-dashed border-highlight bg-accent/50 p-4">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-highlight text-highlight-foreground">
          <Icon className="size-4.5" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="font-semibold text-heading">{gap.title}</span>
          <span className="text-sm text-muted-foreground">{gap.detail}</span>
        </div>
        <Button variant="ghost" size="icon-sm" aria-label="Not now" onClick={onDismiss} disabled={pending}>
          <X className="size-4" />
        </Button>
      </div>

      {whole ? (
        <>
          <ul className="flex flex-wrap gap-1.5">
            {gap.options.map((e) => (
              <li key={e.id} className="flex items-center gap-1.5 rounded-full bg-card py-1 pr-3 pl-1 text-sm ring-1 ring-foreground/10">
                <ExerciseThumb exercise={e} className="size-7 rounded-full" />
                {e.name}
              </li>
            ))}
          </ul>
          <Button
            className="h-10 w-fit rounded-xl"
            disabled={pending}
            onClick={() => run(gap.type, () => addWarmUpOrCoolDown(target, gap.type === "warmup" ? "warmup" : "cooldown"))}
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            {gap.type === "warmup" ? "Add the warm-up" : "Add the stretches"}
          </Button>
        </>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {gap.options.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                disabled={pending}
                onClick={() => run(e.id, () => addOne(e.id))}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl bg-card p-2 text-left ring-1 ring-foreground/10 transition-colors hover:bg-muted disabled:opacity-70",
                )}
              >
                <ExerciseThumb exercise={e} className="size-12" />
                <span className="min-w-0 flex-1 font-medium">{e.name}</span>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  {adding === e.id ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p className="text-sm text-coral-foreground" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
