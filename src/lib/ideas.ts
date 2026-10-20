import type { SavedQuestion } from "@/lib/saved-questions";

// "Learn this" on a saved idea or question: the New topic form filled in with
// its short title (or the question itself), the question for the lesson to
// answer, and the level and tags of the topic it came from. Creating the
// topic marks the idea as started.
export function learnIdeaHref(idea: Pick<SavedQuestion, "id" | "text" | "title" | "source">): string {
  const params = new URLSearchParams({ title: (idea.title ?? idea.text).slice(0, 200), q: idea.text, saved: idea.id });
  if (idea.source?.level) params.set("level", idea.source.level);
  if (idea.source && idea.source.tags.length > 0) params.set("tags", idea.source.tags.join(", "));
  return `/topics/new?${params}`;
}
