import "server-only";
import { startOfDay } from "@/lib/schedule";
import { db } from "@/lib/supabase";

// Days in a row with learning: a day counts when you recalled something (a
// review or quiz answer, word practice, a part recall, a brain dump, a
// teach-back, a Think deeper answer, a challenge, a tutor conversation or a
// speaking exercise). Days are calendar days in the app's
// time zone.

export type Streak = {
  /** Days in a row up to today, or up to yesterday if today isn't done yet. */
  current: number;
  best: number;
  /** Something was recalled today. */
  today: boolean;
  /** Days with learning in the last year, in a row or not: one leaf each on the tree. */
  days: number;
};

export function streakFrom(times: string[], now: Date = new Date()): Streak {
  const days = new Set(times.map((t) => startOfDay(new Date(t)).getTime()));
  const today = startOfDay(now).getTime();
  const didToday = days.has(today);

  // Yesterday's run is still alive until today ends.
  let day = didToday ? today : startOfDay(now, -1).getTime();
  let current = 0;
  while (days.has(day)) {
    current++;
    day = startOfDay(new Date(day), -1).getTime();
  }

  let best = 0;
  let run = 0;
  let previous: number | null = null;
  for (const d of [...days].sort((a, b) => a - b)) {
    run = previous !== null && startOfDay(new Date(previous), 1).getTime() === d ? run + 1 : 1;
    best = Math.max(best, run);
    previous = d;
  }
  return { current, best, today: didToday, days: days.size };
}

// Each table with the time that counts; a speaking exercise counts once done.
const ACTIVITY = [
  ["attempts", "created_at"],
  ["vocabulary_attempts", "created_at"],
  ["chunk_recalls", "created_at"],
  ["dumps", "created_at"],
  ["explanations", "created_at"],
  ["critical_answers", "created_at"],
  ["challenge_attempts", "created_at"],
  ["tutor_sessions", "created_at"],
  ["speaking_exercises", "completed_at"],
] as const;

export async function learningStreak(now: Date = new Date()): Promise<Streak> {
  // A year back is plenty for the current streak and a fair "best".
  const since = startOfDay(now, -366).toISOString();
  const results = await Promise.all(
    ACTIVITY.map(([table, column]) => db().from(table).select(column).gte(column, since)),
  );
  const times = results.flatMap(({ data }, i) =>
    (data ?? []).map((row) => (row as Record<string, string | null>)[ACTIVITY[i][1]]).filter((t): t is string => t !== null),
  );
  return streakFrom(times, now);
}
