"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Dialog } from "@base-ui/react/dialog";
import {
  BookmarkPlus,
  Check,
  CheckCircle2,
  Info,
  Loader2,
  Minus,
  MoreHorizontal,
  Plus,
  Repeat,
  RotateCcw,
  Timer,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { LastTime, Workout, WorkoutExercise, WorkoutSet } from "@/lib/fitness";
import {
  FEELING_LABELS,
  MUSCLE_LABELS,
  feelings,
  formatKg,
  setLabel,
  takesWeight,
  type Exercise,
  type Feeling,
  type Measure,
} from "@/lib/schemas";
import { cn } from "@/lib/utils";
import {
  addSet,
  addWorkoutExercises,
  deleteWorkout,
  finishWorkout,
  removeSet,
  removeWorkoutExercise,
  renameWorkout,
  reopenWorkout,
  saveSet,
  saveWorkoutAsRoutine,
  swapExercise,
} from "../../actions";
import { ExercisePicker, ExerciseThumb } from "../../exercise-picker";
import { Chip, ExerciseHow, minutesLabel } from "../../fitness-bits";

// A workout, set by set: type the weight and reps you really did (7 of a
// planned 12 is kept as 7) and tick the set. Last time's sets sit beside
// each one, a rest timer runs between sets, and Finish is always in reach.

type Rest = { endsAt: number; total: number };

/** Seconds of rest after a set of this kind. */
const restFor = (measure: Measure) => (measure === "reps" ? 90 : 45);

const measureOf = (e: WorkoutExercise): Measure =>
  e.measure ?? (e.reps !== null ? "reps" : e.sets === null ? "duration" : "hold");

function clock(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

/** The time now, ticking every second; null until the page is in the browser. */
function useNow(): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const every = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(every);
    };
  }, []);
  return now;
}

export function WorkoutSession({
  workout,
  library,
  lastTimes,
}: {
  workout: Workout;
  library: Exercise[];
  lastTimes: Record<string, LastTime>;
}) {
  const now = useNow();
  const [rest, setRest] = useState<Rest | null>(null);
  const [picking, setPicking] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const done = workout.doneAt !== null;
  const allSets = workout.exercises.flatMap((e) => e.logged);
  const setsDone = allSets.filter((s) => s.done).length;
  const elapsed = now === null ? null : now - Date.parse(workout.createdAt);
  // Left open for hours: the clock no longer means anything.
  const showClock = elapsed !== null && elapsed < 6 * 3600_000;
  const restLeft = rest && now !== null ? rest.endsAt - now : null;

  useEffect(() => {
    if (restLeft === null || restLeft > 0) return;
    try {
      navigator.vibrate?.([200, 100, 200]);
    } catch {
      // No vibration here (an iPhone): the bar says it instead.
    }
    const t = setTimeout(() => setRest(null), 2500);
    return () => clearTimeout(t);
  }, [restLeft]);

  /** Starts the rest timer from the moment the set was ticked. */
  function setDone(measure: Measure, at: number) {
    if (measure !== "duration") setRest({ endsAt: at + restFor(measure) * 1000, total: restFor(measure) });
  }

  return (
    <div className={cn("flex flex-col gap-5", !done && "pb-36")}>
      <WorkoutTitle workout={workout} />

      {done && <DoneSummary workout={workout} />}

      {!done && workout.exercises.length > 0 && workout.minutes >= 20 && workout.kind !== "mobility" && setsDone === 0 && (
        <p className="flex items-start gap-2 rounded-2xl bg-accent px-4 py-3 text-sm text-accent-foreground">
          <Info className="mt-0.5 size-4 shrink-0" />
          Warm up first: 3 minutes of easy movement, like marching on the spot and arm circles.
        </p>
      )}

      {workout.exercises.length === 0 && !done && (
        <div className="flex flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-border px-6 py-10 text-center">
          <p className="font-medium text-heading">Add the exercises you want to do</p>
          <p className="text-sm text-muted-foreground">Search by name or pick a muscle group. You can add more as you go.</p>
          <Button size="lg" className="h-11 rounded-xl px-5" onClick={() => setPicking(true)}>
            <Plus className="size-4" /> Add exercises
          </Button>
        </div>
      )}

      <ol className="flex flex-col gap-4">
        {workout.exercises.map((e) => (
          <li key={e.id}>
            <ExerciseCard
              exercise={e}
              last={e.exerciseId ? lastTimes[e.exerciseId] : undefined}
              locked={done}
              onSetDone={(at) => setDone(measureOf(e), at)}
              onError={setError}
            />
          </li>
        ))}
      </ol>

      {!done && workout.exercises.length > 0 && (
        <Button variant="outline" size="lg" className="h-12 rounded-2xl border-dashed text-base" onClick={() => setPicking(true)}>
          <Plus className="size-4" /> Add exercises
        </Button>
      )}

      {error && (
        <p className="text-sm text-coral-foreground" role="alert">
          {error}
        </p>
      )}

      <DeleteWorkout workoutId={workout.id} />

      {!done && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-background/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
          {rest && restLeft !== null && <RestBar left={restLeft} rest={rest} onChange={setRest} />}
          <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="flex flex-col">
              <span className="text-xl font-semibold text-heading tabular-nums">{showClock ? clock(elapsed) : "–"}</span>
              <span className="text-xs text-muted-foreground">
                {setsDone} of {allSets.length} sets
              </span>
            </div>
            <Button size="lg" className="h-12 rounded-xl px-6 text-base" onClick={() => setFinishing(true)}>
              <CheckCircle2 className="size-4.5" /> Finish
            </Button>
          </div>
        </div>
      )}

      {picking && (
        <ExercisePicker
          exercises={library}
          already={new Set(workout.exercises.flatMap((e) => (e.exerciseId ? [e.exerciseId] : [])))}
          onAdd={(ids) => addWorkoutExercises(workout.id, ids)}
          onClose={() => setPicking(false)}
        />
      )}
      {finishing && (
        <FinishDialog
          workout={workout}
          suggestedMinutes={showClock ? Math.max(1, Math.round(elapsed / 60_000)) : workout.minutes}
          setsLeft={allSets.length - setsDone}
          onClose={() => setFinishing(false)}
        />
      )}
    </div>
  );
}

