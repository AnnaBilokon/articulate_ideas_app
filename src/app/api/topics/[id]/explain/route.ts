import Anthropic from "@anthropic-ai/sdk";
import { gradeExplain } from "@/lib/ai/explain";
import { requireSession } from "@/lib/auth";
import { raisesMastery } from "@/lib/mastery";
import { explainInputSchema, type ExplainRecord } from "@/lib/schemas";
import { db } from "@/lib/supabase";

export const maxDuration = 120;

export type ExplainResponse = { id: string; feedback: ExplainRecord; mastery: string | null };

// Grades a teach-back against the lesson and card, and saves it with its
// feedback and follow-up questions.
export async function POST(request: Request, { params }: RouteContext<"/api/topics/[id]/explain">) {
  await requireSession();
  const { id } = await params;

  const body = (await request.json().catch(() => null)) as { text?: unknown } | null;
  const parsed = explainInputSchema.safeParse(body?.text);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const supabase = db();
  const { data: topic } = await supabase
    .from("topics")
    .select(
      "title, mastery_level, dumps(id), topic_cards(one_sentence, paragraph, analogy, counterpoint), lesson_chunks(title, content, position)",
    )
    .eq("id", id)
    .order("position", { referencedTable: "lesson_chunks" })
    .maybeSingle();
  if (!topic) return Response.json({ error: "Topic not found." }, { status: 404 });
  if (topic.dumps.length === 0) return Response.json({ error: "Do the brain dump first." }, { status: 400 });
  if (!topic.topic_cards || topic.lesson_chunks.length === 0) {
    return Response.json({ error: "The topic card isn't ready yet." }, { status: 400 });
  }

  try {
    const { result, usage } = await gradeExplain({
      title: topic.title,
      card: topic.topic_cards,
      chunks: topic.lesson_chunks,
      explanation: parsed.data,
    });
    console.log(`explain ${id}:`, usage);
    const feedback: ExplainRecord = {
      ...result,
      follow_ups: result.follow_ups.map((question) => ({ question, answer: null, reply: null, closed: null })),
    };

    const { data: saved, error } = await supabase
      .from("explanations")
      .insert({ topic_id: id, text: parsed.data, feedback, score: result.score })
      .select("id")
      .single();
    if (error) throw new Error("Could not save your explanation. Try again.");

    // Explained well enough for a newcomer: the third mastery level.
    let mastery = topic.mastery_level;
    if (result.score >= 4 && raisesMastery(mastery, "explained")) {
      mastery = "explained";
      await supabase.from("topics").update({ mastery_level: mastery }).eq("id", id);
    }

    const response: ExplainResponse = { id: saved.id, feedback, mastery };
    return Response.json(response);
  } catch (error) {
    console.error(`explain ${id} failed:`, error);
    const message =
      error instanceof Anthropic.RateLimitError
        ? "Claude is busy right now. Wait a minute and try again."
        : error instanceof Anthropic.APIError
          ? "Claude couldn't give feedback on your explanation. Try again."
          : error instanceof Error
            ? error.message
            : "Something went wrong. Try again.";
    return Response.json({ error: message }, { status: 500 });
  }
}
