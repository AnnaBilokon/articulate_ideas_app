import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { tutorTurn } from "@/lib/ai/tutor";
import { isTopicLevel, parseTutorMessages, type TutorMessage, type TutorSession } from "@/lib/schemas";
import { db } from "@/lib/supabase";

// Runs a tutor turn on a conversation and saves it.

export class TutorError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

async function lessonFor(topicId: string) {
  const { data: topic } = await db()
    .from("topics")
    .select("title, level, lesson_chunks(title, content, position)")
    .eq("id", topicId)
    .order("position", { referencedTable: "lesson_chunks" })
    .maybeSingle();
  if (!topic) throw new TutorError("Topic not found.", 404);
  if (topic.lesson_chunks.length === 0) throw new TutorError("Read the lesson first.");
  return { title: topic.title, level: isTopicLevel(topic.level) ? topic.level : null, chunks: topic.lesson_chunks };
}

const toSession = (row: { id: string; messages: unknown; done: boolean; summary: string[] | null }): TutorSession => ({
  id: row.id,
  messages: parseTutorMessages(row.messages),
  done: row.done,
  summary: row.summary,
});

/** Starts a conversation with the tutor's opener and first question. */
export async function startTutor(topicId: string): Promise<TutorSession> {
  const lesson = await lessonFor(topicId);
  const { turn, usage } = await tutorTurn({ ...lesson, messages: [] });
  console.log(`tutor start ${topicId}:`, usage);
  const messages: TutorMessage[] = [{ role: "tutor", reply: turn.reply, question: turn.question }];
  const { data, error } = await db()
    .from("tutor_sessions")
    .insert({ topic_id: topicId, messages, done: turn.done, summary: turn.done ? turn.summary : null })
    .select("id, messages, done, summary")
    .single();
  if (error) throw new TutorError("Could not save the conversation. Try again.", 500);
  return toSession(data);
}

/** Adds the learner's message, gets the tutor's reply, and saves both. */
export async function continueTutor(sessionId: string, message: Extract<TutorMessage, { role: "learner" }>): Promise<TutorSession> {
  const supabase = db();
  const { data: row } = await supabase.from("tutor_sessions").select("topic_id, messages, done").eq("id", sessionId).maybeSingle();
  if (!row) throw new TutorError("Conversation not found.", 404);
  if (row.done) throw new TutorError("This conversation is finished. Start a new one.");

  const lesson = await lessonFor(row.topic_id);
  const messages = [...parseTutorMessages(row.messages), message];
  const { turn, usage } = await tutorTurn({ ...lesson, messages });
  console.log(`tutor ${sessionId}:`, usage);
  messages.push({ role: "tutor", reply: turn.reply, question: turn.question });

  const { data, error } = await supabase
    .from("tutor_sessions")
    .update({ messages, done: turn.done, summary: turn.done ? turn.summary : null, updated_at: new Date().toISOString() })
    .eq("id", sessionId)
    .select("id, messages, done, summary")
    .single();
  if (error) throw new TutorError("Could not save the conversation. Try again.", 500);
  return toSession(data);
}

/** The JSON error response for a failed turn. */
export function tutorErrorResponse(error: unknown, label: string): Response {
  if (error instanceof TutorError) return Response.json({ error: error.message }, { status: error.status });
  console.error(`${label} failed:`, error);
  const message =
    error instanceof Anthropic.RateLimitError
      ? "Claude is busy right now. Wait a minute and try again."
      : error instanceof Anthropic.APIError
        ? "The tutor couldn't reply. Try again."
        : error instanceof Error
          ? error.message
          : "Something went wrong. Try again.";
  return Response.json({ error: message }, { status: 500 });
}
