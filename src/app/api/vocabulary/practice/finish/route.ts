import { requireSession } from "@/lib/auth";
import { practiceOverview } from "@/lib/vocabulary";

export type PracticeSummary = { remaining: number; nextDueAt: string | null };

// Ends a practice session: how many words are still due, and when the next
// one is. Scores are saved with each answer, so the attempt ids aren't needed.
export async function POST() {
  await requireSession();
  const { due, nextDueAt } = await practiceOverview();
  const summary: PracticeSummary = { remaining: due, nextDueAt };
  return Response.json(summary);
}
