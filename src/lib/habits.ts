import "server-only";
import { localDate } from "@/lib/schedule";
import { addDays, isPlannedOn, scheduleLabel, weekProgress, type HabitSchedule } from "@/lib/schemas";
import { db } from "@/lib/supabase";

// Habits and the days they were done, for the Growth workspace and Journey home.

export type Habit = {
  id: string;
  title: string;
  why: string | null;
  schedule: HabitSchedule;
  days: number[];
  timesPerWeek: number | null;
  archived: boolean;
  /** Days done, YYYY-MM-DD, newest first. */
  done: string[];
  plannedToday: boolean;
  doneToday: boolean;
  week: { done: number; target: number };
  last30: number;
};

export async function listHabits(today: string = localDate()): Promise<Habit[]> {
  const [{ data: habits }, { data: checks }] = await Promise.all([
    db()
      .from("habits")
      .select("id, title, why, schedule, days, times_per_week, archived_at")
      .order("created_at", { ascending: true }),
    db().from("habit_checks").select("habit_id, day").order("day", { ascending: false }),
  ]);
  const byHabit = new Map<string, string[]>();
  for (const c of checks ?? []) byHabit.set(c.habit_id, [...(byHabit.get(c.habit_id) ?? []), c.day]);
  const monthAgo = addDays(today, -29);

  return (habits ?? []).map((h) => {
    const rule = { schedule: h.schedule as HabitSchedule, days: h.days, timesPerWeek: h.times_per_week };
    const done = byHabit.get(h.id) ?? [];
    const doneSet = new Set(done);
    return {
      id: h.id,
      title: h.title,
      why: h.why,
      ...rule,
      archived: h.archived_at !== null,
      done,
      plannedToday: isPlannedOn(rule, today),
      doneToday: doneSet.has(today),
      week: weekProgress(rule, doneSet, today),
      last30: done.filter((d) => d >= monthAgo && d <= today).length,
    };
  });
}

export async function getHabit(id: string, today: string = localDate()): Promise<Habit | null> {
  return (await listHabits(today)).find((h) => h.id === id) ?? null;
}

/** "2 of 3 this week" for a weekly habit; otherwise its schedule. */
export function todayDetail(h: Habit): string {
  if (h.schedule === "weekly") {
    return h.week.done >= h.week.target
      ? `${scheduleLabel(h)} · done for this week`
      : `${h.week.done} of ${h.week.target} this week`;
  }
  return scheduleLabel(h);
}
