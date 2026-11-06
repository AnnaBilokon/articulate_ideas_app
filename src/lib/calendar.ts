import "server-only";
import { localDate, zonedInstant, zonedMinutes } from "@/lib/schedule";
import { DAY_MINUTES, addDays, goalColors, type CalendarEvent, type EventWhen, type GoalColor } from "@/lib/schemas";
import { db } from "@/lib/supabase";

// The Growth calendar's events, in the app's time zone.

export const EVENT_COLUMNS = "id, title, notes, color, starts_at, ends_at, day, done_at";

type EventRow = {
  id: string;
  title: string;
  notes: string | null;
  color: string;
  starts_at: string | null;
  ends_at: string | null;
  day: string | null;
  done_at: string | null;
};

export function toEvent(r: EventRow): CalendarEvent {
  let when: EventWhen;
  if (r.day) when = { allDay: true, date: r.day };
  else {
    const starts = new Date(r.starts_at!);
    const ends = new Date(r.ends_at!);
    const date = localDate(starts);
    // A block ending at midnight (or later) ends at the bottom of its day.
    const end = localDate(ends) > date ? DAY_MINUTES : zonedMinutes(ends);
    when = { allDay: false, date, start: zonedMinutes(starts), end };
  }
  return {
    id: r.id,
    title: r.title,
    notes: r.notes,
    color: (goalColors as readonly string[]).includes(r.color) ? (r.color as GoalColor) : "blue",
    when,
    done: r.done_at !== null,
  };
}

/** The columns to save for when something happens. A new time reminds again. */
export function whenColumns(when: EventWhen) {
  return when.allDay
    ? { day: when.date, starts_at: null, ends_at: null, reminded_at: null }
    : {
        day: null,
        starts_at: zonedInstant(when.date, when.start).toISOString(),
        ends_at: zonedInstant(when.date, when.end).toISOString(),
        reminded_at: null,
      };
}

/** Everything in the 7 days from `from` (YYYY-MM-DD). */
export async function loadWeek(from: string): Promise<CalendarEvent[]> {
  const to = addDays(from, 7);
  const [{ data: timed }, { data: allDay }] = await Promise.all([
    db()
      .from("calendar_events")
      .select(EVENT_COLUMNS)
      .gte("starts_at", zonedInstant(from, 0).toISOString())
      .lt("starts_at", zonedInstant(to, 0).toISOString())
      .order("starts_at"),
    db().from("calendar_events").select(EVENT_COLUMNS).gte("day", from).lt("day", to).order("created_at"),
  ]);
  return [...(allDay ?? []), ...(timed ?? [])].map(toEvent);
}
