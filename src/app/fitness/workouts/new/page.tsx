import Link from "next/link";
import { connection } from "next/server";
import { ArrowLeft } from "lucide-react";
import { listExercises } from "@/lib/fitness";
import { NewWorkout } from "./new-workout";

// A workout you put together as you go. Nothing is saved until it has its
// first exercises.
export default async function NewWorkoutPage() {
  await connection();
  const library = await listExercises();
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-4 py-8 sm:px-6">
      <Link href="/fitness" className="flex w-fit items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="size-4" /> Today
      </Link>
      <NewWorkout library={library} />
    </main>
  );
}
