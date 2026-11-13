import Link from "next/link";
import { connection } from "next/server";
import { CheckCircle2, ChevronRight, Play } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { listExercises, listWorkouts, recentFrom, toRecent, type Workout } from "@/lib/fitness";
import { weekDays } from "@/lib/fitness-plan";
import { localDate } from "@/lib/schedule";
import { FEELING_LABELS, weekStart } from "@/lib/schemas";
import { KindBadge, WeekStrip, minutesLabel } from "./fitness-bits";
import { LogActivity } from "./log-activity";
import { TodayPlanner } from "./today-planner";

// Fitness Today: what you've done this week, a workout you started, and
// ideas for the time and equipment you have today.
export default async function FitnessTodayPage() {
  await connection();
  const today = localDate();
  const [library, workouts] = await Promise.all([listExercises(), listWorkouts(recentFrom(today), today)]);

  const started = workouts.filter((w) => w.day === today && !w.doneAt);
  const doneToday = workouts.filter((w) => w.day === today && w.doneAt);
  const thisWeek = workouts.filter((w) => w.doneAt && w.day >= weekStart(today));
  const weekMinutes = thisWeek.reduce((sum, w) => sum + w.minutes, 0);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6">
      <PageHeader
        title="Today"
        description={
          thisWeek.length === 0
            ? "Nothing yet this week. Ten minutes counts."
            : `This week: ${thisWeek.length} ${thisWeek.length === 1 ? "workout" : "workouts"}, ${minutesLabel(weekMinutes)}.`
        }
      />

      <WeekStrip days={weekDays(today)} today={today} done={thisWeek.map((w) => ({ day: w.day, kind: w.kind }))} />

      {started.length > 0 && (
        <section className="flex flex-col gap-2" aria-label="Started">
          {started.map((w) => (
            <WorkoutLink key={w.id} workout={w} started />
          ))}
        </section>
      )}

      {doneToday.length > 0 && (
        <section className="flex flex-col gap-2" aria-labelledby="done-today">
          <h2 id="done-today" className="text-lg font-semibold tracking-tight text-heading">
            Done today
          </h2>
          {doneToday.map((w) => (
            <WorkoutLink key={w.id} workout={w} />
          ))}
        </section>
      )}

      <TodayPlanner library={library} recent={toRecent(workouts)} today={today} />

      <LogActivity today={today} />
    </main>
  );
}

function WorkoutLink({ workout: w, started }: { workout: Workout; started?: boolean }) {
  const done = w.exercises.filter((e) => e.done).length;
  return (
    <Link
      href={`/fitness/workouts/${w.id}`}
      className="group flex items-center gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10 transition-shadow hover:shadow-md hover:ring-primary/30"
    >
      <span
        className={
          started
            ? "flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
            : "flex size-10 shrink-0 items-center justify-center rounded-full bg-success-soft text-success-foreground"
        }
      >
        {started ? <Play className="size-4.5" /> : <CheckCircle2 className="size-5" />}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-heading">{started ? `Carry on: ${w.title}` : w.title}</span>
          <KindBadge kind={w.kind} />
        </span>
        <span className="text-sm text-muted-foreground">
          {started
            ? `${done} of ${w.exercises.length} done`
            : [minutesLabel(w.minutes), w.feeling && `felt ${FEELING_LABELS[w.feeling].toLowerCase()}`].filter(Boolean).join(" · ")}
        </span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
