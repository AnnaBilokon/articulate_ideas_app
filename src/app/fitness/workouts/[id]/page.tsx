import { notFound } from "next/navigation";
import { connection } from "next/server";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getWorkout, lastTimes, listExercises } from "@/lib/fitness";
import { localDate } from "@/lib/schedule";
import { KindBadge } from "../../fitness-bits";
import { WorkoutSession } from "./workout-session";

const dateFormat = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

// One workout, set by set: what you did, beside what you did last time.
export default async function WorkoutPage({ params }: PageProps<"/fitness/workouts/[id]">) {
  await connection();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const workout = await getWorkout(id);
  if (!workout) notFound();
  const [library, last] = await Promise.all([
    listExercises(),
    lastTimes(
      workout.exercises.flatMap((e) => (e.exerciseId ? [e.exerciseId] : [])),
      workout.id,
    ),
  ]);
  const today = localDate();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href="/fitness" className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="size-4" /> Today
        </Link>
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          {workout.exercises.length > 0 && <KindBadge kind={workout.kind} />}
          {workout.day === today ? "Today" : dateFormat.format(new Date(`${workout.day}T00:00:00Z`))}
          {workout.source === "ai" && " · by Claude"}
        </span>
      </div>
      <WorkoutSession workout={workout} library={library} lastTimes={Object.fromEntries(last)} today={today} />
    </main>
  );
}
