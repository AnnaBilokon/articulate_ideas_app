"use server";

import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/supabase";

export type DeleteTopicState = { error: string | null };

// Deleting a topic cascades to its lesson, card, questions, and answers.
// Tags are kept so they can be reused.
export async function deleteTopic(topicId: string): Promise<DeleteTopicState> {
  await requireSession();

  const { error } = await db().from("topics").delete().eq("id", topicId);
  if (error) return { error: "Could not delete the topic. Try again." };

  redirect("/");
}
