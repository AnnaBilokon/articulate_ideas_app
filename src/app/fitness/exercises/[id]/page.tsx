import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { z } from "zod";
import { ArrowLeft, ChevronRight, Trophy } from "lucide-react";
import { LineChart } from "@/components/charts/line-chart";
import { seriesColor } from "@/components/charts/series";
import { exerciseSessions, getExercise } from "@/lib/fitness";
import {
  EQUIPMENT_LABELS,
  MUSCLE_LABELS,
  NO_BESTS,
  addToBests,
  beatsBests,
  formatKg,
  setLabel,
  type Bests,
  type Measure,
} from "@/lib/schemas";
import { ExerciseHow, KindBadge } from "../../fitness-bits";
import { EditExercise } from "./edit-exercise";

// One exercise: how to do it, your personal bests, how your top set has
// moved over time, and every time you've done it.

const shortDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const longDate = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const at = (day: string) => new Date(`${day}T00:00:00Z`);

type Set = { reps: number | null; seconds: number | null; weightKg: number | null };

/** The number the chart follows: heaviest weight, else most reps, else the longest. */
function topOf(sets: Set[], measure: Measure, weighted: boolean): number | null {
  const values = sets.flatMap((s) =>
    weighted && s.weightKg ? [s.weightKg] : measure === "reps" ? (s.reps ? [s.reps] : []) : s.seconds ? [measure === "duration" ? Math.round(s.seconds / 60) : s.seconds] : [],
  );
  return values.length > 0 ? Math.max(...values) : null;
}

