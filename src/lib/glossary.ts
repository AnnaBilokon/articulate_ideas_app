import "server-only";
import { buildGlossary, defineTerm, type GlossaryContext } from "@/lib/ai/glossary";
import { isTopicLevel } from "@/lib/schemas";
import { db } from "@/lib/supabase";

const UNIQUE_VIOLATION = "23505";

async function loadContext(topicId: string) {
  const { data: topic } = await db()
    .from("topics")
    .select("title, level, lesson_chunks(title, content, position), glossary_terms(term, source)")
    .eq("id", topicId)
    .order("position", { referencedTable: "lesson_chunks" })
    .maybeSingle();
  if (!topic) throw new Error("Topic not found.");
  if (topic.lesson_chunks.length === 0) throw new Error("Build the lesson first.");
  const context: GlossaryContext = {
    title: topic.title,
    level: isTopicLevel(topic.level) ? topic.level : null,
    chunks: topic.lesson_chunks,
  };
  return { context, existing: topic.glossary_terms };
}

/**
 * Builds the glossary from the lesson. Safe to call more than once: if Claude
 * already built one it's left alone, and terms the learner added are kept.
 */
export async function ensureGlossary(topicId: string): Promise<"created" | "exists"> {
  const { context, existing } = await loadContext(topicId);
  if (existing.some((t) => t.source === "claude")) return "exists";

  const { terms, usage } = await buildGlossary(context);
  console.log(`glossary ${topicId}:`, usage);

  const taken = new Set(existing.map((t) => t.term.toLowerCase()));
  const fresh = terms.filter((t) => {
    const key = t.term.toLowerCase();
    if (taken.has(key)) return false;
    taken.add(key);
    return true;
  });
  if (fresh.length === 0) return "created";

  const { error } = await db()
    .from("glossary_terms")
    .insert(fresh.map((t) => ({ topic_id: topicId, source: "claude", ...t })));
  if (error?.code === UNIQUE_VIOLATION) return "exists";
  if (error) throw new Error("Could not save the glossary. Try again.");
  return "created";
}

/** Adds a term the learner asked about, with Claude's definition. */
export async function addTerm(topicId: string, term: string) {
  const { context, existing } = await loadContext(topicId);
  if (existing.some((t) => t.term.toLowerCase() === term.toLowerCase())) {
    throw new Error(`"${term}" is already in the glossary.`);
  }

  const { entry, usage } = await defineTerm(context, term);
  console.log(`term ${topicId}:`, usage);

  // Keep the learner's own spelling of the term.
  const { data, error } = await db()
    .from("glossary_terms")
    .insert({ topic_id: topicId, source: "user", ...entry, term })
    .select("id, term, full_form, definition, example, source")
    .single();
  if (error?.code === UNIQUE_VIOLATION) throw new Error(`"${term}" is already in the glossary.`);
  if (error) throw new Error("Could not save the term. Try again.");
  return data;
}
