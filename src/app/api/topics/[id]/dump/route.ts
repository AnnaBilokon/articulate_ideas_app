import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { gradeDump } from "@/lib/ai/dump";
import { requireSession } from "@/lib/auth";
import { scheduleTopicQuestions } from "@/lib/reviews";
import { MAX_DUMP_NUDGES, dumpInputSchema, type DumpRecord } from "@/lib/schemas";
import { db } from "@/lib/supabase";

export const maxDuration = 120;

// Grades a brain dump against the lesson and saves it with its feedback.
export async function POST(request: Request, { params }: RouteContext<"/api/topics/[id]/dump">) {
  await requireSession();
  const { id } = await params;

  const body = (await request.json().catch(() => null)) as { text?: unknown; nudges?: unknown } | null;
  const parsed = dumpInputSchema.safeParse(body?.text);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const nudges = z.int().min(0).max(MAX_DUMP_NUDGES).catch(0).parse(body?.nudges ?? 0);

  const supabase = db();
  const { data: topic } = await supabase
    .from("topics")
    .select("title, mastery_level, lesson_chunks(title, content, position)")
    .eq("id", id)
    .order("position", { referencedTable: "lesson_chunks" })
    .maybeSingle();
  if (!topic) return Response.json({ error: "Topic not found." }, { status: 404 });
  if (topic.lesson_chunks.length === 0) {
    return Response.json({ error: "Read the lesson first." }, { status: 400 });
  }

  try {
    const graded = await gradeDump({ title: topic.title, chunks: topic.lesson_chunks, dump: parsed.data });
    console.log(`dump ${id}:`, graded.usage);
    const feedback: DumpRecord = { ...graded.feedback, nudges };

    const { error } = await supabase.from("dumps").insert({ topic_id: id, text: parsed.data, feedback });
    if (error) throw new Error("Could not save your brain dump. Try again.");

    // Lesson read and recalled: the first mastery level.
    if (!topic.mastery_level) await supabase.from("topics").update({ mastery_level: "seen" }).eq("id", id);

    // Day 1 is done: the questions come back in tomorrow's review.
    await scheduleTopicQuestions(id);

    return Response.json({ feedback });
  } catch (error) {
    console.error(`dump ${id} failed:`, error);
    const message =
      error instanceof Anthropic.RateLimitError
        ? "Claude is busy right now. Wait a minute and try again."
        : error instanceof Anthropic.APIError
          ? "Claude couldn't grade your brain dump. Try again."
          : error instanceof Error
            ? error.message
            : "Something went wrong. Try again.";
    return Response.json({ error: message }, { status: 500 });
  }
}
