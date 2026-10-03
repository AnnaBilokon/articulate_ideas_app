import Anthropic from "@anthropic-ai/sdk";
import { requireSession } from "@/lib/auth";
import { ensureCriticalQuestions } from "@/lib/critical-questions";

export const maxDuration = 300;

// Builds the "Think deeper" questions if they don't exist yet. New topics get
// them in the background after the card; this is for older topics and retries.
export async function POST(_request: Request, { params }: RouteContext<"/api/topics/[id]/critical">) {
  await requireSession();
  const { id } = await params;

  try {
    const status = await ensureCriticalQuestions(id);
    return Response.json({ status });
  } catch (error) {
    console.error(`critical ${id} failed:`, error);
    const message =
      error instanceof Anthropic.RateLimitError
        ? "Claude is busy right now. Wait a minute and try again."
        : error instanceof Anthropic.APIError
          ? "Claude couldn't write the questions. Try again."
          : error instanceof Error
            ? error.message
            : "Something went wrong. Try again.";
    return Response.json({ error: message }, { status: 500 });
  }
}