export default async function ExercisePage({ params }: PageProps<"/fitness/exercises/[id]">) {
  await connection();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const exercise = await getExercise(id);
  if (!exercise) notFound();
  const sessions = await exerciseSessions(id);

  const bests = sessions.reduce((b, s) => addToBests(b, s.sets), NO_BESTS);
  const weighted = sessions.some((s) => s.sets.some((set) => set.weightKg && set.weightKg > 0));
  // Each session: did it set a best, against everything before it?
  const withBests = sessions.reduce<{ list: ((typeof sessions)[number] & { beat: string | null })[]; before: Bests }>(
    (acc, s) => ({
      list: [...acc.list, { ...s, beat: s.sets.map((set) => beatsBests(set, acc.before)).find(Boolean) ?? null }],
      before: addToBests(acc.before, s.sets),
    }),
    { list: [], before: NO_BESTS },
  ).list;
  const whenBest = (test: (set: Set) => boolean) => withBests.find((s) => s.sets.some(test));
  const heaviestSet = bests.weightKg !== null ? withBests.flatMap((s) => s.sets.filter((x) => x.weightKg === bests.weightKg).map((x) => ({ s, x }))).sort((a, b) => (b.x.reps ?? 0) - (a.x.reps ?? 0))[0] : null;
  const bestSet = bests.volume !== null ? withBests.flatMap((s) => s.sets.filter((x) => (x.weightKg ?? 0) * (x.reps ?? 0) === bests.volume).map((x) => ({ s, x })))[0] : null;

  const tiles = [
    heaviestSet && { label: "Heaviest", value: `${formatKg(heaviestSet.x.weightKg!)} kg × ${heaviestSet.x.reps}`, day: heaviestSet.s.day },
    bestSet && bestSet.x !== heaviestSet?.x && { label: "Best set", value: `${formatKg(bestSet.x.weightKg!)} kg × ${bestSet.x.reps}`, day: bestSet.s.day },
    bests.reps !== null && { label: "Most reps", value: String(bests.reps), day: whenBest((x) => x.reps === bests.reps && !x.weightKg)?.day },
    bests.seconds !== null && {
      label: exercise.measure === "duration" ? "Longest" : "Longest hold",
      value: exercise.measure === "duration" ? `${Math.round(bests.seconds / 60)} min` : `${bests.seconds} s`,
      day: whenBest((x) => x.seconds === bests.seconds)?.day,
    },
    { label: "Done", value: `${sessions.length} ${sessions.length === 1 ? "time" : "times"}`, day: sessions.at(-1)?.day, last: true },
  ].filter((t): t is { label: string; value: string; day: string | undefined; last?: boolean } => Boolean(t));

  const chartSessions = withBests.slice(-20);
  const unit = weighted ? "kg" : exercise.measure === "reps" ? "reps" : exercise.measure === "duration" ? "minutes" : "seconds";
  const chartTitle = weighted ? "Heaviest set each time" : exercise.measure === "reps" ? "Most reps each time" : "Longest each time";

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <Link href="/fitness/exercises" className="flex w-fit items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="size-4" /> Exercises
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h1 className="text-3xl font-semibold tracking-tight text-balance text-heading">{exercise.name}</h1>
          <span className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <KindBadge kind={exercise.kind} />
            {[exercise.muscles.map((m) => MUSCLE_LABELS[m]).join(", "), exercise.equipment.map((q) => EQUIPMENT_LABELS[q]).join(" or ")]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </div>
        <EditExercise exercise={exercise} />
      </div>

      {sessions.length > 0 && (
        <section className="fitness-hero flex flex-col gap-3 rounded-[1.75rem] p-5 shadow-lg sm:p-6" aria-label="Personal bests">
          <h2 className="flex items-center gap-2 text-sm font-medium text-[#99d5c9]">
            <Trophy className="size-4" /> Your bests
          </h2>
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {tiles.map((t) => (
              <div key={t.label} className="flex flex-col gap-0.5 rounded-2xl bg-white/10 px-3 py-2.5">
                <dt className="text-xs text-white/75">{t.label}</dt>
                <dd className="text-xl font-semibold tabular-nums">{t.value}</dd>
                {t.day && <dd className="text-xs text-white/70">{t.last ? `last ${shortDate.format(at(t.day))}` : shortDate.format(at(t.day))}</dd>}
              </div>
            ))}
          </dl>
        </section>
      )}

      {chartSessions.length >= 2 ? (
        <LineChart
          title={chartTitle}
          description={weighted ? "The heaviest weight you lifted each time, in kg." : undefined}
          unit={unit}
          data={{
            labels: chartSessions.map((s) => shortDate.format(at(s.day))),
            series: [{ key: "top", name: chartTitle, color: seriesColor(0), values: chartSessions.map((s) => topOf(s.sets, exercise.measure, weighted)) }],
          }}
        />
      ) : (
        <p className="rounded-2xl bg-muted/50 p-4 text-sm text-muted-foreground">
          {sessions.length === 0 ? "You haven't done this one yet." : "Do it once more to see how it's going over time."}
        </p>
      )}

      <details className="group rounded-3xl bg-card p-4 shadow-sm ring-1 ring-foreground/10 sm:p-5" open={sessions.length === 0}>
        <summary className="cursor-pointer list-none font-semibold text-heading [&::-webkit-details-marker]:hidden">
          How to do it <span className="text-sm font-normal text-muted-foreground group-open:hidden">· show</span>
        </summary>
        <div className="mt-3">
          <ExerciseHow name={exercise.name} how={exercise.how} picture={exercise.picture} steps={exercise.steps} />
        </div>
      </details>

      {withBests.length > 0 && (
        <section className="flex flex-col gap-2" aria-labelledby="sessions">
          <h2 id="sessions" className="text-lg font-semibold tracking-tight text-heading">
            Every time
          </h2>
          <ul className="flex flex-col gap-2">
            {withBests
              .slice()
              .reverse()
              .map((s) => (
                <li key={`${s.workoutId}-${s.createdAt}`}>
                  <Link
                    href={`/fitness/workouts/${s.workoutId}`}
                    className="group flex items-center gap-3 rounded-2xl bg-card p-3 shadow-sm ring-1 ring-foreground/10 transition-shadow hover:shadow-md"
                  >
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-medium text-heading">{longDate.format(at(s.day))}</span>
                        <span className="truncate text-muted-foreground">{s.title}</span>
                        {s.beat && (
                          <span className="flex items-center gap-1 rounded-full bg-sunflower-soft px-2 py-0.5 text-xs font-medium text-sunflower-foreground">
                            <Trophy className="size-3" /> {s.beat}
                          </span>
                        )}
                      </span>
                      <span className="text-sm text-muted-foreground tabular-nums">{s.sets.map((x) => setLabel(x, exercise.measure)).join(", ")}</span>
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      )}
    </main>
  );
}
