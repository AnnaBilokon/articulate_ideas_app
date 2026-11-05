import { z } from "zod";
import { labelIdea } from "@/lib/ai/label-idea";
import { ASK_COLUMNS, toThread } from "@/lib/asks";
import { requireSession } from "@/lib/auth";
import { favoriteAreas } from "@/lib/discover";
import { scheduleTopicQuestions } from "@/lib/reviews";
import { recallQuestionSchema } from "@/lib/schemas";
import { db } from "@/lib/supabase";

export const maxDuration = 60;

const bodySchema = z.object({ action: z.enum(["review", "idea"]) });

// What a question thread can become:
// - "review": its drafted review question joins the topic's recall questions,
//   in the reviews from the next day (after the brain dump, like the others).
// - "idea": the subject it opens is saved as an idea to learn later.
// Doing either twice returns the thread as it is.
export async function POST(request: Request, { params }: RouteContext<"/api/asks/[id]">) {
  await requireSession();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return Response.json({ error: "Question not found." }, { status: 404 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Unknown action." }, { status: 400 });

  const supabase = db();
  const { data: ask } = await supabase
    .from("topic_asks")
    .select(`${ASK_COLUMNS}, topic_id, topics(dumps(id))`)
    .eq("id", id)
    .maybeSingle();
  if (!ask) return Response.json({ error: "Question not found." }, { status: 404 });

  if (parsed.data.action === "review") {
    if (ask.recall_question_id) return Response.json({ thread: toThread(ask) });
    const draft = recallQuestionSchema.safeParse(ask.review_draft);
    if (!draft.success) return Response.json({ error: "There's no review question for this one." }, { status: 400 });
    const { data: last } = await supabase
      .from("recall_questions")
      .select("position")
      .eq("topic_id", ask.topic_id)
      .order("position", { ascending: false })
      .limit(1);
    const { data: question, error } = await supabase
      .from("recall_questions")
      .insert({ topic_id: ask.topic_id, position: (last?.[0]?.position ?? -1) + 1, ...draft.data })
      .select("id")
      .single();
    if (error) {
      console.error(`ask ${id} to review failed:`, error);
      return Response.json({ error: "Could not add it to your reviews. Try again." }, { status: 500 });
    }
    // Before the brain dump, it's scheduled with the others when the dump is done.
    if ((ask.topics?.dumps.length ?? 0) > 0) await scheduleTopicQuestions(ask.topic_id);
    const { data: updated } = await supabase
      .from("topic_asks")
      .update({ recall_question_id: question.id })
      .eq("id", id)
      .select(ASK_COLUMNS)
      .single();
    return Response.json({ thread: toThread(updated ?? { ...ask, recall_question_id: question.id }) });
  }

  if (ask.saved_question_id) return Response.json({ thread: toThread(ask) });
  const text = ask.new_topic ?? toThread(ask).turns[0]?.question;
  if (!text) return Response.json({ error: "There's nothing to save." }, { status: 400 });
  // Labelled like any saved idea; an unlabelled idea is still kept.
  let label: { area: string | null; title: string | null } = { area: null, title: null };
  try {
    const result = await labelIdea(text, await favoriteAreas());
    console.log("label idea:", result.usage);
    label = result.label;
  } catch (error) {
    console.error("label idea failed:", error);
  }
  const { data: idea, error } = await supabase
    .from("saved_questions")
    .insert({ text: text.slice(0, 500), topic_id: ask.topic_id, ...label })
    .select("id")
    .single();
  if (error) {
    console.error(`ask ${id} to idea failed:`, error);
    return Response.json({ error: "Could not save the idea. Try again." }, { status: 500 });
  }
  const { data: updated } = await supabase
    .from("topic_asks")
    .update({ saved_question_id: idea.id })
    .eq("id", id)
    .select(ASK_COLUMNS)
    .single();
  return Response.json({ thread: toThread(updated ?? { ...ask, saved_question_id: idea.id }) });
}