function WorkoutTitle({ workout }: { workout: Workout }) {
  const [title, setTitle] = useState(workout.title);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();
  // Put together as you went: name it as you like.
  if (workout.source !== "own" || workout.doneAt) {
    return <h1 className="text-3xl font-semibold tracking-tight text-balance text-heading">{workout.title}</h1>;
  }
  return (
    <div className="flex flex-col gap-1">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => title.trim() && title !== workout.title && start(async () => setError((await renameWorkout(workout.id, title)).error))}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        maxLength={80}
        aria-label="Workout name"
        className="-mx-2 rounded-lg bg-transparent px-2 py-1 text-3xl font-semibold tracking-tight text-heading outline-none hover:bg-muted/60 focus:bg-muted/60"
      />
      {error && <p className="text-sm text-coral-foreground">{error}</p>}
    </div>
  );
}

function RestBar({ left, rest, onChange }: { left: number; rest: Rest; onChange: (rest: Rest | null) => void }) {
  const over = left <= 0;
  const nudge = (seconds: number) => onChange({ ...rest, endsAt: rest.endsAt + seconds * 1000 });
  return (
    <div className="mx-auto flex w-full max-w-3xl px-4 pt-3 sm:px-6" role="timer" aria-live="polite">
      <div className="fitness-hero flex flex-1 items-center gap-3 overflow-hidden rounded-2xl px-4 py-2.5">
        <Timer className="size-4.5 shrink-0 text-[#99d5c9]" />
        <span className="flex-1 text-sm font-medium">{over ? "Rest over: next set!" : "Rest"}</span>
        {!over && (
          <>
            <span className="text-lg font-semibold tabular-nums">{clock(left)}</span>
            <button type="button" onClick={() => nudge(-15)} className="rounded-lg bg-white/15 px-2 py-1 text-xs font-semibold hover:bg-white/25" aria-label="15 seconds less">
              −15
            </button>
            <button type="button" onClick={() => nudge(15)} className="rounded-lg bg-white/15 px-2 py-1 text-xs font-semibold hover:bg-white/25" aria-label="15 seconds more">
              +15
            </button>
          </>
        )}
        <button type="button" onClick={() => onChange(null)} className="rounded-lg p-1 hover:bg-white/15" aria-label="Skip the rest">
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}

function ExerciseCard({
  exercise: e,
  last,
  locked,
  onSetDone,
  onError,
}: {
  exercise: WorkoutExercise;
  last: LastTime | undefined;
  locked: boolean;
  onSetDone: (at: number) => void;
  onError: (error: string | null) => void;
}) {
  const [showHow, setShowHow] = useState(false);
  const [pending, start] = useTransition();
  const [swapSeed, setSwapSeed] = useState(1);
  const measure = measureOf(e);
  const weighted = takesWeight(e.equipment, measure);
  const setsDone = e.logged.filter((s) => s.done).length;
  const run = (task: () => Promise<{ error: string | null }>) => start(async () => onError((await task()).error));
  const columns = weighted ? "grid-cols-[1.5rem_minmax(0,1fr)_4.25rem_4.25rem_2.5rem]" : "grid-cols-[1.5rem_minmax(0,1fr)_4.25rem_2.5rem]";

  return (
    <section
      className={cn(
        "flex flex-col gap-3 rounded-3xl bg-card p-4 shadow-sm ring-1 ring-foreground/10 transition-shadow sm:p-5",
        e.done && "ring-2 ring-highlight",
      )}
      aria-label={e.name}
    >
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => setShowHow(!showHow)} aria-label={`How to do ${e.name}`} className="shrink-0">
          <ExerciseThumb exercise={e} className="size-14" />
        </button>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h2 className="leading-snug font-semibold text-heading">{e.name}</h2>
          <span className="truncate text-xs text-muted-foreground">
            {[e.muscles.map((m) => MUSCLE_LABELS[m]).join(", "), e.eachSide && "each side", `${setsDone}/${e.logged.length} sets`]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </div>
        {e.done && (
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-highlight text-highlight-foreground">
            <Check className="size-4" strokeWidth={3} />
          </span>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label={`More for ${e.name}`} disabled={pending} />}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <MoreHorizontal className="size-4" />}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => setShowHow(!showHow)}>
              <Info /> {showHow ? "Hide how" : "How to do it"}
            </DropdownMenuItem>
            {!locked && e.exerciseId && (
              <DropdownMenuItem
                onClick={() =>
                  run(async () => {
                    setSwapSeed(swapSeed + 1);
                    return swapExercise(e.id, swapSeed);
                  })
                }
              >
                <Repeat /> Swap for another
              </DropdownMenuItem>
            )}
            {!locked && (
              <DropdownMenuItem variant="destructive" onClick={() => run(() => removeWorkoutExercise(e.id))}>
                <Trash2 /> Remove
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {showHow && <ExerciseHow name={e.name} how={e.how} picture={e.picture} />}

      <div className="flex flex-col gap-1.5">
        <div className={cn("grid items-center gap-2 px-1 text-[0.7rem] font-medium tracking-wide text-muted-foreground uppercase", columns)}>
          <span className="text-center">Set</span>
          <span>Last time</span>
          {weighted && <span className="text-center">kg</span>}
          <span className="text-center">{measure === "reps" ? "Reps" : measure === "hold" ? "Sec" : "Min"}</span>
          <span className="sr-only">Done</span>
        </div>
        {e.logged.map((s, i) => (
          <SetRow
            key={s.id}
            set={s}
            index={i}
            measure={measure}
            weighted={weighted}
            columns={columns}
            last={last?.sets[i]}
            locked={locked}
            onDone={onSetDone}
            onError={onError}
          />
        ))}
      </div>

      {!locked && measure !== "duration" && (
        <div className="flex gap-2">
          <Button variant="secondary" className="h-10 flex-1 rounded-xl" disabled={pending} onClick={() => run(() => addSet(e.id))}>
            <Plus className="size-4" /> Add set
          </Button>
          {e.logged.length > 1 && (
            <Button
              variant="ghost"
              className="h-10 rounded-xl text-muted-foreground"
              disabled={pending}
              aria-label="Remove the last set"
              onClick={() => run(() => removeSet(e.logged.at(-1)!.id))}
            >
              <Minus className="size-4" /> Set
            </Button>
          )}
        </div>
      )}
    </section>
  );
}

const toNumber = (text: string) => {
  const n = Number(text.replace(",", ".").trim());
  return text.trim() === "" || Number.isNaN(n) ? null : n;
};

function SetRow({
  set,
  index,
  measure,
  weighted,
  columns,
  last,
  locked,
  onDone,
  onError,
}: {
  set: WorkoutSet;
  index: number;
  measure: Measure;
  weighted: boolean;
  columns: string;
  last: LastTime["sets"][number] | undefined;
  locked: boolean;
  onDone: (at: number) => void;
  onError: (error: string | null) => void;
}) {
  const target =
    measure === "reps" ? set.targetReps : measure === "duration" ? Math.round((set.targetSeconds ?? 0) / 60) : set.targetSeconds;
  const savedAmount =
    measure === "reps" ? set.reps : set.seconds === null ? null : measure === "duration" ? Math.round(set.seconds / 60) : set.seconds;
  const [kg, setKg] = useState(set.weightKg === null ? "" : formatKg(set.weightKg));
  const [amount, setAmount] = useState(savedAmount === null ? "" : String(savedAmount));
  const [done, setDone] = useState(set.done);
  const [, start] = useTransition();

  /** `at`: when it was ticked, for the rest timer. */
  function save(nextDone: boolean, at?: number) {
    // Ticked with nothing typed: done as planned.
    const typed = toNumber(amount);
    const value = typed ?? (nextDone ? target : null);
    if (nextDone && typed === null && value !== null) setAmount(String(value));
    const input = {
      reps: measure === "reps" && value !== null ? Math.round(value) : null,
      seconds: measure !== "reps" && value !== null ? Math.round(measure === "duration" ? value * 60 : value) : null,
      weightKg: weighted ? toNumber(kg) : null,
      done: nextDone,
    };
    const wasDone = done;
    setDone(nextDone);
    if (nextDone && !wasDone && at !== undefined) onDone(at);
    start(async () => {
      const result = await saveSet(set.id, input);
      if (result.error) setDone(wasDone);
      onError(result.error);
    });
  }

  // A changed weight is kept straight away; a changed amount once the set is done.
  const blurSave = () => {
    if (toNumber(kg) !== set.weightKg || (done && toNumber(amount) !== savedAmount)) save(done);
  };

  const field =
    "h-10 rounded-xl border-transparent bg-muted px-1 text-center text-base font-semibold tabular-nums shadow-none focus-visible:bg-background md:text-base";

  return (
    <div className={cn("grid items-center gap-2 rounded-2xl px-1 py-1 transition-colors", columns, done && "bg-highlight/30")}>
      <span className="text-center text-sm font-semibold text-muted-foreground">{index + 1}</span>
      <span className="truncate text-sm text-muted-foreground">{last ? setLabel(last, measure) : "–"}</span>
      {weighted && (
        <Input
          value={kg}
          onChange={(x) => setKg(x.target.value)}
          onBlur={blurSave}
          onKeyDown={(x) => x.key === "Enter" && x.currentTarget.blur()}
          inputMode="decimal"
          placeholder="–"
          disabled={locked}
          aria-label={`Set ${index + 1}: weight in kg`}
          className={field}
        />
      )}
      <Input
        value={amount}
        onChange={(x) => setAmount(x.target.value)}
        onBlur={blurSave}
        onKeyDown={(x) => x.key === "Enter" && x.currentTarget.blur()}
        inputMode="numeric"
        placeholder={target === null ? "–" : String(target)}
        disabled={locked}
        aria-label={`Set ${index + 1}: ${measure === "reps" ? "reps" : measure === "hold" ? "seconds" : "minutes"}${target !== null ? `, planned ${target}` : ""}`}
        className={cn(field, "placeholder:font-normal placeholder:text-muted-foreground/70")}
      />
      <button
        type="button"
        // The tap's own time, as a timestamp.
        onClick={(x) => save(!done, performance.timeOrigin + x.timeStamp)}
        disabled={locked}
        aria-pressed={done}
        aria-label={`Set ${index + 1}: ${done ? "done" : "not done"}`}
        className={cn(
          "flex size-10 items-center justify-center justify-self-end rounded-xl transition-colors disabled:opacity-60",
          done ? "bg-highlight text-highlight-foreground" : "bg-muted text-muted-foreground hover:bg-highlight/60",
        )}
      >
        <Check className="size-5" strokeWidth={3} />
      </button>
    </div>
  );
}

function FinishDialog({
  workout,
  suggestedMinutes,
  setsLeft,
  onClose,
}: {
  workout: Workout;
  suggestedMinutes: number;
  setsLeft: number;
  onClose: () => void;
}) {
  const [minutes, setMinutes] = useState(String(suggestedMinutes));
  const [feeling, setFeeling] = useState<Feeling | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <Dialog.Root open onOpenChange={(open) => !open && !pending && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-foreground/25 backdrop-blur-[2px]" />
        <Dialog.Popup className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col gap-4 overflow-y-auto rounded-t-3xl bg-card p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-card-foreground shadow-2xl ring-1 ring-foreground/10 sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl">
          <div className="flex items-center justify-between gap-2">
            <Dialog.Title className="text-lg font-semibold text-heading">
              {setsLeft === 0 ? "All done. Nice work!" : "Finish the workout?"}
            </Dialog.Title>
            <Dialog.Close render={<Button variant="ghost" size="icon" aria-label="Close" disabled={pending} />}>
              <X className="size-4" />
            </Dialog.Close>
          </div>
          {setsLeft > 0 && (
            <p className="-mt-2 text-sm text-muted-foreground">
              {setsLeft} {setsLeft === 1 ? "set isn't" : "sets aren't"} ticked. That&apos;s fine: what you did counts.
            </p>
          )}
          <form
            className="flex flex-col gap-4"
            onSubmit={(x) => {
              x.preventDefault();
              start(async () => {
                const result = await finishWorkout(workout.id, { minutes: Number(minutes), feeling, note });
                if (result.error) setError(result.error);
                else onClose();
              });
            }}
          >
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
                className="h-11 rounded-xl bg-background md:text-base"
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
              className="rounded-xl bg-background"
            />
            {error && (
              <p className="text-sm text-coral-foreground" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" size="lg" className="h-12 rounded-xl text-base" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Save workout
            </Button>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function DoneSummary({ workout }: { workout: Workout }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const sets = workout.exercises.flatMap((e) => e.logged.filter((s) => s.done));
  const volume = sets.reduce((sum, s) => sum + (s.weightKg ?? 0) * (s.reps ?? 0), 0);
  const stats = [
    { label: "Time", value: minutesLabel(workout.minutes) },
    { label: "Sets", value: String(sets.length) },
    ...(volume > 0 ? [{ label: "Lifted", value: `${Math.round(volume).toLocaleString("en-GB")} kg` }] : []),
  ];

  return (
    <div className="fitness-hero flex flex-col gap-4 rounded-3xl p-5">
      <p className="flex items-center gap-2 font-semibold">
        <CheckCircle2 className="size-5 text-[#99d5c9]" /> Done
        {workout.feeling && <span className="font-normal text-white/80">· felt {FEELING_LABELS[workout.feeling].toLowerCase()}</span>}
      </p>
      <dl className="grid grid-cols-3 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col gap-0.5 rounded-2xl bg-white/10 px-3 py-2.5">
            <dt className="text-xs text-white/75">{s.label}</dt>
            <dd className="text-lg font-semibold tabular-nums">{s.value}</dd>
          </div>
        ))}
      </dl>
      {workout.note && <p className="text-sm leading-6 text-white/90">{workout.note}</p>}
      <div className="flex flex-wrap gap-2">
        <Button className="rounded-xl bg-[#99d5c9] text-[#1d1236] hover:bg-[#99d5c9]/85" onClick={() => router.push("/fitness")}>
          Back to Today
        </Button>
        {!workout.routineId && workout.exercises.length > 0 && (
          <Button
            variant="ghost"
            className="rounded-xl text-white hover:bg-white/15 hover:text-white"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const result = await saveWorkoutAsRoutine(workout.id);
                if (result.error || !result.id) setError(result.error ?? "Could not save it.");
                else router.push(`/fitness/routines/${result.id}`);
              })
            }
          >
            <BookmarkPlus className="size-4" /> Save as my workout
          </Button>
        )}
        {workout.source !== "logged" && (
          <Button
            variant="ghost"
            className="rounded-xl text-white hover:bg-white/15 hover:text-white"
            disabled={pending}
            onClick={() => start(async () => setError((await reopenWorkout(workout.id)).error))}
          >
            <RotateCcw className="size-4" /> Not done yet
          </Button>
        )}
      </div>
      {error && <p className="text-sm text-[#ffd1c7]">{error}</p>}
    </div>
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
    <div className="flex flex-col gap-3 rounded-2xl bg-coral-soft p-4 ring-1 ring-coral/30" role="alertdialog" aria-labelledby="delete-workout">
      <p id="delete-workout" className="font-medium text-coral-foreground">
        Delete this workout? Its sets go too.
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
