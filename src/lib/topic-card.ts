import "server-only";
import { buildTopicCard } from "@/lib/ai/card";
import { scheduleTopicQuestions } from "@/lib/reviews";
import { MAX_TAGS, isTopicLevel } from "@/lib/schemas";
import { db } from "@/lib/supabase";

const UNIQUE_VIOLATION = "23505";

/**
 * Builds and saves the Topic Card for a topic that has a lesson. Safe to call
 * more than once: an existing card is left alone, and the unique topic_id on
 * topic_cards stops two parallel runs from both saving.
 */
export async function ensureTopicCard(topicId: string): Promise<"created" | "exists"> {
  const supabase = db();

  const [{ data: topic }, { data: allTags }] = await Promise.all([
    supabase
      .from("topics")
      .select(
        "title, level, topic_cards(id), dumps(id), lesson_chunks(title, content, position), user_questions(text, answer, position), topic_tags(tag_id)",
      )
      .eq("id", topicId)
      .order("position", { referencedTable: "lesson_chunks" })
      .order("position", { referencedTable: "user_questions" })
      .maybeSingle(),
    supabase.from("tags").select("name").order("name"),
  ]);
  if (!topic) throw new Error("Topic not found.");
  if (topic.topic_cards) return "exists";
  if (topic.lesson_chunks.length === 0) throw new Error("Build the lesson first.");

  const { result, usage } = await buildTopicCard({
    title: topic.title,
    level: isTopicLevel(topic.level) ? topic.level : null,
    chunks: topic.lesson_chunks,
    questions: topic.user_questions,
    existingTags: (allTags ?? []).map((t) => t.name),
  });
  console.log(`card ${topicId}:`, usage);

  const { data: card, error: cardError } = await supabase
    .from("topic_cards")
    .insert({ topic_id: topicId, ...result.card })
    .select("id")
    .single();
  if (cardError?.code === UNIQUE_VIOLATION) return "exists";
  if (cardError) throw new Error("Could not save the card. Try again.");

  const { error: questionsError } = await supabase.from("recall_questions").insert(
    result.recall_questions.map((q, position) => ({ topic_id: topicId, position, ...q })),
  );
  if (questionsError) {
    await supabase.from("topic_cards").delete().eq("id", card.id);
    throw new Error("Could not save the recall questions. Try again.");
  }

  // Add Claude's tags while the topic has room; the learner's own tags stay.
  const room = MAX_TAGS - topic.topic_tags.length;
  if (room > 0) {
    const { data: tagRows } = await supabase
      .from("tags")
      .upsert(result.tags.map((name) => ({ name })), { onConflict: "name" })
      .select("id");
    const have = new Set(topic.topic_tags.map((t) => t.tag_id));
    const newLinks = (tagRows ?? []).filter((t) => !have.has(t.id)).slice(0, room);
    if (newLinks.length > 0) {
      await supabase.from("topic_tags").insert(newLinks.map((t) => ({ topic_id: topicId, tag_id: t.id })));
    }
  }

  if (topic.dumps.length > 0) await scheduleTopicQuestions(topicId);

  return "created";
}
