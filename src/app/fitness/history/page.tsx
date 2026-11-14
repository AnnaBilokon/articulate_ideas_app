import Link from "next/link";
import { connection } from "next/server";
import { Flame, Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { listWorkouts, type Workout } from "@/lib/fitness";
import { localDate } from "@/lib/schedule";
import { KIND_LABELS, WEEKDAYS, addDays, weekStart, workoutKinds } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { KindBadge, minutesLabel } from "../fitness-bits";
import { WorkoutRow, workoutTotals } from "../workout-row";

// Fitness history: how you're doing at a glance (this week, this month, weeks
// in a row), a tracker of the last 12 weeks, and every workout, week by week.

const WEEKS = 12;
const monthShort = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" });
const dayMonth = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const dayLong = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

const at = (day: string) => new Date(`${day}T00:00:00Z`);

/** Weeks in a row with at least one workout, up to this one (or last, if this one is still empty). */
function weekStreak(done: Workout[], today: string): number {
  const weeks = new Set(done.map((w) => weekStart(w.day)));
  let week = weekStart(today);
  if (!weeks.has(week)) week = addDays(week, -7);
  let streak = 0;
  while (weeks.has(week)) {
    streak++;
    week = addDays(week, -7);
  }
  return streak;
}

/** How much a day's training was: nothing, a little, a session, a big one. */
const level = (minutes: number) => (minutes === 0 ? 0 : minutes < 20 ? 1 : minutes < 45 ? 2 : 3);
const LEVELS = ["bg-muted", "bg-highlight/45", "bg-highlight", "bg-primary"];

export default async function FitnessHistoryPage() {
  await connection();
  const today = localDate();
  const firstWeek = addDays(weekStart(today), -7 * (WEEKS - 1));
  const done = (await listWorkouts(firstWeek, today)).filter((w) => w.doneAt);

  const thisWeek = done.filter((w) => w.day >= weekStart(today));
  const thisMonth = done.filter((w) => w.day.slice(0, 7) === today.slice(0, 7));
  const lifted = thisMonth.reduce((sum, w) => sum + workoutTotals(w).lifted, 0);
  const streak = weekStreak(done, today);
  const byDay = new Map<string, Workout[]>();
  for (const w of done) byDay.set(w.day, [...(byDay.get(w.day) ?? []), w]);
  const weeks = Array.from({ length: WEEKS }, (_, i) => addDays(firstWeek, 7 * i));
  const kindsThisMonth = workoutKinds.map((k) => ({ kind: k, count: thisMonth.filter((w) => w.kind === k).length })).filter((k) => k.count > 0);

  const stats = [
    { label: "This week", value: String(thisWeek.length), detail: thisWeek.length > 0 ? minutesLabel(thisWeek.reduce((s, w) => s + w.minutes, 0)) : "Nothing yet" },
    { label: "This month", value: String(thisMonth.length), detail: thisMonth.length === 1 ? "workout" : "workouts" },
    { label: "Weeks in a row", value: String(streak), detail: streak === 0 ? "Start one this week" : "with a workout" },
    ...(lifted > 0 ? [{ label: "Lifted this month", value: `${Math.round(lifted / 100) / 10} t`, detail: `${lifted.toLocaleString("en-GB")} kg` }] : []),
  ];

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6">
      <PageHeader title="History" description="Every workout you've done, and how your weeks are going.">
        <Link href="/fitness/workouts/past" className={cn(buttonVariants({ variant: "outline" }), "w-fit")}>
          <Plus className="size-4" /> Add a past workout
        </Link>
      </PageHeader>

      <section className="fitness-hero flex flex-col gap-5 rounded-[1.75rem] p-5 shadow-lg sm:p-6" aria-label="At a glance">
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col gap-0.5 rounded-2xl bg-white/10 px-3 py-2.5">
              <dt className="text-xs text-white/75">{s.label}</dt>
              <dd className="flex items-baseline gap-1.5">
                <span className="text-2xl font-semibold tabular-nums">{s.value}</span>
                <span className="truncate text-xs text-white/75">{s.detail}</span>
              </dd>
            </div>
          ))}
        </dl>
        {streak >= 2 && (
          <p className="flex items-center gap-2 text-sm text-white/90">
            <Flame className="size-4 text-[#99d5c9]" /> {streak} weeks in a row. Keep it going this week.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-3xl bg-card p-4 shadow-sm ring-1 ring-foreground/10 sm:p-5" aria-labelledby="tracker">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="tracker" className="text-lg font-semibold tracking-tight text-heading">
            Last {WEEKS} weeks
          </h2>
          <span className="text-sm text-muted-foreground">{done.length} workouts</span>
        </div>
        <div className="flex gap-1.5">
          <div className="grid grid-rows-[1rem_repeat(7,minmax(0,1fr))] gap-1 text-[0.65rem] text-muted-foreground">
            <span />
            {WEEKDAYS.map((d) => (
              <span key={d.day} className="flex items-center">
                {d.day % 2 === 1 ? d.short : ""}
              </span>
            ))}
          </div>
          <div className="grid flex-1 gap-1" style={{ gridTemplateColumns: `repeat(${WEEKS}, minmax(0, 1fr))` }}>
            {weeks.map((week, i) => {
              const showMonth = i === 0 || at(week).getUTCMonth() !== at(addDays(week, -7)).getUTCMonth();
              return (
                <div key={week} className="grid grid-rows-[1rem_repeat(7,minmax(0,1fr))] gap-1">
                  <span className="truncate text-[0.65rem] text-muted-foreground">{showMonth ? monthShort.format(at(week)) : ""}</span>
                  {Array.from({ length: 7 }, (_, d) => {
                    const day = addDays(week, d);
                    const list = byDay.get(day) ?? [];
                    const minutes = list.reduce((s, w) => s + w.minutes, 0);
                    const label = `${dayLong.format(at(day))}: ${list.length === 0 ? "rest" : list.map((w) => `${w.title}, ${minutesLabel(w.minutes)}`).join("; ")}`;
                    if (day > today) return <span key={day} className="aspect-square" />;
                    return (
                      <span
                        key={day}
                        title={label}
                        aria-label={label}
                        role="img"
                        className={cn("aspect-square rounded-[0.3rem]", LEVELS[level(minutes)], day === today && "ring-2 ring-ring ring-offset-1 ring-offset-card")}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            Less
            {LEVELS.map((c) => (
              <span key={c} className={cn("size-3 rounded-[0.2rem]", c)} />
            ))}
            More
          </span>
          {kindsThisMonth.length > 0 && (
            <span className="flex flex-wrap items-center gap-1.5">
              This month:
              {kindsThisMonth.map((k) => (
                <KindBadge key={k.kind} kind={k.kind} className="px-2" />
              ))}
              <span className="sr-only">{kindsThisMonth.map((k) => `${k.count} ${KIND_LABELS[k.kind]}`).join(", ")}</span>
            </span>
          )}
        </div>
      </section>

      {done.length === 0 ? (
        <p className="rounded-2xl bg-muted/50 p-5 text-sm text-muted-foreground">
          No workouts in the last {WEEKS} weeks yet.{" "}
          <Link href="/fitness" className="font-medium text-foreground underline-offset-4 hover:underline">
            Start one on Today
          </Link>
          .
        </p>
      ) : (
        weeks
          .slice()
          .reverse()
          .map((week) => {
            const list = done.filter((w) => weekStart(w.day) === week);
            if (list.length === 0) return null;
            const label =
              week === weekStart(today) ? "This week" : week === addDays(weekStart(today), -7) ? "Last week" : `${dayMonth.format(at(week))} – ${dayMonth.format(at(addDays(week, 6)))}`;
            return (
              <section key={week} className="flex flex-col gap-2" aria-label={label}>
                <h2 className="flex items-baseline justify-between gap-2 px-1">
                  <span className="text-lg font-semibold tracking-tight text-heading">{label}</span>
                  <span className="text-sm text-muted-foreground">
                    {list.length} {list.length === 1 ? "workout" : "workouts"} · {minutesLabel(list.reduce((s, w) => s + w.minutes, 0))}
                  </span>
                </h2>
                {list.map((w) => (
                  <WorkoutRow key={w.id} workout={w} />
                ))}
              </section>
            );
          })
      )}
    </main>
  );
}
