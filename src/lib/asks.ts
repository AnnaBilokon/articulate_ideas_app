import "server-only";
import { z } from "zod";
import { askTurnSchema, type AskThread } from "@/lib/schemas";
import { db } from "@/lib/supabase";

// Questions asked while learning a topic: each thread under a lesson part or
// on the Topic Card.

export const ASK_COLUMNS = "id, chunk_id, turns, review_draft, new_topic, recall_question_id, saved_question_id";

type AskRow = {
  id: string;
  chunk_id: string | null;
  turns: unknown;
  review_draft: unknown;
  new_topic: string | null;
  recall_question_id: string | null;
  saved_question_id: string | null;
};

// Lenient on purpose: a bad turn is dropped, not the thread.
const turnsSchema = z.array(askTurnSchema.nullable().catch(null));

export function toThread(row: AskRow): AskThread {
  const turns = turnsSchema.safeParse(row.turns);
  return {
    id: row.id,
    chunkId: row.chunk_id,
    turns: turns.success ? turns.data.filter((t) => t !== null) : [],
    canReview: row.review_draft !== null,
    inReviews: row.recall_question_id !== null,
    newTopic: row.new_topic,
    savedAsIdea: row.saved_question_id !== null,
  };
}

/** A topic's threads, oldest first. */
export async function topicAsks(topicId: string): Promise<AskThread[]> {
  const { data } = await db().from("topic_asks").select(ASK_COLUMNS).eq("topic_id", topicId).order("created_at");
  return (data ?? []).map(toThread);
}
