"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { speakingProfileSchema, type SpeakingProfile } from "@/lib/schemas";
import { db } from "@/lib/supabase";

// Saves the speaking coach profile (goals, challenges, level, contexts, topics).
export async function saveSpeakingProfile(input: SpeakingProfile): Promise<{ error: string | null }> {
  await requireSession();
  const parsed = speakingProfileSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const topics = parsed.data.topics.filter(
    (t, i) => parsed.data.topics.findIndex((x) => x.toLowerCase() === t.toLowerCase()) === i,
  );
  const { error } = await db()
    .from("speaking_profile")
    .upsert({ id: 1, ...parsed.data, topics, updated_at: new Date().toISOString() });
  if (error) return { error: "Could not save your profile. Try again." };
  revalidatePath("/speaking");
  return { error: null };
}

// Removes a saved expression, so exercises stop bringing it back.
export async function removeSpeakingExpression(id: string): Promise<{ error: string | null }> {
  await requireSession();
  if (!z.uuid().safeParse(id).success) return { error: "Expression not found." };
  const { error } = await db().from("speaking_expressions").delete().eq("id", id);
  if (error) return { error: "Could not remove it. Try again." };
  revalidatePath("/speaking");
  revalidatePath("/speaking/expressions");
  return { error: null };
}
