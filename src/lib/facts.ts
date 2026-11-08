import "server-only";
import type { QuickFact } from "@/lib/schemas";
import { db } from "@/lib/supabase";

// Quick facts read so far: the Library's knowledge of them, and what not to
// suggest again.

export const FACT_COLUMNS = "id, created_at, area, question, fact, why_interesting, review_draft, recall_questions(id)";

type FactRow = {
  id: string;
  created_at: string;
  area: string;
  question: string;
  fact: string;
  why_interesting: string | null;
  review_draft: unknown;
  recall_questions: { id: string }[];
};

export function toFact(r: FactRow): QuickFact {
  return {
    id: r.id,
    createdAt: r.created_at,
    area: r.area,
    question: r.question,
    fact: r.fact,
    whyInteresting: r.why_interesting,
    canReview: r.review_draft !== null,
    inReviews: r.recall_questions.length > 0,
  };
}

/** Every fact read, newest first. */
export async function listFacts(): Promise<QuickFact[]> {
  const { data } = await db().from("quick_facts").select(FACT_COLUMNS).order("created_at", { ascending: false });
  return (data ?? []).map(toFact);
}

/** Questions already read, newest first: in one area, or in all of them. */
export async function factQuestionsRead(area: string | null, limit = 60): Promise<string[]> {
  let query = db().from("quick_facts").select("question").order("created_at", { ascending: false }).limit(limit);
  // Any case; % and _ in a typed topic are plain characters.
  if (area) query = query.ilike("area", area.replace(/[%_\\]/g, (c) => `\\${c}`));
  const { data } = await query;
  return (data ?? []).map((f) => f.question);
}
