import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { FACT_COLUMNS, toFact } from "@/lib/facts";
import { startOfDay } from "@/lib/schedule";
import { recallQuestionSchema } from "@/lib/schemas";
import { db } from "@/lib/supabase";

// "Add to my reviews": the review question drafted with the fact joins the
// reviews, from tomorrow. Adding it twice returns the fact as it is.
export async function POST(_request: Request, { params }: RouteContext<"/api/facts/[id]/review">) {
  await requireSession();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return Response.json({ error: "Fact not found." }, { status: 404 });

  const supabase = db();
  const { data: fact } = await supabase.from("quick_facts").select(FACT_COLUMNS).eq("id", id).maybeSingle();
  if (!fact) return Response.json({ error: "Fact not found." }, { status: 404 });
  if (fact.recall_questions.length > 0) return Response.json({ fact: toFact(fact) });
  const draft = recallQuestionSchema.safeParse(fact.review_draft);
  if (!draft.success) return Response.json({ error: "There's no review question for this one." }, { status: 400 });

  const { data: question, error } = await supabase
    .from("recall_questions")
    .insert({ quick_fact_id: id, position: 0, ...draft.data })
    .select("id")
    .single();
  if (error) {
    console.error(`fact ${id} to review failed:`, error);
    return Response.json({ error: "Could not add it to your reviews. Try again." }, { status: 500 });
  }
  const { error: scheduleError } = await supabase
    .from("review_state")
    .insert({ question_id: question.id, due_at: startOfDay(new Date(), 1).toISOString(), step: 0, interval_days: 1 });
  if (scheduleError) console.error(`fact ${id} schedule failed:`, scheduleError);

  return Response.json({ fact: toFact({ ...fact, recall_questions: [{ id: question.id }] }) });
}
