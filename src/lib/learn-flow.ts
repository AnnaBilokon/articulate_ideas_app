import { startOfDay } from "@/lib/schedule";

// The learn flow from PLAN.md. Day 1 is the lesson and the brain dump; the
// Topic Card unlocks after the dump and the questions come back in the next
// day's review. The quiz, teach-back and think deeper are optional extras.

/** The step a topic needs next on day 1, or null once day 1 is done. */
export function nextLearnStep(topic: { hasLesson: boolean; hasDump: boolean }): "Lesson" | "Brain dump" | null {
  if (!topic.hasLesson) return "Lesson";
  if (!topic.hasDump) return "Brain dump";
  return null;
}

type AnsweredQuestion = { attempts: { score: number; created_at: string }[] };

/**
 * Progress as what you can do: "You can answer 9 of 14 questions, 3 days
 * after you learned it". A question counts when its latest answer scored 4+.
 * Null until any question has been answered.
 */
export function progressLine(questions: AnsweredQuestion[], learnedAt: string, now: Date = new Date()): string | null {
  const tried = questions.filter((q) => q.attempts.length > 0);
  if (tried.length === 0) return null;
  const can = tried.filter((q) => {
    const latest = q.attempts.reduce((a, b) => (a.created_at > b.created_at ? a : b));
    return latest.score >= 4;
  }).length;
  const days = Math.round((startOfDay(now).getTime() - startOfDay(new Date(learnedAt)).getTime()) / 86_400_000);
  const after = days >= 1 ? `, ${days} ${days === 1 ? "day" : "days"} after you learned it` : "";
  return `You can answer ${can} of ${questions.length} ${questions.length === 1 ? "question" : "questions"}${after}`;
}
