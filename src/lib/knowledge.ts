import { z } from "zod";
import { STEP_DAYS, formatDue } from "@/lib/schedule";

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

// --- One topic in detail: "How you're doing" --------------------------------

export type AttemptInput = { score: number; confidence: number; created_at: string; feedback: unknown };

export type QuestionInput = {
  id: string;
  position: number;
  text: string;
  attempts: AttemptInput[];
  review_state: { due_at: string; step: number } | null;
};

export type QuestionProgress = {
  id: string;
  position: number;
  text: string;
  /** Scores, oldest first, at most the last 10. */
  history: number[];
  latest: number | null;
  /** From the latest answer: the key points it missed and why it went wrong. */
  missed: string[];
  mistake: string | null;
  /** Latest answer scored 0-2 with confidence 3. */
  confidentMiss: boolean;
  /** "Step 3 of 7 · every 7 days", null before the first review is scheduled. */
  ladder: string | null;
  nextReview: string | null;
};

// Lenient on purpose: older attempts may lack a field.
const feedbackSchema = z.object({
  points_missed: z.array(z.string()).catch([]),
  mistake_cause: z.string().nullable().catch(null),
});

const HISTORY = 10;

export function questionProgress(q: QuestionInput, now: Date = new Date()): QuestionProgress {
  const attempts = [...q.attempts].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const last = attempts.at(-1);
  const feedback = last ? feedbackSchema.safeParse(last.feedback) : null;
  const step = q.review_state ? Math.min(q.review_state.step, STEP_DAYS.length - 1) : null;
  const days = step === null ? 0 : STEP_DAYS[step];
  return {
    id: q.id,
    position: q.position,
    text: q.text,
    history: attempts.slice(-HISTORY).map((a) => a.score),
    latest: last?.score ?? null,
    missed: feedback?.success ? feedback.data.points_missed : [],
    // "no answer" adds nothing to a blank answer.
    mistake: feedback?.success && feedback.data.mistake_cause !== "no answer" ? feedback.data.mistake_cause : null,
    confidentMiss: Boolean(last && last.score <= 2 && last.confidence === 3),
    ladder: step === null ? null : `Step ${step + 1} of ${STEP_DAYS.length} · every ${days} ${days === 1 ? "day" : "days"}`,
    nextReview: q.review_state ? formatDue(q.review_state.due_at, now) : null,
  };
}

/** Questions to work on: latest score under 4, weakest and confident misses first. */
export function toImprove(questions: QuestionProgress[]): QuestionProgress[] {
  return questions
    .filter((q) => q.latest !== null && q.latest < 4)
    .sort((a, b) => Number(b.confidentMiss) - Number(a.confidentMiss) || a.latest! - b.latest!);
}

/** The key points missed most often across every answer to the topic. */
export function mostMissed(questions: QuestionInput[], limit = 5): { point: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const q of questions) {
    for (const a of q.attempts) {
      const parsed = feedbackSchema.safeParse(a.feedback);
      for (const point of parsed.success ? parsed.data.points_missed : []) {
        counts.set(point, (counts.get(point) ?? 0) + 1);
      }
    }
  }
  return [...counts]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([point, count]) => ({ point, count }));
}
