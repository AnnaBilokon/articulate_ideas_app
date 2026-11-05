import { z } from "zod";
import { goalColors } from "./goals";

// Growth calendar: timed blocks and to-dos for a day. Times are minutes after
// midnight in the app's time zone; the server turns them into instants. Days
// move with addDays and weekStart from ./habits.

export const SNAP_MINUTES = 15;
export const DAY_MINUTES = 24 * 60;

const title = z.string().trim().min(1, "Give it a name.").max(200, "Keep the name under 200 characters.");
const notes = z.string().trim().max(2000, "Keep the notes under 2000 characters.");
const date = z.iso.date();
const minute = z.int().min(0).max(DAY_MINUTES);

/** When something happens: a block of time on a day, or the whole day (a to-do with no time). */
export const eventWhenSchema = z.discriminatedUnion("allDay", [
  z.object({ allDay: z.literal(true), date }),
  z
    .object({ allDay: z.literal(false), date, start: minute, end: minute })
    .refine((w) => w.end > w.start, { message: "The end should be after the start.", path: ["end"] }),
]);
export type EventWhen = z.infer<typeof eventWhenSchema>;

export const calendarEventSchema = z.object({
  title,
  notes,
  color: z.enum(goalColors),
  when: eventWhenSchema,
});
export type CalendarEventInput = z.infer<typeof calendarEventSchema>;

/** An event as the calendar shows it. A block ends on its start's day (at most at midnight). */
export type CalendarEvent = {
  id: string;
  title: string;
  notes: string | null;
  color: (typeof goalColors)[number];
  when: EventWhen;
  done: boolean;
};

/** "09:30" */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Side-by-side columns for overlapping blocks on one day, like Google
 * Calendar: each block gets a column, and how many columns its group of
 * overlapping blocks needs.
 */
export function layoutDay<T extends { start: number; end: number }>(blocks: T[]): (T & { column: number; columns: number })[] {
  const sorted = [...blocks].sort((a, b) => a.start - b.start || b.end - a.end);
  const placed: (T & { column: number; columns: number })[] = [];
  let group: (T & { column: number; columns: number })[] = [];
  let groupEnd = -1;
  const closeGroup = () => {
    const columns = Math.max(0, ...group.map((b) => b.column + 1));
    for (const b of group) b.columns = columns;
    group = [];
  };
  for (const block of sorted) {
    if (block.start >= groupEnd) closeGroup();
    const taken = new Set(group.filter((b) => b.end > block.start).map((b) => b.column));
    let column = 0;
    while (taken.has(column)) column++;
    const item = { ...block, column, columns: 1 };
    group.push(item);
    placed.push(item);
    groupEnd = Math.max(groupEnd, block.end);
  }
  closeGroup();
  return placed;
}
