import { notFound } from "next/navigation";
import { connection } from "next/server";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getHabit } from "@/lib/habits";
import { localDate } from "@/lib/schedule";
import { scheduleLabel } from "@/lib/schemas";
import { DeleteHabit, EditHabit, RestHabit } from "../habit-actions";
import { HabitCalendar, HabitToday } from "../habit-check";

// One habit: today's tick, the last half year, and edit, rest or delete.
export default async function HabitPage({ params }: PageProps<"/growth/habits/[id]">) {
  await connection();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const today = localDate();
  const habit = await getHabit(id, today);
  if (!habit) notFound();

  const stats = [
    { value: `${habit.week.done} of ${habit.week.target}`, label: "this week" },
    { value: habit.last30, label: "in the last 30 days" },
    { value: habit.done.length, label: "days in all" },
  ];

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
      <PageHeader
        title={habit.title}
        description={habit.archived ? `${scheduleLabel(habit)} · resting` : scheduleLabel(habit)}
        back={{ href: "/growth/habits", label: "Habits" }}
      />

      {habit.why && (
        <blockquote className="border-l-4 border-primary/40 pl-4 leading-7 whitespace-pre-wrap text-muted-foreground italic">
          {habit.why}
        </blockquote>
      )}

      {!habit.archived && habit.plannedToday && (
        <HabitToday habitId={habit.id} title="Today" today={today} done={habit.doneToday} />
      )}

      <section className="grid grid-cols-3 gap-3">
        {stats.map(({ value, label }) => (
          <Card key={label} size="sm">
            <CardContent className="flex flex-col gap-0.5">
              <span className="text-xl font-semibold tabular-nums text-heading sm:text-2xl">{value}</span>
              <span className="text-xs text-muted-foreground">{label}</span>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-heading">The last 26 weeks</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <HabitCalendar habitId={habit.id} title={habit.title} rule={habit} done={habit.done} today={today} weeks={26} />
          <p className="text-xs text-muted-foreground">Tap a day to tick it off or undo it. Faint days aren&apos;t planned.</p>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-start gap-2">
        <EditHabit
          habitId={habit.id}
          initial={{
            title: habit.title,
            why: habit.why ?? "",
            schedule: habit.schedule,
            days: habit.days,
            timesPerWeek: habit.timesPerWeek ?? 3,
          }}
        />
        <RestHabit habitId={habit.id} resting={habit.archived} />
      </div>

      <div className="border-t pt-6">
        <DeleteHabit habitId={habit.id} title={habit.title} />
      </div>
    </main>
  );
}
