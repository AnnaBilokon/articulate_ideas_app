import "server-only";
import { startOfDay } from "@/lib/schedule";
import { db } from "@/lib/supabase";

// Days in a row with learning: a day counts when you recalled something (a
// review or quiz answer, word practice, a part recall, a brain dump, a
// teach-back, a Think deeper answer or a challenge). Days are calendar days in the app's
// time zone.

export type Streak = {
  /** Days in a row up to today, or up to yesterday if today isn't done yet. */
  current: number;
  best: number;
  /** Something was recalled today. */
  today: boolean;
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
  return { current, best, today: didToday };
}

const ACTIVITY_TABLES = [
  "attempts",
  "vocabulary_attempts",
  "chunk_recalls",
  "dumps",
  "explanations",
  "critical_answers",
  "challenge_attempts",
] as const;

export async function learningStreak(now: Date = new Date()): Promise<Streak> {
  // A year back is plenty for the current streak and a fair "best".
  const since = startOfDay(now, -366).toISOString();
  const results = await Promise.all(
    ACTIVITY_TABLES.map((table) => db().from(table).select("created_at").gte("created_at", since)),
  );
  return streakFrom(
    results.flatMap(({ data }) => (data ?? []).map((row) => row.created_at)),
    now,
  );
}
