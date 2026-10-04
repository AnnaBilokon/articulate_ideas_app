import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { sourceTextSchema } from "@/lib/schemas";
import { db } from "@/lib/supabase";

const bodySchema = z.object({
  text: sourceTextSchema(),
  // save: just store it (before the lesson exists).
  // lesson: clear the lesson and glossary so they're rebuilt; keep card, quiz and dumps.
  // everything: also clear the card, questions, quiz history and brain dumps.
  mode: z.enum(["save", "lesson", "everything"]),
});

// Saves edited material and clears what will be rebuilt from it. The lesson
// itself is then rebuilt through the normal research route.
export async function POST(request: Request, { params }: RouteContext<"/api/topics/[id]/material">) {
  await requireSession();
  const { id } = await params;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const { text, mode } = parsed.data;

  const supabase = db();
  const { data: topic } = await supabase.from("topics").select("source_text").eq("id", id).maybeSingle();
  if (!topic) return Response.json({ error: "Topic not found." }, { status: 404 });
  if (topic.source_text === null) {
    return Response.json({ error: "This topic was researched on the web, so it has no material to edit." }, { status: 400 });
  }

  const failed = () => Response.json({ error: "Could not save your changes. Try again." }, { status: 500 });

  const { error } = await supabase.from("topics").update({ source_text: text }).eq("id", id);
  if (error) return failed();
  if (mode === "save") return Response.json({ status: "saved" });

  const results = await Promise.all([
    supabase.from("lesson_chunks").delete().eq("topic_id", id),
    supabase.from("sources").delete().eq("topic_id", id),
    supabase.from("user_questions").delete().eq("topic_id", id).eq("is_suggested", true),
    supabase.from("user_questions").update({ answer: null }).eq("topic_id", id),
    // Terms the learner added stay; Claude's are rebuilt from the new lesson.
    supabase.from("glossary_terms").delete().eq("topic_id", id).eq("source", "claude"),
    ...(mode === "everything"
      ? [
          supabase.from("topic_cards").delete().eq("topic_id", id),
          // Deleting questions also deletes their attempts and schedules.
          supabase.from("recall_questions").delete().eq("topic_id", id),
          supabase.from("critical_questions").delete().eq("topic_id", id),
          supabase.from("dumps").delete().eq("topic_id", id),
        ]
      : []),
  ]);
  if (results.some((r) => r.error)) return failed();

  const reset = mode === "everything" ? { researched_at: null, mastery_level: null } : { researched_at: null };
  const { error: resetError } = await supabase.from("topics").update(reset).eq("id", id);
  if (resetError) return failed();

  return Response.json({ status: "cleared" });
}
