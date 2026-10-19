import Anthropic from "@anthropic-ai/sdk";
import { critiqueAnswer } from "@/lib/ai/critique";
import { requireSession } from "@/lib/auth";
import { criticalAnswerInputSchema, isTopicLevel } from "@/lib/schemas";
import { db } from "@/lib/supabase";

export const maxDuration = 120;

// Grades a written answer to a Think deeper question and saves it with the
// feedback, the fuller answer and the strongest counterargument.
export async function POST(request: Request, { params }: RouteContext<"/api/critical/[id]/answer">) {
  await requireSession();
  const { id } = await params;

  const body = (await request.json().catch(() => null)) as { answer?: unknown } | null;
  const parsed = criticalAnswerInputSchema.safeParse(body?.answer);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const supabase = db();
  const { data: question } = await supabase
    .from("critical_questions")
    .select(
      "text, considerations, topics(title, level, topic_cards(one_sentence, paragraph), lesson_chunks(title, content, position))",
    )
    .eq("id", id)
    .order("position", { referencedTable: "topics.lesson_chunks" })
    .maybeSingle();
  const topic = question?.topics;
  if (!question || !topic) return Response.json({ error: "Question not found." }, { status: 404 });
  if (!topic.topic_cards) return Response.json({ error: "The topic card isn't ready yet." }, { status: 400 });

  try {
    const { critique, usage } = await critiqueAnswer({
      title: topic.title,
      level: isTopicLevel(topic.level) ? topic.level : null,
      card: topic.topic_cards,
      chunks: topic.lesson_chunks,
      question: question.text,
      considerations: question.considerations,
      answer: parsed.data,
    });
    console.log(`critique ${id}:`, usage);

    const { data: saved, error } = await supabase
      .from("critical_answers")
      .insert({ critical_question_id: id, answer: parsed.data, feedback: critique })
      .select("answer, created_at")
      .single();
    if (error) throw new Error("Could not save your answer. Try again.");
    return Response.json({ answer: { ...saved, feedback: critique } });
  } catch (error) {
    console.error(`critique ${id} failed:`, error);
    const message =
      error instanceof Anthropic.RateLimitError
        ? "Claude is busy right now. Wait a minute and try again."
        : error instanceof Anthropic.APIError
          ? "Claude couldn't give feedback on your answer. Try again."
          : error instanceof Error
            ? error.message
            : "Something went wrong. Try again.";
    return Response.json({ error: message }, { status: 500 });
  }
}
