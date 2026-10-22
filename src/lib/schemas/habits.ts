import { z } from "zod";

// Growth workspace: habits. Daily, on chosen weekdays, or a number of times
// a week. No streaks to lose: progress is what you did, and past days can be
// ticked off later. Dates are YYYY-MM-DD in the app's time zone.

export const habitSchedules = ["daily", "days", "weekly"] as const;
export type HabitSchedule = (typeof habitSchedules)[number];

/** ISO weekdays: 1 = Monday ... 7 = Sunday. */
export const WEEKDAYS = [
  { day: 1, short: "Mon", letter: "M" },
  { day: 2, short: "Tue", letter: "T" },
  { day: 3, short: "Wed", letter: "W" },
  { day: 4, short: "Thu", letter: "T" },
  { day: 5, short: "Fri", letter: "F" },
  { day: 6, short: "Sat", letter: "S" },
  { day: 7, short: "Sun", letter: "S" },
] as const;

export const habitSchema = z
  .object({
    title: z.string().trim().min(1, "Name the habit.").max(120, "Keep the name under 120 characters."),
    why: z.string().trim().max(1000, "Keep the why under 1000 characters."),
    schedule: z.enum(habitSchedules),
    days: z.array(z.number().int().min(1).max(7)).max(7),
    timesPerWeek: z.number().int().min(1).max(7),
  })
  .refine((h) => h.schedule !== "days" || h.days.length > 0, { message: "Pick at least one day.", path: ["days"] });
export type HabitInput = z.infer<typeof habitSchema>;

export type HabitRule = { schedule: HabitSchedule; days: number[]; timesPerWeek: number | null };

export function isoWeekday(date: string): number {
  const d = new Date(`${date}T00:00:00Z`).getUTCDay();
  return d === 0 ? 7 : d;
}

/** The date `days` days after `date`. */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Monday of the week `date` is in. */
export const weekStart = (date: string) => addDays(date, 1 - isoWeekday(date));

/** Whether the habit is planned for that day. A weekly habit can be done any day. */
export function isPlannedOn(habit: HabitRule, date: string): boolean {
  return habit.schedule !== "days" || habit.days.includes(isoWeekday(date));
}

/** "Every day", "Mon, Wed, Fri", "3 times a week". */
export function scheduleLabel(habit: HabitRule): string {
  if (habit.schedule === "daily") return "Every day";
  if (habit.schedule === "weekly") {
    const n = habit.timesPerWeek ?? 1;
    return n === 1 ? "Once a week" : `${n} times a week`;
  }
  if (habit.days.length === 7) return "Every day";
  if (habit.days.length === 5 && [1, 2, 3, 4, 5].every((d) => habit.days.includes(d))) return "Weekdays";
  if (habit.days.length === 2 && habit.days.includes(6) && habit.days.includes(7)) return "Weekends";
  return WEEKDAYS.filter((w) => habit.days.includes(w.day))
    .map((w) => w.short)
    .join(", ");
}

/** This week so far: days done, and how many the habit asks for in the whole week. */
export function weekProgress(habit: HabitRule, done: Set<string>, today: string): { done: number; target: number } {
  const monday = weekStart(today);
  const week = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const target =
    habit.schedule === "daily" ? 7 : habit.schedule === "weekly" ? (habit.timesPerWeek ?? 1) : habit.days.length;
  return { done: week.filter((d) => done.has(d)).length, target };
}

/** Weeks of days for a calendar, Monday first, ending with the week of `today`. */
export function calendarWeeks(today: string, weeks: number): string[][] {
  const first = addDays(weekStart(today), -7 * (weeks - 1));
  return Array.from({ length: weeks }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(first, w * 7 + d)));
}
