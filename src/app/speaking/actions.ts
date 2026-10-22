"use server";

import { revalidatePath } from "next/cache";
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
