import { requireSession } from "@/lib/auth";
import { savedQuestionInputSchema } from "@/lib/schemas";
import { db } from "@/lib/supabase";

// Saves a question to learn later: a Think deeper question (its own text and
// topic are used) or one typed in. Saving the same Think deeper question
// twice returns the existing one.
export async function POST(request: Request) {
  await requireSession();

  const parsed = savedQuestionInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const { text, criticalQuestionId } = parsed.data;

  const supabase = db();
  let row = { text, topic_id: null as string | null, critical_question_id: null as string | null };
  if (criticalQuestionId) {
    const { data: question } = await supabase
      .from("critical_questions")
      .select("text, topic_id")
      .eq("id", criticalQuestionId)
      .maybeSingle();
    if (!question) return Response.json({ error: "Question not found." }, { status: 404 });
    row = { text: question.text, topic_id: question.topic_id, critical_question_id: criticalQuestionId };

    const { data: existing } = await supabase
      .from("saved_questions")
      .select("id")
      .eq("critical_question_id", criticalQuestionId)
      .maybeSingle();
    if (existing) return Response.json({ id: existing.id });
  }

  const { data, error } = await supabase.from("saved_questions").insert(row).select("id").single();
  if (error) {
    console.error("save question failed:", error);
    return Response.json({ error: "Could not save the question. Try again." }, { status: 500 });
  }
  return Response.json({ id: data.id });
}
