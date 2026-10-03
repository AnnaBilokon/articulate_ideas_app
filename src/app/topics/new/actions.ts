"use server";

import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { newTopicSchema, normalizeTag } from "@/lib/schemas";
import { db } from "@/lib/supabase";

export type NewTopicState = { error: string | null };

const lines = (value: FormDataEntryValue | null) =>
  typeof value === "string" ? value.split(/\r?\n/).map((l) => l.trim()).filter(Boolean) : [];

export async function createTopic(_prev: NewTopicState, formData: FormData): Promise<NewTopicState> {
  await requireSession();

  const tags = [
    ...new Set(
      (typeof formData.get("tags") === "string" ? String(formData.get("tags")).split(",") : [])
        .map(normalizeTag)
        .filter(Boolean),
    ),
  ];

  const source = formData.get("source");
  const parsed = newTopicSchema.safeParse({
    title: formData.get("title"),
    level: formData.get("level"),
    questions: lines(formData.get("questions")),
    tags,
    sourceText: formData.get("mode") === "own" && typeof source === "string" ? source : null,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const input = parsed.data;

  const supabase = db();

  const { data: topic, error: topicError } = await supabase
    .from("topics")
    .insert({ title: input.title, level: input.level, status: "learning", source_text: input.sourceText })
    .select("id")
    .single();
  if (topicError) return { error: "Could not save the topic. Try again." };

  // Supabase calls aren't one transaction, so undo the topic if a later step
  // fails (deleting it cascades to questions and tag links).
  const fail = async () => {
    await supabase.from("topics").delete().eq("id", topic.id);
    return { error: "Could not save the topic. Try again." };
  };

  if (input.questions.length > 0) {
    const { error } = await supabase.from("user_questions").insert(
      input.questions.map((text, position) => ({ topic_id: topic.id, position, text })),
    );
    if (error) return fail();
  }

  if (input.tags.length > 0) {
    const { data: tagRows, error: tagError } = await supabase
      .from("tags")
      .upsert(input.tags.map((name) => ({ name })), { onConflict: "name" })
      .select("id");
    if (tagError) return fail();

    const { error } = await supabase
      .from("topic_tags")
      .insert(tagRows.map((tag) => ({ topic_id: topic.id, tag_id: tag.id })));
    if (error) return fail();
  }

  redirect(`/topics/${topic.id}`);
}
