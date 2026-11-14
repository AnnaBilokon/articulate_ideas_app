"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Loader2, Minus, Play, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MUSCLE_LABELS, formatKg, takesWeight, type Exercise, type Routine, type RoutineExercise } from "@/lib/schemas";
import {
  addRoutineExercises,
  deleteRoutine,
  moveRoutineExercise,
  removeRoutineExercise,
  startRoutine,
  updateRoutine,
  updateRoutineExercise,
} from "../../actions";
import { ExercisePicker, ExerciseThumb } from "../../exercise-picker";
import { WorkoutGaps } from "../../gaps";

// Your own workout: the exercises you like, in your order, each with its
// sets, reps (or seconds, or minutes) and a weight to start from. Starting
// it fills in last time's weights where there are any.

const weekday = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" });

export function RoutineEditor({ routine, library }: { routine: Routine; library: Exercise[] }) {
  const router = useRouter();
  const fresh = routine.name === "New workout" && routine.exercises.length === 0;
  const [name, setName] = useState(routine.name);
  const [note, setNote] = useState(routine.note ?? "");
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [starting, startStart] = useTransition();
  const [, start] = useTransition();

  const saveDetails = () => {
    if (!name.trim() || (name === routine.name && note === (routine.note ?? ""))) return;
    start(async () => setError((await updateRoutine(routine.id, { name, note })).error));
  };

  return (
    <div className="flex flex-col gap-5 pb-28">
      <div className="flex flex-col gap-1">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={saveDetails}
          onFocus={(e) => fresh && e.currentTarget.select()}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          autoFocus={fresh}
          maxLength={80}
          aria-label="Workout name"
          className="-mx-2 rounded-lg bg-transparent px-2 py-1 text-3xl font-semibold tracking-tight text-heading outline-none hover:bg-muted/60 focus:bg-muted/60"
        />
        <p className="text-sm text-muted-foreground">
          {routine.exercises.length} {routine.exercises.length === 1 ? "exercise" : "exercises"}
          {routine.lastDone ? ` · last done ${weekday.format(new Date(`${routine.lastDone}T00:00:00Z`))}` : ""}
        </p>
      </div>
      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={saveDetails}
        maxLength={1000}
        rows={1}
        placeholder="A note: warm-up, how to progress, anything"
        aria-label="Note"
        className="min-h-10 rounded-xl bg-card"
      />

      {routine.exercises.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-border px-6 py-10 text-center">
          <p className="font-medium text-heading">Which exercises do you like to do?</p>
          <p className="text-sm text-muted-foreground">Search by name or pick a muscle group, then set the sets, reps and weight.</p>
          <Button size="lg" className="h-11 rounded-xl px-5" onClick={() => setPicking(true)}>
            <Plus className="size-4" /> Add exercises
          </Button>
        </div>
      ) : (
        <ol className="flex flex-col gap-3">
          {routine.exercises.map((e, i) => (
            <li key={e.id}>
              <PlanCard
                key={`${e.id}-${e.sets}-${e.reps}-${e.seconds}-${e.weightKg}`}
                exercise={e}
                first={i === 0}
                last={i === routine.exercises.length - 1}
                onError={setError}
              />
            </li>
          ))}
        </ol>
      )}

      {routine.exercises.length > 0 && (
        <WorkoutGaps
          items={routine.exercises}
          library={library}
          equipment={[...new Set(routine.exercises.flatMap((e) => e.equipment))]}
          target={{ routineId: routine.id }}
        />
      )}

      {routine.exercises.length > 0 && (
        <Button variant="outline" size="lg" className="h-12 rounded-2xl border-dashed text-base" onClick={() => setPicking(true)}>
          <Plus className="size-4" /> Add exercises
        </Button>
      )}

      {error && (
        <p className="text-sm text-coral-foreground" role="alert">
          {error}
        </p>
      )}

      <DeleteRoutine routineId={routine.id} />

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-background/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <span className="min-w-0 truncate text-sm text-muted-foreground">
            {routine.exercises.length === 0 ? "Add exercises to start" : `${routine.exercises.reduce((n, e) => n + e.sets, 0)} sets in all`}
          </span>
          <Button
            size="lg"
            className="h-12 rounded-xl px-6 text-base"
            disabled={routine.exercises.length === 0 || starting}
            onClick={() =>
              startStart(async () => {
                const result = await startRoutine(routine.id);
                if (result.error || !result.id) setError(result.error ?? "Could not start it.");
                else router.push(`/fitness/workouts/${result.id}`);
              })
            }
          >
            {starting ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />} Start workout
          </Button>
        </div>
      </div>

      {picking && (
        <ExercisePicker
          exercises={library}
          already={new Set(routine.exercises.map((e) => e.exerciseId))}
          onAdd={(ids) => addRoutineExercises(routine.id, ids)}
          onClose={() => setPicking(false)}
        />
      )}
    </div>
  );
}

const toNumber = (text: string) => {
  const n = Number(text.replace(",", ".").trim());
  return text.trim() === "" || Number.isNaN(n) ? null : n;
};

