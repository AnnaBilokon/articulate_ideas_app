import { requireSession } from "@/lib/auth";
import { reviewOverview } from "@/lib/reviews";

export type ReviewSummary = { remaining: number; overflow: number; cap: number; nextDueAt: string | null };

// Ends a review session: what's left for today, and when the next review is.
// Scores are already saved with each answer, so the attempt ids aren't needed.
export async function POST() {
  await requireSession();
  const { today, overflow, cap, nextDueAt } = await reviewOverview();
  const summary: ReviewSummary = { remaining: today.length, overflow, cap, nextDueAt };
  return Response.json(summary);
}
