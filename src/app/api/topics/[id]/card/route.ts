import Anthropic from "@anthropic-ai/sdk";
import { after } from "next/server";
import { requireSession } from "@/lib/auth";
import { ensureCriticalQuestions } from "@/lib/critical-questions";
import { withRetry } from "@/lib/retry";
import { ensureTopicCard } from "@/lib/topic-card";

export const maxDuration = 300;

// Builds the Topic Card if it doesn't exist yet. Usually already done in the
// background after research; this is the manual retry.
export async function POST(_request: Request, { params }: RouteContext<"/api/topics/[id]/card">) {
  await requireSession();
  const { id } = await params;

  try {
    const status = await ensureTopicCard(id);
    // The "Think deeper" questions build on the card; make them in the background.
    after(async () => {
      try {
        await withRetry(() => ensureCriticalQuestions(id));
      } catch (error) {
        console.error(`background critical ${id} failed:`, error);
      }
    });
    return Response.json({ status });
  } catch (error) {
    console.error(`card ${id} failed:`, error);
    const message =
      error instanceof Anthropic.RateLimitError
        ? "Claude is busy right now. Wait a minute and try again."
        : error instanceof Anthropic.APIError
          ? "Claude couldn't build the card. Try again."
          : error instanceof Error
            ? error.message
            : "Something went wrong. Try again.";
    return Response.json({ error: message }, { status: 500 });
  }
}
