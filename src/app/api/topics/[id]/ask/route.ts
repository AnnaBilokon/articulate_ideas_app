import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { answerQuestion } from "@/lib/ai/ask";
import { ASK_COLUMNS, toThread } from "@/lib/asks";
import { requireSession } from "@/lib/auth";
import {
  MAX_ASK_TURNS,
  askKindQuestions,
  askRequestSchema,
  askTurnSchema,
  isTopicLevel,
  type AskThread,
  type AskTurn,
} from "@/lib/schemas";
import { db } from "@/lib/supabase";

export const maxDuration = 60;

// Asks a question about a topic, or for a lesson part explained differently,
// and saves the answer: a new thread, or a follow-up on one (askId).
export async function POST(request: Request, { params }: RouteContext<"/api/topics/[id]/ask">) {
  await requireSession();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return Response.json({ error: "Topic not found." }, { status: 404 });
  const parsed = askRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const { kind, askId } = parsed.data;

  const supabase = db();
  const [{ data: topic }, { data: ask }] = await Promise.all([
    supabase
      .from("topics")
      .select("title, level, lesson_chunks(id, title, content, position)")
      .eq("id", id)
      .order("position", { referencedTable: "lesson_chunks" })
      .maybeSingle(),
    askId
      ? supabase.from("topic_asks").select("chunk_id, turns").eq("id", askId).eq("topic_id", id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  if (!topic) return Response.json({ error: "Topic not found." }, { status: 404 });
  if (askId && !ask) return Response.json({ error: "Question not found." }, { status: 404 });

  const turns: AskTurn[] = ask ? z.array(askTurnSchema).catch([]).parse(ask.turns) : [];
  if (turns.length >= MAX_ASK_TURNS) {
    return Response.json({ error: "That's the most follow-ups for one question. Ask a new one below." }, { status: 400 });
  }
  const chunkId = ask ? ask.chunk_id : parsed.data.chunkId;
  if (chunkId && !topic.lesson_chunks.some((c) => c.id === chunkId)) {
    return Response.json({ error: "Lesson part not found." }, { status: 404 });
  }
  const question = kind === "question" ? parsed.data.question! : askKindQuestions[kind];

  try {
    const { reply, usage } = await answerQuestion({
      title: topic.title,
      level: isTopicLevel(topic.level) ? topic.level : null,
      chunks: topic.lesson_chunks,
      chunkId,
      turns,
      kind,
      question,
    });
    console.log(`ask ${id}:`, usage);

    const nextTurns: AskTurn[] = [...turns, { kind, question, answer: reply.answer, beyond_lesson: reply.beyond_lesson }];
    const fields = {
      turns: nextTurns,
      // The latest answer's draft; an earlier one stays if this one has none.
      ...(reply.review_question ? { review_draft: reply.review_question } : {}),
      ...(reply.new_topic ? { new_topic: reply.new_topic } : {}),
    };
    const saved = askId
      ? await supabase
          .from("topic_asks")
          .update({ ...fields, updated_at: new Date().toISOString() })
          .eq("id", askId)
          .select(ASK_COLUMNS)
          .single()
      : await supabase
          .from("topic_asks")
          .insert({ topic_id: id, chunk_id: chunkId, ...fields })
          .select(ASK_COLUMNS)
          .single();
    if (saved.error) throw new Error("Could not save the answer. Try again.");
    const thread: AskThread = toThread(saved.data);
    return Response.json({ thread });
  } catch (error) {
    console.error(`ask ${id} failed:`, error);
    const message =
      error instanceof Anthropic.RateLimitError
        ? "Claude is busy right now. Wait a minute and try again."
        : error instanceof Anthropic.APIError
          ? "Claude couldn't answer. Try again."
          : error instanceof Error
            ? error.message
            : "Something went wrong. Try again.";
    return Response.json({ error: message }, { status: 500 });
  }
}
