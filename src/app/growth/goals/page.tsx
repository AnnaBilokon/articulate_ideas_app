import Link from "next/link";
import { connection } from "next/server";
import { CalendarDays, ChevronRight, Plus, Target } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { listGoals, type GoalSummary } from "@/lib/goals";
import { localDate } from "@/lib/schedule";
import { describeTargetYear, formatDay, goalStatusLabels, type GoalStatus } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { ProgressBar, progressText } from "./goal-bits";

// Goals by status: what you're working on first, then paused, reached and let go.
export default async function GoalsPage() {
  await connection();
  const goals = await listGoals();
  const today = localDate();
  const groups: { status: GoalStatus; title: string }[] = [
    { status: "active", title: "Working on" },
    { status: "paused", title: "Paused" },
    { status: "achieved", title: "Achieved" },
    { status: "let_go", title: "Let go" },
  ];

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6">
      <PageHeader title="Goals" description="What you're working towards, and how far you've come.">
        <Link href="/growth/goals/new" className={cn(buttonVariants(), "w-fit")}>
          <Plus className="size-4" /> New goal
        </Link>
      </PageHeader>

      {goals.length === 0 ? (
        <Card className="bg-muted/40">
          <CardContent className="flex flex-col items-start gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-highlight text-highlight-foreground">
              <Target className="size-5" />
            </span>
            <p className="font-medium">No goals yet.</p>
            <p className="text-sm text-muted-foreground">
              Start with one that matters this season. You can break it into steps, give it a number to reach, or just
              keep notes as you go.
            </p>
          </CardContent>
        </Card>
      ) : (
        groups.map(({ status, title }) => {
          const inGroup = goals.filter((g) => g.status === status);
          if (inGroup.length === 0) return null;
          return (
            <section key={status} className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold tracking-tight text-heading">
                {title} <span className="text-sm font-normal text-muted-foreground">{inGroup.length}</span>
              </h2>
              <ul className="flex flex-col gap-2">
                {inGroup.map((goal) => (
                  <li key={goal.id}>
                    <GoalRow goal={goal} today={today} />
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}
    </main>
  );
}

function GoalRow({ goal, today }: { goal: GoalSummary; today: string }) {
  const text = progressText(goal);
  const muted = goal.status === "paused" || goal.status === "let_go";
  return (
    <Link
      href={`/growth/goals/${goal.id}`}
      className={cn(
        "group flex items-center gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10 transition-colors hover:bg-accent/50",
        muted && "bg-muted/40",
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <span className={cn("font-medium", muted && "text-muted-foreground")}>{goal.title}</span>
        {goal.progress !== null && goal.status !== "achieved" && (
          <div className="flex items-center gap-3">
            <ProgressBar value={goal.progress} label={`${goal.title}: ${text}`} className="flex-1" />
            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{text}</span>
          </div>
        )}
        <span className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {goal.status === "achieved" && goal.achievedAt ? (
            <span>Achieved {formatDay(localDate(new Date(goal.achievedAt)))}</span>
          ) : (
            goal.targetYear &&
            goal.status === "active" && (
              <span className="flex items-center gap-1">
                <CalendarDays className="size-3.5" /> {describeTargetYear(goal.targetYear, Number(today.slice(0, 4)))}
              </span>
            )
          )}
          {goal.status !== "active" && goal.status !== "achieved" && <span>{goalStatusLabels[goal.status]}</span>}
        </span>
      </div>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
