import Link from "next/link";
import { connection } from "next/server";
import { ChevronRight, Repeat } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { listHabits, todayDetail, type Habit } from "@/lib/habits";
import { localDate } from "@/lib/schedule";
import { scheduleLabel } from "@/lib/schemas";
import { NewHabit } from "./habit-actions";
import { HabitCalendar, HabitToday } from "./habit-check";

// Habits: today's check-in first, then each habit with its recent weeks.
// Missed days carry no penalty, and past days can be ticked off later.
export default async function HabitsPage() {
  await connection();
  const today = localDate();
  const habits = await listHabits(today);
  const active = habits.filter((h) => !h.archived);
  const resting = habits.filter((h) => h.archived);
  const todays = active.filter((h) => h.plannedToday);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6">
      <PageHeader title="Habits" description="Small things, most days. Missed days are fine: just pick it up again.">
        <NewHabit first={habits.length === 0} />
      </PageHeader>

      {habits.length === 0 && (
        <Card className="bg-muted/40">
          <CardContent className="flex flex-col items-start gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-highlight text-highlight-foreground">
              <Repeat className="size-5" />
            </span>
            <p className="text-sm text-muted-foreground">
              Start with one small habit you can do even on a busy day. You can tick it off here or on Journey home.
            </p>
          </CardContent>
        </Card>
      )}

      {todays.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold tracking-tight text-heading">
            Today{" "}
            <span className="text-sm font-normal text-muted-foreground">
              {todays.filter((h) => h.doneToday).length} of {todays.length}
            </span>
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {todays.map((h) => (
              <li key={h.id}>
                <HabitToday habitId={h.id} title={h.title} today={today} done={h.doneToday} detail={todayDetail(h)} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {active.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold tracking-tight text-heading">Your habits</h2>
          <p className="-mt-1 text-sm text-muted-foreground">Tap a day to tick it off or undo it, if you forgot.</p>
          <ul className="flex flex-col gap-3">
            {active.map((h) => (
              <li key={h.id}>
                <HabitCard habit={h} today={today} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {resting.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold tracking-tight text-heading">Resting</h2>
          <ul className="flex flex-col gap-2">
            {resting.map((h) => (
              <li key={h.id}>
                <Link
                  href={`/growth/habits/${h.id}`}
                  className="group flex items-center gap-3 rounded-xl bg-muted/40 p-3 text-sm ring-1 ring-foreground/10 hover:bg-accent/50"
                >
                  <span className="flex-1 text-muted-foreground">{h.title}</span>
                  <span className="text-xs text-muted-foreground">{h.done.length} days done</span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

function HabitCard({ habit: h, today }: { habit: Habit; today: string }) {
  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-3">
        <Link href={`/growth/habits/${h.id}`} className="group flex items-start gap-3">
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="font-medium group-hover:text-heading">{h.title}</span>
            <span className="text-xs text-muted-foreground">
              {scheduleLabel(h)} · this week {h.week.done} of {h.week.target} · {h.last30} in the last 30 days
            </span>
          </span>
          <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </Link>
        <HabitCalendar habitId={h.id} title={h.title} rule={h} done={h.done} today={today} weeks={12} />
      </CardContent>
    </Card>
  );
}
