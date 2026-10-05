import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { replyToFollowUps } from "@/lib/ai/explain";
import { requireSession } from "@/lib/auth";
import { MAX_FOLLOW_UP_CHARS, explainRecordSchema, type ExplainRecord, type FollowUp } from "@/lib/schemas";
import { db } from "@/lib/supabase";

export const maxDuration = 60;

const bodySchema = z.object({
  answers: z
    .array(z.string().trim().max(MAX_FOLLOW_UP_CHARS, "Keep each answer under about 500 words."))
    .min(1)
    .max(2),
});

// Saves the answers to a teach-back's follow-up questions, with a short reply
// to each. Each explanation's follow-ups are answered once.
export async function POST(request: Request, { params }: RouteContext<"/api/explanations/[id]/follow-ups">) {
  await requireSession();
  const { id } = await params;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const { answers } = parsed.data;
  if (answers.every((a) => !a)) return Response.json({ error: "Answer at least one question." }, { status: 400 });

  const supabase = db();
  const { data: explanation } = await supabase
    .from("explanations")
    .select("feedback, topics(title, lesson_chunks(title, content, position))")
    .eq("id", id)
    .maybeSingle();
  const record = explainRecordSchema.safeParse(explanation?.feedback);
  if (!explanation?.topics || !record.success) {
    return Response.json({ error: "Explanation not found." }, { status: 404 });
  }
  const { follow_ups } = record.data;
  if (answers.length !== follow_ups.length) return Response.json({ error: "Invalid request." }, { status: 400 });
  if (follow_ups.some((f) => f.answer !== null)) {
    return Response.json({ error: "You've already answered these." }, { status: 409 });
  }

  try {
    const answered = follow_ups.flatMap((f, i) => (answers[i] ? [{ question: f.question, answer: answers[i] }] : []));
    const { result, usage } = await replyToFollowUps({
      title: explanation.topics.title,
      chunks: explanation.topics.lesson_chunks.toSorted((a, b) => a.position - b.position),
      answered,
    });
    console.log(`follow-ups ${id}:`, usage);

    // Replies come back in the order of the answered questions; a skipped
    // question is saved as an empty answer with no reply.
    const replies = [...result];
    const updated: FollowUp[] = follow_ups.map((f, i) => {
      if (!answers[i]) return { ...f, answer: "", reply: null, closed: false };
      const { reply, closed } = replies.shift()!;
      return { ...f, answer: answers[i], reply, closed };
    });
    const feedback: ExplainRecord = { ...record.data, follow_ups: updated };

    // Only if still unanswered, so two quick submits can't both save.
    const { data: saved, error } = await supabase
      .from("explanations")
      .update({ feedback })
      .eq("id", id)
      .filter("feedback->follow_ups->0->>answer", "is", null)
      .select("id");
    if (error) throw new Error("Could not save your answers. Try again.");
    if (saved.length === 0) return Response.json({ error: "You've already answered these." }, { status: 409 });

    return Response.json({ follow_ups: updated });
  } catch (error) {
    console.error(`follow-ups ${id} failed:`, error);
    const message =
      error instanceof Anthropic.RateLimitError
        ? "Claude is busy right now. Wait a moment and try again."
        : error instanceof Anthropic.APIError
          ? "Claude couldn't reply to your answers. Try again."
          : error instanceof Error
            ? error.message
            : "Something went wrong. Try again.";
    return Response.json({ error: message }, { status: 500 });
  }
}
