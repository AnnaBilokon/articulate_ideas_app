import Link from "next/link";
import { connection } from "next/server";
import { ArrowRight, CheckCircle2, Feather, Flame, GraduationCap, Repeat, Sprout, Trophy, Wallet, WholeWord } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listBeliefs, reminderFor } from "@/lib/beliefs";
import { listAchievements, listGoals } from "@/lib/goals";
import { listHabits, todayDetail } from "@/lib/habits";
import { loadMoney } from "@/lib/money";
import { reviewOverview } from "@/lib/reviews";
import { APP_TIME_ZONE, localDate } from "@/lib/schedule";
import { formatKr, periodLabel, periodTotals, runningBalances } from "@/lib/schemas";
import { learningStreak } from "@/lib/streak";
import { practiceOverview } from "@/lib/vocabulary";
import { cn } from "@/lib/utils";
import { ProgressBar, progressText } from "./growth/goals/goal-bits";
import { HabitToday } from "./growth/habits/habit-check";

const dateFormat = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: APP_TIME_ZONE });
const hourFormat = new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: APP_TIME_ZONE });

function greeting(now: Date): string {
  const hour = Number(hourFormat.format(now));
  return hour >= 5 && hour < 12 ? "Good morning" : hour >= 12 && hour < 18 ? "Good afternoon" : "Good evening";
}

