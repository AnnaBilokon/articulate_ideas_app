import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";
import { getRoutine, listExercises } from "@/lib/fitness";
import { RoutineEditor } from "./routine-editor";

// One of your own workouts: its exercises and the plan for each, ready to start.
export default async function RoutinePage({ params }: PageProps<"/fitness/routines/[id]">) {
  await connection();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [routine, library] = await Promise.all([getRoutine(id), listExercises()]);
  if (!routine) notFound();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-4 py-8 sm:px-6">
      <Link href="/fitness" className="flex w-fit items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="size-4" /> Today
      </Link>
      <RoutineEditor routine={routine} library={library} />
    </main>
  );
}
