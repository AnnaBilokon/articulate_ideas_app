import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { raisesMastery } from "@/lib/mastery";
import { db } from "@/lib/supabase";

const bodySchema = z.object({ attemptIds: z.array(z.uuid()).min(1).max(30) });

// Ends a quiz: the average of first-try scores decides whether the topic
// reaches "Recalled" (average 3+, see "Mastery level per topic" in PLAN.md).
export async function POST(request: Request, { params }: RouteContext<"/api/topics/[id]/quiz/finish">) {
  await requireSession();
  const { id } = await params;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request." }, { status: 400 });

  const supabase = db();
  const [{ data: attempts }, { data: topic }] = await Promise.all([
    supabase
      .from("attempts")
      .select("score, recall_questions!inner(topic_id)")
      .in("id", parsed.data.attemptIds)
      .eq("recall_questions.topic_id", id),
    supabase.from("topics").select("mastery_level").eq("id", id).maybeSingle(),
  ]);
  if (!topic || !attempts || attempts.length === 0) {
    return Response.json({ error: "Quiz not found." }, { status: 404 });
  }

  const average = attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length;
  let mastery = topic.mastery_level;
  if (average >= 3 && raisesMastery(mastery, "recalled")) {
    mastery = "recalled";
    await supabase.from("topics").update({ mastery_level: mastery }).eq("id", id);
  }

  return Response.json({ average, mastery });
}
