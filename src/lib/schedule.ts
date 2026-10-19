// Spaced reviews: when each recall question comes back. See "Scheduling" in
// PLAN.md. Pure functions, used on the server and in the browser.

// Days until the next review at each step of the ladder; the last step repeats.
export const STEP_DAYS = [1, 3, 7, 14, 30, 60, 120] as const;
const LAST_STEP = STEP_DAYS.length - 1;

// Reviews fall due at the start of a day in the learner's time zone, so a
// question answered at 17:30 is due first thing in the morning, not at 17:30.
export const APP_TIME_ZONE = "Europe/Stockholm";

export type ReviewState = { step: number; interval_days: number; due_at: string };
export type NextReview = ReviewState & { last_score: number };

/**
 * Where a question goes after an answer.
 * - Missed (0-2), confident misses included: back to the first step, due tomorrow.
 * - First answer ever: first review tomorrow.
 * - Not due yet (quiz again, a re-ask at the end of a quiz): the schedule stays
 *   as it is, so extra practice can't rush a question up the ladder.
 * - Due, scored 3, or 4-5 while guessing (a lucky guess): same step again.
 * - Due and 4-5: one step up.
 */
export function nextReview(
  current: ReviewState | null,
  score: number,
  confidence: number,
  now: Date = new Date(),
): NextReview {
  let step: number;
  if (score <= 2 || !current) step = 0;
  else if (new Date(current.due_at) > now) return { ...current, last_score: score };
  else if (score === 3 || confidence === 1) step = current.step;
  else step = Math.min(current.step + 1, LAST_STEP);

  const interval_days = STEP_DAYS[step];
  return { step, interval_days, due_at: startOfDay(now, interval_days).toISOString(), last_score: score };
}

// Calendar date (year, month, day) of an instant in the app's time zone.
function zonedDate(date: Date): [number, number, number] {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  return [get("year"), get("month"), get("day")];
}

// How far the app's time zone is ahead of UTC at an instant, in milliseconds.
function zoneOffset(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIME_ZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** Midnight in the app's time zone, `days` days after the day of `date`. */
export function startOfDay(date: Date, days = 0): Date {
  const [year, month, day] = zonedDate(date);
  const midnightUtc = Date.UTC(year, month - 1, day + days);
  // Correct by the zone's offset; check again in case summer time starts or ends that night.
  const first = midnightUtc - zoneOffset(new Date(midnightUtc));
  return new Date(midnightUtc - zoneOffset(new Date(first)));
}

const weekdayFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: APP_TIME_ZONE,
  weekday: "short",
  day: "numeric",
  month: "short",
});

/** "due now", "tomorrow", "in 3 days (Fri 9 Oct)", counted in calendar days. */
export function formatDue(dueAt: string, now: Date = new Date()): string {
  const due = new Date(dueAt);
  if (due <= now) return "due now";
  const days = Math.round((startOfDay(due).getTime() - startOfDay(now).getTime()) / 86_400_000);
  if (days <= 0) return "later today";
  if (days === 1) return "tomorrow";
  return `in ${days} days (${weekdayFormat.format(due)})`;
}

/**
 * Today's review from the questions that are due: the oldest first, up to
 * what's left of the daily cap, so a missed week doesn't become one huge
 * session; the rest wait for the next days, still oldest first. Topics are
 * then spread apart (interleaving): each pick comes from the topic with the
 * most questions left, never the same topic twice in a row if another is left.
 * Up to two questions answered well last time go first, as a warm-up.
 */
export function planTodaysReview<T extends { topicId: string; lastScore?: number | null }>(
  dueOldestFirst: T[],
  room: number,
): { today: T[]; overflow: number } {
  const picked = dueOldestFirst.slice(0, Math.max(0, room));
  const byTopic = new Map<string, T[]>();
  for (const item of picked) byTopic.set(item.topicId, [...(byTopic.get(item.topicId) ?? []), item]);

  const today: T[] = [];
  let previous: string | null = null;
  while (today.length < picked.length) {
    let best: string | null = null;
    for (const [topicId, items] of byTopic) {
      if (items.length === 0 || (topicId === previous && hasOther(byTopic, topicId))) continue;
      if (best === null || items.length > byTopic.get(best)!.length) best = topicId;
    }
    best ??= previous!;
    today.push(byTopic.get(best)!.shift()!);
    previous = best;
  }
  // Warm-up: start with up to two questions answered well last time, so the
  // session opens with a win.
  const warmUp = today.filter((q) => (q.lastScore ?? 0) >= 4).slice(0, WARM_UP);
  return {
    today: [...warmUp, ...today.filter((q) => !warmUp.includes(q))],
    overflow: dueOldestFirst.length - picked.length,
  };
}

const WARM_UP = 2;

function hasOther<T>(byTopic: Map<string, T[]>, topicId: string): boolean {
  for (const [id, items] of byTopic) if (id !== topicId && items.length > 0) return true;
  return false;
}
