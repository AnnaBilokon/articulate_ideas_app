import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { makeChallenge } from "@/lib/ai/challenge";
import { requireSession } from "@/lib/auth";
import { challengeKinds, isTopicLevel } from "@/lib/schemas";
import { db } from "@/lib/supabase";

export const maxDuration = 120;

const bodySchema = z.object({ kind: z.enum(challengeKinds) });

// Makes a new challenge of one kind from the topic's lesson.
export async function POST(request: Request, { params }: RouteContext<"/api/topics/[id]/challenges">) {
  await requireSession();
  const { id } = await params;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Pick a kind of challenge." }, { status: 400 });

  const supabase = db();
  const { data: topic } = await supabase
    .from("topics")
    .select("title, level, lesson_chunks(title, content, position)")
    .eq("id", id)
    .order("position", { referencedTable: "lesson_chunks" })
    .maybeSingle();
  if (!topic) return Response.json({ error: "Topic not found." }, { status: 404 });
  if (topic.lesson_chunks.length === 0) return Response.json({ error: "Read the lesson first." }, { status: 400 });

  try {
    const { content, usage } = await makeChallenge({
      kind: parsed.data.kind,
      title: topic.title,
      level: isTopicLevel(topic.level) ? topic.level : null,
      chunks: topic.lesson_chunks,
    });
    console.log(`challenge ${parsed.data.kind} for ${id}:`, usage);
    const { data, error } = await supabase
      .from("challenges")
      .insert({ topic_id: id, kind: parsed.data.kind, content: content as never })
      .select("id")
      .single();
    if (error) throw new Error("Could not save the challenge. Try again.");
    return Response.json({ id: data.id });
  } catch (error) {
    console.error(`challenge for ${id} failed:`, error);
    const message =
      error instanceof Anthropic.RateLimitError
        ? "Claude is busy right now. Wait a minute and try again."
        : error instanceof Anthropic.APIError
          ? "Claude couldn't make the challenge. Try again."
          : error instanceof Error
            ? error.message
            : "Something went wrong. Try again.";
    return Response.json({ error: message }, { status: 500 });
  }
}
