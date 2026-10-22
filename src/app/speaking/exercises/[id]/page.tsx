import { notFound } from "next/navigation";
import { connection } from "next/server";
import { PageHeader } from "@/components/page-header";
import { SPEAKING_PLAN } from "@/lib/schemas";
import { speakingExercise, speakingProfile } from "@/lib/speaking";
import { ExerciseFlow } from "./exercise-flow";

export default async function SpeakingExercisePage({ params }: PageProps<"/speaking/exercises/[id]">) {
  await connection();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [exercise, profile] = await Promise.all([speakingExercise(id), speakingProfile()]);
  if (!exercise) notFound();
  const plan = SPEAKING_PLAN[exercise.day - 1];

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
      <PageHeader
        title={plan.title}
        description={`Day ${plan.day} · ${exercise.topic}`}
        back={{ href: "/speaking", label: "Speaking coach" }}
      />
      <ExerciseFlow initial={exercise} technique={plan.technique} topics={profile?.topics ?? [exercise.topic]} />
    </main>
  );
}
