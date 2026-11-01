import { connection } from "next/server";
import { PageHeader } from "@/components/page-header";
import { listGoals } from "@/lib/goals";
import { nextGoalColor } from "@/lib/schemas";
import { GoalForm } from "../goal-form";

export default async function NewGoalPage() {
  await connection();
  const goals = await listGoals();
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
      <PageHeader
        title="New goal"
        description="Only the name is needed. Add the rest now or later."
        back={{ href: "/growth/goals", label: "Goals" }}
      />
      <GoalForm suggestedColor={nextGoalColor(goals.map((g) => g.color))} />
    </main>
  );
}
