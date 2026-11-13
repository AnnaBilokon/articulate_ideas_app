import { connection } from "next/server";
import { PageHeader } from "@/components/page-header";
import { listExercises } from "@/lib/fitness";
import { ExerciseLibrary } from "./exercise-library";

// The exercise library the workouts are made from: change any exercise,
// hide what you don't want suggested, add your own.
export default async function ExercisesPage() {
  await connection();
  const exercises = await listExercises();
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6">
      <PageHeader
        title="Exercises"
        description="Workout ideas come from this list. Hide what you don't like, add what you do."
      />
      <ExerciseLibrary exercises={exercises} />
    </main>
  );
}
