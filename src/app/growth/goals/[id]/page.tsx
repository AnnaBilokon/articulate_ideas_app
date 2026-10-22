import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { CalendarDays, Pencil, PartyPopper } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getGoal } from "@/lib/goals";
import { localDate } from "@/lib/schedule";
import { describeTargetYear, formatAmount, goalStatusLabels } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { ProgressBar, progressText, statusTone } from "../goal-bits";
import { AchievedDate, DeleteGoal, MetricControl, NotesLog, StatusActions, StepsList } from "./goal-parts";

// One goal: why it matters, how far along it is, its steps and notes, and
// moving it on (achieved, paused, let go).
export default async function GoalPage({ params }: PageProps<"/growth/goals/[id]">) {
  await connection();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const goal = await getGoal(id);
  if (!goal) notFound();
  const today = localDate();
  const text = progressText(goal);
  const looksDone = goal.status === "active" && goal.progress !== null && goal.progress >= 1;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
      <PageHeader
        title={goal.title}
        back={{ href: "/growth/goals", label: "Goals" }}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", statusTone[goal.status])}>
              {goalStatusLabels[goal.status]}
            </span>
            {goal.targetYear && goal.status !== "achieved" && (
              <span className="flex items-center gap-1">
                <CalendarDays className="size-3.5" /> {describeTargetYear(goal.targetYear, Number(today.slice(0, 4)))}
              </span>
            )}
            <Link href={`/growth/goals/${goal.id}/edit`} className="flex items-center gap-1 hover:text-foreground">
              <Pencil className="size-3.5" /> Edit
            </Link>
          </span>
        }
      />

      {goal.status === "achieved" && goal.achievedAt && (
        <Card className="bg-success-soft/60 ring-success/30">
          <CardContent className="flex items-start gap-3">
            <PartyPopper className="mt-0.5 size-5 shrink-0 text-success-foreground" />
            <div className="flex flex-col gap-1 text-success-foreground">
              <AchievedDate goalId={goal.id} day={localDate(new Date(goal.achievedAt))} today={today} />
              <p className="text-sm">
                It&apos;s in your{" "}
                <Link href="/growth/achievements" className="font-medium underline underline-offset-4">
                  achievements
                </Link>
                .
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {goal.why && (
        <blockquote className="border-l-4 border-primary/40 pl-4 leading-7 whitespace-pre-wrap text-muted-foreground italic">
          {goal.why}
        </blockquote>
      )}

      {(goal.metricTarget !== null || goal.steps.length > 0 || goal.status === "active") && (
        <Card>
          <CardHeader>
            <CardTitle className="text-heading">Progress</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {goal.progress !== null && (
              <div className="flex flex-col gap-1.5">
                <ProgressBar value={goal.progress} label={`Progress: ${text}`} className="h-2.5" />
                <span className="text-sm text-muted-foreground tabular-nums">
                  {text} · {Math.round(goal.progress * 100)}%
                </span>
              </div>
            )}
            {goal.metricTarget !== null && (
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">
                  Reached so far, out of {formatAmount(goal.metricTarget)}
                  {goal.metricUnit ? ` ${goal.metricUnit}` : ""}
                </span>
                <MetricControl key={goal.metricCurrent} goalId={goal.id} current={goal.metricCurrent} unit={goal.metricUnit} />
              </div>
            )}
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">
                Steps
                {goal.metricTarget !== null && goal.stepsTotal > 0 && (
                  <span className="font-normal text-muted-foreground">
                    {" "}
                    · {goal.stepsDone} of {goal.stepsTotal} done
                  </span>
                )}
              </span>
              <StepsList goalId={goal.id} steps={goal.steps} />
            </div>
          </CardContent>
        </Card>
      )}

      {looksDone && (
        <p className="rounded-xl bg-success-soft/60 p-3 text-sm text-success-foreground">
          {goal.metricTarget !== null ? "You've reached the number." : "Every step is ticked off."} If it feels done, mark it
          as achieved.
        </p>
      )}
      <StatusActions goalId={goal.id} status={goal.status} />

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight text-heading">Notes</h2>
        <NotesLog goalId={goal.id} notes={goal.notes} />
      </section>

      <div className="border-t pt-6">
        <DeleteGoal goalId={goal.id} title={goal.title} />
      </div>
    </main>
  );
}

