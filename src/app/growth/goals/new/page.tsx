import { PageHeader } from "@/components/page-header";
import { GoalForm } from "../goal-form";

export default function NewGoalPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
      <PageHeader
        title="New goal"
        description="Only the name is needed. Add the rest now or later."
        back={{ href: "/growth/goals", label: "Goals" }}
      />
      <GoalForm />
    </main>
  );
}
