"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { DAILY_CAP_OPTIONS } from "@/lib/reviews-shared";
import { db } from "@/lib/supabase";

// Saves how many review questions come each day.
export async function saveDailyCap(cap: number): Promise<{ cap: number } | { error: string }> {
  await requireSession();
  if (!DAILY_CAP_OPTIONS.includes(cap as (typeof DAILY_CAP_OPTIONS)[number])) return { error: "Pick one of the options." };

  const { error } = await db().from("settings").update({ daily_review_cap: cap }).eq("id", 1);
  if (error) return { error: "Could not save the limit. Try again." };
  revalidatePath("/learn");
  return { cap };
}
