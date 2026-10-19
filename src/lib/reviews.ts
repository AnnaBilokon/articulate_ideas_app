import "server-only";
import { cookies } from "next/headers";
import { planTodaysReview, startOfDay } from "@/lib/schedule";
import { db } from "@/lib/supabase";

export type ReviewQuestion = { id: string; text: string; topicId: string; topicTitle: string; lastScore: number | null };

// "Too much?": a light day reviews at most this many questions. The choice is
// kept in a cookie that names the day, so it ends by itself at midnight.
export const LIGHT_DAY_CAP = 5;
export const LIGHT_DAY_COOKIE = "light-day";

/** The day's key for the light-day cookie: midnight in the app's time zone. */
export const dayKey = (now: Date = new Date()) => startOfDay(now).toISOString();

export async function isLightDay(now: Date = new Date()): Promise<boolean> {
  return (await cookies()).get(LIGHT_DAY_COOKIE)?.value === dayKey(now);
}

export type ReviewOverview = {
  // Today's review: due questions within the daily cap, topics mixed.
  today: ReviewQuestion[];
  // Due, but over today's cap; they come in the next days.
  overflow: number;
  // Questions already reviewed today, which count toward the cap.
  reviewedToday: number;
  cap: number;
  // Today is a light day ("Too much?"), with the smaller cap.
  lightDay: boolean;
  // When the next question falls due after now; null if none is scheduled.
  nextDueAt: string | null;
  // Whether any question has a schedule yet (a quiz has been taken).
  scheduled: boolean;
};

export async function reviewOverview(now: Date = new Date()): Promise<ReviewOverview> {
  const supabase = db();
  const [{ data: settings }, { data: due }, { data: reviewed }, { data: next }] = await Promise.all([
    supabase.from("settings").select("daily_review_cap").eq("id", 1).maybeSingle(),
    supabase
      .from("review_state")
      .select("due_at, last_score, recall_questions(id, text, topic_id, topics(title))")
      .lte("due_at", now.toISOString())
      .order("due_at"),
    supabase
      .from("attempts")
      .select("question_id")
      .eq("mode", "review")
      .gte("created_at", startOfDay(now).toISOString()),
    supabase.from("review_state").select("due_at").gt("due_at", now.toISOString()).order("due_at").limit(1),
  ]);

  const lightDay = await isLightDay(now);
  const cap = Math.min(settings?.daily_review_cap ?? 10, lightDay ? LIGHT_DAY_CAP : Infinity);
  // Distinct questions, so re-asks at the end of a session don't use up the cap.
  const reviewedToday = new Set((reviewed ?? []).map((a) => a.question_id)).size;
  const dueQuestions = (due ?? []).flatMap(({ last_score, recall_questions: q }) =>
    q?.topics
      ? [{ id: q.id, text: q.text, topicId: q.topic_id, topicTitle: q.topics.title, lastScore: last_score }]
      : [],
  );
  const { today, overflow } = planTodaysReview(dueQuestions, cap - reviewedToday);

  return {
    today,
    overflow,
    reviewedToday,
    cap,
    lightDay,
    nextDueAt: next?.[0]?.due_at ?? null,
    scheduled: dueQuestions.length > 0 || (next?.length ?? 0) > 0,
  };
}

/**
 * Puts a topic's questions into the review schedule for tomorrow, once the
 * brain dump is done: day 1 is the lesson, the first recall is a day later.
 * Questions that already have a schedule (a quiz was taken) keep it.
 */
export async function scheduleTopicQuestions(topicId: string, now: Date = new Date()): Promise<number> {
  const supabase = db();
  const { data: questions } = await supabase.from("recall_questions").select("id, review_state(id)").eq("topic_id", topicId);
  const fresh = (questions ?? []).filter((q) => !q.review_state);
  if (fresh.length === 0) return 0;
  const due_at = startOfDay(now, 1).toISOString();
  const { error } = await supabase
    .from("review_state")
    .upsert(
      fresh.map((q) => ({ question_id: q.id, due_at, step: 0, interval_days: 1 })),
      { onConflict: "question_id", ignoreDuplicates: true },
    );
  if (error) console.error(`schedule topic ${topicId} failed:`, error);
  return error ? 0 : fresh.length;
}
