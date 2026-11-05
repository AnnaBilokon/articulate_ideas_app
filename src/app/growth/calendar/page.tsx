import { connection } from "next/server";
import { PageHeader } from "@/components/page-header";
import { loadWeek } from "@/lib/calendar";
import { localDate } from "@/lib/schedule";
import { weekStart } from "@/lib/schemas";
import { CalendarView } from "./calendar-view";

// Things to do and time blocked for them, a week or a day at a time.
export default async function CalendarPage({ searchParams }: PageProps<"/growth/calendar">) {
  await connection();
  const { date: dateParam, view: viewParam } = await searchParams;
  const today = localDate();
  const date = typeof dateParam === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) && !Number.isNaN(Date.parse(dateParam)) ? dateParam : today;
  const view = viewParam === "week" || viewParam === "day" ? viewParam : null;
  const week = weekStart(date);
  const events = await loadWeek(week);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6">
      <PageHeader title="Calendar" description="Put down what you want to do, and block time for what matters." />
      {/* A new week starts fresh; within a week, the calendar keeps its own state. */}
      <CalendarView key={week} week={week} date={date} today={today} view={view} events={events} />
    </main>
  );
}
