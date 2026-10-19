import "server-only";
import { isTopicLevel, type TopicLevel } from "@/lib/schemas";
import { db } from "@/lib/supabase";

// Questions saved to learn later, newest first.

export type SavedQuestion = {
  id: string;
  text: string;
  createdAt: string;
  startedAt: string | null;
  // The topic it came from, if any; its level and tags fill in "Learn this".
  source: { id: string; title: string; level: TopicLevel | null; tags: string[] } | null;
  // The topic started from it.
  started: { id: string; title: string } | null;
};

export async function savedQuestions(): Promise<SavedQuestion[]> {
  const { data, error } = await db()
    .from("saved_questions")
    .select(
      "id, text, created_at, started_at, source:topics!saved_questions_topic_id_fkey(id, title, level, topic_tags(tags(name))), started:topics!saved_questions_started_topic_id_fkey(id, title)",
    )
    .order("created_at", { ascending: false });
  if (error) throw new Error("Could not read your saved questions. Try again.");
  return (data ?? []).map((q) => ({
    id: q.id,
    text: q.text,
    createdAt: q.created_at,
    startedAt: q.started_at,
    source: q.source
      ? {
          id: q.source.id,
          title: q.source.title,
          level: isTopicLevel(q.source.level) ? q.source.level : null,
          tags: q.source.topic_tags.flatMap((tt) => (tt.tags ? [tt.tags.name] : [])),
        }
      : null,
    started: q.started,
  }));
}

/** How many saved questions are still waiting to be learned. */
export async function savedQuestionsToLearn(): Promise<number> {
  const { count } = await db()
    .from("saved_questions")
    .select("id", { count: "exact", head: true })
    .is("started_at", null);
  return count ?? 0;
}
