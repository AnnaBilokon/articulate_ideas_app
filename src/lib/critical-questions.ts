import "server-only";
import { buildCriticalQuestions } from "@/lib/ai/critical";
import { isTopicLevel } from "@/lib/schemas";
import { db } from "@/lib/supabase";

const UNIQUE_VIOLATION = "23505";

/**
 * Builds and saves the "Think deeper" questions for a topic that has a card.
 * Safe to call more than once: existing questions are left alone, and the
 * unique (topic_id, position) key stops two parallel runs from both saving.
 */
export async function ensureCriticalQuestions(topicId: string): Promise<"created" | "exists"> {
  const supabase = db();

  const { data: topic } = await supabase
    .from("topics")
    .select(
      "title, level, critical_questions(id), topic_cards(one_sentence, paragraph, analogy, counterpoint, connects_to), lesson_chunks(title, content, position)",
    )
    .eq("id", topicId)
    .order("position", { referencedTable: "lesson_chunks" })
    .maybeSingle();
  if (!topic) throw new Error("Topic not found.");
  if (topic.critical_questions.length > 0) return "exists";
  if (!topic.topic_cards) throw new Error("Build the topic card first.");

  const { questions, usage } = await buildCriticalQuestions({
    title: topic.title,
    level: isTopicLevel(topic.level) ? topic.level : null,
    card: topic.topic_cards,
    chunks: topic.lesson_chunks,
  });
  console.log(`critical ${topicId}:`, usage);

  const { error } = await supabase
    .from("critical_questions")
    .insert(questions.map((q, position) => ({ topic_id: topicId, position, ...q })));
  if (error?.code === UNIQUE_VIOLATION) return "exists";
  if (error) throw new Error("Could not save the questions. Try again.");
  return "created";
}
