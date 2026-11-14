import Link from "next/link";
import { connection } from "next/server";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { listExercises, listRoutines } from "@/lib/fitness";
import { localDate } from "@/lib/schedule";
import { PastWorkout } from "./past-workout";

// A workout you did and forgot to add: pick the day, start from one of your
// own workouts or pick exercises, then fill in the sets as you did them.
export default async function PastWorkoutPage() {
  await connection();
  const [routines, library] = await Promise.all([listRoutines(), listExercises()]);
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <Link href="/fitness" className="flex w-fit items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="size-4" /> Today
      </Link>
      <PageHeader title="Add a past workout" description="One you did and forgot to add. Its sets count as last time, like any other." />
      <PastWorkout routines={routines.filter((r) => r.exercises.length > 0)} library={library} today={localDate()} />
    </main>
  );
}
