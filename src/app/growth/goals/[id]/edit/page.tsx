import { notFound } from "next/navigation";
import { connection } from "next/server";
import { PageHeader } from "@/components/page-header";
import { getGoal } from "@/lib/goals";
import { GoalForm } from "../../goal-form";

export default async function EditGoalPage({ params }: PageProps<"/growth/goals/[id]/edit">) {
  await connection();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const goal = await getGoal(id);
  if (!goal) notFound();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
      <PageHeader title="Edit goal" back={{ href: `/growth/goals/${id}`, label: goal.title }} />
      <GoalForm
        goalId={id}
        initial={{
          title: goal.title,
          why: goal.why ?? "",
          targetDate: goal.targetDate,
          metricTarget: goal.metricTarget,
          metricUnit: goal.metricUnit ?? "",
        }}
      />
    </main>
  );
}
