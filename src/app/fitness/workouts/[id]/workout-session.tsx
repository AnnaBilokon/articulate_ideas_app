"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { Check, CheckCircle2, Info, Loader2, Repeat, RotateCcw, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Workout, WorkoutExercise } from "@/lib/fitness";
import { FEELING_LABELS, feelings, prescription, takesWeight, type Feeling } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import {
  deleteWorkout,
  finishWorkout,
  removeWorkoutExercise,
  reopenWorkout,
  setExerciseDone,
  setExerciseWeight,
  swapExercise,
} from "../../actions";
import { Chip, ExerciseHow, minutesLabel } from "../../fitness-bits";

export function WorkoutSession({ workout }: { workout: Workout }) {
  const [exercises, setOptimistic] = useOptimistic(
    workout.exercises,
    (list, change: { id: string; done: boolean }) => list.map((e) => (e.id === change.id ? { ...e, done: change.done } : e)),
  );
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const done = workout.doneAt !== null;
  const ticked = exercises.filter((e) => e.done).length;
  const next = exercises.find((e) => !e.done);

  function toggle(e: WorkoutExercise) {
    startTransition(async () => {
      setOptimistic({ id: e.id, done: !e.done });
      setError((await setExerciseDone(e.id, !e.done)).error);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {!done && exercises.length > 0 && workout.minutes >= 20 && workout.kind !== "mobility" && (
        <p className="flex items-start gap-2 rounded-xl bg-muted/60 p-3 text-sm">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" />
          Warm up first: 3 minutes of easy movement, like marching on the spot and arm circles.
        </p>
      )}

      {exercises.length > 0 && (
        <section className="flex flex-col gap-3" aria-labelledby="exercises">
          <h2 id="exercises" className="text-lg font-semibold tracking-tight text-heading">
            Exercises{" "}
            <span className="text-sm font-normal text-muted-foreground">
              {ticked} of {exercises.length} done
            </span>
          </h2>
          <ol className="flex flex-col gap-2">
            {exercises.map((e) => (
              <li key={e.id}>
                <ExerciseRow
                  // A swap brings a new exercise: its weight starts empty.
                  key={e.exerciseId}
                  exercise={e}
                  isNext={!done && next?.id === e.id}
                  locked={done}
                  onToggle={() => toggle(e)}
                  onError={setError}
                />
              </li>
            ))}
          </ol>
        </section>
      )}

      {error && (
        <p className="text-sm text-coral-foreground" role="alert">
          {error}
        </p>
      )}

      {done ? <DoneSummary workout={workout} /> : <FinishForm workout={workout} allTicked={exercises.length > 0 && !next} />}

      <DeleteWorkout workoutId={workout.id} />
    </div>
  );
}

function ExerciseRow({
  exercise: e,
  isNext,
  locked,
  onToggle,
  onError,
}: {
  exercise: WorkoutExercise;
  isNext: boolean;
  locked: boolean;
  onToggle: () => void;
  onError: (error: string | null) => void;
}) {
  const [showHow, setShowHow] = useState(false);
  const [weight, setWeight] = useState(e.weightKg === null ? "" : String(e.weightKg));
  const [pending, start] = useTransition();
  const [swapSeed, setSwapSeed] = useState(1);
  const weighted = e.measure !== null && takesWeight(e.equipment, e.measure);

  function saveWeight() {
    const value = weight.trim() === "" ? null : Number(weight.replace(",", "."));
    if (value === e.weightKg || (value !== null && Number.isNaN(value))) return;
    start(async () => onError((await setExerciseWeight(e.id, value)).error));
  }

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl bg-card p-3 ring-1 ring-foreground/10 transition-colors sm:p-4",
        isNext && "ring-2 ring-primary/40",
        e.done && "bg-muted/40",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        disabled={locked}
        aria-pressed={e.done}
        aria-label={`${e.name}: ${e.done ? "done" : "not done"}`}
        className={cn(
          "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full ring-2 transition-colors",
          e.done ? "bg-success text-background ring-success" : "ring-foreground/20 hover:ring-primary",
        )}
      >
        {e.done && <Check className="size-4" strokeWidth={3} />}
      </button>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <span className={cn("font-medium", e.done && "text-muted-foreground line-through decoration-foreground/30")}>{e.name}</span>
          <span className="text-sm text-muted-foreground tabular-nums">{prescription(e)}</span>
        </div>
        {isNext && <span className="text-xs font-medium text-primary">Next</span>}
        {showHow && <ExerciseHow name={e.name} how={e.how} picture={e.picture} />}
        <div className="flex flex-wrap items-center gap-1">
          {weighted && (
            <span className="mr-1 flex items-center gap-1.5">
              <Input
                value={weight}
                onChange={(x) => setWeight(x.target.value)}
                onBlur={saveWeight}
                onKeyDown={(x) => x.key === "Enter" && x.currentTarget.blur()}
                inputMode="decimal"
                placeholder="–"
                aria-label={`Weight for ${e.name}, in kg`}
                className="h-7 w-16 bg-background text-right tabular-nums"
              />
              <span className="text-xs text-muted-foreground">kg</span>
            </span>
          )}
          <Button variant="ghost" size="xs" onClick={() => setShowHow(!showHow)} className="text-muted-foreground">
            <Info className="size-3" /> {showHow ? "Hide" : "How"}
          </Button>
          {!locked && e.exerciseId && (
            <Button
              variant="ghost"
              size="xs"
              disabled={pending}
              className="text-muted-foreground"
              onClick={() =>
                start(async () => {
                  onError((await swapExercise(e.id, swapSeed)).error);
                  setSwapSeed(swapSeed + 1);
                })
              }
            >
              {pending ? <Loader2 className="size-3 animate-spin" /> : <Repeat className="size-3" />} Swap
            </Button>
          )}
          {!locked && (
            <Button
              variant="ghost"
              size="xs"
              disabled={pending}
              className="text-muted-foreground hover:text-coral-foreground"
              onClick={() => start(async () => onError((await removeWorkoutExercise(e.id)).error))}
            >
              <X className="size-3" /> Remove
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function FinishForm({ workout, allTicked }: { workout: Workout; allTicked: boolean }) {
  const [open, setOpen] = useState(workout.exercises.length === 0);
  const [minutes, setMinutes] = useState(String(workout.minutes));
  const [feeling, setFeeling] = useState<Feeling | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <Button size="lg" variant={allTicked ? "default" : "outline"} className="h-10 w-fit px-4" onClick={() => setOpen(true)}>
        <CheckCircle2 className="size-4" /> {allTicked ? "Finish workout" : "Finish now"}
      </Button>
    );
  }

  return (
    <Card>
      <CardContent>
        <form
          className="flex flex-col gap-4"
          onSubmit={(x) => {
            x.preventDefault();
            start(async () => setError((await finishWorkout(workout.id, { minutes: Number(minutes), feeling, note })).error));
          }}
        >
          <p className="font-medium text-heading">{allTicked ? "All done. Nice work." : "Finishing early counts too."}</p>
          <div className="flex max-w-40 flex-col gap-2">
            <Label htmlFor="workout-minutes">Minutes it took</Label>
            <Input
              id="workout-minutes"
              type="number"
              inputMode="numeric"
              min={1}
              max={600}
              value={minutes}
              onChange={(x) => setMinutes(x.target.value)}
              required
              className="h-10 bg-background md:text-base"
            />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">How did it feel?</span>
            <div className="flex flex-wrap gap-2">
              {feelings.map((f) => (
                <Chip key={f} on={feeling === f} onClick={() => setFeeling(feeling === f ? null : f)}>
                  {FEELING_LABELS[f]}
                </Chip>
              ))}
            </div>
          </div>
          <Textarea
            value={note}
            onChange={(x) => setNote(x.target.value)}
            maxLength={1000}
            rows={2}
            placeholder="A note for next time, if you like"
            aria-label="Note"
            className="bg-background"
          />
          {error && (
            <p className="text-sm text-coral-foreground" role="alert">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" size="lg" className="h-10 px-4" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Save as done
            </Button>
            <Button type="button" variant="ghost" className="h-10" disabled={pending} onClick={() => setOpen(false)}>
              Not yet
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function DoneSummary({ workout }: { workout: Workout }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <Card className="bg-success-soft/60">
      <CardContent className="flex flex-col gap-3">
        <p className="flex items-center gap-2 font-medium text-success-foreground">
          <CheckCircle2 className="size-5" /> Done · {minutesLabel(workout.minutes)}
          {workout.feeling && ` · felt ${FEELING_LABELS[workout.feeling].toLowerCase()}`}
        </p>
        {workout.note && <p className="text-sm leading-6">{workout.note}</p>}
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => router.push("/fitness")}>Back to Today</Button>
          {workout.source !== "logged" && (
            <Button
              variant="ghost"
              disabled={pending}
              onClick={() => start(async () => setError((await reopenWorkout(workout.id)).error))}
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />} Not done yet
            </Button>
          )}
        </div>
        {error && <p className="text-sm text-coral-foreground">{error}</p>}
      </CardContent>
    </Card>
  );
}

// Two steps: the first click asks, the second deletes.
function DeleteWorkout({ workoutId }: { workoutId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!confirming) {
    return (
      <Button variant="ghost" className="w-fit text-muted-foreground hover:text-coral-foreground" onClick={() => setConfirming(true)}>
        <Trash2 className="size-4" /> Delete workout
      </Button>
    );
  }
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-coral-soft p-4 ring-1 ring-coral/30" role="alertdialog" aria-labelledby="delete-workout">
      <p id="delete-workout" className="font-medium text-coral-foreground">
        Delete this workout? It leaves your week too.
      </p>
      <div className="flex gap-2">
        <Button
          variant="destructive"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const result = await deleteWorkout(workoutId);
              if (result.error) setError(result.error);
              else router.push("/fitness");
            })
          }
        >
          {pending && <Loader2 className="size-4 animate-spin" />} Delete
        </Button>
        <Button variant="ghost" disabled={pending} onClick={() => setConfirming(false)}>
          Keep it
        </Button>
      </div>
      {error && <p className="text-sm text-coral-foreground">{error}</p>}
    </div>
  );
}
