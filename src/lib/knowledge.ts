import { formatDue } from "@/lib/schedule";

// How well each topic is known, worked out from saved answers and review
// dates. Pure functions, so the Library and Today agree on every number.

export type TopicProgressInput = {
  hasLesson: boolean;
  hasDump: boolean;
  questions: { attempts: { score: number; created_at: string }[]; review_state: { due_at: string } | null }[];
};

export type TopicStanding = {
  /** Day 1 is done: the lesson and the brain dump. */
  learned: boolean;
  questions: number;
  answered: number;
  /** Questions whose latest answer scored 4+. */
  canAnswer: number;
  /** Average of the latest score of each answered question, 0-5, one decimal. Null before any answer. */
  score: number | null;
  /** Questions due now. */
  dueNow: number;
  /** The earliest review date, and the same as "due now", "tomorrow", "in 6 days (Sun)". */
  nextDueAt: string | null;
  nextReview: string | null;
};

export function topicStanding(topic: TopicProgressInput, now: Date = new Date()): TopicStanding {
  const latest = topic.questions.flatMap((q) =>
    q.attempts.length > 0 ? [q.attempts.reduce((a, b) => (a.created_at > b.created_at ? a : b)).score] : [],
  );
  const dueDates = topic.questions.flatMap((q) => (q.review_state ? [q.review_state.due_at] : [])).sort();
  return {
    learned: topic.hasLesson && topic.hasDump,
    questions: topic.questions.length,
    answered: latest.length,
    canAnswer: latest.filter((s) => s >= 4).length,
    score: latest.length > 0 ? Math.round((latest.reduce((a, b) => a + b, 0) / latest.length) * 10) / 10 : null,
    dueNow: dueDates.filter((d) => new Date(d) <= now).length,
    nextDueAt: dueDates[0] ?? null,
    nextReview: dueDates.length > 0 ? formatDue(dueDates[0], now) : null,
  };
}

// Mastery stages from PLAN.md: Seen (lesson read and recalled), Recalled
// (quiz average 3+), Explained (teach-back 4+), Applied (used for real).
export const stageLabels: Record<string, string> = {
  seen: "Seen",
  recalled: "Recalled",
  explained: "Explained",
  applied: "Applied",
};

/** Colour for a 0-5 score: strong, getting there, or needs work. */
export function scoreTone(score: number): string {
  if (score >= 4) return "bg-success-soft text-success-foreground";
  if (score >= 3) return "bg-sunflower-soft text-sunflower-foreground";
  return "bg-coral-soft text-coral-foreground";
}
