import Anthropic from "@anthropic-ai/sdk";
import { gradeChunkRecall } from "@/lib/ai/chunk-recall";
import { requireSession } from "@/lib/auth";
import { chunkRecallInputSchema } from "@/lib/schemas";
import { db } from "@/lib/supabase";

export const maxDuration = 60;

// Grades the recall of one lesson part (its main idea, from memory) and saves it.
export async function POST(request: Request, { params }: RouteContext<"/api/chunks/[id]/recall">) {
  await requireSession();
  const { id } = await params;

  const body = (await request.json().catch(() => null)) as { text?: unknown } | null;
  const parsed = chunkRecallInputSchema.safeParse(body?.text);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const supabase = db();
  const { data: chunk } = await supabase
    .from("lesson_chunks")
    .select("title, content, topics(title)")
    .eq("id", id)
    .maybeSingle();
  if (!chunk?.topics) return Response.json({ error: "Lesson part not found." }, { status: 404 });

  try {
    const { result, usage } = await gradeChunkRecall({
      topic: chunk.topics.title,
      title: chunk.title,
      content: chunk.content,
      recall: parsed.data,
    });
    console.log(`chunk recall ${id}:`, usage);

    const { error } = await supabase.from("chunk_recalls").insert({ chunk_id: id, text: parsed.data, feedback: result });
    if (error) throw new Error("Could not save your recall. Try again.");

    return Response.json({ feedback: result });
  } catch (error) {
    console.error(`chunk recall ${id} failed:`, error);
    const message =
      error instanceof Anthropic.RateLimitError
        ? "Claude is busy right now. Wait a moment and try again."
        : error instanceof Anthropic.APIError
          ? "Claude couldn't check your recall. Try again."
          : error instanceof Error
            ? error.message
            : "Something went wrong. Try again.";
    return Response.json({ error: message }, { status: 500 });
  }
}
