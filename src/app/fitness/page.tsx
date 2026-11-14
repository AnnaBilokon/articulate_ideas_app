import Link from "next/link";
import { connection } from "next/server";
import { CheckCircle2, ChevronDown, ChevronRight, Play, Sparkles } from "lucide-react";
import { listExercises, listRoutines, listWorkouts, recentFrom, toRecent, type Workout } from "@/lib/fitness";
import { weekDays } from "@/lib/fitness-plan";
import { localDate } from "@/lib/schedule";
import { FEELING_LABELS, MUSCLE_LABELS, weekStart, type Muscle, type Routine } from "@/lib/schemas";
import { ExerciseThumb } from "./exercise-picker";
import { KindBadge, WeekStrip, minutesLabel } from "./fitness-bits";
import { LogActivity } from "./log-activity";
import { NewRoutineButton, StartEmptyButton, StartRoutineButton } from "./start-buttons";
import { TodayPlanner } from "./today-planner";

const weekday = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

// Fitness Today: your week, your own workouts to start with a tap, and ideas
// for when you don't know what to do.
export default async function FitnessTodayPage() {
  await connection();
  const today = localDate();
  const [library, workouts, routines] = await Promise.all([listExercises(), listWorkouts(recentFrom(today), today), listRoutines()]);

  const started = workouts.filter((w) => w.day === today && !w.doneAt);
  const doneToday = workouts.filter((w) => w.day === today && w.doneAt);
  const thisWeek = workouts.filter((w) => w.doneAt && w.day >= weekStart(today));
  const weekMinutes = thisWeek.reduce((sum, w) => sum + w.minutes, 0);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6">
      <section className="fitness-hero flex flex-col gap-5 rounded-[1.75rem] p-5 shadow-lg sm:p-6" aria-label="This week">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-[#99d5c9]">This week</span>
          <p className="text-3xl font-semibold tracking-tight">
            {thisWeek.length === 0 ? "Ready when you are" : `${thisWeek.length} ${thisWeek.length === 1 ? "workout" : "workouts"} · ${minutesLabel(weekMinutes)}`}
          </p>
          {thisWeek.length === 0 && <p className="text-sm text-white/75">Ten minutes counts.</p>}
        </div>
        <WeekStrip days={weekDays(today)} today={today} done={thisWeek.map((w) => ({ day: w.day, kind: w.kind }))} />
        {started.length > 0 ? (
          started.map((w) => (
            <Link
              key={w.id}
              href={`/fitness/workouts/${w.id}`}
              className="flex items-center gap-3 rounded-2xl bg-[#99d5c9] px-4 py-3 text-[#1d1236] transition-transform hover:scale-[1.01]"
            >
              <Play className="size-5 shrink-0" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-semibold">Carry on: {w.title}</span>
                <span className="text-sm opacity-80">{setsLine(w)}</span>
              </span>
              <ChevronRight className="size-5 shrink-0" />
            </Link>
          ))
        ) : (
          <StartEmptyButton className="w-full bg-[#99d5c9] text-[#1d1236] hover:bg-[#99d5c9]/85 sm:w-fit" />
        )}
      </section>

      {doneToday.length > 0 && (
        <section className="flex flex-col gap-2" aria-labelledby="done-today">
          <h2 id="done-today" className="text-lg font-semibold tracking-tight text-heading">
            Done today
          </h2>
          {doneToday.map((w) => (
            <DoneLink key={w.id} workout={w} />
          ))}
        </section>
      )}

      <section className="flex flex-col gap-3" aria-labelledby="my-workouts">
        <div className="flex items-baseline justify-between gap-2">
          <h2 id="my-workouts" className="text-xl font-semibold tracking-tight text-heading">
            My workouts
          </h2>
          <Link href="/fitness/exercises" className="text-sm text-muted-foreground hover:text-foreground">
            All exercises
          </Link>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {routines.map((r) => (
            <li key={r.id}>
              <RoutineCard routine={r} />
            </li>
          ))}
          <li>
            <NewRoutineButton className="flex h-full min-h-32 w-full flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-border p-5 text-center font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-card hover:text-heading disabled:opacity-60">
              <span>{routines.length === 0 ? "Make your first workout" : "New workout"}</span>
              <span className="text-xs font-normal">Pick the exercises you like</span>
            </NewRoutineButton>
          </li>
        </ul>
      </section>

      <details className="group rounded-3xl bg-card shadow-sm ring-1 ring-foreground/10" open={routines.length === 0}>
        <summary className="flex cursor-pointer list-none items-center gap-3 p-4 sm:p-5 [&::-webkit-details-marker]:hidden">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
            <Sparkles className="size-5" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="font-semibold text-heading">Need an idea?</span>
            <span className="text-sm text-muted-foreground">Pick the time and what you have, and get a workout</span>
          </span>
          <ChevronDown className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>
        <div className="border-t px-4 pt-4 pb-5 sm:px-5">
          <TodayPlanner library={library} recent={toRecent(workouts)} today={today} />
        </div>
      </details>

      <LogActivity today={today} />
    </main>
  );
}

function setsLine(w: Workout): string {
  const sets = w.exercises.flatMap((e) => e.logged);
  return sets.length === 0 ? "No exercises yet" : `${sets.filter((s) => s.done).length} of ${sets.length} sets done`;
}

function RoutineCard({ routine: r }: { routine: Routine }) {
  const muscles = [...new Set(r.exercises.flatMap((e) => e.muscles))].slice(0, 4) as Muscle[];
  return (
    <div className="flex h-full flex-col gap-3 rounded-3xl bg-card p-4 shadow-sm ring-1 ring-foreground/10 transition-shadow hover:shadow-md sm:p-5">
      <Link href={`/fitness/routines/${r.id}`} className="flex flex-col gap-1">
        <span className="text-lg leading-snug font-semibold text-heading">{r.name}</span>
        <span className="text-sm text-muted-foreground">
          {r.exercises.length} {r.exercises.length === 1 ? "exercise" : "exercises"}
          {r.lastDone ? ` · last ${weekday.format(new Date(`${r.lastDone}T00:00:00Z`))}` : ""}
        </span>
      </Link>
      {r.exercises.length > 0 && (
        <span className="flex -space-x-2">
          {r.exercises.slice(0, 5).map((e) => (
            <ExerciseThumb key={e.id} exercise={e} className="size-10 rounded-full ring-2 ring-card" />
          ))}
        </span>
      )}
      <div className="mt-auto flex items-end justify-between gap-2">
        <span className="flex flex-wrap gap-1">
          {muscles.map((m) => (
            <span key={m} className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
              {MUSCLE_LABELS[m]}
            </span>
          ))}
        </span>
        <StartRoutineButton routineId={r.id} disabled={r.exercises.length === 0} />
      </div>
    </div>
  );
}

function DoneLink({ workout: w }: { workout: Workout }) {
  return (
    <Link
      href={`/fitness/workouts/${w.id}`}
      className="group flex items-center gap-3 rounded-2xl bg-card p-4 shadow-sm ring-1 ring-foreground/10 transition-shadow hover:shadow-md"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-highlight text-highlight-foreground">
        <CheckCircle2 className="size-5" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-heading">{w.title}</span>
          <KindBadge kind={w.kind} />
        </span>
        <span className="text-sm text-muted-foreground">
          {[minutesLabel(w.minutes), w.feeling && `felt ${FEELING_LABELS[w.feeling].toLowerCase()}`].filter(Boolean).join(" · ")}
        </span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
