import Anthropic from "@anthropic-ai/sdk";
import { after } from "next/server";
import { lessonFromMaterial } from "@/lib/ai/material";
import { researchLesson, type ResearchEvent } from "@/lib/ai/research";
import { requireSession } from "@/lib/auth";
import { isTopicLevel, type Lesson } from "@/lib/schemas";
import { db } from "@/lib/supabase";
import { ensureCriticalQuestions } from "@/lib/critical-questions";
import { ensureTopicCard } from "@/lib/topic-card";

// Research plus writing can take a few minutes.
export const maxDuration = 300;

export type ResearchStreamEvent =
  | ResearchEvent
  | { type: "done"; costUsd: number }
  | { type: "error"; message: string };

// Streams progress as newline-delimited JSON, then saves the lesson.
export async function POST(_request: Request, { params }: RouteContext<"/api/topics/[id]/research">) {
  await requireSession();
  const { id } = await params;
  const supabase = db();

  const { data: topic } = await supabase
    .from("topics")
    .select("title, level, source_text, user_questions(text, position, is_suggested), lesson_chunks(id)")
    .eq("id", id)
    .maybeSingle();
  if (!topic) return Response.json({ error: "Topic not found" }, { status: 404 });

  // Once the lesson is saved, build the Topic Card in the background so it's
  // ready by the time the lesson has been read. after() is registered here,
  // inside the request, and waits for the stream to report the save.
  let reportSaved: (saved: boolean) => void = () => {};
  const lessonSaved = new Promise<boolean>((resolve) => (reportSaved = resolve));
  after(async () => {
    if (!(await lessonSaved)) return;
    try {
      await ensureTopicCard(id);
      await ensureCriticalQuestions(id);
    } catch (error) {
      console.error(`background card ${id} failed:`, error);
    }
  });

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: ResearchStreamEvent) =>
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));

      try {
        // Research once: a topic that already has a lesson is never re-researched here.
        if (topic.lesson_chunks.length > 0) {
          send({ type: "done", costUsd: 0 });
          return;
        }

        const ownQuestions = topic.user_questions
          .filter((q) => !q.is_suggested)
          .sort((a, b) => a.position - b.position);

        const input = {
          title: topic.title,
          level: isTopicLevel(topic.level) ? topic.level : null,
          questions: ownQuestions.map((q) => q.text),
        };
        // The learner's own material replaces web research when they gave some.
        const { lesson, usage } = topic.source_text
          ? await lessonFromMaterial(input, topic.source_text, send)
          : await researchLesson(input, send);
        console.log(`${topic.source_text ? "material" : "research"} ${id}:`, usage);

        await saveLesson(id, lesson, ownQuestions.map((q) => q.position));
        reportSaved(true);
        send({ type: "done", costUsd: usage.costUsd });
      } catch (error) {
        console.error(`research ${id} failed:`, error);
        send({ type: "error", message: errorMessage(error) });
      } finally {
        reportSaved(false); // no-op if already reported
        controller.close();
      }
    },
  });

  return new Response(body, {
    headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" },
  });
}

function errorMessage(error: unknown): string {
  if (error instanceof Anthropic.RateLimitError) return "Claude is busy right now. Wait a minute and try again.";
  if (error instanceof Anthropic.AuthenticationError) return "The Claude API key isn't working. Check ANTHROPIC_API_KEY.";
  if (error instanceof Anthropic.APIError) return "Claude couldn't finish the research. Try again.";
  if (error instanceof Error && !(error instanceof Anthropic.AnthropicError)) return error.message;
  return "Something went wrong. Try again.";
}

async function saveLesson(topicId: string, lesson: Lesson, questionPositions: number[]) {
  const supabase = db();

  // Chunks first: the unique (topic_id, position) key stops a second, parallel
  // run from saving a duplicate lesson.
  const { error: chunkError } = await supabase.from("lesson_chunks").insert(
    lesson.chunks.map((chunk, position) => ({ topic_id: topicId, position, ...chunk })),
  );
  if (chunkError) throw new Error("Could not save the lesson. Try again.");

  try {
    const results = await Promise.all([
      lesson.sources.length > 0
        ? supabase.from("sources").insert(lesson.sources.map((s) => ({ topic_id: topicId, ...s })))
        : null,
      ...lesson.answers.slice(0, questionPositions.length).map((a, i) =>
        supabase
          .from("user_questions")
          .update({ answer: a.answer })
          .eq("topic_id", topicId)
          .eq("position", questionPositions[i]),
      ),
      lesson.suggested_questions.length > 0
        ? supabase.from("user_questions").insert(
            lesson.suggested_questions.map((q, i) => ({
              topic_id: topicId,
              position: questionPositions.length + i,
              text: q.question,
              answer: q.answer,
              is_suggested: true,
            })),
          )
        : null,
      supabase.from("topics").update({ researched_at: new Date().toISOString() }).eq("id", topicId),
    ]);
    if (results.some((r) => r?.error)) throw new Error("save failed");
  } catch {
    // Undo the partial save so the topic can be researched again.
    await Promise.all([
      supabase.from("lesson_chunks").delete().eq("topic_id", topicId),
      supabase.from("sources").delete().eq("topic_id", topicId),
      supabase.from("user_questions").delete().eq("topic_id", topicId).eq("is_suggested", true),
      supabase.from("user_questions").update({ answer: null }).eq("topic_id", topicId),
      supabase.from("topics").update({ researched_at: null }).eq("id", topicId),
    ]);
    throw new Error("Could not save the lesson. Try again.");
  }
}
