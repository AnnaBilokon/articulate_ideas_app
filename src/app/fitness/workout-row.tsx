import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Workout } from "@/lib/fitness";
import { FEELING_LABELS, KIND_TONES } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { KindBadge, minutesLabel } from "./fitness-bits";

// A workout you've done, at a glance: the day, what it was, and how much.

const weekday = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "UTC" });

/** Sets ticked off, and kg lifted (weight × reps over those sets). */
export function workoutTotals(w: Workout) {
  const sets = w.exercises.flatMap((e) => e.logged.filter((s) => s.done));
  return { sets: sets.length, lifted: Math.round(sets.reduce((sum, s) => sum + (s.weightKg ?? 0) * (s.reps ?? 0), 0)) };
}

export function WorkoutRow({ workout: w }: { workout: Workout }) {
  const { sets, lifted } = workoutTotals(w);
  const date = new Date(`${w.day}T00:00:00Z`);
  return (
    <Link
      href={`/fitness/workouts/${w.id}`}
      className="group flex items-center gap-3 rounded-2xl bg-card p-3 shadow-sm ring-1 ring-foreground/10 transition-shadow hover:shadow-md sm:p-4"
    >
      <span className={cn("flex size-12 shrink-0 flex-col items-center justify-center rounded-xl leading-none", KIND_TONES[w.kind].soft)}>
        <span className="text-[0.65rem] font-semibold uppercase">{weekday.format(date)}</span>
        <span className="text-lg font-bold tabular-nums">{date.getUTCDate()}</span>
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-heading">{w.title}</span>
          <KindBadge kind={w.kind} />
        </span>
        <span className="truncate text-sm text-muted-foreground">
          {[
            minutesLabel(w.minutes),
            sets > 0 && `${sets} ${sets === 1 ? "set" : "sets"}`,
            lifted > 0 && `${lifted.toLocaleString("en-GB")} kg`,
            w.feeling && `felt ${FEELING_LABELS[w.feeling].toLowerCase()}`,
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
