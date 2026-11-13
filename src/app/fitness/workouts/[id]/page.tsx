import { notFound } from "next/navigation";
import { connection } from "next/server";
import { z } from "zod";
import { PageHeader } from "@/components/page-header";
import { getWorkout } from "@/lib/fitness";
import { localDate } from "@/lib/schedule";
import { KindBadge, minutesLabel } from "../../fitness-bits";
import { WorkoutSession } from "./workout-session";

const dateFormat = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

// One workout: tick off each exercise, note the weights, swap what doesn't
// suit, then finish it with how long it took and how it felt.
export default async function WorkoutPage({ params }: PageProps<"/fitness/workouts/[id]">) {
  await connection();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const workout = await getWorkout(id);
  if (!workout) notFound();
  const today = localDate();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
      <PageHeader
        title={workout.title}
        back={{ href: "/fitness", label: "Today" }}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <KindBadge kind={workout.kind} />
            <span>
              {workout.day === today ? "Today" : dateFormat.format(new Date(`${workout.day}T00:00:00Z`))} · about{" "}
              {minutesLabel(workout.minutes)}
              {workout.source === "ai" && " · suggested by Claude"}
            </span>
          </span>
        }
      />
      <WorkoutSession workout={workout} />
    </main>
  );
}
