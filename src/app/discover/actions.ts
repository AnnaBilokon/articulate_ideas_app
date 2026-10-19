"use server";

import { requireSession } from "@/lib/auth";
import { favoriteAreasSchema } from "@/lib/schemas";
import { db } from "@/lib/supabase";

// Saves the whole list of favourite areas: adding, removing and reordering
// all go through here. Duplicates (ignoring case) keep the first spelling.
export async function saveFavoriteAreas(areas: string[]): Promise<{ areas: string[] } | { error: string }> {
  await requireSession();

  const parsed = favoriteAreasSchema.safeParse(areas);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const unique = parsed.data.filter(
    (area, i) => parsed.data.findIndex((a) => a.toLowerCase() === area.toLowerCase()) === i,
  );

  const { error } = await db().from("settings").update({ interests: unique }).eq("id", 1);
  if (error) return { error: "Could not save your areas. Try again." };
  return { areas: unique };
}
