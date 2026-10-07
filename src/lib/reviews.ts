import "server-only";
import { planTodaysReview, startOfDay } from "@/lib/schedule";
import { db } from "@/lib/supabase";

export type ReviewQuestion = { id: string; text: string; topicId: string; topicTitle: string };

export type ReviewOverview = {
  // Today's review: due questions within the daily cap, topics mixed.
  today: ReviewQuestion[];
  // Due, but over today's cap; they come in the next days.
  overflow: number;
  // Questions already reviewed today, which count toward the cap.
  reviewedToday: number;
  cap: number;
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
      .select("due_at, recall_questions(id, text, topic_id, topics(title))")
      .lte("due_at", now.toISOString())
      .order("due_at"),
    supabase
      .from("attempts")
      .select("question_id")
      .eq("mode", "review")
      .gte("created_at", startOfDay(now).toISOString()),
    supabase.from("review_state").select("due_at").gt("due_at", now.toISOString()).order("due_at").limit(1),
  ]);

  const cap = settings?.daily_review_cap ?? 20;
  // Distinct questions, so re-asks at the end of a session don't use up the cap.
  const reviewedToday = new Set((reviewed ?? []).map((a) => a.question_id)).size;
  const dueQuestions = (due ?? []).flatMap(({ recall_questions: q }) =>
    q?.topics ? [{ id: q.id, text: q.text, topicId: q.topic_id, topicTitle: q.topics.title }] : [],
  );
  const { today, overflow } = planTodaysReview(dueQuestions, cap - reviewedToday);

  return {
    today,
    overflow,
    reviewedToday,
    cap,
    nextDueAt: next?.[0]?.due_at ?? null,
    scheduled: dueQuestions.length > 0 || (next?.length ?? 0) > 0,
  };
}
