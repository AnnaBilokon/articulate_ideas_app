import "server-only";
import type { StudiedTopic } from "@/lib/ai/suggest";
import { isTopicLevel } from "@/lib/schemas";
import { db } from "@/lib/supabase";

// Favourite areas live in settings.interests, in the order they were added.
export async function favoriteAreas(): Promise<string[]> {
  const { data } = await db().from("settings").select("interests").eq("id", 1).maybeSingle();
  return data?.interests ?? [];
}

// Every topic studied so far, newest first, with what the suggestions need.
export async function studiedTopics(): Promise<StudiedTopic[]> {
  const { data, error } = await db()
    .from("topics")
    .select("id, title, level, topic_tags(tags(name)), topic_cards(one_sentence)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error("Could not read your topics. Try again.");
  return (data ?? []).map((t) => ({
    id: t.id,
    title: t.title,
    level: isTopicLevel(t.level) ? t.level : null,
    tags: t.topic_tags.flatMap((tt) => (tt.tags ? [tt.tags.name] : [])),
    summary: t.topic_cards?.one_sentence ?? null,
  }));
}