function PlanCard({
  exercise: e,
  first,
  last,
  onError,
}: {
  exercise: RoutineExercise;
  first: boolean;
  last: boolean;
  onError: (error: string | null) => void;
}) {
  const weighted = takesWeight(e.equipment, e.measure);
  const amountOf = (seconds: number | null) => (seconds === null ? "" : String(e.measure === "duration" ? Math.round(seconds / 60) : seconds));
  const [sets, setSets] = useState(e.sets);
  const [amount, setAmount] = useState(e.measure === "reps" ? String(e.reps ?? "") : amountOf(e.seconds));
  const [kg, setKg] = useState(e.weightKg === null ? "" : formatKg(e.weightKg));
  const [pending, start] = useTransition();

  function save(nextSets = sets) {
    const value = toNumber(amount);
    start(async () =>
      onError(
        (
          await updateRoutineExercise(e.id, {
            sets: e.measure === "duration" ? 1 : nextSets,
            reps: e.measure === "reps" ? (value === null ? null : Math.round(value)) : null,
            seconds: e.measure === "reps" || value === null ? null : Math.round(e.measure === "duration" ? value * 60 : value),
            weightKg: weighted ? toNumber(kg) : null,
          })
        ).error,
      ),
    );
  }

  const changeSets = (by: number) => {
    const next = Math.min(10, Math.max(1, sets + by));
    setSets(next);
    save(next);
  };
  const field = "h-10 rounded-xl border-transparent bg-muted px-1 text-center text-base font-semibold tabular-nums shadow-none focus-visible:bg-background md:text-base";

  return (
    <section className="flex flex-col gap-3 rounded-3xl bg-card p-4 shadow-sm ring-1 ring-foreground/10" aria-label={e.name}>
      <div className="flex items-center gap-3">
        <ExerciseThumb exercise={e} className="size-20" />
        <div className="flex min-w-0 flex-1 flex-col">
          <h2 className="leading-snug font-semibold text-heading">{e.name}</h2>
          <span className="truncate text-xs text-muted-foreground">
            {[e.muscles.map((m) => MUSCLE_LABELS[m]).join(", "), e.eachSide && "each side"].filter(Boolean).join(" · ")}
          </span>
        </div>
        <div className="flex shrink-0 items-center">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Move up"
            disabled={first || pending}
            onClick={() => start(async () => onError((await moveRoutineExercise(e.id, -1)).error))}
          >
            <ArrowUp className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Move down"
            disabled={last || pending}
            onClick={() => start(async () => onError((await moveRoutineExercise(e.id, 1)).error))}
          >
            <ArrowDown className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Remove ${e.name}`}
            disabled={pending}
            className="text-muted-foreground hover:text-coral-foreground"
            onClick={() => start(async () => onError((await removeRoutineExercise(e.id)).error))}
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        {e.measure !== "duration" && (
          <div className="flex flex-col gap-1">
            <span className="text-[0.7rem] font-medium tracking-wide text-muted-foreground uppercase">Sets</span>
            <div className="flex h-10 items-center rounded-xl bg-muted">
              <button type="button" onClick={() => changeSets(-1)} disabled={sets <= 1} className="flex size-10 items-center justify-center rounded-xl disabled:opacity-40" aria-label="One set less">
                <Minus className="size-4" />
              </button>
              <span className="w-6 text-center text-base font-semibold tabular-nums" aria-live="polite">
                {sets}
              </span>
              <button type="button" onClick={() => changeSets(1)} disabled={sets >= 10} className="flex size-10 items-center justify-center rounded-xl disabled:opacity-40" aria-label="One set more">
                <Plus className="size-4" />
              </button>
            </div>
          </div>
        )}
        <label className="flex w-20 flex-col gap-1">
          <span className="text-[0.7rem] font-medium tracking-wide text-muted-foreground uppercase">
            {e.measure === "reps" ? "Reps" : e.measure === "hold" ? "Seconds" : "Minutes"}
          </span>
          <Input
            value={amount}
            onChange={(x) => setAmount(x.target.value)}
            onBlur={() => save()}
            onKeyDown={(x) => x.key === "Enter" && x.currentTarget.blur()}
            inputMode="numeric"
            className={field}
          />
        </label>
        {weighted && (
          <label className="flex w-20 flex-col gap-1">
            <span className="text-[0.7rem] font-medium tracking-wide text-muted-foreground uppercase">Start kg</span>
            <Input
              value={kg}
              onChange={(x) => setKg(x.target.value)}
              onBlur={() => save()}
              onKeyDown={(x) => x.key === "Enter" && x.currentTarget.blur()}
              inputMode="decimal"
              placeholder="–"
              className={field}
            />
          </label>
        )}
        {pending && <Loader2 className="mb-3 size-4 animate-spin text-muted-foreground" />}
      </div>
    </section>
  );
}

// Two steps: the first click asks, the second deletes.
function DeleteRoutine({ routineId }: { routineId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!confirming) {
    return (
      <Button variant="ghost" className="w-fit text-muted-foreground hover:text-coral-foreground" onClick={() => setConfirming(true)}>
        <Trash2 className="size-4" /> Delete this workout
      </Button>
    );
  }
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-coral-soft p-4 ring-1 ring-coral/30" role="alertdialog" aria-labelledby="delete-routine">
      <p id="delete-routine" className="font-medium text-coral-foreground">
        Delete it? Workouts you&apos;ve done with it stay in your history.
      </p>
      <div className="flex gap-2">
        <Button
          variant="destructive"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const result = await deleteRoutine(routineId);
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
