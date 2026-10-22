import Link from "next/link";
import { connection } from "next/server";
import { Target, Trophy } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { listAchievements, listGoals } from "@/lib/goals";
import { localDate } from "@/lib/schedule";
import { formatDay } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { LogWin, RemoveAchievement } from "./log-win";

const monthFormat = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });

// Achievements by month: reached goals and wins logged along the way.
export default async function AchievementsPage() {
  await connection();
  const [achievements, goals] = await Promise.all([listAchievements(), listGoals()]);
  const today = localDate();
  const months = new Map<string, typeof achievements>();
  for (const a of achievements) {
    const key = a.achievedOn.slice(0, 7);
    months.set(key, [...(months.get(key) ?? []), a]);
  }
  const thisYear = achievements.filter((a) => a.achievedOn.slice(0, 4) === today.slice(0, 4)).length;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6">
      <PageHeader
        title="Achievements"
        description={
          achievements.length === 0
            ? "Goals you reach and wins worth remembering, big or small."
            : `${thisYear} this year. Look back here when it feels like nothing's moving.`
        }
      >
        <LogWin goals={goals.filter((g) => g.status === "active").map(({ id, title }) => ({ id, title }))} today={today} />
      </PageHeader>

      {achievements.length === 0 ? (
        <Card className="bg-muted/40">
          <CardContent className="flex flex-col items-start gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-sunflower-soft text-sunflower-foreground">
              <Trophy className="size-5" />
            </span>
            <p className="text-sm text-muted-foreground">
              Nothing here yet. Log a win from this week, even a small one: it counts. Goals you mark as achieved land
              here too.
            </p>
          </CardContent>
        </Card>
      ) : (
        [...months].map(([month, items]) => (
          <section key={month} className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold tracking-tight text-heading">{monthFormat.format(new Date(`${month}-01T00:00:00Z`))}</h2>
            <ul className="flex flex-col gap-2">
              {items.map((a) => (
                <li key={a.id} className="group flex gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full",
                      a.fromGoal ? "bg-success-soft text-success-foreground" : "bg-sunflower-soft text-sunflower-foreground",
                    )}
                  >
                    {a.fromGoal ? <Target className="size-4" /> : <Trophy className="size-4" />}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="font-medium">{a.fromGoal ? `Reached: ${a.title}` : a.title}</span>
                    {a.note && <p className="text-sm leading-6 whitespace-pre-wrap text-muted-foreground">{a.note}</p>}
                    <span className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                      {formatDay(a.achievedOn)}
                      {a.goalId && !a.fromGoal && a.goalTitle && (
                        <Link href={`/growth/goals/${a.goalId}`} className="hover:text-foreground">
                          Towards: {a.goalTitle}
                        </Link>
                      )}
                    </span>
                  </div>
                  <RemoveAchievement id={a.id} title={a.title} />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </main>
  );
}