// Journey home: each workspace at a glance, and the way into it.
export default async function JourneyHome() {
  await connection(); // Read fresh data on every visit, not once at build.
  const now = new Date();
  const today = localDate(now);
  const [review, words, streak, goals, achievements, habits, beliefs, money] = await Promise.all([
    reviewOverview(),
    practiceOverview(),
    learningStreak(),
    listGoals(),
    listAchievements(),
    listHabits(today),
    listBeliefs(),
    loadMoney(),
  ]);
  const reminder = reminderFor(beliefs, today);
  const todaysHabits = habits.filter((h) => !h.archived && h.plannedToday);
  // Money: the latest month that's been filled in.
  const moneyMonth = money.periods.filter((p) => periodTotals(p, money.categories).billsEntered).at(-1);
  const moneyTotals = moneyMonth ? periodTotals(moneyMonth, money.categories) : null;
  const moneySavings = moneyMonth
    ? [...(runningBalances(money.periods, money.categories).get(moneyMonth.id) ?? new Map<string, number>())]
        .filter(([id]) => money.categories.find((c) => c.id === id)?.kind === "saving")
        .reduce((t, [, v]) => t + v, 0)
    : 0;
  const active = goals.filter((g) => g.status === "active");
  // Goals with a target year first, soonest first; then the newest.
  const shown = [...active].sort((a, b) => (a.targetYear ?? 9999) - (b.targetYear ?? 9999)).slice(0, 3);
  const thisMonth = achievements.filter((a) => a.achievedOn.slice(0, 7) === today.slice(0, 7)).length;

  const learning = [
    {
      icon: Flame,
      tone: "bg-tag-3 text-tag-3-foreground",
      text: streak.today
        ? `Learned today · ${streak.current}-day streak`
        : streak.current > 0
          ? `${streak.current}-day streak · learn today to keep it`
          : "Learn something today to start a streak",
    },
    ...(review.today.length > 0
      ? [
          {
            icon: Repeat,
            tone: "bg-sunflower-soft text-sunflower-foreground",
            text: `${review.today.length} ${review.today.length === 1 ? "question" : "questions"} to review`,
          },
        ]
      : []),
    ...(words.due > 0
      ? [
          {
            icon: WholeWord,
            tone: "bg-info-soft text-info-foreground",
            text: `${words.due} ${words.due === 1 ? "word" : "words"} to practise`,
          },
        ]
      : []),
  ];

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6">
      <PageHeader title={greeting(now)} description={`${dateFormat.format(now)}. Your journey, one day at a time.`} />

      {reminder && (
        <Link
          href={`/growth/beliefs/${reminder.id}`}
          className="-mt-2 flex items-start gap-3 rounded-xl bg-accent/60 p-4 text-accent-foreground transition-colors hover:bg-accent"
        >
          <Feather className="mt-0.5 size-4 shrink-0" />
          <span className="flex flex-col gap-0.5">
            <span className="text-xs font-medium tracking-wide uppercase opacity-80">To keep in mind today</span>
            <span className="leading-6 font-medium">{reminder.reframe}</span>
          </span>
        </Link>
      )}

      {todaysHabits.length > 0 && (
        <section className="flex flex-col gap-3" aria-labelledby="habits-today">
          <div className="flex items-baseline justify-between gap-2">
            <h2 id="habits-today" className="text-lg font-semibold tracking-tight text-heading">
              Habits today{" "}
              <span className="text-sm font-normal text-muted-foreground">
                {todaysHabits.filter((h) => h.doneToday).length} of {todaysHabits.length}
              </span>
            </h2>
            <Link href="/growth/habits" className="text-sm text-muted-foreground hover:text-foreground">
              All habits
            </Link>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {todaysHabits.map((h) => (
              <li key={h.id}>
                <HabitToday habitId={h.id} title={h.title} today={today} done={h.doneToday} detail={todayDetail(h)} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <span className="mb-1 flex size-9 items-center justify-center rounded-lg bg-highlight text-highlight-foreground">
              <GraduationCap className="size-4.5" />
            </span>
            <CardTitle className="text-lg text-heading">Learning</CardTitle>
            <CardDescription>Topics, recall, vocabulary and speaking.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-4">
            <ul className="flex flex-col gap-2 text-sm">
              {learning.map(({ icon: Icon, tone, text }) => (
                <li key={text} className="flex items-center gap-2.5">
                  <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-md", tone)}>
                    <Icon className="size-3.5" />
                  </span>
                  {text}
                </li>
              ))}
              {review.today.length === 0 && words.due === 0 && (
                <li className="flex items-center gap-2.5 text-muted-foreground">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-success-soft text-success-foreground">
                    <CheckCircle2 className="size-3.5" />
                  </span>
                  Nothing due: a good day for something new
                </li>
              )}
            </ul>
            <Link href="/learn" className={cn(buttonVariants(), "mt-auto w-fit")}>
              Open Learning <ArrowRight className="size-4" />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <span className="mb-1 flex size-9 items-center justify-center rounded-lg bg-success-soft text-success-foreground">
              <Sprout className="size-4.5" />
            </span>
            <CardTitle className="text-lg text-heading">Growth</CardTitle>
            <CardDescription>Goals, habits, achievements, strengths and beliefs.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-4">
            {shown.length === 0 ? (
              <p className="text-sm text-muted-foreground">No goals yet. Start with one that matters this season.</p>
            ) : (
              <ul className="flex flex-col gap-3 text-sm">
                {shown.map((g) => {
                  const text = progressText(g);
                  return (
                    <li key={g.id}>
                      <Link href={`/growth/goals/${g.id}`} className="flex flex-col gap-1.5 hover:text-heading">
                        <span className="font-medium">{g.title}</span>
                        {g.progress !== null && (
                          <span className="flex items-center gap-2">
                            <ProgressBar value={g.progress} label={`${g.title}: ${text}`} className="flex-1" />
                            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{text}</span>
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
                {active.length > shown.length && (
                  <li className="text-xs text-muted-foreground">and {active.length - shown.length} more</li>
                )}
              </ul>
            )}
            {thisMonth > 0 && (
              <p className="flex items-center gap-2 text-sm">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-sunflower-soft text-sunflower-foreground">
                  <Trophy className="size-3.5" />
                </span>
                {thisMonth} {thisMonth === 1 ? "achievement" : "achievements"} this month
              </p>
            )}
            <Link href={shown.length === 0 ? "/growth/goals/new" : "/growth/goals"} className={cn(buttonVariants(), "mt-auto w-fit")}>
              {shown.length === 0 ? "Add a goal" : "Open Growth"} <ArrowRight className="size-4" />
            </Link>
          </CardContent>
        </Card>

        <Card className="sm:col-span-2">
          <CardHeader>
            <span className="mb-1 flex size-9 items-center justify-center rounded-lg bg-info-soft text-info-foreground">
              <Wallet className="size-4.5" />
            </span>
            <CardTitle className="text-lg text-heading">Money</CardTitle>
            <CardDescription>{moneyMonth ? `Last filled in: ${periodLabel(moneyMonth.month)}.` : "Income, spending and savings, month by month."}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {moneyTotals && (
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ["Spent", moneyTotals.spending],
                  ["Saved", moneyTotals.saved],
                  ["Free cash", moneyTotals.freeCash],
                  ["All savings", moneySavings],
                ].map(([label, value]) => (
                  <div key={label} className="flex flex-col gap-0.5">
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="font-semibold text-heading">{formatKr(value as number)}</dd>
                  </div>
                ))}
              </dl>
            )}
            <Link href="/money" className={cn(buttonVariants(), "w-fit")}>
              Open Money <ArrowRight className="size-4" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
