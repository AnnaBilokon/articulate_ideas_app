import Anthropic from "@anthropic-ai/sdk";
import { SpeakingError } from "@/lib/speaking";

// The JSON error response for a failed speaking coach request.
export function speakingErrorResponse(error: unknown, label: string): Response {
  if (error instanceof SpeakingError) return Response.json({ error: error.message }, { status: error.status });
  console.error(`${label} failed:`, error);
  const message =
    error instanceof Anthropic.RateLimitError
      ? "The coach is busy right now. Wait a minute and try again."
      : error instanceof Anthropic.APIError
        ? "The coach couldn't reply. Try again."
        : error instanceof Error
          ? error.message
          : "Something went wrong. Try again.";
  return Response.json({ error: message }, { status: 500 });
}
